import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, PickupRequest, PickupRequestsResult } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Pagination, RotateIcon, SearchIcon } from './ui';

function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins < 1 ? 'now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const isReady = status === 'Ready';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
      isReady ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

export default function ChefPickupRequests() {
  const [rows, setRows] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page + 1), per_page: String(pageSize) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (statusFilter) params.set('status', statusFilter);
    apiGet<PickupRequestsResult>(`/chef/pickup-requests?${params}`)
      .then((r) => setRows(r.pickups || []))
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, statusFilter, page, pageSize, reload]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 text-base font-bold text-slate-900">Pickup Requests</h5>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search supplier, client, ID..."
              className="w-56 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 outline-none"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Ready">Ready</option>
          </select>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(0); setReload((n) => n + 1); }}
            className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
          >
            <RotateIcon />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-900" style={{ minWidth: 60 }}>ID</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-900" style={{ minWidth: 180 }}>Supplier / Client</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-slate-900" style={{ minWidth: 70 }}>Products</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-900" style={{ minWidth: 100 }}>Status</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-900" style={{ minWidth: 100 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 transition hover:bg-sky-50/40">
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] font-semibold text-sky-600">#{r.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-800">{r.title}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {r.products}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="whitespace-nowrap text-[11px] text-slate-500">{relDate(r.date)}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-xs text-slate-400">No pickup requests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={rows.length} />
    </div>
  );
}
