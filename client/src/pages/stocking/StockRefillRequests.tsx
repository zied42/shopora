import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, dateFmt, searchStockRefillRequests, StockRefillRequest, StockRefillStatus } from '../../lib/api';
import { Button, PageHeader, Spinner } from '../../components/ui';
import { Pagination, RotateIcon, SearchIcon } from '../chef/ui';

const STATUS_TONES: Record<StockRefillStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Confirmed: 'bg-emerald-50 text-emerald-700',
  Approved: 'bg-sky-50 text-sky-700',
  'In preparation': 'bg-violet-50 text-violet-700',
  Ready: 'bg-teal-50 text-teal-700',
  Shipped: 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
};

function EyePreviewIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

export default function StockRefillRequests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StockRefillRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page + 1), per_page: String(pageSize) });
    if (debouncedQ) params.set('q', debouncedQ);
    searchStockRefillRequests(params)
      .then((r) => {
        if (!alive) return;
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debouncedQ, page, pageSize, refreshKey]);

  return (
    <div>
      <PageHeader
        title="Stock refill requests"
        subtitle="Track, search and create supplier stock refill requests"
        actions={
          <>
            <div className="relative flex items-center">
              <SearchIcon className="pointer-events-none absolute left-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="w-64 rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              type="button"
              title="Refresh"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex rounded-xl border border-slate-300 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <RotateIcon />
            </button>
            <Button type="button" onClick={() => navigate('/stocking/stock-refill-requests/new')}>
              <PlusIcon />
              Create stock refill request
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supplier</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Products</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Storage Request</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reservation</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 transition hover:bg-brand-50/40">
                  <td className="px-3 py-2.5 align-top text-xs font-bold text-slate-900">#{r.id}</td>
                  <td className="px-3 py-2.5 align-top text-xs font-semibold text-slate-800">{r.supplier}</td>
                  <td className="px-3 py-2.5 text-center align-top text-xs text-slate-700">{r.products}</td>
                  <td className="px-3 py-2.5 align-top text-xs text-slate-600">{r.storage_request ?? '—'}</td>
                  <td className="px-3 py-2.5 align-top text-xs text-slate-600">{r.reservation ?? '—'}</td>
                  <td className="px-3 py-2.5 align-top text-xs text-slate-600">{dateFmt(r.date)}</td>
                  <td className="px-3 py-2.5 text-center align-top">
                    <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONES[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        title="Preview"
                        onClick={() => navigate(`/stocking/stock-refill-requests/${r.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
                      >
                        <EyePreviewIcon />
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="flex justify-center py-14 text-xs text-slate-400">No results found</div>}
        </div>
      )}

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
    </div>
    </div>
  );
}
