import { mulberry32 } from './shipments';

export const PRODUCT_SUBSCRIPTIONS_TOTAL = 570_829;

interface SubProduct {
  name: string;
  emoji: string;
}

const PRODUCTS: SubProduct[] = [
  { name: 'Berceau', emoji: '🛏️' },
  { name: 'Vélo', emoji: '🚲' },
  { name: 'Robe', emoji: '👗' },
  { name: 'Réfrigérateur', emoji: '🧊' },
  { name: 'Four', emoji: '🔥' },
  { name: 'Set robot chauffage', emoji: '🔥' },
  { name: 'Barre de marche', emoji: '🏃' },
  { name: 'Food process', emoji: '🥣' },
  { name: 'Contrôleuse de puissance', emoji: '⚡' },
  { name: 'Robe voile', emoji: '👗' },
  { name: 'Plateforme pas-bébé', emoji: '👶' },
  { name: 'Tapis', emoji: '🧶' },
  { name: 'Climatiseur', emoji: '❄️' },
  { name: 'Machine à laver', emoji: '🧺' },
  { name: 'Téléviseur', emoji: '📺' },
  { name: 'Smartphone', emoji: '📱' },
  { name: 'Casque', emoji: '🎧' },
  { name: 'Montre', emoji: '⌚' },
  { name: 'Lampadaire', emoji: '💡' },
  { name: 'Chaise', emoji: '🪑' },
  { name: 'FFP2 masques', emoji: '😷' },
  { name: 'Manteau', emoji: '🧥' },
  { name: 'Sac à main', emoji: '👜' },
  { name: 'Chaussures', emoji: '👟' },
  { name: 'Perceuse', emoji: '🔧' },
  { name: 'Aspirateur', emoji: '🧹' },
  { name: 'Fer à repasser', emoji: '👔' },
  { name: 'Mixeur', emoji: '🥤' },
  { name: 'Bouilloire', emoji: '🫖' },
  { name: 'Multiple', emoji: '📦' },
];

interface SubOrg {
  name: string;
  code: string;
}

const SUPPLIERS: SubOrg[] = [
  { name: 'Smej Weld', code: 'OX6891' },
  { name: '4Ward', code: 'LX4395' },
  { name: 'Pro4com', code: 'QZ1823' },
  { name: 'Info dist', code: 'AF3951' },
  { name: 'STAR Sfax', code: 'KO4872' },
  { name: 'Sana Ben', code: 'MN9554' },
  { name: 'Gsm+', code: 'WR6330' },
  { name: 'Noor Pharma', code: 'JU0295' },
  { name: 'Tunisian Market', code: 'KL5124' },
  { name: 'Maison Du Gadget', code: 'IH8822' },
  { name: 'Beauty Lab', code: 'OP7711' },
  { name: 'Aura Herbs', code: 'TR4460' },
];

interface SubRetailer extends SubOrg {
  premium: 'crown' | 'bolt' | null;
}

const RETAILERS: SubRetailer[] = [
  { name: 'Boutique Wafa', code: 'OH123', premium: 'crown' },
  { name: 'Souk el Nhar', code: 'WL839', premium: null },
  { name: 'Maison de la Tunisie', code: 'KR7305', premium: 'bolt' },
  { name: 'Roba Zone', code: 'GF788', premium: null },
  { name: 'El Amra', code: 'AF3951', premium: null },
  { name: 'Top Shell', code: 'KC2016', premium: 'crown' },
  { name: 'Sofiane Cosmetic', code: 'VN5558', premium: null },
  { name: 'Black Bucure', code: 'PM9870', premium: 'bolt' },
  { name: 'Tek Up', code: 'LH2207', premium: null },
  { name: 'Basma Store', code: 'RT4459', premium: null },
  { name: 'Cyberh', code: 'OF7793', premium: 'crown' },
  { name: 'Golden E-comm', code: 'GJ5601', premium: null },
  { name: 'New Fashion', code: 'SC8426', premium: 'bolt' },
  { name: 'Atlas Market', code: 'DH3102', premium: null },
  { name: 'Medina Shop', code: 'YW9624', premium: null },
  { name: 'Lamari Chahd', code: 'ET731', premium: null },
  { name: 'Miss Rihab', code: 'QN9507', premium: 'crown' },
  { name: 'Kontiza shop', code: 'UB2196', premium: null },
  { name: 'My Shopping', code: 'XC8894', premium: null },
  { name: 'TAWBA STORE', code: 'DJ1212', premium: 'bolt' },
];

