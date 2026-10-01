import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, PackingBin, searchPackingBins } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Pagination, RotateIcon, SearchIcon } from './ui';

function toggleOnPath(on: boolean) {
  return on
    ? 'M192 64C86 64 0 150 0 256S86 448 192 448H384c106 0 192-86 192-192s-86-192-192-192H192zM384 352c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96z'
    : 'M384 64C490 64 576 150 576 256S490 448 384 448H192C86 448 0 362 0 256S86 64 192 64H384zM384 352c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96s43 96 96 96z';
}

function PenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM384 256c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z" />
    </svg>
  );
}

const thCls = 'px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900 whitespace-nowrap';

export default function ChefPackingBins() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PackingBin[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    searchPackingBins({ page: page + 1, per_page: pageSize, q: debouncedQ || undefined })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, page, pageSize, reload]);

  const toggle = (id: number) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 text-base font-bold text-slate-900">Bins</h5>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search"
            className="w-48 rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
          />
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setReload((n) => n + 1);
              alert('Stocks packability status re-evaluated.');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateIcon />
            Reevaluate Stocks Packability Status
          </button>
          <button type="button" title="Toggle columns" className="inline-flex rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
            <SlidersIcon />
          </button>
          <button type="button" title="Create bin" onClick={() => navigate('/chef/packing/bins/create')} className="inline-flex rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
            <PlusIcon />
          </button>
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
              <tr className="bg-slate-50/80">
                <th className={thCls}>ID</th>
                <th className={thCls}>Name</th>
                <th className={thCls}>Reference</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Cost</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Created at</th>
                <th className={`${thCls} text-right`}>Toolbar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-middle transition hover:bg-brand-50/40">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.id}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full border border-slate-100 bg-white">
                        {r.image && (
                          <div
                            className="h-full w-full"
                            style={{ backgroundImage: `url(${r.image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.reference}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.price.toFixed(3)} TND</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.cost.toFixed(3)} TND</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.type}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => navigate(`/chef/packing/bins/${r.id}`)}
                        className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50"
                      >
                        <PenIcon />
                      </button>
                      <button
                        type="button"
                        title={r.active ? 'Disable' : 'Enable'}
                        onClick={() => toggle(r.id)}
                        className={`inline-flex rounded-xl border border-slate-200 bg-white p-1.5 transition hover:bg-slate-50 ${r.active ? 'text-emerald-600' : 'text-slate-400'}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
                          <path d={toggleOnPath(r.active)} />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-14 text-center text-xs text-slate-400">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
    </div>
  );
}