import { at, codeFor, mulberry32, pad, FULFILLERS, WAREHOUSES, SUPPLIERS } from './shipments';

export interface Manifest {
  id: number;
  gid: string;
  manifest_ref: string;
  fulfiller_name: string;
  fulfiller_code: string;
  carrier_logo: string;
  warehouse: string;
  supplier_name: string | null;
  delivery_company: string | null;
  /** Local date string like `2026-08-19`. */
  date: string;
  status: 'not_uploaded';
  shipments: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DELIVERY_COMPANIES = ['aram', 'first', 'xdelivery', 'goodex', 'jax', 'intigo'];

export function buildManifests(): Manifest[] {
  const rand = mulberry32(20260819);
  const list: Manifest[] = [];
  const count = 6518;
  const carriers = ['aram', 'shipper', 'intigo', 'xdelivery', 'first', 'abm', 'jax', 'goodex'];

  for (let i = 0; i < count; i++) {
    const fulfiller = FULFILLERS[Math.floor(rand() * FULFILLERS.length)] ?? FULFILLERS[0]!;
    const dayAgo = Math.floor(i / 600);
    list.push({
      id: 6624 - i,
      gid: String(6624 - i),
      manifest_ref: String(1000 + Math.floor(rand() * 9000)),
      fulfiller_name: fulfiller,
      fulfiller_code: codeFor('man_' + fulfiller),
      carrier_logo: carriers[Math.floor(rand() * carriers.length)]!,
      warehouse: WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)]!,
      supplier_name: SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)] ?? null,
      delivery_company: DELIVERY_COMPANIES[Math.floor(rand() * DELIVERY_COMPANIES.length)] ?? null,
      date: formatDate(at(dayAgo, 10, 30)),
      status: 'not_uploaded',
      shipments: 1 + Math.floor(rand() * 500),
    });
  }

  list.sort((a, b) => b.id - a.id);
  return list;
}