interface Cache {
  prod: Uint32Array;
  supp: Uint32Array;
  ret: Uint32Array;
  cost: Float64Array;
  price: Float64Array;
  fee: Float64Array;
  units: Uint32Array;
  oos: Uint8Array;
  startedMs: Float64Array;
  updates: Uint8Array;
}

let cache: Cache | null = null;

function init(): Cache {
  if (cache) return cache;
  const rand = mulberry32(20260823);
  const n = PRODUCT_SUBSCRIPTIONS_TOTAL;
  const c: Cache = {
    prod: new Uint32Array(n),
    supp: new Uint32Array(n),
    ret: new Uint32Array(n),
    cost: new Float64Array(n),
    price: new Float64Array(n),
    fee: new Float64Array(n),
    units: new Uint32Array(n),
    oos: new Uint8Array(n),
    startedMs: new Float64Array(n),
    updates: new Uint8Array(n),
  };
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    c.prod[i] = Math.floor(rand() * PRODUCTS.length);
    c.supp[i] = Math.floor(rand() * SUPPLIERS.length);
    c.ret[i] = Math.floor(rand() * RETAILERS.length);
    const cost = 15 + Math.floor(rand() * 386);
    c.cost[i] = cost + Math.floor(rand() * 1000) / 1000;
    c.price[i] = Math.round(cost * (1.12 + rand() * 1.4) * 1000) / 1000;
    c.fee[i] = Math.round(rand() * 45 * 1000) / 1000;
    c.units[i] = rand() < 0.55 ? 0 : Math.floor(rand() * 15);
    c.oos[i] = rand() < 0.45 ? 1 : 0;
    const r = rand();
    let minsAgo: number;
    if (r < 0.35) minsAgo = 1 + Math.floor(rand() * 59);
    else if (r < 0.7) minsAgo = 60 + Math.floor(rand() * 23 * 60);
    else minsAgo = 24 * 60 + Math.floor(rand() * 60 * 60);
    c.startedMs[i] = now - minsAgo * 60_000;
    c.updates[i] = rand() < 0.15 ? 1 + Math.floor(rand() * 3) : 0;
  }
  cache = c;
  return c;
}

export interface ProductSubscription {
  id: number;
  product_name: string;
  product_emoji: string;
  supplier_name: string;
  supplier_code: string;
  retailer_name: string;
  retailer_code: string;
  premium: 'crown' | 'bolt' | null;
  cost: number;
  price: number;
  profit_fee: number;
  allow_when_oos: boolean;
  price_constraint: boolean;
  units_sold: number;
  started_at: string;
  price_updates: number;
}

