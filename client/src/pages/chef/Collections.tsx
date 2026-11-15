import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, apiGet, Collection, CollectionsResult, CollectionStatus } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Pagination, SearchIcon, SortIcon, clockSlot } from './ui';

type CCol = 'id' | 'title' | 'description' | 'products' | 'created_at' | 'status' | 'toolbar';

const COLUMNS: { id: CCol; label: string }[] = [
  { id: 'id', label: 'ID' },
  { id: 'title', label: 'Title' },
  { id: 'description', label: 'Description' },
  { id: 'products', label: 'Products' },
  { id: 'created_at', label: 'Created at' },
  { id: 'status', label: 'Status' },
  { id: 'toolbar', label: 'Toolbar' },
];

const SORTABLE = new Set<CCol>(['id', 'title', 'description', 'products', 'created_at', 'status']);

function statusPill(status: CollectionStatus) {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Inactive') return 'bg-slate-100 text-slate-500';
  return 'bg-amber-50 text-amber-700';
}

export default function ChefCollections() {
  const [rows, setRows] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sortKey, setSortKey] = useState<CCol>('id');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    apiGet<CollectionsResult>('/chef/collections')
      .then((r) => {
        setRows(r.collections);
        setPage(0);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = debouncedQ.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => `${r.title} ${r.description} ${String(r.products)}`.toLowerCase().includes(query));
  }, [rows, debouncedQ]);

  const sorted = useMemo(() => {
    const dir = sortDir;
    const sk = sortKey as 'id' | 'products' | 'created_at' | 'title' | 'description' | 'status';
    return [...filtered].sort((a, b) => {
      if (sk === 'id' || sk === 'products') return (a[sk] - b[sk]) * dir;
      if (sk === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      return String(a[sk]).localeCompare(String(b[sk])) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (col: CCol) => {
    if (sortKey === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(col);
      setSortDir(col === 'created_at' || col === 'id' || col === 'products' ? -1 : 1);
    }
    setPage(0);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 text-base font-bold text-slate-900">Collections</h5>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search"
                className="w-56 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </form>
            <Link
              to="/chef/products-collections/create"
              title="Create collection"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
              </svg>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {COLUMNS.map((c) => {
                    const sortable = SORTABLE.has(c.id);
                    return (
                      <th key={c.id} className={`px-3 py-2.5 ${c.id === 'toolbar' ? 'text-center' : 'text-left'} text-[11px] font-semibold text-slate-900`}>
                        <button
                          type="button"
                          onClick={() => (sortable ? toggleSort(c.id) : undefined)}
                          title={sortable ? 'Toggle SortBy' : undefined}
                          className={`inline-flex items-center gap-1 ${sortable ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {c.label}
                          {sortable && (
                            <span className={`inline-flex text-sky-600 ${sortKey === c.id ? 'opacity-100' : 'opacity-40'}`}>
                              <SortIcon />
                            </span>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 odd:bg-slate-50/40 transition hover:bg-sky-50/40">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link to={`/chef/products-collections/${r.id}`} className="text-xs font-bold text-slate-900 hover:text-sky-600">
                        #{r.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: 220 }}>
                      <div className="max-w-xs text-wrap text-xs font-bold text-slate-800">{r.title}</div>
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: 260 }}>
                      <div className="max-w-sm whitespace-normal text-wrap text-xs font-semibold text-slate-600">{r.description}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {r.products} product{r.products === 1 ? '' : 's'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">{clockSlot(r.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusPill(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      <Link
                        to={`/chef/products-collections/${r.id}`}
                        title="Edit"
                        className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 p-1.5 text-sky-600 transition hover:bg-sky-100"
                      >
                        <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                          <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageRows.length === 0 && <div className="flex justify-center py-14 text-xs text-slate-400">No results found</div>}
          </div>
        )}

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} />
      </div>
    </>
  );
}