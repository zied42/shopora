import { at, mulberry32 } from './shipments';

export const SUPPLIER_PRODUCTS_TOTAL = 25916;

export type SupplierProductOffer = 'dropshipping' | 'wholesale' | 'white_label';
export type SupplierProductStatus = 'Active' | 'In Review' | 'Declined' | 'Inactive';
export type SupplierProductShipping = 'Can be shipped' | 'Cannot ship';

export interface SupplierProduct {
  id: number;
  gid: string;
  name: string;
  emoji: string;
  visible: boolean;
  offer_type: SupplierProductOffer;
  status: SupplierProductStatus;
  shipping: SupplierProductShipping;
  product_labels: string[];
  collection_ids: number[];
  supplier_id: number;
  supplier_name: string;
  supplier_labels: string[];
  created_at: string;
}

export interface SupplierProductsQuery {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  statuses?: string[];
  offers?: string[];
  visibility?: string;
  shipping?: string;
}

export interface SupplierProductsResult {
  rows: SupplierProduct[];
  total: number;
  filters: { statuses: string[]; offers: string[]; shippings: string[] };
  page: number;
  per_page: number;
}

interface ProdDef {
  name: string;
  emoji: string;
}

export const PROD_DEFS: ProdDef[] = [
  { name: 'Berceau', emoji: '🛏️' },
  { name: 'Vélo', emoji: '🚲' },
  { name: 'Robe', emoji: '👗' },
  { name: 'Réfrigérateur', emoji: '🧊' },
  { name: 'Four', emoji: '🔥' },
  { name: 'Food process', emoji: '🥣' },
  { name: 'Barre de marche', emoji: '🏃' },
  { name: 'Casque', emoji: '🎧' },
  { name: 'Montre', emoji: '⌚' },
  { name: 'Smartphone', emoji: '📱' },
  { name: 'Téléviseur', emoji: '📺' },
  { name: 'Machine à laver', emoji: '🧺' },
  { name: 'Climatiseur', emoji: '❄️' },
  { name: 'Manteau', emoji: '🧥' },
  { name: 'Sac à main', emoji: '👜' },
  { name: 'Chaussures', emoji: '👟' },
  { name: 'Aspirateur', emoji: '🧹' },
  { name: 'Perceuse', emoji: '🔧' },
  { name: 'Mixeur', emoji: '🥤' },
  { name: 'Tapis', emoji: '🧶' },
  { name: 'Scie circulaire', emoji: '🪚' },
  { name: 'Sèche-cheveux', emoji: '💇' },
  { name: 'Robot de cuisine', emoji: '🍳' },
  { name: 'Grille-pain', emoji: '🍞' },
  { name: 'Machine à café', emoji: '☕' },
  { name: 'Fer à repasser', emoji: '👔' },
  { name: 'Cagole', emoji: '💼' },
  { name: 'Oud électronique', emoji: '🎹' },
  { name: 'Taktuka électronique', emoji: '🥁' },
  { name: 'Chauffe-eau', emoji: '🚿' },
  { name: 'Sèche-linge', emoji: '🌀' },
  { name: 'Congélateur', emoji: '🧊' },
  { name: 'Lampe sur pied', emoji: '💡' },
  { name: 'Table basse', emoji: '🪑' },
  { name: 'Canapé', emoji: '🛋️' },
  { name: 'Bureau', emoji: '🖥️' },
  { name: 'Parfum', emoji: '🌸' },
  { name: 'Sérum visage', emoji: '✨' },
  { name: 'Shampoing', emoji: '🧴' },
  { name: 'Eau de parfum', emoji: '👃' },
  { name: 'Lampadaire', emoji: '💡' },
  { name: 'Horloge murale', emoji: '🕰️' },
  { name: 'Rideaux', emoji: '🪟' },
  { name: 'Tondeuse', emoji: '🧑‍🌾' },
  { name: 'Matelas bébé', emoji: '👶' },
  { name: 'Bikini', emoji: '🩱' },
  { name: 'Essuie-tout', emoji: '🧻' },
  { name: 'Plateforme pas-bébé', emoji: '👶' },
];

