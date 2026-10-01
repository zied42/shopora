import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, apiGet, money, PlatformEarnings, timeFmt } from '../../lib/api';
import { DashboardLoader, useDashboard } from '../../hooks/useDashboard';
import { Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';
import { LowStockList, RecentOrdersTable, RevenueChart, StatusPie } from '../../components/Charts';

export default function AdminDashboard() {
  const { refresh } = useDashboard();
  const [platform, setPlatform] = useState<PlatformEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PlatformEarnings>('/chef/platform-earnings')
      .then(setPlatform)
      .catch((e) => console.warn(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview" actions={<button onClick={refresh} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Refresh</button>} />

      <DashboardLoader>
        {(d) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Revenue (paid)" value={money(d.totals.revenue ?? 0)} accent="green" icon="💰" />
              <StatCard label="Platform profit (3% of delivered)" value={money(platform?.total ?? 0)} accent="indigo" icon="📈" />
              <StatCard label="Orders" value={d.totals.orders ?? 0} accent="blue" icon="🧾" />
              <StatCard label="Pending orders" value={d.totals.pendingOrders ?? 0} accent="amber" icon="⏳" />
              <StatCard label="Products" value={d.totals.products ?? 0} accent="purple" icon="📦" />
              <StatCard label="Users" value={d.totals.users ?? 0} accent="slate" icon="👥" />
              <StatCard label="Customers" value={d.totals.customers ?? 0} accent="emerald" icon="🛍️" />
              <StatCard label="Sellers" value={d.totals.sellers ?? 0} accent="sky" icon="🏭" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RevenueChart data={d.revenueByDay ?? []} />
              </div>
              <StatusPie counts={d.statusCounts ?? {}} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentOrdersTable orders={d.recentOrders ?? []} />
              </div>
              <LowStockList items={d.lowStock ?? []} />
            </div>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Platform earnings — 3% of every delivered order</h3>
                {loading ? (
                  <Spinner />
                ) : (
                  <span className="text-xs text-slate-400">{platform?.orders.length ?? 0} delivered commandes</span>
                )}
              </div>
              {!platform || platform.orders.length === 0 ? (
                <EmptyState icon="💸" title="No platform earnings yet" hint="Once commandes are delivered, the 3% share of each one will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">Order</th>
                        <th className="py-2 pr-3">Dropshipper</th>
                        <th className="py-2 pr-3 text-right">Total</th>
                        <th className="py-2 pr-3 text-right">Platform 3%</th>
                        <th className="py-2">Delivered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platform.orders.map((o) => (
                        <tr key={o.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                          <td className="py-2 pr-3 text-slate-600">{o.dropshipper_name}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{money(o.total)}</td>
                          <td className="py-2 pr-3 text-right font-semibold tabular-nums text-brand-600">{money(o.commission)}</td>
                          <td className="py-2 text-slate-500">{o.delivered_at ? timeFmt(o.delivered_at) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <p className="text-sm text-slate-500">
              Quick links: <Link className="text-brand-600 hover:underline" to="/admin/users">Users</Link> ·{' '}
              <Link className="text-brand-600 hover:underline" to="/admin/products">Products</Link> ·{' '}
              <Link className="text-brand-600 hover:underline" to="/admin/orders">Orders</Link> ·{' '}
              <Link className="text-brand-600 hover:underline" to="/admin/support">Support</Link>
            </p>
          </div>
        )}
      </DashboardLoader>
    </div>
  );
}
