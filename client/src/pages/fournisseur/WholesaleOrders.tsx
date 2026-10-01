import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiGet, apiPatch, createOrderPick, dateFmt, dispatchFirstDelivery, money, Order, OrderPickabilityRow } from '../../lib/api';
import { AppFooter, Badge, ButtonGhost, orderStatusTone, Spinner, TablePagination } from '../../components/ui';
import { OrderDetailModal, OrderTrackingView } from '../../components/OrderCenter';
import { BonLivraison } from '../../components/BonLivraison';
import { PickPreviewModal } from '../stocking/Orders';

const DELIVERY_COMPANIES = [
  { id: 'navex', name: 'Navex', logo: '/navex.jpg' },
  { id: 'first-delivery', name: 'First Delivery', logo: '/first_delivery.png' },
  { id: 'jetpack', name: 'Jetpack', logo: '/jetpack.jpg' },
  { id: 'intigo', name: 'Intigo', logo: '/intigo.png' },
  { id: 'kamatcho', name: 'Kamatcho', logo: '/kamatcho.png' },
  { id: 'lazajella', name: 'LaZajella', logo: '/zajella.png' },
];

function DeliveryCompanyCell({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const current = order.delivery_company ?? '';
  const locked = ['shipped', 'delivered', 'retour'].includes(order.status);

  const update = async (val: string) => {
    setSaving(true);
    try {
      await apiPatch(`/orders/${order.id}/delivery-company`, { delivery_company: val || null });
      onChanged();
    } catch (e) {
      console.warn(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (locked) {
    const co = DELIVERY_COMPANIES.find((c) => c.id === current);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        {co && <img src={co.logo} alt="" className="h-4 w-4 rounded object-cover" />}
        {co?.name ?? current ?? '—'}
      </span>
    );
  }

  return (
    <select
      value={current}
      onChange={(e) => update(e.target.value)}
      disabled={saving}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 disabled:opacity-50"
    >
      <option value="">— Select —</option>
      {DELIVERY_COMPANIES.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

interface ReferenceTableOpts {
  showDelivery?: boolean;
  showPaid?: boolean;
  viewOnly?: boolean;
}

function referenceTable(title: string, filter: (o: Order) => boolean, endpoint = '/orders', opts: ReferenceTableOpts = {}) {
  const { showDelivery = false, showPaid = false, viewOnly = false } = opts;
  return function ReferenceOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [pickMap, setPickMap] = useState<Record<number, OrderPickabilityRow>>({});
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [detail, setDetail] = useState<Order | null>(null);
    const [trackingId, setTrackingId] = useState<number | null>(null);
    const [previewId, setPreviewId] = useState<number | null>(null);
    const [paper, setPaper] = useState<Order | null>(null);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const load = () => {
      setLoading(true);
      Promise.all([
        apiGet<Order[]>(endpoint),
        apiGet<OrderPickabilityRow[]>('/stocking/orders-pickability').catch(() => [] as OrderPickabilityRow[]),
      ])
        .then(([orders, picks]) => {
          setOrders(orders);
          const m: Record<number, OrderPickabilityRow> = {};
          for (const p of picks) m[p.order_id] = p;
          setPickMap(m);
        })
        .catch((e) => alert(apiErrorMessage(e)))
        .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const based = useMemo(() => orders.filter(filter), [orders]);

    const searched = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return based;
      return based.filter((o) => {
        const productNames = o.items.map((i) => i.product_name).join(' ');
        return (
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? '').toLowerCase().includes(q) ||
          (o.city ?? '').toLowerCase().includes(q) ||
          productNames.toLowerCase().includes(q)
        );
      });
    }, [based, query]);

    const total = searched.length;
    const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
    const pageRows = searched.slice((safePage - 1) * pageSize, safePage * pageSize);
    const colCount = 11 + (showDelivery ? 1 : 0) + (showPaid ? 1 : 0);

    return (
      <div>
        {notice && (
          <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notice.text}</p>
        )}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h5 className="text-base font-bold text-slate-900">{title}</h5>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-52 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <svg className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M500.3 443.7l-119.7-119.7c27.22-40.41 40.65-90.9 33.46-144.7C401.8 87.79 326.8 13.32 235.2 1.723 99.01-15.51-15.51 99.01 1.724 235.2c11.6 91.64 86.08 166.7 177.6 178.9 53.8 7.189 104.3-6.236 144.7-33.46l119.7 119.7c15.62 15.62 40.95 15.62 56.57 0C515.9 484.7 515.9 459.3 500.3 443.7zM79.1 208c0-70.58 57.42-128 128-128s128 57.42 128 128c0 70.58-57.42 128-128 128S79.1 278.6 79.1 208z" />
                  </svg>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                  <span className="bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500">All</span>
                  <button type="button" title="Date range" className="border-l border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-500">📅</button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Dropshipper</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-center">Carrier</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Qty requested</th>
                  <th className="px-3 py-3 text-right">Qty picked</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  {showDelivery && <th className="px-3 py-3">Delivery</th>}
                  {showPaid && <th className="px-3 py-3 text-center">Paid amount</th>}
                  <th className="px-5 py-3 text-right">Toolbar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="py-10 text-center"><Spinner /></td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount}><div className="flex h-24 items-center justify-center text-sm text-slate-400">No results found</div></td>
                  </tr>
                ) : (
                  pageRows.map((o) => {
                    const carrier = o.tracking.find((t) => t.carrier)?.carrier ?? null;
                    const qtyRequested = o.items.reduce((s, i) => s + i.quantity, 0);
                    const pick = pickMap[o.id];
                    const qtyPicked = pick ? pick.picked : 0;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                        <td className="px-3 py-3 font-medium text-slate-700">{o.customer_name ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{o.dropshipper_name}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${o.order_type === 'wholesale' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {o.order_type === 'wholesale' ? 'Wholesale' : 'Dropshipping'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600">{carrier ?? '—'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-500">{dateFmt(o.created_at)}</td>
                        <td className="max-w-[220px] truncate px-3 py-3 text-slate-600">{o.items.map((i) => i.product_name).join(', ')}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{qtyRequested}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{qtyPicked}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{money(o.total)}</td>
                        <td className="px-3 py-3"><Badge tone={orderStatusTone(o.status)}>{o.status}</Badge></td>
                        {showDelivery && (
                          <td className="px-3 py-3">
                            <DeliveryCompanyCell order={o} onChanged={load} />
                          </td>
                        )}
                        {showPaid && (
                          <td className="px-3 py-3 text-center tabular-nums">
                            {o.payment_status === 'paid' ? <span className="font-semibold text-emerald-600">{money(o.total)}</span> : <span className="text-slate-400">—</span>}
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {viewOnly ? (
                              <button
                                onClick={() => setTrackingId(o.id)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                View
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setDetail(o)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  View
                                </button>
                                <button
                                  title="Preview the picking samples"
                                  onClick={() => setPreviewId(o.id)}
                                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                                >
                                  👁 Preview
                                </button>
                                <ButtonGhost
                                  className="px-3 py-1.5 text-xs"
                                  title="Print the commande paper"
                                  onClick={async () => {
                                    const fresh = (await apiGet<Order[]>(endpoint)).find((x) => x.id === o.id) ?? o;
                                    setPaper(fresh);
                                  }}
                                >
                                  🖨 Print
                                </ButtonGhost>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination count={total} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>

        <AppFooter />

        {detail && <OrderDetailModal order={detail} open onClose={() => setDetail(null)} onChanged={load} />}

        {trackingId !== null && (() => {
          const trackedOrder = orders.find((o) => o.id === trackingId) ?? null;
          return trackedOrder ? <OrderTrackingView order={trackedOrder} open onClose={() => setTrackingId(null)} hideCancel /> : null;
        })()}

        {previewId !== null && (
          <PickPreviewModal
            orderId={previewId}
            onClose={() => {
              setPreviewId(null);
              load();
            }}
            onReady={async () => {
            try {
              await createOrderPick(previewId);
              const fd = await dispatchFirstDelivery(previewId);
              load();
              setNotice({ ok: true, text: fd.barCode ? `🎉 Dispatched — barcode: ${fd.barCode} — click Print to view` : '🎉 All products picked' });
            } catch (e) {
              load();
              setNotice({ ok: false, text: apiErrorMessage(e) });
            }
          }}
          />
        )}

        {paper && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 p-6 print:bg-white print:p-0">
            <div className="mx-auto max-w-4xl print:mx-auto">
              <div className="mb-4 flex justify-center gap-2 print:hidden">
                <button type="button" onClick={() => window.print()} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">🖨 Print / Save PDF</button>
                <ButtonGhost onClick={() => setPaper(null)}>Close</ButtonGhost>
              </div>
              <BonLivraison order={paper} />
            </div>
          </div>
        )}
      </div>
    );
  };
}

export const WholesaleOrders = referenceTable('Wholesale orders', (o) => o.order_type === 'wholesale', '/orders', { viewOnly: true });
export const StockingWholesaleOrders = referenceTable('Wholesale orders', (o) => o.order_type === 'wholesale', '/stocking/wholesale-orders', { showDelivery: true, showPaid: true });
export function Reservations() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
      <span className="text-5xl">🚧</span>
      <p className="mt-3 text-lg font-bold text-slate-900">New feature coming soon</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Reservations aren't available yet — check back later.</p>
    </div>
  );
}