export const PRODUCT_OFFERS: SupplierProductOffer[] = ['dropshipping', 'wholesale', 'dropshipping'];

export const PRODUCT_STATUSES: SupplierProductStatus[] = ['Active', 'In Review', 'Declined', 'Inactive'];

export const PRODUCT_SHIPPINGS: SupplierProductShipping[] = ['Can be shipped', 'Cannot ship'];

export const PRODUCT_LABELS = [
  'late_preparation_warning_3',
  'winner_72h',
  'eligible_to_marketplace',
  'best_seller',
  'high_margin',
  'low_margin',
  'new_arrival',
  'seasonal',
  'promo_trending',
  'winter_essentials',
];

export const SUPPLIER_LABELS = [
  'late_preparation_warning_3',
  'activation_pending',
  'fulfillment_verified',
  'packaging_missing',
  'stock_issues',
  'active_subscription',
];

const SUPPLIER_NAMES = [
  'Jomla Pro',
  'UB tech',
  'WIXI TN',
  'La perla home',
  'Sté Tarek Verre',
  'Maison Du Gadget',
  'Aura Herbs',
  'Store 4 Eljem',
  'Beauty Lab',
  'Sotraleg',
  'Atelier Cuir',
  'Pep Electronics',
  'Tunisian Market',
  'Verre & Déco',
  'Céramique El Aouina',
  'Ets Bouzid',
  'Bio Terre',
  'Textile Nord',
  'Sfax Import',
  'GDH Distribution',
];

const SEED_COLLECTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const STATUS_WEIGHTS: { s: SupplierProductStatus; w: number }[] = [
  { s: 'Active', w: 55 },
  { s: 'In Review', w: 20 },
  { s: 'Inactive', w: 15 },
  { s: 'Declined', w: 10 },
];

function pickStatus(rand: () => number): SupplierProductStatus {
  const roll = rand() * 100;
  let acc = 0;
  for (const { s, w } of STATUS_WEIGHTS) {
    acc += w;
    if (roll <= acc) return s;
  }
  return 'Active';
}

function pickOffers(rand: () => number): SupplierProductOffer[] {
  const offers = new Set<SupplierProductOffer>();
  if (rand() < 0.9) offers.add('dropshipping');
  if (rand() < 0.45) offers.add('wholesale');
  if (rand() < 0.08) offers.add('white_label');
  if (offers.size === 0) offers.add('dropshipping');
  return Array.from(offers);
}

function buildAt(i: number): { row: SupplierProduct; rand: () => number; offers: SupplierProductOffer[] } {
  const rand = mulberry32(20260824 + i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] ?? arr[0]!;
  const def = pick(PROD_DEFS);
  const offers = pickOffers(rand);

  const productLabels = new Set<string>();
  if (rand() < 0.5) productLabels.add(pick(PRODUCT_LABELS));
  if (rand() < 0.3) productLabels.add(pick(PRODUCT_LABELS));

  const collections = new Set<number>();
  const cCount = rand() < 0.5 ? 0 : 1 + Math.floor(rand() * 3);
  while (collections.size < Math.min(cCount, SEED_COLLECTION_IDS.length)) {
    collections.add(pick(SEED_COLLECTION_IDS));
  }

  const supplierLabels = new Set<string>();
  if (rand() < 0.5) supplierLabels.add(pick(SUPPLIER_LABELS));
  if (rand() < 0.2) supplierLabels.add(pick(SUPPLIER_LABELS));

  const supplierId = pick(SUPPLIER_NAMES);
  const daysAgo = Math.floor(rand() * 120);
  const created = at(daysAgo, 8 + Math.floor(rand() * 11), Math.floor(rand() * 60));

  const row: SupplierProduct = {
    id: 54000 + i,
    gid: String(54000 + i),
    name: def.name,
    emoji: def.emoji,
    visible: rand() < 0.8,
    offer_type: offers[0]!,
    status: pickStatus(rand),
    shipping: pick(PRODUCT_SHIPPINGS),
    product_labels: Array.from(productLabels),
    collection_ids: Array.from(collections).sort((a, b) => a - b),
    supplier_id: 90715 + (i % 1590) * 2,
    supplier_name: supplierId,
    supplier_labels: Array.from(supplierLabels),
    created_at: created,
  };
  return { row, rand, offers };
}

