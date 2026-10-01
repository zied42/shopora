import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, getManifestGroups, ManifestGroup } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Avatar, EyeIcon, SearchIcon } from './ui';

function CircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z" />
    </svg>
  );
}

function ChartBarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M32 32c17.7 0 32 14.3 32 32V400c0 8.8 7.2 16 16 16H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H80c-44.2 0-80-35.8-80-80V64C0 46.3 14.3 32 32 32zm96 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32zm32 64H288c17.7 0 32 14.3 32 32s-14.3 32-32 32H160c17.7 0-32-14.3-32-32s14.3-32 32-32zm0 96H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H160c17.7 0-32-14.3-32-32s14.3-32 32-32z" />
    </svg>
  );
}

export default function ChefManifests() {
  const [groups, setGroups] = useState<ManifestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [multiple, setMultiple] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = () => {
    setLoading(true);
    getManifestGroups()
      .then(setGroups)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return groups;
    const tokens = multiple ? q.toLowerCase().split(/[\s,]+/).filter(Boolean) : [q.toLowerCase()];
    return groups.filter((g) => {
      const hay = [g.supplier_name, g.delivery_company].join(' ').toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });
  }, [groups, search, multiple]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* card header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 w-full whitespace-nowrap text-base font-bold text-slate-900 lg:w-auto">Manifests</h5>

        <form
          className="flex w-full items-center overflow-hidden rounded-lg border border-slate-300 sm:w-auto"
          onSubmit={(e) => { e.preventDefault(); setPage(0); }}
        >
          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              type="search"
              placeholder="Search supplier or delivery..."
              className="w-[220px] border-transparent bg-white py-2 pl-3 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeOpen((o) => !o)}
              title={multiple ? 'Search multiple' : 'Search single'}
              className="flex h-full items-center bg-sky-50 px-2.5 py-2 text-sky-600 transition hover:bg-sky-100"
            >
              <CircleIcon className={multiple ? 'text-sky-600' : 'text-slate-600'} />
            </button>
            {modeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setModeOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  <button type="button" onClick={() => { setMultiple(false); setModeOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${!multiple ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <CircleIcon className="text-slate-400" /> Search single
                  </button>
                  <button type="button" onClick={() => { setMultiple(true); setModeOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${multiple ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <ChartBarIcon className="text-slate-400" /> Search multiple
                  </button>
                </div>
              </>
            )}
          </div>
        </form>

        <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
          <button type="button" onClick={load}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
            <svg className="h-3 w-3" viewBox="0 0 512 512" fill="currentColor"><path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H463.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z" /></svg>
            <span className="hidden sm:inline">Sync all</span>
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100 align-middle text-xs text-slate-800">
                  <th className="px-3 py-2.5 font-semibold">Supplier</th>
                  <th className="px-3 py-2.5 font-semibold">Delivery Company</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Orders</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Shipped</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Delivered</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Products</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Total Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr className="whitespace-nowrap border-b border-slate-50">
                    <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">
                      No manifest groups match your search.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((g) => (
                    <tr key={`${g.supplier_id}-${g.delivery_company}`} className="whitespace-nowrap border-b border-slate-50 align-middle transition odd:bg-slate-50/40 hover:bg-slate-100/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center">
                          <Avatar name={g.supplier_name} size="h-8 w-8 text-xs border border-slate-200" />
                          <span className="ms-2 text-[11px] font-semibold text-slate-900">{g.supplier_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {g.delivery_company}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] font-semibold text-slate-800">{g.order_count}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{g.shipped_count}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">{g.delivered_count}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] font-semibold text-slate-800">{g.total_products}</td>
                      <td className="px-3 py-2 text-center text-[11px] font-semibold text-slate-800">{g.total_qty}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`/chef/manifests/${g.supplier_id}/${encodeURIComponent(g.delivery_company)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                          title="View details"
                        >
                          <EyeIcon />
                          <span className="hidden md:inline">View details</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs">
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-slate-400">|</span>
              <span>{current * pageSize + 1}–{Math.min((current + 1) * pageSize, total)} of {total}</span>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={current === 0} onClick={() => setPage((p) => p - 1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={current >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
