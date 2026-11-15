import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiGet, dateFmt, money, Order, ReturnRequest, listReturnRequests } from '../../lib/api';
import { exportOrdersToCsv } from '../../lib/export';
import { AppFooter, Badge, orderStatusTone, Spinner, TablePagination } from '../../components/ui';
import { OrderDetailModal } from '../../components/OrderCenter';
import { warehouseNames } from '../../lib/warehouses';

type Tab = 'orders' | 'returns';

const WAREHOUSES = () => warehouseNames();

export default function FourOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');
  const [query, setQuery] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showWh, setShowWh] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set<number>());
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet<Order[]>('/orders'),
      listReturnRequests().catch(() => [] as ReturnRequest[]),
    ])
      .then(([o, r]) => { setOrders(o); setReturnRequests(r); })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const inRange = (o: Order) => {
    if (!from && !to) return true;
    const t = new Date(o.created_at).getTime();
    if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const returnOrderIds = new Set(returnRequests.map((r) => r.order_id));
    const rows = tab === 'returns'
      ? orders.filter((o) => o.status === 'retour' || returnOrderIds.has(o.id))
      : orders.filter((o) => o.order_type === 'dropshipping');
    return rows.filter(inRange);
  }, [tab, orders, returnRequests, from, to]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((o) => {
      const productNames = o.items.map((i) => i.product_name).join(' ');
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        (o.customer_phone ?? '').toLowerCase().includes(q) ||
        (o.city ?? '').toLowerCase().includes(q) ||
        productNames.toLowerCase().includes(q)
      );
    });
  }, [filtered, query]);

  const total = searched.length;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
  const pageRows = searched.slice((safePage - 1) * pageSize, safePage * pageSize);

  const rangeLabel = from && to ? `${from} → ${to}` : from ? `From ${from}` : to ? `Until ${to}` : 'All';

  const toggleAll = () => {
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
  };

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
      load();
    } catch {
      alert('Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* ===== TABS ===== */}
      <div className="flex justify-center py-2">
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-1">
          {(['orders', 'returns'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setPage(1);
                setSelected(new Set());
                setShowWh(false);
                setShowDate(false);
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition sm:px-6 ${
                tab === t ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'orders' ? (
                <>🛒 Orders</>
              ) : (
                <>↩️ Returns</>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ===== HEADER ===== */}
        <div className="border-b border-slate-200 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h5 className="text-base font-bold text-slate-900">{tab === 'orders' ? 'Orders' : 'Returns'}</h5>
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
              <div className="relative">
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                  <span className="whitespace-nowrap bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500">{rangeLabel}</span>
                  <button
                    type="button"
                    title="Date range"
                    onClick={() => {
                      setShowDate((v) => !v);
                      setShowWh(false);
                    }}
                    className="border-l border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-500"
                  >
                    📅
                  </button>
                </div>
                {showDate && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDate(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        From
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                      </label>
                      <label className="block text-xs font-medium text-slate-600">
                        To
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                      </label>
                      <button
                        type="button"
                        onClick={() => { setFrom(''); setTo(''); }}
                        className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
              </div>
              {tab === 'orders' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWh((v) => !v);
                      setShowDate(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    🏭 {warehouse || 'All warehouses'}
                    <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showWh && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowWh(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        {['', ...WAREHOUSES()].map((w) => (
                          <button
                            key={w || 'all'}
                            type="button"
                            onClick={() => { setWarehouse(w); setShowWh(false); }}
                            className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${warehouse === w ? 'font-semibold text-brand-700' : 'text-slate-700'}`}
                          >
                            {w || 'All warehouses'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ACTION BAR (orders only) ===== */}
        {tab === 'orders' && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-5 py-2.5">
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => void statusPatch('shipped')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              📤 Mark orders as ready for pickup
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => void statusPatch('delivered')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              📥 Mark failed delivery orders as received
            </button>
            <span className="text-xs text-slate-400">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => (orders.length ? exportOrdersToCsv(orders, 'orders.csv') : alert('No orders to export'))}
                className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                ⬇️
              </button>
            </div>
          </div>
        )}

        {/* ===== TABLE ===== */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              {tab === 'orders' ? (
                <tr>
                  <th className="px-5 py-3">
                    <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((o) => selected.has(o.id))} onChange={toggleAll} className="h-4 w-4 accent-brand-600" />
                  </th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Ship from</th>
                  <th className="px-3 py-3">Carrier</th>
                  <th className="px-3 py-3">Ship to</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Returns</th>
                  <th className="px-3 py-3 text-center">Recovery</th>
                  <th className="px-3 py-3 text-right">Paid amount</th>
                  <th className="px-5 py-3 text-right">Toolbar</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-5 py-3">
                    <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((o) => selected.has(o.id))} onChange={toggleAll} className="h-4 w-4 accent-brand-600" />
                  </th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Product(s)</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Reason</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Toolbar</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={tab === 'orders' ? 13 : 9} className="py-10 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'orders' ? 13 : 9}>
                    <div className="flex h-24 items-center justify-center text-sm text-slate-400">
                      {tab === 'returns' ? 'No returned orders yet' : 'No results found'}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => {
                  const carrier = o.tracking.find((t) => t.carrier)?.carrier ?? null;
                  const paid = o.payment_status === 'paid';
                  const rr = returnRequests.find((r) => r.order_id === o.id);
                  return tab === 'orders' ? (
                    <tr key={o.id} className={selected.has(o.id) ? 'bg-brand-50/50' : 'hover:bg-slate-50/60'}>
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} className="h-4 w-4 accent-brand-600" />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                      <td className="px-3 py-3 text-slate-600">{o.fournisseur_name}</td>
                      <td className="px-3 py-3 text-slate-600">{carrier ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-500">
                        {[o.city, o.governorate].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500">{dateFmt(o.created_at)}</td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-slate-600">{o.items.map((i) => i.product_name).join(', ')}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{money(o.total)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">{o.status === 'retour' ? '↩️' : '—'}</td>
                      <td className="px-3 py-3 text-center text-slate-600">—</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {paid ? <span className="font-semibold text-emerald-600">{money(o.total)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDetail(o)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} className="h-4 w-4 accent-brand-600" />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                      <td className="px-3 py-3 text-slate-600">{o.customer_name ?? '—'}</td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-slate-600">{o.items.map((i) => i.product_name).join(', ')}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{money(o.total)}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">
                        {rr ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-700">{rr.type === 'echange' ? '🔄 Exchange' : '↩️ Return'}</span>
                            <span className="truncate text-slate-400" title={rr.reason}>{rr.reason}</span>
                          </span>
                        ) : 'Returned by customer'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500">{dateFmt(o.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDetail(o)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Manage
                        </button>
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
    </div>
  );
}
