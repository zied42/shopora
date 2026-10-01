import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Order, dateFmt } from '../../../lib/api';
import { Badge, Card } from '../../../components/ui';
import { orderStatusTone } from '../../../components/ui';
import { AnalyticsRange, dailySeries, moneyNum } from './analytics';

type Filter = 'all' | 'delivered' | 'transit' | 'failed' | 'pending';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All orders' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'transit', label: 'In transit' },
  { id: 'failed', label: 'Failed delivery' },
  { id: 'pending', label: 'Pending' },
];

function MiniStat({ label, value, tone, icon, sub }: { label: string; value: number; tone: string; icon: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-[11px] font-semibold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function DeliveryTab({ orders, range }: { orders: Order[]; range: AnalyticsRange }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const series = useMemo(() => dailySeries(orders, range), [orders, range]);

  const stats = useMemo(
    () => ({
      delivered: orders.filter((o) => o.status === 'delivered').length,
      inTransit: orders.filter((o) => o.status === 'shipped').length,
      failed: orders.filter((o) => o.status === 'retour' || o.status === 'cancelled').length,
      pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
    }),
    [orders]
  );

  const total = orders.length;
  const segments = [
    { label: 'Delivered', value: stats.delivered, cls: 'bg-emerald-500', legend: 'bg-emerald-500' },
    { label: 'In transit', value: stats.inTransit, cls: 'bg-sky-500', legend: 'bg-sky-500' },
    { label: 'Failed delivery', value: stats.failed, cls: 'bg-rose-500', legend: 'bg-rose-500' },
    { label: 'Pending', value: stats.pending, cls: 'bg-amber-500', legend: 'bg-amber-500' },
  ];

  const rows = useMemo(() => {
    let list = orders;
    if (filter === 'delivered') list = list.filter((o) => o.status === 'delivered');
    if (filter === 'transit') list = list.filter((o) => o.status === 'shipped');
    if (filter === 'failed') list = list.filter((o) => o.status === 'retour' || o.status === 'cancelled');
    if (filter === 'pending') list = list.filter((o) => o.status === 'pending' || o.status === 'confirmed');
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((o) => {
        const last = o.tracking[o.tracking.length - 1];
        return [o.order_number, o.customer_name, o.city, o.governorate, last?.tracking_number, last?.carrier]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(qq);
      });
    }
    return list;
  }, [orders, filter, q]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Delivered" value={stats.delivered} icon="✅" tone="bg-emerald-100 text-emerald-600" sub={total ? `${Math.round((stats.delivered / total) * 100)}% of orders` : undefined} />
        <MiniStat label="In transit" value={stats.inTransit} icon="🚚" tone="bg-sky-100 text-sky-600" sub="currently being shipped" />
        <MiniStat label="Failed delivery" value={stats.failed} icon="⚠️" tone="bg-rose-100 text-rose-600" sub="returned or cancelled" />
        <MiniStat label="Pending" value={stats.pending} icon="⏳" tone="bg-amber-100 text-amber-600" sub="awaiting confirmation / shipment" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Delivery mix</h6>
        </div>
        <div className="p-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {segments.map((s) => (
              <div key={s.label} className={`${s.cls} h-full`} style={{ width: total ? `${(s.value / total) * 100}%` : 0 }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {segments.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${s.legend}`} />
                {s.label} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Delivery Performance</h6>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Delivery Rate <span className="font-bold text-emerald-600">{total ? `${Math.round((stats.delivered / total) * 100)}%` : '—'}</span>
            </span>
            <span className="text-slate-400">·</span>
            <span>Delivered</span>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis yAxisId="n" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Line yAxisId="n" type="monotone" dataKey="delivered" name="Delivered" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
              <Line yAxisId="pct" type="monotone" dataKey="deliveryRate" name="Delivery Rate %" stroke="#4f46e5" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Orders</h6>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order, customer, city, tracking…"
              className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
            />
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    filter === f.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Order</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">City</th>
                <th className="px-3 py-2.5">Carrier</th>
                <th className="px-3 py-2.5">Tracking</th>
                <th className="px-3 py-2.5">Shipped</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No orders match the current filters
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const last = o.tracking[o.tracking.length - 1];
                return (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{o.order_number}</td>
                    <td className="px-3 py-2.5 text-slate-700">{o.customer_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{o.city ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{last?.carrier ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{last?.tracking_number ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{o.shipped_at ? dateFmt(o.shipped_at) : '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-800">{moneyNum(o.total)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
