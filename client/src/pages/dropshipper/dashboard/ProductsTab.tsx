import { useMemo, useState } from 'react';
import { Order } from '../../../lib/api';
import { Card } from '../../../components/ui';
import { DELIV_GROUPS, DelivGroup, groupOf, moneyNum, pct, SHIPPED_STATUSES } from './analytics';

interface Props {
  orders: Order[];
}

interface ProdStat {
  product_id: number;
  name: string;
  image: string | null;
  leads: number;
  shippedOrders: number;
  deliveredOrders: number;
  shipped: number;
  delivered: number;
  inTransit: number;
  returning: number;
  returned: number;
  revenue: number;
  cost: number;
}

function Rate({ p }: { p: number | null }) {
  if (p === null) return <span className="text-slate-400">-</span>;
  return <span className={`font-bold ${p >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{p}%</span>;
}

export default function ProductsTab({ orders }: Props) {
  const [include, setInclude] = useState<Record<DelivGroup, boolean>>({
    'delivered-paid': true,
    'delivered-unpaid': true,
    failed: true,
    pending: true,
  });
  const [excludeDup, setExcludeDup] = useState(false);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const included = orders.filter((o) => include[groupOf(o)]);
    const map = new Map<number, ProdStat>();
    for (const o of included) {
      for (const it of o.items) {
        let r = map.get(it.product_id);
        if (!r) {
          r = {
            product_id: it.product_id,
            name: it.product_name,
            image: it.product_image,
            leads: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            shipped: 0,
            delivered: 0,
            inTransit: 0,
            returning: 0,
            returned: 0,
            revenue: 0,
            cost: 0,
          };
          map.set(it.product_id, r);
        }
        r.leads += 1;
        r.revenue += (it.price || 0) * it.quantity;
        r.cost += (it.cost || 0) * it.quantity;
        if (SHIPPED_STATUSES.includes(o.status)) {
          r.shipped += it.quantity;
          r.shippedOrders += 1;
        }
        if (o.status === 'delivered') {
          r.delivered += it.quantity;
          r.deliveredOrders += 1;
        }
        if (o.status === 'shipped') r.inTransit += it.quantity;
        if (o.status === 'retour') r.returning += it.quantity;
        if (o.status === 'cancelled') r.returned += it.quantity;
      }
    }
    let list = Array.from(map.values());
    if (excludeDup) {
      const seen = new Set<string>();
      list = list.filter((r) => {
        const key = r.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return list.sort((a, b) => b.leads - a.leads);
  }, [orders, include, excludeDup]);

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(qq));
  }, [rows, q]);

  const summary = useMemo(() => {
    const products = rows.length;
    const leads = rows.reduce((s, r) => s + r.leads, 0);
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const shipped = rows.reduce((s, r) => s + r.shipped, 0);
    const delivered = rows.reduce((s, r) => s + r.delivered, 0);
    return { products, leads, revenue, net: revenue - cost, deliveryRate: pct(delivered, shipped) };
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-600">🛍️</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Products</p>
            <p className="text-xl font-bold text-slate-900">{summary.products}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg text-sky-600">🎯</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Leads</p>
            <p className="text-xl font-bold text-slate-900">{summary.leads}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-600">💵</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Net revenue</p>
            <p className="text-xl font-bold text-slate-900">{moneyNum(summary.net)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-600">📦</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Delivery rate</p>
            <p className="text-xl font-bold text-slate-900">{summary.deliveryRate === null ? '—' : `${summary.deliveryRate}%`}</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Product Performance</h6>
          <div className="flex flex-wrap items-center gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product…"
              className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
            />
            <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-800">Include:</span>
            {DELIV_GROUPS.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-center gap-1 text-xs text-slate-800">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600" checked={include[g.id]} onChange={() => setInclude((s) => ({ ...s, [g.id]: !s[g.id] }))} />
                {g.label}
              </label>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600" checked={excludeDup} onChange={(e) => setExcludeDup(e.target.checked)} />
            Exclude duplicate &amp; wrong number
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <th className="whitespace-nowrap px-4 py-2.5">Product</th>
              <th className="whitespace-nowrap px-3 py-2.5">Leads</th>
              <th className="whitespace-nowrap px-3 py-2.5">Shipped</th>
              <th className="whitespace-nowrap px-3 py-2.5">Delivered</th>
              <th className="whitespace-nowrap px-3 py-2.5">In Transit</th>
              <th className="whitespace-nowrap px-3 py-2.5">Returning</th>
              <th className="whitespace-nowrap px-3 py-2.5">Returned</th>
              <th className="whitespace-nowrap px-3 py-2.5">Confirmation</th>
              <th className="whitespace-nowrap px-3 py-2.5">Delivery Rate</th>
              <th className="whitespace-nowrap px-3 py-2.5">Conversion</th>
              <th className="whitespace-nowrap px-3 py-2.5">Revenue</th>
              <th className="whitespace-nowrap px-3 py-2.5">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-400">
                  No orders for the selected filters
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.product_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center whitespace-nowrap">
                    {r.image ? (
                      <img src={r.image} alt="" className="mr-2 h-8 w-8 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">📦</span>
                    )}
                    <span className="font-semibold text-slate-800">{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-800">{r.leads}</div>
                  <div className="text-[11px] text-slate-400">orders</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-800">{r.shipped}</div>
                  <div className="text-[11px] text-slate-400">{r.shipped} units</div>
                </td>
                <td className="px-3 py-2.5 text-emerald-600">
                  <div className="font-semibold">{r.delivered}</div>
                  <div className="text-[11px]">{r.delivered} units</div>
                </td>
                <td className="px-3 py-2.5 text-sky-600">
                  <div className="font-semibold">{r.inTransit}</div>
                  <div className="text-[11px]">{r.inTransit} units</div>
                </td>
                <td className="px-3 py-2.5 text-amber-600">
                  <div className="font-semibold">{r.returning}</div>
                  <div className="text-[11px]">{r.returning} units</div>
                </td>
                <td className="px-3 py-2.5 text-rose-600">
                  <div className="font-semibold">{r.returned}</div>
                  <div className="text-[11px]">{r.returned} units</div>
                </td>
                <td className="px-3 py-2.5 text-slate-400">-</td>
                <td className="px-3 py-2.5">
                  <div>
                    <Rate p={pct(r.deliveredOrders, r.shippedOrders)} /> <span className="text-[11px] text-slate-400">overall</span>
                  </div>
                  <div>
                    <Rate p={pct(r.delivered, r.shipped)} /> <span className="text-[11px] text-slate-400">abs</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div>
                    <Rate p={pct(r.deliveredOrders, r.leads)} /> <span className="text-[11px] text-slate-400">overall</span>
                  </div>
                  <div>
                    <Rate p={pct(r.delivered, r.shipped)} /> <span className="text-[11px] text-slate-400">abs</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-emerald-600">{moneyNum(r.revenue)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-600">-{moneyNum(r.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </div>
  );
}