let cache: SupplierProduct[] | null = null;

function allRows(): SupplierProduct[] {
  if (cache) return cache;
  const rows: SupplierProduct[] = [];
  for (let i = 0; i < SUPPLIER_PRODUCTS_TOTAL; i++) rows.push(buildAt(i).row);
  cache = rows;
  return rows;
}

/* ── rich detail (product preview) ───────────────────────────────────── */

export interface SupplierProductVariation {
  emoji: string;
  variant: string;
  stock: number;
  price: number;
  vat_pct: number;
  weight_g: number;
  dimensions: string;
  recommended_selling_price: number;
}

export interface SupplierProductFulfiller {
  name: string;
  warehouse: string;
  quantity: number;
}

export interface SupplierProductDeclineReason {
  reason: string;
  note: string | null;
}

export interface SupplierProductStock {
  warehouses: { name: string; brought: number; in_orders: number; in_warehouse: number }[];
  movements: { direction: 'in' | 'out'; warehouse: string; label: string; qty: number; at: string }[];
}

export interface SupplierProductDetail extends SupplierProduct {
  offer_types: SupplierProductOffer[];
  description: string | null;
  marketplace_price: number;
  supplier_price: number;
  product_value: number | null;
  wholesale: { min: number; max: number } | null;
  categories: string[];
  platform_commission_pct: number;
  tags: string[];
  fulfillers: SupplierProductFulfiller[];
  weight_g: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  vat_pct: number;
  media_count: number;
  real_video: boolean;
  real_image: boolean;
  updated_at: string;
  activated_at: string | null;
  activated_by: string | null;
  decline_reasons: SupplierProductDeclineReason[] | null;
  variations: SupplierProductVariation[];
  service_user_score: number;
  recommended_selling_price: number;
  stock: SupplierProductStock;
}

const DESC_POOL = [
  'Le produit est prêt pour la vente en ligne. Emballage soigné et expédition rapide vers toute la Tunisie.',
  'Cet article est un best-seller chez nos partenaires. Fiable, durable et livré avec tous les accessoires.',
  'Un produit pratique et économique, parfait pour un dropshipping à forte marge. Stock disponible en entrepôt.',
  'Qualité garantie par notre plateforme. Retours faciles, service client réactif pour toute réclamation.',
];

const CATEGORY_POOL = ['Électronique', 'Maison & Jardin', 'Beauté & Soin', 'Mode', 'Cuisine', 'Sport & Loisirs', 'Outils', 'Bébé & Mère'];

const TAG_POOL = ['nouveau', 'promo', 'meilleure vente', 'qualité premium', 'livraison rapide', 'été 2026', 'école 2026', 'rabais'];

const WAREHOUSE_POOL = ['Ariana', 'Sousse', 'Sfax', 'Tunis', 'Monastir', 'Bizerte', 'Nabeul', 'Kairouan'];

const ACTIVATOR_POOL = ['Rakia', 'Rahma', 'Lamia', 'Sonia'];

const DECLINE_POOL: SupplierProductDeclineReason[] = [
  { reason: 'Price', note: null },
  { reason: 'Packing', note: 'la boîte ne correspond pas aux dimensions demandées' },
  { reason: 'Quality', note: 'échantillon non conforme aux photos' },
  { reason: 'Missing documents', note: 'facture d\u2019achat manquante' },
  { reason: 'Drop product', note: 'produit concerné par la liste des produits refusés' },
  { reason: 'Photos', note: 'les visuels doivent être reprise' },
];

