import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, listCancelledOrders, money, Order } from '../../lib/api';
import { Badge, Card, EmptyState, orderStatusTone, PageHeader, Spinner } from '../../components/ui';

export default function CanceledShipments() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = () => {
    listCancelledOrders()
      .then(setOrders)
      .catch((e) => setError(apiErrorMessage(e)));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name ?? '').toLowerCase().includes(q) ||
      (o.dropshipper_name ?? '').toLowerCase().includes(q) ||
      o.items.some((i) => i.product_name.toLowerCase().includes(q))
    );
  }, [orders, query]);

  return (
    <div>
      <PageHeader
        title="Canceled shipments"
        subtitle="Every cancelled commande — dropshipping and wholesale"
        actions={<button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>}
      />

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">⚠️ {error}</p>}

      {orders === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🚫" title={query ? 'No matches' : 'No cancelled commandes'} hint={query ? 'Try another search.' : 'Cancelled commandes will appear here.'} />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <div className="border-b border-slate-200 px-5 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commande, customer, product…"
              className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Order</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Destination</th>
                <th className="px-3 py-3">Dropshipper</th>
                <th className="px-3 py-3">Items</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs font-semibold text-brand-700">{o.order_number}</p>
                    {o.barcode && <p className="font-mono text-[10px] text-slate-400">{o.barcode}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={o.order_type === 'wholesale' ? 'amber' : 'blue'}>
                      {o.order_type === 'wholesale' ? '🏭 Wholesale' : '🛍️ Dropshipping'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{o.customer_name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{o.customer_phone ?? ''}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {[o.city, o.governorate].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">{o.dropshipper_name}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {o.items.reduce((s, i) => s + i.quantity, 0)} unit{o.items.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'} · {o.items.length} product{o.items.length === 1 ? '' : 's'}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(o.total)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
