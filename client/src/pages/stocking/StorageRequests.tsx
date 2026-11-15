import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, listStorageRequests, StorageRequest } from '../../lib/api';
import { PageHeader, Spinner } from '../../components/ui';
import { Pagination, SearchIcon } from '../chef/ui';

const STATUS_TONES: Record<StorageRequest['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Confirmed: 'bg-emerald-50 text-emerald-700',
};

function EyeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" />
    </svg>
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StorageRequests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StorageRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setRows(null);
    const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
    if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
    listStorageRequests(params)
      .then((r) => {
        if (!alive) return;
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) => alive && setError(apiErrorMessage(e)));
    return () => {
      alive = false;
    };
  }, [page, pageSize, debouncedQ]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Storage requests"
        subtitle="Review inbound storage requests, QC results and discrepancies"
        actions={
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search GID, client, ID…"
              className="h-10 w-64 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-slate-50/80">
              <tr>
                {['GID', 'ID', 'Client', 'Related to', 'Failed QC', 'Products', 'Discrepancies', 'Status', 'Created at'].map((h, i) => (
                  <th key={h} className={`px-[13px] py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${i >= 3 && i <= 7 ? 'text-center' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
                <th className="px-[13px] py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={10} className="px-[13px] py-10 text-center text-xs text-rose-600">{error}</td>
                </tr>
              )}
              {!error && rows === null && (
                <tr>
                  <td colSpan={10} className="py-12 text-center"><Spinner /></td>
                </tr>
              )}
              {rows !== null && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-[13px] py-10 text-center text-xs text-slate-400">
                    No results found
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 transition hover:bg-brand-50/40">
                  <td className="px-[13px] py-2.5 text-[11px] font-medium text-slate-500">{r.gid}</td>
                  <td className="px-[13px] py-2.5 text-[11px] font-semibold text-slate-800">#{r.id}</td>
                  <td className="px-[13px] py-2.5 text-[11px] text-slate-500">{r.client}</td>
                  <td className="px-[13px] py-2.5 text-center">
                    {r.related_refill_id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/stocking/stock-refill-requests/${r.related_refill_id}`)}
                        className="text-[11px] font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
                      >
                        refill request: {r.related_refill_id}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-[13px] py-2.5 text-center">
                    {r.failed_qc > 0 ? (
                      <span className="inline-flex whitespace-nowrap rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">{r.failed_qc}</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-[13px] py-2.5 text-center text-[11px] text-slate-500">{r.products}</td>
                  <td className="max-w-[170px] truncate px-[13px] py-2.5 text-center text-[11px] text-slate-500" title={r.discrepancies ?? undefined}>
                    {r.discrepancies ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-[13px] py-2.5 text-center">
                    <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-[13px] py-2.5 text-[11px] text-slate-500">{fmtDateTime(r.created_at)}</td>
                  <td className="px-[13px] py-2.5 text-right">
                    <button
                      type="button"
                      title="Open storage request"
                      onClick={() => navigate(`/stocking/storage-requests/${r.id}`)}
                      className="rounded p-1 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                    >
                      <EyeIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>
    </div>
  );
}
