import { useEffect, useState } from 'react';
import { apiErrorMessage, getProductsDashboard, ProductsDashboardData, money, DashboardPeriod } from '../../lib/api';
import { Spinner } from '../../components/ui';

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

type Product = ProductsDashboardData['products'][number];

export default function ProductsDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [data, setData] = useState<ProductsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getProductsDashboard(period)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [period]);

  const sorted = data?.products ? [...data.products].sort((a, b) => b.revenue - a.revenue) : [];

  const totals = sorted.reduce(
    (acc, p) => {
      acc.revenue += p.revenue;
      acc.profit += p.profit;
      acc.qty += p.qty;
      return acc;
    },
    { revenue: 0, profit: 0, qty: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Products Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data ? `${data.period.start} – ${data.period.end}` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                period === p.id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Products" value={String(sorted.length)} />
            <StatCard label="Total Revenue" value={money(totals.revenue)} />
            <StatCard label="Total Profit" value={money(totals.profit)} />
            <StatCard label="Total Units Sold" value={String(totals.qty)} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Top Products by Revenue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Product</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Profit</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Qty Sold</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Orders</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Profit Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((p, i) => (
                    <ProductRow key={p.id} product={p} rank={i + 1} />
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                        No products for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProductRow({ product, rank }: { product: Product; rank: number }) {
  const margin = product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : '0.0';

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-5 py-3 text-sm font-medium text-slate-500">{rank}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-8 w-8 rounded object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-sm">
              &#127968;
            </span>
          )}
          <span className="text-sm font-medium text-slate-900">{product.name}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{money(product.revenue)}</td>
      <td className="px-5 py-3 text-right text-sm text-slate-900">{money(product.profit)}</td>
      <td className="px-5 py-3 text-right text-sm text-slate-900">{product.qty}</td>
      <td className="px-5 py-3 text-right text-sm text-slate-900">{product.orders}</td>
      <td className="px-5 py-3 text-right text-sm text-slate-900">{margin}%</td>
    </tr>
  );
}
