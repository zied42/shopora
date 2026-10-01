import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { apiDelete, apiErrorMessage, apiGet, apiPatch, dateFmt, money, Order, Product } from '../../lib/api';
import { exportOrdersToCsv } from '../../lib/export';
import { Badge, orderStatusTone, PageHeader, Spinner, TablePagination } from '../../components/ui';
import { OrderTrackingView } from '../../components/OrderCenter';
import CreateTab from './FulfillmentNewOrder';
import ReturnsTab from '../dropshipper/ReturnsTab';

const TABS = (path: string) => [
  { to: '/fournisseur/fulfillment/orders', label: 'All orders', icon: '🧾', active: path === '/fournisseur/fulfillment/orders' },
  { to: '/fournisseur/fulfillment/orders/new', label: 'New order', icon: '➕', active: path === '/fournisseur/fulfillment/orders/new' || path === '/fournisseur/fulfillment/orders/exchanges/create' },
  { to: '/fournisseur/fulfillment/orders/returns', label: 'Returns', icon: '↩️', active: path.includes('/fulfillment/orders/returns') },
  { to: '/fournisseur/fulfillment/orders/exchanges', label: 'Exchanges', icon: '🔁', active: path === '/fournisseur/fulfillment/orders/exchanges' },
];

export default function FulfillmentOrders() {
  const { pathname } = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet<Order[]>('/orders').catch(() => [] as Order[]),
      apiGet<Product[]>('/products').catch(() => [] as Product[]),
    ])
      .then(([o, p]) => { setOrders(o); setProducts(p); })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const fulfillmentIds = useMemo(() => new Set(products.filter((p) => p.category === 'fulfillment').map((p) => p.id)), [products]);
  const isFulfillmentOrder = (o: Order) => o.items.some((it) => fulfillmentIds.has(it.product_id));

  return (
    <div>
      <PageHeader
        title="Fulfillment orders"
        subtitle="Orders that contain your private fulfillment products — separate from stocking"
        breadcrumb={[{ label: 'Home', to: '/fournisseur' }, { label: 'Fulfillment' }, { label: 'Orders' }]}
      />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
        {TABS(pathname).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={() =>
              `inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                t.active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <span>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>

      {pathname === '/fournisseur/fulfillment/orders' && (
        <OrderList orders={orders} loading={loading} fulfillmentIds={fulfillmentIds} onRefresh={load} />
      )}
      {pathname === '/fournisseur/fulfillment/orders/new' && <CreateTab onCreated={load} />}
      {pathname === '/fournisseur/fulfillment/orders/exchanges/create' && <CreateTab onCreated={load} exchangeMode />}
      {pathname.includes('/fulfillment/orders/returns') && <ReturnsTab type="retour" orderFilter={isFulfillmentOrder} />}
      {pathname === '/fournisseur/fulfillment/orders/exchanges' && <ReturnsTab type="echange" orderFilter={isFulfillmentOrder} exchangeCreateTo="/fournisseur/fulfillment/orders/exchanges/create" />}
    </div>
  );
}

function OrderList({ orders, loading, fulfillmentIds, onRefresh }: { orders: Order[]; loading: boolean; fulfillmentIds: Set<number>; onRefresh: () => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set<number>());
  const [track, setTrack] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const rows = orders.filter((o) => o.items.some((it) => fulfillmentIds.has(it.product_id)));
    return rows.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!from && !to) return true;
      const t = new Date(o.created_at).getTime();
      if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    });
  }, [orders, fulfillmentIds, statusFilter, from, to]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((o) => {
      const productNames = o.items.filter((i) => fulfillmentIds.has(i.product_id)).map((i) => i.product_name).join(' ');
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        (o.customer_phone ?? '').toLowerCase().includes(q) ||
        (o.city ?? '').toLowerCase().includes(q) ||
        productNames.toLowerCase().includes(q)
      );
    });
  }, [filtered, query, fulfillmentIds]);

  const total = searched.length;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
  const pageRows = searched.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fulfillmentItems = (o: Order) => o.items.filter((i) => fulfillmentIds.has(i.product_id));

  const toggleAll = () =>
    setSelected((prev) => {
      const visibleIds = pageRows.map((o) => o.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const statusPatch = async (status: string) => {
    if (selected.size === 0) return;
    if (!window.confirm(`Apply "${status}" to ${selected.size} selected order(s)?`)) return;
    setBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('d42_token')}` },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelected(new Set());
      onRefresh();
    } catch {
      alert('Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const STATUSES = ['draft', 'pending', 'confirmed', 'ready', 'shipped', 'delivered', 'cancelled'];

  const sendToChef = async (o: Order) => {
    if (!window.confirm(`Send commande ${o.order_number} to the chef? Once sent you can no longer edit or delete it.`)) return;
    try {
      await apiPatch(`/orders/${o.id}/status`, { status: 'pending' });
      onRefresh();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const deleteDraft = async (o: Order) => {
    if (!window.confirm(`Permanently delete draft commande ${o.order_number}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/orders/${o.id}`);
      onRefresh();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h5 className="text-base font-bold text-slate-900">Orders</h5>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search order, client, phone…"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
            />
            {!showDate && (
              <button
                type="button"
                onClick={() => setShowDate(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                📅 Filter by date
              </button>
            )}
          </div>
        </div>
        {showDate && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
            <span className="text-xs text-slate-400">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); setShowDate(false); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-5 py-2.5">
        <button
          type="button"
          disabled={selected.size === 0 || busy}
          onClick={() => void statusPatch('shipped')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          📤 Mark as ready for pickup
        </button>
        <button
          type="button"
          disabled={selected.size === 0 || busy}
          onClick={() => void statusPatch('delivered')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          📥 Mark as delivered
        </button>
        <span className="text-xs text-slate-400">{selected.size} selected</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => (searched.length ? exportOrdersToCsv(searched, 'fulfillment-orders.csv') : alert('No orders to export'))}
            className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
            title="Export"
          >
            ⬇️
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3">
                <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((o) => selected.has(o.id))} onChange={toggleAll} className="h-4 w-4 accent-brand-600" />
              </th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Fulfillment product(s)</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-5 py-3 text-right">Toolbar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center">
                  <Spinner />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex h-24 items-center justify-center text-sm text-slate-400">
                    No fulfillment orders yet. Add fulfillment products first.
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((o) => {
                const its = fulfillmentItems(o);
                const qty = its.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={o.id} className={selected.has(o.id) ? 'bg-brand-50/50' : 'hover:bg-slate-50/60'}>
                    <td className="px-5 py-3">
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} className="h-4 w-4 accent-brand-600" />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="flex flex-col">
                        <span>{o.customer_name ?? '—'}</span>
                        <span className="text-xs text-slate-400">{o.customer_phone}</span>
                      </div>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-3 text-slate-600">{its.map((i) => i.product_name).join(', ')}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-600">{qty}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{money(o.total)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">{dateFmt(o.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {o.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void sendToChef(o)}
                              className="rounded-lg border border-brand-300 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                            >
                              Send to chef
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteDraft(o)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {o.status === 'pending' && (
                          <span className="text-[11px] font-medium text-slate-400">Sent — awaiting chef confirmation</span>
                        )}
                        <button
                          onClick={() => setTrack(o)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="border-t border-slate-200 px-5 py-3">
          <TablePagination count={total} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      )}

      {track && (
        <OrderTrackingView order={track} open onClose={() => setTrack(null)} />
      )}
    </div>
  );
}