const VARIANT_SUFFIX = ['Noir', 'Blanc', 'Rouge', 'Bleu', 'Vert', 'Gris', 'Rose', 'Violet', 'XL', 'L', 'M', 'S', '32 GB', '64 GB', '128 GB'];

const IN_LABELS = ['Stock shipment', 'Return', 'Manual adjustment', 'Production release', 'First stocking'];
const OUT_LABELS = ['Order', 'Damage', 'Manual adjustment', 'Sampling', 'Return to supplier'];

function pickN<T>(rand: () => number, arr: T[], max: number): T[] {
  const out = new Set<T>();
  const n = 1 + Math.floor(rand() * max);
  while (out.size < Math.min(n, arr.length)) out.add(arr[Math.floor(rand() * arr.length)]!);
  return Array.from(out);
}

export function getSupplierProductDetail(id: number): SupplierProductDetail | null {
  const i = id - 54000;
  if (i < 0 || i >= SUPPLIER_PRODUCTS_TOTAL) return null;
  const { row, rand, offers } = buildAt(i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] ?? arr[0]!;

  const marketplace_price = Number((5 + rand() * 95).toFixed(3));
  const supplier_price = Number((marketplace_price * (0.92 + rand() * 0.06)).toFixed(3));
  const product_value = rand() < 0.5 ? null : Number((marketplace_price * (0.5 + rand() * 0.45)).toFixed(3));
  const wholesale = rand() < 0.5 ? null : { min: Number((supplier_price * 0.85).toFixed(3)), max: Number((supplier_price * 1.15).toFixed(3)) };
  const categories = pickN(rand, CATEGORY_POOL, 3);
  const tags = rand() < 0.7 ? pickN(rand, TAG_POOL, 3) : [];
  const fulfillersNum = 1 + Math.floor(rand() * 2);
  const fulfillers: SupplierProductFulfiller[] = [];
  const usedWh = new Set<string>();
  for (let f = 0; f < fulfillersNum; f++) {
    let wh = pick(WAREHOUSE_POOL);
    while (usedWh.has(wh)) wh = pick(WAREHOUSE_POOL);
    usedWh.add(wh);
    fulfillers.push({ name: row.supplier_name, warehouse: wh, quantity: 10 + Math.floor(rand() * 900) });
  }
  const weight_g = 100 + Math.floor(rand() * 20050);
  const length_mm = 50 + Math.floor(rand() * 800);
  const width_mm = 40 + Math.floor(rand() * 600);
  const height_mm = 20 + Math.floor(rand() * 400);
  const media_count = 1 + Math.floor(rand() * 6);
  const real_video = rand() < 0.6;
  const real_image = rand() < 0.9;

  const createdDays = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000);
  const updateDaysAgo = Math.max(0, Math.floor(rand() * createdDays));
  const updated_at = at(updateDaysAgo, 9 + Math.floor(rand() * 11), Math.floor(rand() * 60));

  const activated_at = row.status === 'Active' ? at(Math.max(0, Math.floor(rand() * (updateDaysAgo + 2))), 8 + Math.floor(rand() * 11), Math.floor(rand() * 60)) : null;
  const activated_by = activated_at ? pick(ACTIVATOR_POOL) : null;

  const decline_reasons = row.status === 'Declined' ? pickN(rand, DECLINE_POOL, 3).map((r) => ({ ...r })) : null;

  const variations: SupplierProductVariation[] = [];
  const varCount = rand() < 0.45 ? 0 : 1 + Math.floor(rand() * 4);
  for (let v = 0; v < varCount; v++) {
    const vprice = Number((supplier_price * (0.9 + rand() * 0.3)).toFixed(3));
    variations.push({
      emoji: row.emoji,
      variant: `${row.name} ${pick(VARIANT_SUFFIX)}`,
      stock: 4 + Math.floor(rand() * 600),
      price: vprice,
      vat_pct: 19,
      weight_g: 80 + Math.floor(rand() * 1000),
      dimensions: `${length_mm} x ${width_mm} x ${height_mm} mm`,
      recommended_selling_price: Number((marketplace_price * (1 + rand() * 0.25)).toFixed(3)),
    });
  }

  const service_user_score = 50;
  const recommended_selling_price = Number((marketplace_price * (1 + rand() * 0.25)).toFixed(3));

  const warehouses = pickN(rand, WAREHOUSE_POOL, 3).map((name) => ({
    name,
    brought: 1 + Math.floor(rand() * 900),
    in_orders: Math.floor(rand() * 200),
    in_warehouse: 1 + Math.floor(rand() * 700),
  }));
  const movements: SupplierProductStock['movements'] = [];
  const mvCount = 6 + Math.floor(rand() * 8);
  for (let m = 0; m < mvCount; m++) {
    const isIn = rand() < 0.55;
    const mvDays = Math.floor(rand() * (createdDays + 2));
    movements.push({
      direction: isIn ? 'in' : 'out',
      warehouse: pick(warehouses.map((w) => w.name)),
      label: `${isIn ? pick(IN_LABELS) : pick(OUT_LABELS)} #${10000 + Math.floor(rand() * 90000)}`,
      qty: 1 + Math.floor(rand() * 120),
      at: at(mvDays, 8 + Math.floor(rand() * 11), Math.floor(rand() * 60)),
    });
  }
  movements.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    ...row,
    offer_types: offers,
    description: rand() < 0.85 ? pick(DESC_POOL) : null,
    marketplace_price,
    supplier_price,
    product_value,
    wholesale,
    categories,
    platform_commission_pct: 3,
    tags,
    fulfillers,
    weight_g,
    length_mm,
    width_mm,
    height_mm,
    vat_pct: 19,
    media_count,
    real_video,
    real_image,
    updated_at,
    activated_at,
    activated_by,
    decline_reasons,
    variations,
    service_user_score,
    recommended_selling_price,
    stock: { warehouses, movements },
  };
}

