import { useMemo, useState } from 'react';
import { Order, dateFmt } from '../../../lib/api';
import { Badge, Card } from '../../../components/ui';
import { orderStatusTone } from '../../../components/ui';

interface Props {
  orders: Order[];
}

type Filter = 'all' | 'awaiting' | 'confirmed' | 'shipped';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'Awaiting stock' },
  { id: 'confirmed', label: 'Stock confirmed' },
  { id: 'shipped', label: 'Shipped' },
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

export default function InternalConfirmationTab({ orders }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const stats = useMemo(
    () => ({
      awaiting: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length,
    }),
    [orders]
  );

  const rows = useMemo(() => {
    let list = orders;
    if (filter === 'awaiting') list = list.filter((o) => o.status === 'pending');
    if (filter === 'confirmed') list = list.filter((o) => o.status === 'confirmed');
    if (filter === 'shipped') list = list.filter((o) => o.status === 'shipped' || o.status === 'delivered');
    const qq = q.trim().toLowerCase();
    if (qq) list = list.filter((o) => [o.order_number, o.customer_name, o.city].filter(Boolean).join(' ').toLowerCase().includes(qq));
    const rank = (s: string) => (s === 'pending' ? 0 : s === 'confirmed' ? 1 : 2);
    return [...list].sort((a, b) => rank(a.status) - rank(b.status));
  }, [orders, filter, q]);

  const coverage = useMemo(() => {
    const totalUnits = orders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0);
    const houseUnits = orders.reduce((s, o) => s + o.items.reduce((x, i) => x + (i.house_qty ?? 0), 0), 0);
    const supplierUnits = orders.reduce((s, o) => s + o.items.reduce((x, i) => x + (i.supplier_qty ?? 0), 0), 0);
    return { totalUnits, houseUnits, supplierUnits, covered: houseUnits + supplierUnits };
  }, [orders]);

  const coveragePct = coverage.totalUnits ? Math.min(100, Math.round((coverage.covered / coverage.totalUnits) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <MiniStat label="Awaiting stock" value={stats.awaiting} icon="🔍" tone="bg-amber-100 text-amber-600" sub="need internal review" />
        <MiniStat label="Stock confirmed" value={stats.confirmed} icon="✅" tone="bg-sky-100 text-sky-600" sub="ready to ship" />
        <MiniStat label="Shipped / delivered" value={stats.shipped} icon="🚚" tone="bg-emerald-100 text-emerald-600" sub="left the dropshipper" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Stock coverage</h6>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="bg-sky-500" style={{ width: `${coverage.totalUnits ? (coverage.houseUnits / coverage.totalUnits) * 100 : 0}%` }} />
              <div className="bg-amber-400" style={{ width: `${coverage.totalUnits ? (coverage.supplierUnits / coverage.totalUnits) * 100 : 0}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> House stock ({coverage.houseUnits} units)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Supplier stock ({coverage.supplierUnits} units)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Missing ({coverage.totalUnits - coverage.covered} units)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-slate-900">{coverage.totalUnits ? `${coveragePct}%` : '—'}</p>
            <p className="text-xs font-medium text-slate-500">of {coverage.totalUnits} units covered</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h6 className="text-sm font-bold text-slate-800">Internal Confirmation</h6>
            <p className="mt-0.5 text-xs text-slate-500">Stock coverage is reviewed internally before each order is shipped — house stock is used first, the rest is sourced from suppliers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order, customer, city…"
              className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
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
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Order</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">House</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Stock coverage</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    No orders match the current filters
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const qty = o.items.reduce((s, i) => s + i.quantity, 0);
                const house = o.items.reduce((s, i) => s + (i.house_qty ?? 0), 0);
                const supplier = o.items.reduce((s, i) => s + (i.supplier_qty ?? 0), 0);
                const covered = house + supplier;
                const pct = qty ? Math.min(100, Math.round((covered / qty) * 100)) : 0;
                return (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{o.order_number}</td>
                    <td className="px-3 py-2.5 text-slate-700">{o.customer_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{qty} units</td>
                    <td className="px-3 py-2.5 text-slate-600">{house}</td>
                    <td className="px-3 py-2.5 text-slate-600">{supplier}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${pct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{dateFmt(o.created_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-800">{Number(o.total).toFixed(2)} TND</td>
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
