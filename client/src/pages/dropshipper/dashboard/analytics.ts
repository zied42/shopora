import { Order } from '../../../lib/api';

export type AnalyticsRange = '7d' | '30d' | 'all';

export const RANGE_OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

export function inRange(o: Order, range: AnalyticsRange): boolean {
  if (range === 'all') return true;
  const days = range === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 86400000;
  return new Date(o.created_at).getTime() >= cutoff;
}

export function hasProduct(o: Order, productId: number | null): boolean {
  return !productId || o.items.some((i) => i.product_id === productId);
}

export type DelivGroup = 'delivered-paid' | 'delivered-unpaid' | 'failed' | 'pending';

export interface DelivGroupMeta {
  id: DelivGroup;
  label: string;
  icon: string;
  cls: string;
}

export const DELIV_GROUPS: DelivGroupMeta[] = [
  { id: 'delivered-paid', label: 'Delivered paid', icon: '✓✓', cls: 'bg-emerald-100 text-emerald-600' },
  { id: 'delivered-unpaid', label: 'Delivered (unpaid)', icon: '✓', cls: 'bg-emerald-100 text-emerald-600' },
  { id: 'failed', label: 'Failed delivery', icon: '✕', cls: 'bg-rose-100 text-rose-600' },
  { id: 'pending', label: 'Pending', icon: '⏳', cls: 'bg-sky-100 text-sky-600' },
];

export const SHIPPED_STATUSES = ['shipped', 'delivered', 'retour', 'cancelled'];

export function groupOf(o: Order): DelivGroup {
  if (o.status === 'delivered') return o.payment_status === 'paid' ? 'delivered-paid' : 'delivered-unpaid';
  if (o.status === 'retour' || o.status === 'cancelled') return 'failed';
  return 'pending';
}

export interface DayPoint {
  day: string;
  shipments: number;
  delivered: number;
  deliveryRate: number;
}

export function dailySeries(orders: Order[], range: AnalyticsRange): DayPoint[] {
  const days = range === '7d' ? 7 : 30;
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const shipped = orders.filter((o) => new Date(o.created_at).toISOString().slice(0, 10) === key);
    const delivered = shipped.filter((o) => o.delivered_at && new Date(o.delivered_at).toISOString().slice(0, 10) === key);
    out.push({
      day: key.slice(5),
      shipments: shipped.length,
      delivered: delivered.length,
      deliveryRate: shipped.length ? Math.round((delivered.length / shipped.length) * 100) : 0,
    });
  }
  return out;
}

export const moneyNum = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);

export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);
