import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, searchStockRefillRequests, StockRefillRequest, StockRefillRequestItem } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AppFooter, PageHeader, Spinner, TablePagination } from '../../components/ui';

const STATUS_TONES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'In preparation': 'bg-violet-100 text-violet-700',
  Ready: 'bg-teal-100 text-teal-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Rejected: 'bg-rose-100 text-rose-700',
};

type FlatItem = StockRefillRequestItem & { request_id: number; request_status: string; request_date: string; storage_request: string | null };

export default function StorageRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<StockRefillRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');

  const load = () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(pageSize));
    params.set('supplier', user.name);
    if (q) params.set('q', q);
    searchStockRefillRequests(params)
      .then((r) => { setRequests(r.rows); setTotal(r.total); })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, pageSize, q, user]);

  const items = useMemo(() => {
    const flat: FlatItem[] = [];
    for (const r of requests) {
      for (const it of r.items) {
        flat.push({ ...it, request_id: r.id, request_status: r.status, request_date: r.date, storage_request: r.storage_request });
      }
    }
    return flat;
  }, [requests]);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Storage requests" subtitle="Track stock refill requests and pick quantities for your products." />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by product, storage request…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-64"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); setPage(1); }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-3 py-3 text-center">Qty requested</th>
                <th className="px-3 py-3 text-center">Qty picked</th>
                <th className="px-3 py-3 text-center">Unit price</th>
                <th className="px-3 py-3 text-center">Refill #</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex h-24 items-center justify-center text-sm text-slate-400">No products found</div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={`${it.request_id}-${it.id}`} className="border-t border-slate-100 transition hover:bg-brand-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.product_name} className="h-10 w-10 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-lg">📦</div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-800">{it.product_name}</p>
                          {it.color && <p className="truncate text-[11px] text-slate-500">{it.color}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">{it.qty_to_request}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-brand-600">{it.qty_picked}</td>
                    <td className="px-3 py-3 text-center text-xs text-slate-600">{it.unit_price}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/fournisseur/storage-requests/${it.request_id}`)}
                        className="text-[11px] font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
                      >
                        #{it.request_id}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_TONES[it.request_status] ?? STATUS_TONES.Pending}`}>
                        {it.request_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination count={total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>
      <AppFooter />
    </div>
  );
}