const SORT_FIELDS: Record<string, (r: SupplierProduct) => string> = {
  gid: (r) => r.gid,
  name: (r) => r.name,
  supplier: (r) => r.supplier_name,
  status: (r) => r.status,
  shipping: (r) => r.shipping,
  created_at: (r) => r.created_at,
};

export function getSupplierProduct(id: number): SupplierProduct | null {
  return allRows().find((r) => r.id === id) ?? null;
}

export function searchSupplierProducts(query: SupplierProductsQuery): SupplierProductsResult {
  const rows = allRows();
  const q = (query.q ?? '').trim().toLowerCase();
  const statuses = query.statuses ?? [];
  const offers = query.offers ?? [];
  const shippings = query.shipping ? [query.shipping] : [];
  const visibility = query.visibility;
  const sort = query.sort && SORT_FIELDS[query.sort] ? query.sort : 'created_at';
  const dir = query.dir === 'asc' ? 1 : -1;

  const matches: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (statuses.length && !statuses.includes(r.status)) continue;
    if (offers.length && !offers.includes(r.offer_type)) continue;
    if (shippings.length && !shippings.includes(r.shipping)) continue;
    if (visibility === 'visible' && !r.visible) continue;
    if (visibility === 'hidden' && r.visible) continue;
    if (q) {
      const hay = `${r.name} ${r.supplier_name} ${r.gid}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    matches.push(i);
  }

  const getVal = SORT_FIELDS[sort]!;
  matches.sort((a, b) => {
    const va = getVal!(rows[a]!);
    const vb = getVal!(rows[b]!);
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return (rows[a]!.id - rows[b]!.id) * dir;
  });

  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  const pageRows = matches.slice(start, start + query.per_page).map((i) => rows[i]!);

  return {
    rows: pageRows,
    total,
    filters: {
      statuses: [...PRODUCT_STATUSES],
      offers: [...new Set(PRODUCT_OFFERS)],
      shippings: [...PRODUCT_SHIPPINGS],
    },
    page: query.page,
    per_page: query.per_page,
  };
}