export interface SubscriptionsQuery {
  page: number;
  per_page: number;
  q?: string;
  products?: string[];
  suppliers?: string[];
  retailers?: string[];
  cost_min?: number;
  cost_max?: number;
  price_min?: number;
  price_max?: number;
  oos?: boolean;
  started?: 'day' | 'week' | 'month';
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface ProductSubscriptionsResult {
  rows: ProductSubscription[];
  total: number;
  filters: { suppliers: string[]; retailers: string[]; products: string[] };
  page: number;
  per_page: number;
}

const priceConstraints = new Map<number, boolean>();

function materialize(c: Cache, i: number): ProductSubscription {
  const p = PRODUCTS[c.prod[i]!]!;
  const s = SUPPLIERS[c.supp[i]!]!;
  const r = RETAILERS[c.ret[i]!]!;
  return {
    id: i + 1,
    product_name: p.name,
    product_emoji: p.emoji,
    supplier_name: s.name,
    supplier_code: s.code,
    retailer_name: r.name,
    retailer_code: r.code,
    premium: r.premium,
    cost: c.cost[i]!,
    price: c.price[i]!,
    profit_fee: c.fee[i]!,
    allow_when_oos: c.oos[i] === 1,
    price_constraint: priceConstraints.get(i + 1) ?? false,
    units_sold: c.units[i]!,
    started_at: new Date(c.startedMs[i]!).toISOString(),
    price_updates: c.updates[i]!,
  };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export interface SubscriptionPatch {
  price?: number | null;
  cost?: number | null;
  profit_fee?: number | null;
  allow_when_oos?: boolean;
  price_constraint?: boolean;
}

export function getProductSubscription(id: number): ProductSubscription | null {
  if (!Number.isInteger(id) || id < 1 || id > PRODUCT_SUBSCRIPTIONS_TOTAL) return null;
  const c = init();
  return materialize(c, id - 1);
}

export function updateProductSubscription(id: number, patch: SubscriptionPatch): ProductSubscription | null {
  if (!Number.isInteger(id) || id < 1 || id > PRODUCT_SUBSCRIPTIONS_TOTAL) return null;
  const c = init();
  const idx = id - 1;
  if (patch.price !== undefined && patch.price !== null) c.price[idx] = round3(patch.price);
  if (patch.cost !== undefined && patch.cost !== null) c.cost[idx] = round3(patch.cost);
  if (patch.profit_fee !== undefined && patch.profit_fee !== null) c.fee[idx] = round3(patch.profit_fee);
  if (patch.allow_when_oos !== undefined) c.oos[idx] = patch.allow_when_oos ? 1 : 0;
  if (patch.price_constraint !== undefined) priceConstraints.set(id, patch.price_constraint);
  c.updates[idx] = Math.min(255, c.updates[idx]! + 1);
  return materialize(c, idx);
}

export function searchProductSubscriptions(query: SubscriptionsQuery): ProductSubscriptionsResult {
  const c = init();
  const q = (query.q ?? '').trim().toLowerCase();
  const products = query.products ?? [];
  const suppliers = query.suppliers ?? [];
  const retailers = query.retailers ?? [];
  const oos = query.oos;
  const sort = query.sort ?? 'started_at';
  const dir = query.dir === 'asc' ? 1 : -1;

  const matches: number[] = [];
  for (let i = 0; i < c.cost.length; i++) {
    if (products.length && !products.includes(PRODUCTS[c.prod[i]!]!.name)) continue;
    if (suppliers.length && !suppliers.includes(SUPPLIERS[c.supp[i]!]!.name)) continue;
    if (retailers.length && !retailers.includes(RETAILERS[c.ret[i]!]!.name)) continue;
    if (query.cost_min !== undefined && c.cost[i]! < query.cost_min) continue;
    if (query.cost_max !== undefined && c.cost[i]! > query.cost_max) continue;
    if (query.price_min !== undefined && c.price[i]! < query.price_min) continue;
    if (query.price_max !== undefined && c.price[i]! > query.price_max) continue;
    if (oos !== undefined && oos === (c.oos[i] === 1)) continue;
    if (query.started === 'day' && c.startedMs[i]! < Date.now() - 24 * 3600_000) continue;
    if (query.started === 'week' && c.startedMs[i]! < Date.now() - 7 * 24 * 3600_000) continue;
    if (query.started === 'month' && c.startedMs[i]! < Date.now() - 30 * 24 * 3600_000) continue;
    if (q) {
      const p = PRODUCTS[c.prod[i]!]!;
      const s = SUPPLIERS[c.supp[i]!]!;
      const r = RETAILERS[c.ret[i]!]!;
      if (!`${p.name} ${s.name} ${r.name}`.toLowerCase().includes(q)) continue;
    }
    matches.push(i);
  }

  matches.sort((a, b) => {
    let res = 0;
    switch (sort) {
      case 'cost':
        res = c.cost[a]! - c.cost[b]!;
        break;
      case 'price':
        res = c.price[a]! - c.price[b]!;
        break;
      case 'profit_fee':
        res = c.fee[a]! - c.fee[b]!;
        break;
      case 'units_sold':
        res = c.units[a]! - c.units[b]!;
        break;
      case 'allow_when_oos':
        res = c.oos[a]! - c.oos[b]!;
        break;
      case 'product':
        res = (PRODUCTS[c.prod[a]!]!.name < PRODUCTS[c.prod[b]!]!.name ? -1 : 1);
        break;
      case 'supplier':
        res = SUPPLIERS[c.supp[a]!]!.name.localeCompare(SUPPLIERS[c.supp[b]!]!.name);
        break;
      case 'retailer':
        res = RETAILERS[c.ret[a]!]!.name.localeCompare(RETAILERS[c.ret[b]!]!.name);
        break;
      default:
        res = c.startedMs[a]! - c.startedMs[b]!;
        break;
    }
    return res * dir || a - b;
  });

  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  const pageRows = matches.slice(start, start + query.per_page).map((i) => materialize(c, i));

  return {
    rows: pageRows,
    total,
    filters: {
      suppliers: SUPPLIERS.map((s) => s.name),
      retailers: RETAILERS.map((r) => r.name),
      products: PRODUCTS.map((p) => p.name),
    },
    page: query.page,
    per_page: query.per_page,
  };
}