import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Card } from './ui';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

export function RevenueChart({ data }: { data: { day: string; value: number }[] }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const axis = dark ? '#94a3b8' : '#64748b';
  const tooltip = { borderRadius: 12, border: '1px solid ' + grid, backgroundColor: dark ? '#0f172a' : '#ffffff', color: dark ? '#e2e8f0' : '#0f172a' };
  if (!data?.length) return null;
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-slate-800">Revenue — last 7 days</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: axis }} tickLine={false} axisLine={{ stroke: grid }} />
          <YAxis tick={{ fontSize: 12, fill: axis }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} contentStyle={tooltip} />
          <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: '#4f46e5' }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function StatusPie({ counts }: { counts: Record<string, number> }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const tooltip = { borderRadius: 12, border: '1px solid ' + grid, backgroundColor: dark ? '#0f172a' : '#ffffff', color: dark ? '#e2e8f0' : '#0f172a' };
  const data = Object.entries(counts ?? {}).map(([name, value]) => ({ name, value }));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-slate-800">Orders by status</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {d.name} ({d.value})
          </span>
        ))}
      </div>
    </Card>
  );
}

export function RecentOrdersTable({ orders }: { orders: { id: number; order_number: string; customer_name: string | null; total: number; status: string; payment_status: string }[] }) {
  if (!orders?.length) return null;
  return (
    <Card className="overflow-x-auto">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-800">Recent orders</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
            <th className="px-5 py-2.5">Order</th>
            <th className="px-3 py-2.5">Customer</th>
            <th className="px-3 py-2.5 text-right">Total</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-5 py-2.5 text-right">Payment</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-slate-50 last:border-0">
              <td className="px-5 py-2.5 font-mono text-xs text-brand-700">{o.order_number}</td>
              <td className="px-3 py-2.5 text-slate-700">{o.customer_name ?? '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">${Number(o.total).toFixed(2)}</td>
              <td className="px-3 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{o.status}</span></td>
              <td className="px-5 py-2.5 text-right"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{o.payment_status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function LowStockList({ items }: { items: { id: number; name: string; stock: number; image_url?: string | null }[] }) {
  if (!items?.length) return null;
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold text-slate-800">⚠️ Low stock alert</p>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
            {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
            <p className="flex-1 truncate text-sm text-slate-700">{p.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{p.stock} left</span>
          </div>
        ))}
      </div>
    </Card>
  );
}