import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Order } from '../../../lib/api';
import { Card } from '../../../components/ui';
import { AnalyticsRange, dailySeries, DELIV_GROUPS, DelivGroup, groupOf, moneyNum } from './analytics';

interface Props {
  orders: Order[];
  range: AnalyticsRange;
}

interface GroupAgg {
  count: number;
  revenue: number;
  expenses: number;
}

function Tile({ icon, label, value, sub, valueCls }: { icon: string; label: string; value: string; sub?: string; valueCls?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <span className="text-2xl text-slate-800">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`truncate text-lg font-bold text-slate-900 ${valueCls ?? ''}`}>{value}</p>
        {sub && <p className="text-[11px] font-semibold text-emerald-600">{sub}</p>}
      </div>
    </div>
  );
}

export default function OverviewTab({ orders, range }: Props) {
  const [show, setShow] = useState<Record<DelivGroup, boolean>>({
    'delivered-paid': true,
    'delivered-unpaid': true,
    failed: true,
    pending: true,
  });

  const rows = useMemo(() => {
    const agg: Record<DelivGroup, GroupAgg> = {
      'delivered-paid': { count: 0, revenue: 0, expenses: 0 },
      'delivered-unpaid': { count: 0, revenue: 0, expenses: 0 },
      failed: { count: 0, revenue: 0, expenses: 0 },
      pending: { count: 0, revenue: 0, expenses: 0 },
    };
    for (const o of orders) {
      const g = groupOf(o);
      agg[g].count += 1;
      agg[g].revenue += Number(o.total) || 0;
      agg[g].expenses += Number(o.total_cost) || 0;
    }
    return agg;
  }, [orders]);

  const totals = useMemo(() => {
    const t = { count: 0, revenue: 0, expenses: 0 };
    for (const g of DELIV_GROUPS) {
      if (!show[g.id]) continue;
      const r = rows[g.id];
      t.count += r.count;
      t.revenue += r.revenue;
      t.expenses += r.expenses;
    }
    return t;
  }, [rows, show]);

  const net = totals.revenue - totals.expenses;
  const avg = totals.count ? totals.revenue / totals.count : 0;
  const series = useMemo(() => dailySeries(orders, range), [orders, range]);

  const toggle = (g: DelivGroup) => setShow((s) => ({ ...s, [g]: !s[g] }));

  return (
    <div className="space-y-3">
      {/* Revenue overview */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Revenue overview</h6>
        </div>
        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Tile icon="📦" label="Shipments" value={String(totals.count)} sub={totals.count ? '100%' : undefined} />
            <Tile icon="🛒" label="Avg Order Value" value={moneyNum(avg)} />
            <Tile icon="💵" label="Revenue" value={moneyNum(totals.revenue)} valueCls="text-emerald-600" />
            <Tile icon="🧾" label="Expenses" value={`-${moneyNum(totals.expenses)}`} valueCls="text-amber-600" />
            <Tile icon="📈" label="Net revenue" value={moneyNum(net)} valueCls={net >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          </div>

          <p className="mb-2 mt-3 text-xs text-slate-500">Toggle rows to adjust the totals above</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2">Delivery status</th>
                  <th className="px-3 py-2 text-center">Orders count</th>
                  <th className="px-3 py-2 text-center">Revenue</th>
                  <th className="px-3 py-2 text-center">Expenses</th>
                  <th className="px-3 py-2 text-right">Net revenue</th>
                </tr>
              </thead>
              <tbody>
                {DELIV_GROUPS.map((g) => {
                  const r = rows[g.id];
                  const gNet = r.revenue - r.expenses;
                  return (
                    <tr key={g.id} className={`border-b border-slate-50 last:border-0 ${show[g.id] ? '' : 'opacity-45'}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600" checked={show[g.id]} onChange={() => toggle(g.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${g.cls}`}>{g.icon}</span>
                          <span className="text-[13px] font-medium text-slate-800">{g.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-800">{r.count}</td>
                      <td className="px-3 py-2 text-center text-emerald-600">{moneyNum(r.revenue)}</td>
                      <td className="px-3 py-2 text-center text-amber-600">-{moneyNum(r.expenses)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{moneyNum(gNet)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Performance Trends */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Performance Trends</h6>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>Shipments <span className="font-bold text-emerald-600">▲ 100%</span></span>
            <span>Delivered</span>
            <span>Delivery Rate</span>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis yAxisId="n" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Line yAxisId="n" type="monotone" dataKey="shipments" name="Shipments" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5' }} />
              <Line yAxisId="n" type="monotone" dataKey="delivered" name="Delivered" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
              <Line yAxisId="pct" type="monotone" dataKey="deliveryRate" name="Delivery Rate %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
