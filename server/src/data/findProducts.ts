import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { mysqlSsl } from '../config/env';

export const FIND_PRODUCTS_TOTAL = 0;

export type FindProductType = 'dropshipping' | 'wholesale' | 'oem';

export interface FindProduct {
  id: number;
  uuid: string;
  name: string;
  description: string;
  image: string | null;
  type: FindProductType;
  in_stock: boolean;
  quantity: number;
  price: number;
  collections: string[];
  hierarchicalCategories: string | null;
  category: string;
  rating: number;
  shipper_express: boolean;
  up_to_date_stocks: boolean;
  high_rating: boolean;
  reliable_fulfillment: boolean;
  activated_at: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FindProductsQuery {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  type?: string;
  in_stock?: string;
  category?: string;
  collections?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  rating_max?: number;
  quantity_min?: number;
  quantity_max?: number;
  shipper_express?: string;
  high_rating?: string;
  reliable_fulfillment?: string;
}

export interface FindProductsResult {
  hits: FindProduct[];
  total: number;
  page: number;
  per_page: number;
  ms: number;
  facets: {
    productType: FacetValue[];
    inStock: FacetValue[];
    shipperExpress: FacetValue[];
    upToDateStocks: FacetValue[];
    highRating: FacetValue[];
    reliableFulfillment: FacetValue[];
    collections: FacetValue[];
    categories: FacetValue[];
    price: { min: number; max: number };
    rating: { min: number; max: number };
  };
}

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ecom',
  waitForConnections: true,
  connectionLimit: 5,
  ssl: mysqlSsl(process.env.DB_HOST || 'localhost'),
});

type Row<T = Record<string, unknown>> = T & RowDataPacket;

async function dbQuery<T extends RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  category: string;
  stock: number;
  image_url: string | null;
  rating: number;
  rating_count: number;
  is_active: number;
  moderation_status: string;
  fournisseur_id: number;
  created_at: string;
}

function mapType(cat: string): FindProductType {
  if (cat === 'white_label') return 'oem';
  if (cat === 'wholesale') return 'wholesale';
  return 'dropshipping';
}

function mapRow(r: ProductRow): FindProduct {
  const inStock = r.stock > 0;
  return {
    id: r.id,
    uuid: String(r.id),
    name: r.name,
    description: r.description ?? '',
    image: r.image_url,
    type: mapType(r.category),
    in_stock: inStock,
    quantity: r.stock,
    price: Number(r.price),
    collections: [],
    hierarchicalCategories: r.category,
    category: r.category,
    rating: Number(r.rating),
    shipper_express: true,
    up_to_date_stocks: true,
    high_rating: Number(r.rating) >= 4,
    reliable_fulfillment: true,
    activated_at: r.created_at,
  };
}

function buildWhereClauses(q: FindProductsQuery): { where: string[]; params: unknown[] } {
  const where: string[] = ['p.is_active = 1', "p.moderation_status = 'approved'"];
  const params: unknown[] = [];

  if (q.type) {
    const types = q.type.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (types.length) {
      const dbTypes = types.map((t: string) => (t === 'oem' ? 'white_label' : t));
      where.push(`p.category IN (${dbTypes.map(() => '?').join(',')})`);
      params.push(...dbTypes);
    }
  }
  if (q.in_stock) {
    const wanted = q.in_stock.split(',').map((s: string) => s.trim());
    if (wanted.includes('true') && !wanted.includes('false')) {
      where.push('p.stock > 0');
    } else if (wanted.includes('false') && !wanted.includes('true')) {
      where.push('p.stock = 0');
    }
  }
  if (q.category) {
    where.push('p.category = ?');
    params.push(q.category);
  }
  if (q.price_min != null) {
    where.push('p.price >= ?');
    params.push(q.price_min);
  }
  if (q.price_max != null) {
    where.push('p.price <= ?');
    params.push(q.price_max);
  }
  if (q.rating_min != null) {
    where.push('p.rating >= ?');
    params.push(q.rating_min);
  }
  if (q.rating_max != null) {
    where.push('p.rating <= ?');
    params.push(q.rating_max);
  }
  if (q.quantity_min != null) {
    where.push('p.stock >= ?');
    params.push(q.quantity_min);
  }
  if (q.quantity_max != null) {
    where.push('p.stock <= ?');
    params.push(q.quantity_max);
  }
  if (q.q) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like);
  }

  return { where, params };
}

