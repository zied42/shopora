import { at } from './shipments';

export const PACKING_BINS_TOTAL = 23;

export type PackingBinType = 'box' | 'flatpolybag' | 'crate' | 'container' | 'pallet' | 'vehicle';

export interface PackingBin {
  id: number;
  name: string;
  reference: string;
  price: number;
  cost: number;
  type: PackingBinType;
  created_at: string;
  image: string | null;
  active: boolean;
}

export interface PackingBinsQuery {
  page: number;
  per_page: number;
  q?: string;
}

export interface PackingBinsResult {
  rows: PackingBin[];
  total: number;
  page: number;
  per_page: number;
}

const IMG = (folder: number | string, file: string) =>
  `https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/bins/${folder}/conversions/${file}-50px-icon.jpg`;

const BINS: PackingBin[] = [
  {
    id: 275,
    name: '2 x Sac (couleurs aléatoire) SE 100x100cm',
    reference: '200 x 100',
    price: 3.3,
    cost: 2.4,
    type: 'flatpolybag',
    created_at: at(0, 10, 15),
    image: IMG(5849167, '686321384baf7-1751327032'),
    active: true,
  },
  {
    id: 274,
    name: '3 x Sac (couleurs aléatoire) SE 100x100cm',
    reference: '300 x 100',
    price: 4.9,
    cost: 3.6,
    type: 'flatpolybag',
    created_at: at(0, 10, 12),
    image: IMG(5849143, '6863205d16137-1751326813'),
    active: true,
  },
  {
    id: 22,
    name: "Sac d'expedition Gris / Sans pochette SE 60x70cm",
    reference: 'sesp 60 x 70cm',
    price: 1.274,
    cost: 0.98,
    type: 'flatpolybag',
    created_at: at(0, 9, 58),
    image: IMG(1989, '64396f6bc3596'),
    active: true,
  },
  {
    id: 21,
    name: "Sac d'expedition opaque + pochette SE 50x60",
    reference: 'seop 50 x 60',
    price: 1.248,
    cost: 0.96,
    type: 'flatpolybag',
    created_at: at(0, 9, 55),
    image: IMG(2360, '6449502d77226-1682526253'),
    active: true,
  },
  {
    id: 20,
    name: "Sac d'expedition opaque + pochette SE 40x50",
    reference: 'seop 40 x 50',
    price: 0.871,
    cost: 0.67,
    type: 'flatpolybag',
    created_at: at(0, 9, 51),
    image: IMG(2361, '6449503de84cf-1682526269'),
    active: true,
  },
  {
    id: 19,
    name: "Sac d'expedition opaque + pochette SE 30x40",
    reference: 'seop 30 x 40',
    price: 0.56,
    cost: 0.43,
    type: 'flatpolybag',
    created_at: at(0, 9, 47),
    image: IMG(1919, '6437216ecba49'),
    active: true,
  },
  {
    id: 18,
    name: "Sac d'expedition opaque + pochette SE 24x30",
    reference: 'seop 24 x 30',
    price: 0.39,
    cost: 0.3,
    type: 'flatpolybag',
    created_at: at(0, 9, 44),
    image: IMG(1918, '6437215ae2363'),
    active: true,
  },
  {
    id: 16,
    name: 'Carton DD 35x30.5x20',
    reference: '35x30.5x20',
    price: 1.9,
    cost: 1.69,
    type: 'box',
    created_at: at(0, 9, 40),
    image: IMG(1942, '64382a2007384'),
    active: true,
  },
  {
    id: 15,
    name: 'Carton DD 47x31x24',
    reference: '47x31x24',
    price: 2.3,
    cost: 2.1,
    type: 'box',
    created_at: at(0, 9, 36),
    image: IMG(1941, '64382a04ceaf4'),
    active: true,
  },
  {
    id: 14,
    name: 'Carton DD 29.5x21x31.5',
    reference: '29.5x21x31.5',
    price: 1.25,
    cost: 1.06,
    type: 'box',
    created_at: at(0, 9, 32),
    image: IMG(1945, '64382a5841cd5'),
    active: true,
  },
  {
    id: 13,
    name: 'Carton DD 54x38x38',
    reference: '54x38x38',
    price: 2.9,
    cost: 2.6,
    type: 'box',
    created_at: at(0, 9, 28),
    image: IMG(1946, '64382a6f0b4e1'),
    active: true,
  },
  {
    id: 12,
    name: 'Carton DD 40x40x40',
    reference: '40x40x40',
    price: 2.45,
    cost: 2.2,
    type: 'box',
    created_at: at(0, 9, 24),
    image: IMG(1947, '64382a7f7a3c2'),
    active: true,
  },
  {
    id: 11,
    name: 'Carton DD 60x40x40',
    reference: '60x40x40',
    price: 3.1,
    cost: 2.8,
    type: 'box',
    created_at: at(0, 9, 20),
    image: IMG(1948, '64382a907b3d3'),
    active: true,
  },
  {
    id: 10,
    name: "Sac d'expedition opaque + pochette SE 20x30",
    reference: 'seop 20 x 30',
    price: 0.31,
    cost: 0.24,
    type: 'flatpolybag',
    created_at: at(0, 9, 16),
    image: IMG(2399, '64496f7b5a9e4'),
    active: true,
  },
  {
    id: 9,
    name: "Sac d'expedition opaque + pochette SE 12x22",
    reference: 'seop 12 x 22',
    price: 0.24,
    cost: 0.18,
    type: 'flatpolybag',
    created_at: at(0, 9, 12),
    image: IMG(2398, '64496f6c4a8f5'),
    active: true,
  },
  {
    id: 8,
    name: "Sac d'expedition transparent SE 30x40",
    reference: 'setr 30 x 40',
    price: 0.48,
    cost: 0.36,
    type: 'flatpolybag',
    created_at: at(0, 9, 8),
    image: IMG(2397, '64496f5b3a9f6'),
    active: true,
  },
  {
    id: 7,
    name: 'Carton DD 30x22x15',
    reference: '30x22x15',
    price: 1.1,
    cost: 0.92,
    type: 'box',
    created_at: at(0, 9, 4),
    image: IMG(1949, '64382ab12c4c7'),
    active: true,
  },
  {
    id: 6,
    name: 'Vrac Sac 90x120cm',
    reference: 'vrac 90 x 120',
    price: 2.1,
    cost: 1.7,
    type: 'flatpolybag',
    created_at: at(0, 9, 0),
    image: IMG(2400, '64496f8c0c1c8'),
    active: true,
  },
  {
    id: 5,
    name: 'Enveloppe bulle 24x32.5',
    reference: 'env 24 x 32.5',
    price: 0.68,
    cost: 0.52,
    type: 'flatpolybag',
    created_at: at(1, 8, 0),
    image: IMG(2401, '64496f9d1d1d9'),
    active: true,
  },
  {
    id: 4,
    name: 'Carton DD 50x40x30',
    reference: '50x40x30',
    price: 2.7,
    cost: 2.4,
    type: 'box',
    created_at: at(1, 7, 30),
    image: IMG(1950, '64382ac22d2e0'),
    active: true,
  },
  {
    id: 3,
    name: 'Caisse plastique 60x40x30',
    reference: 'cp 60x40x30',
    price: 6.5,
    cost: 5.4,
    type: 'crate',
    created_at: at(1, 7, 0),
    image: IMG(2402, '64496fae3e3f1'),
    active: false,
  },
  {
    id: 2,
    name: 'Palette Euro 120x80',
    reference: 'euro pallet',
    price: 12.0,
    cost: 9.5,
    type: 'pallet',
    created_at: at(1, 6, 30),
    image: IMG(2403, '64496fbf4f4f2'),
    active: false,
  },
  {
    id: 1,
    name: 'Container 20ft',
    reference: 'container 20ft',
    price: 180.0,
    cost: 150.0,
    type: 'container',
    created_at: at(1, 6, 0),
    image: IMG(2404, '64496fc0505f3'),
    active: false,
  },
];

let cache: PackingBin[] | null = null;

function allBins(): PackingBin[] {
  if (cache) return cache;
  const rows = [...BINS].sort((a, b) => b.id - a.id);
  cache = rows;
  return rows;
}

export function searchPackingBins(query: PackingBinsQuery): PackingBinsResult {
  const rows = allBins();
  const q = (query.q ?? '').trim().toLowerCase();
  const matches: PackingBin[] = [];
  for (const r of rows) {
    if (q) {
      const hay = `${r.name} ${r.reference} ${r.type}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    matches.push(r);
  }
  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  return { rows: matches.slice(start, start + query.per_page), total, page: query.page, per_page: query.per_page };
}

export const PACKING_BIN_TYPES: { value: PackingBinType; label: string }[] = [
  { value: 'box', label: 'Box' },
  { value: 'flatpolybag', label: 'Flat poly bag' },
  { value: 'crate', label: 'Crate' },
  { value: 'container', label: 'Container' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'vehicle', label: 'Vehicle' },
];