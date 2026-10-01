import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiGet, money, Order, Product } from '../../lib/api';
import { Spinner } from '../../components/ui';

const round = (n: number) => Math.round(n * 100) / 100;

interface StatusGroup {
  key: string;
  icon: string;
  label: string;
  tone: 'amber' | 'blue' | 'purple' | 'green' | 'red';
}

const STATUS_GROUPS: StatusGroup[] = [
  { key: 'pending', icon: '⏳', label: 'Awaiting confirmation', tone: 'amber' },
  { key: 'confirmed', icon: '✅', label: 'Confirmed', tone: 'blue' },
  { key: 'shipped', icon: '🚚', label: 'Shipped', tone: 'purple' },
  { key: 'delivered', icon: '🎉', label: 'Delivered', tone: 'green' },
  { key: 'retour', icon: '↩️', label: 'Retour', tone: 'red' },
  { key: 'cancelled', icon: '🚫', label: 'Cancelled', tone: 'red' },
];

const TONE_CLS: Record<StatusGroup['tone'], string> = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-sky-50 text-sky-600',
  purple: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-600',
};

const NA = <span className="text-slate-400">NA</span>;

function useSupplierStats() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productId, setProductId] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    Promise.all([apiGet<Order[]>('/orders'), apiGet<Product[]>('/products')])
      .then(([o, p]) => {
        setOrders(o);
        setProducts(p);
      })
      .catch((e) => setError(apiErrorMessage(e)));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (productId !== '' && !o.items.some((i) => i.product_id === productId)) return false;
      const t = new Date(o.created_at).getTime();
      if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    });
  }, [orders, productId, from, to]);

  const count = (pred: (o: Order) => boolean) => filtered.filter(pred).length;
  const sum = (pred: (o: Order) => boolean) => round(filtered.filter(pred).reduce((s, o) => s + Number(o.total), 0));

  return { orders, products, productId, setProductId, from, setFrom, to, setTo, filtered, error, refresh: load, count, sum };
}

export default function FourDashboard() {
  const stats = useSupplierStats();

  if (!stats.orders || !stats.products) {
    if (stats.error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{stats.error}</div>;
    return <Spinner />;
  }

  const { filtered, productId, setProductId, products, from, setFrom, to, setTo, count, sum } = stats;

  const paid = (o: Order) => o.payment_status === 'paid';
  const delivered = (o: Order) => o.status === 'delivered';
  const awaiting = (o: Order) => o.status === 'pending' || o.status === 'confirmed';

  const totalOrders = filtered.length;
  const revenuePending = round(filtered.filter((o) => !paid(o)).reduce((s, o) => s + Number(o.total), 0));
  const revenueTransferred = round(filtered.filter(paid).reduce((s, o) => s + Number(o.total), 0));

  const tableRows: { label: string; icon: string; tone: StatusGroup['tone']; count: number; pending: number; transferred: number | null }[] = [
    { label: 'Delivered paid', icon: '✅', tone: 'green', count: count(o => delivered(o) && paid(o)), pending: 0, transferred: sum((o) => delivered(o) && paid(o)) },
    { label: 'Delivered non paid', icon: '⏱️', tone: 'amber', count: count((o) => delivered(o) && !paid(o)), pending: sum((o) => delivered(o) && !paid(o)), transferred: null },
    { label: 'Pending', icon: '📦', tone: 'blue', count: count(awaiting), pending: sum(awaiting), transferred: null },
  ];

  return (
    <div>
      {/* ===== HEADER CARD ===== */}
      <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-brand-50 via-slate-50 to-transparent p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="text-lg font-bold text-slate-900">Dashboard</h5>
              <p className="text-xs text-slate-500">Select the date range of data you want to monitor</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
              </label>
              {(from || to) && (
                <button
                  type="button"
                  onClick={() => { setFrom(''); setTo(''); }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear period
                </button>
              )}
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-auto"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ===== REVENUE OVERVIEW ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h6 className="text-sm font-bold text-slate-800">💰 Revenue overview</h6>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-700">🧾</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orders</p>
                <p className="text-xl font-extrabold leading-tight text-slate-900">{totalOrders}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-600">⏳</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Revenue pending</p>
                <p className="text-xl font-extrabold leading-tight text-slate-900">{money(revenuePending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-600">💸</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Revenue transferred</p>
                <p className="text-xl font-extrabold leading-tight text-slate-900">{money(revenueTransferred)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Delivery status</th>
                  <th className="px-4 py-2.5 text-center">Orders count</th>
                  <th className="px-4 py-2.5 text-center">Revenue pending</th>
                  <th className="px-4 py-2.5 text-center">Revenue transferred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((r) => (
                  <tr key={r.label} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLS[r.tone]}`}>{r.icon}</span>
                        <span className="font-semibold text-slate-700">{r.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{r.count}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{r.transferred === null ? NA : money(r.pending)}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{r.transferred === null ? NA : money(r.transferred)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== SHIPMENT BY STATUS ===== */}
      <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h6 className="text-sm font-bold text-slate-800">🚚 Shipment by status</h6>
        </div>
        <div className="grid gap-x-6 gap-y-1 p-5 sm:grid-cols-2 md:grid-cols-3">
          {STATUS_GROUPS.map((g) => (
            <div key={g.key} className="flex items-center gap-2.5 border-b border-slate-100 py-2 last:border-0 sm:border-b">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLS[g.tone]}`}>{g.icon}</span>
              <span className="flex-1 text-sm text-slate-700">{g.label}</span>
              <b className="text-sm font-extrabold text-slate-900">{filtered.filter((o) => o.status === g.key).length}</b>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-6 text-xs text-slate-500">
        <p>
          Made for better e-commerce ❤️ <span className="mx-1 font-semibold text-slate-600">SHOPORA</span>
          <span className="hidden sm:inline">| 2026 ©</span>
        </p>
        <p>v1.0.0</p>
      </div>
    </div>
  );
}