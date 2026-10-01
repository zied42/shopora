import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, getStockingDashboard, money, OrderPickStatus } from '../../lib/api';
import type { StockingDashboard as StockingDashboardData } from '../../lib/api';
import { Card, PageHeader, Spinner, StatCard } from '../../components/ui';

const STATUS_LABEL: Record<OrderPickStatus, string> = {
  unconfirmed: 'Unconfirmed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
  return: 'Return',
};

const STATUS_TONE: Record<OrderPickStatus, 'amber' | 'blue' | 'green' | 'red' | 'purple'> = {
  unconfirmed: 'amber',
  confirmed: 'blue',
  shipped: 'green',
  cancelled: 'red',
  return: 'purple',
};

const STATUS_ORDER: OrderPickStatus[] = ['unconfirmed', 'confirmed', 'shipped', 'return', 'cancelled'];

export default function StockingDashboard() {
  const [data, setData] = useState<StockingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockingDashboard()
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) return <div className="py-20 text-center"><Spinner /></div>;
  if (!data) return null;

  const handled = data.flow.confirmed + data.flow.shipped;
  const returnRate = handled > 0 ? Math.round((data.flow.returnCount / (handled + data.flow.returnCount)) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stocking Dashboard"
        subtitle="Overview of commandes confirmed, shipped and returned by your account"
      />

      {/* Key numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commandes scanned" value={data.picks.total ?? 0} icon="🧾" accent="indigo" />
        <StatCard label="Confirmed" value={handled} icon="✅" accent="blue" />
        <StatCard label="Shipped" value={data.flow.shipped} icon="🚚" accent="green" />
        <StatCard label="Returned" value={data.flow.returnCount} icon="↩️" accent="purple" />
      </div>

      {/* Commandes by status */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Orders by status</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STATUS_ORDER.map((s) => {
              const count = data.picks[s] ?? 0;
              const total = Math.max(1, data.picks.total ?? 0);
              const pct = Math.round((count / total) * 100);
              const tone = STATUS_TONE[s];
              const ring = { amber: 'bg-amber-500', blue: 'bg-sky-500', green: 'bg-emerald-500', red: 'bg-rose-500', purple: 'bg-violet-500' }[tone];
              return (
                <div key={s} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">{STATUS_LABEL[s]}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${ring}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Refills */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Stock refills</h3>
            <Link to="/stocking/stock-refill-requests" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{data.refill.total}</p>
                <p className="text-xs text-slate-500">Requests</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{data.refill.pickupSuppliers}</p>
                <p className="text-xs text-slate-500">Suppliers</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{data.refill.totalQtyToRequest}</p>
                <p className="text-xs text-slate-500">Qty to request</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Returns & exchanges */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Returns & exchange rate</h3>
            <Link to="/stocking/stock-returns" className="text-xs font-semibold text-brand-600 hover:underline">View returns</Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{data.delivery.exchanges}</p>
                <p className="text-xs text-slate-500">Exchanged</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{data.returns.pendingUnits}</p>
                <p className="text-xs text-slate-500">Units to store</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{returnRate}%</p>
                <p className="text-xs text-slate-500">Return rate</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent scans */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Recent scans</h3>
          <Link to="/stocking/picks" className="text-xs font-semibold text-brand-600 hover:underline">View all picks</Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No scans yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Dropshipper</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map((r) => (
                  <tr key={r.order_number} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-800">{r.order_number}</td>
                    <td className="px-5 py-3 text-slate-600">{r.dropshipper_name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        { amber: 'bg-amber-50 text-amber-700 ring-amber-200', blue: 'bg-sky-50 text-sky-700 ring-sky-200', green: 'bg-emerald-50 text-emerald-700 ring-emerald-200', red: 'bg-rose-50 text-rose-700 ring-rose-200', purple: 'bg-violet-50 text-violet-700 ring-violet-200' }[STATUS_TONE[r.status]]
                      }`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-700">{money(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