export async function searchFindProducts(query: FindProductsQuery): Promise<FindProductsResult> {
  const t0 = Date.now();
  const { where, params } = buildWhereClauses(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sortMap: Record<string, string> = {
    default: 'p.id DESC',
    activated_at_desc: 'p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
  };
  const orderBy = sortMap[query.sort ?? ''] ?? 'p.id DESC';

  const countRows = await dbQuery<Row<{ total: number }>>(
    `SELECT COUNT(*) AS total FROM products p ${whereSql}`,
    params,
  );
  const total = countRows[0]?.total ?? 0;

  const start = (query.page - 1) * query.per_page;
  const rows = await dbQuery<ProductRow>(
    `SELECT p.id, p.name, p.description, p.price, p.cost_price, p.category, p.stock,
            p.image_url, p.rating, p.rating_count, p.is_active, p.moderation_status,
            p.fournisseur_id, p.created_at
     FROM products p ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, query.per_page, start],
  );

  const hits = rows.map(mapRow);

  if (hits.length > 0) {
    const hitIds = hits.map((h) => h.id);
    const collRows = await dbQuery<Row<{ product_id: number; title: string }>>(
      `SELECT cp.product_id, c.title
       FROM collection_products cp
       JOIN collections c ON c.id = cp.collection_id
       WHERE cp.product_id IN (${hitIds.map(() => '?').join(',')})`,
      hitIds,
    );
    const collMap: Record<number, string[]> = {};
    for (const cr of collRows) {
      const pid = Number(cr.product_id);
      if (!collMap[pid]) collMap[pid] = [];
      collMap[pid].push(cr.title);
    }
    for (const h of hits) {
      h.collections = collMap[h.id] ?? [];
    }
  }

  const allRows = await dbQuery<Row<{ category: string; stock: number; price: number; rating: number }>>(
    `SELECT p.category, p.stock, p.price, p.rating FROM products p WHERE p.is_active = 1 AND p.moderation_status = 'approved'`,
  );

  const typeCount: Record<string, number> = {};
  const stockCount: Record<string, number> = { true: 0, false: 0 };
  const catCount: Record<string, number> = {};
  let priceMin = Infinity;
  let priceMax = -Infinity;

  for (const r of allRows) {
    const t = mapType(r.category);
    typeCount[t] = (typeCount[t] ?? 0) + 1;
    if (r.stock > 0) stockCount.true++; else stockCount.false++;
    catCount[r.category] = (catCount[r.category] ?? 0) + 1;
    const p = Number(r.price);
    if (p < priceMin) priceMin = p;
    if (p > priceMax) priceMax = p;
  }

  return {
    hits,
    total,
    page: query.page,
    per_page: query.per_page,
    ms: Date.now() - t0,
    facets: {
      productType: Object.entries(typeCount).map(([value, count]) => ({ value, count })),
      inStock: [
        { value: 'true', count: stockCount.true },
        { value: 'false', count: stockCount.false },
      ],
      shipperExpress: [{ value: 'true', count: allRows.length }],
      upToDateStocks: [{ value: 'true', count: allRows.length }],
      highRating: [
        { value: 'true', count: allRows.filter((r) => Number(r.rating) >= 4).length },
        { value: 'false', count: allRows.filter((r) => Number(r.rating) < 4).length },
      ],
      reliableFulfillment: [{ value: 'true', count: allRows.length }],
      collections: [],
      categories: Object.entries(catCount)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      price: { min: priceMin === Infinity ? 0 : priceMin, max: priceMax === -Infinity ? 0 : priceMax },
      rating: { min: 0, max: 5 },
    },
  };
}

export async function getFindProductDetail(idOrUuid: string): Promise<object | null> {
  const id = Number(idOrUuid);
  if (!Number.isFinite(id)) return null;

  const rows = await dbQuery<ProductRow>(
    `SELECT p.id, p.name, p.description, p.price, p.cost_price, p.category, p.stock,
            p.image_url, p.rating, p.rating_count, p.is_active, p.moderation_status,
            p.fournisseur_id, p.created_at
     FROM products p
     WHERE p.id = ? AND p.is_active = 1 AND p.moderation_status = 'approved'`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;

  const userRows = await dbQuery<Row<{ name: string }>>(
    `SELECT name FROM users WHERE id = ?`,
    [r.fournisseur_id],
  );
  const supplierName = userRows[0]?.name ?? 'Supplier';

  const collRows = await dbQuery<Row<{ collection_id: number }>>(
    `SELECT collection_id FROM collection_products WHERE product_id = ?`,
    [id],
  );
  const collectionIds = collRows.map((cr) => Number(cr.collection_id));

  const marketplace_price = Number(r.price);
  const supplier_price = Number((marketplace_price * 0.97).toFixed(3));
  const inStock = r.stock > 0;
  const images = r.image_url ? [r.image_url] : [];

  return {
    id: r.id,
    gid: String(r.id),
    name: r.name,
    emoji: '📦',
    image_url: r.image_url,
    visible: inStock,
    offer_type: mapType(r.category) === 'oem' ? 'white_label' : mapType(r.category),
    status: 'Active',
    shipping: 'Can be shipped',
    product_labels: [],
    collection_ids: collectionIds,
    supplier_id: r.fournisseur_id,
    supplier_name: supplierName,
    supplier_labels: [],
    created_at: r.created_at,
    offer_types: [mapType(r.category) === 'oem' ? 'white_label' : mapType(r.category)],
    description: r.description ?? '',
    marketplace_price,
    supplier_price,
    product_value: null,
    wholesale: null,
    categories: [r.category],
    platform_commission_pct: 3,
    tags: r.name.toLowerCase().split(' ').filter((w: string) => w.length > 3).slice(0, 3),
    fulfillers: [{ name: supplierName, warehouse: 'Supplier warehouse', quantity: r.stock }],
    weight_g: 200,
    length_mm: 10,
    width_mm: 10,
    height_mm: 20,
    vat_pct: 19,
    images,
    videos: [],
    video_url: null,
    media_count: images.length,
    real_video: false,
    real_image: !!r.image_url,
    updated_at: r.created_at,
    activated_at: r.created_at,
    activated_by: null,
    decline_reasons: null,
    variations: [
      {
        emoji: '📦',
        variant: r.name,
        stock: r.stock,
        price: supplier_price,
        vat_pct: 19,
        weight_g: 200,
        dimensions: '10 x 10 x 20',
        recommended_selling_price: Number((marketplace_price * 1.3).toFixed(3)),
      },
    ],
    service_user_score: 50,
    recommended_selling_price: Number((marketplace_price * 1.3).toFixed(3)),
    stock: {
      warehouses: [
        { name: 'Supplier warehouse', brought: r.stock, in_orders: 0, in_warehouse: r.stock },
      ],
      movements: [],
    },
  };
}

export const FIND_PRODUCT_TYPES: FindProductType[] = ['dropshipping', 'wholesale', 'oem'];
export const RATING_FACETS = [true, false] as const;
