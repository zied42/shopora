import { mulberry32 } from './shipments';

export const BINS_INVENTORY_TOTAL = 2339;

export interface BinCatalogItem {
  id: number;
  title: string;
  dims: number[];
  image: string | null;
}

export interface BinInventoryRow {
  id: number;
  bin_id: number | null;
  bin_title: string;
  dims: number[];
  image: string | null;
  organization: { name: string; code: string };
  warehouse: string;
  available_qty: number;
}

export interface BinsInventoryQuery {
  page: number;
  per_page: number;
  q?: string;
  qte_min?: number;
  qte_max?: number;
}

export interface BinsInventoryResult {
  rows: BinInventoryRow[];
  total: number;
  page: number;
  per_page: number;
  warehouses: string[];
}

export const WAREHOUSES = ['Dépôt 1', 'Dépôt 2', 'Dépôt 3'];

export const BIN_CATALOG: BinCatalogItem[] = [
  {
    id: 5849167,
    title: '2 x Sac (couleurs aléatoire) SE 100x100cm',
    dims: [1000, 2000],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/5849167/conversions/686321384baf7-1751327032-50px-icon.jpg',
  },
  {
    id: 5849143,
    title: '3 x Sac (couleurs aléatoire) SE 100x100cm',
    dims: [1000, 3000],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/5849143/conversions/6863205d16137-1751326813-50px-icon.jpg',
  },
  {
    id: 1989,
    title: "Sac d'expedition Gris / Sans pochette SE 60x70cm",
    dims: [700, 600],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/1989/conversions/64396f6bc3596-50px-icon.jpg',
  },
  {
    id: 2360,
    title: "Sac d'expedition opaque + pochette SE 50x60",
    dims: [600, 500],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/2360/conversions/6449502d77226-1682526253-50px-icon.jpg',
  },
  {
    id: 2361,
    title: "Sac d'expedition opaque + pochette SE 40x50",
    dims: [500, 400],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/2361/conversions/6449503de84cf-1682526269-50px-icon.jpg',
  },
  {
    id: 1919,
    title: "Sac d'expedition opaque + pochette SE 30x40",
    dims: [400, 300],
    image: 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/1919/conversions/6437216ecba49-50px-icon.jpg',
  },
];

export const NO_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg';

const ORG_POOL = [
  'Design & wear supply',
  'Jamil design workshop',
  'Sté Al rahma',
  'Espace nissem',
  'naoufel store',
  'Jomla Pro',
  'UB tech',
  'WIXI TN',
  'La perla home',
  'Maison Du Gadget',
  'Sotraleg',
  'Beauty Lab',
  'Verre & Déco',
  'Atelier Cuir',
  'Pep Electronics',
  'Tunisian Market',
  'Bio Terre',
  'Textile Nord',
  'Sfax Import',
  'GDH Distribution',
];

const CHAR_POOL = 'abcdefghijklmnopqrstuvwxyz1234567890';
const NO_BIN_DIMS = [9999999, 9999999, 9999999];

function buildAt(i: number): BinInventoryRow {
  const rand = mulberry32(20260825 + i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] ?? arr[0]!;

  const fromCatalog = rand() < 0.68;
  const cat = fromCatalog ? pick(BIN_CATALOG) : null;
  const binTitle = cat ? `${cat.dims.length}x ${cat.title}` : 'No Bin';
  const dims = cat ? cat.dims : NO_BIN_DIMS;

  let code = '';
  const len = 16;
  for (let c = 0; c < len; c++) code += CHAR_POOL[Math.floor(rand() * CHAR_POOL.length)]!;

  const warehouseRoll = rand();
  const warehouse = warehouseRoll < 0.78 ? 'Dépôt 1' : warehouseRoll < 0.9 ? 'Dépôt 2' : 'Dépôt 3';

  const available_qty = rand() < 0.12 ? 999999 : Math.floor(rand() * 1201);

  return {
    id: i + 1,
    bin_id: cat ? cat.id : null,
    bin_title: binTitle,
    dims,
    image: cat ? cat.image : null,
    organization: { name: pick(ORG_POOL), code },
    warehouse,
    available_qty,
  };
}

let cache: BinInventoryRow[] | null = null;

function allRows(): BinInventoryRow[] {
  if (cache) return cache;
  const rows: BinInventoryRow[] = [];
  for (let i = 0; i < BINS_INVENTORY_TOTAL; i++) rows.push(buildAt(i));
  cache = rows;
  return rows;
}

export function searchBinsInventories(query: BinsInventoryQuery): BinsInventoryResult {
  const rows = allRows();
  const q = (query.q ?? '').trim().toLowerCase();
  const min = query.qte_min;
  const max = query.qte_max;

  const matches: BinInventoryRow[] = [];
  for (const r of rows) {
    if (min != null && r.available_qty < min) continue;
    if (max != null && r.available_qty > max) continue;
    if (q) {
      const hay = `${r.bin_title} ${r.organization.name} ${r.warehouse} ${r.organization.code}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    matches.push(r);
  }

  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  return {
    rows: matches.slice(start, start + query.per_page),
    total,
    page: query.page,
    per_page: query.per_page,
    warehouses: [...WAREHOUSES],
  };
}

export function getBinsCatalog(): { catalog: BinCatalogItem[]; warehouses: string[] } {
  return { catalog: BIN_CATALOG, warehouses: [...WAREHOUSES] };
}