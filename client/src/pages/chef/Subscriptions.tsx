import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, ProductSubscription, ProductSubscriptionsResult } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Avatar, Pagination, RotateIcon, SearchIcon, SortIcon } from './ui';

type SCol = 'product' | 'supplier' | 'retailer' | 'cost' | 'price' | 'type' | 'saved';

const COLUMNS: { id: SCol; label: string }[] = [
  { id: 'product', label: 'Product' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'retailer', label: 'Dropshipper' },
  { id: 'cost', label: 'Cost' },
  { id: 'price', label: 'Price' },
  { id: 'type', label: 'Type' },
  { id: 'saved', label: 'Saved at' },
];

function rel(iso: string): string {
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

export default function ChefSubscriptions() {
  const [rows, setRows] = useState<ProductSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sortCol, setSortCol] = useState<SCol | null>('saved');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page + 1), per_page: String(pageSize) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (sortCol) {
      params.set('sort', sortCol);
      params.set('dir', sortDir);
    }
    apiGet<ProductSubscriptionsResult>(`/chef/subscriptions?${params}`)
      .then((r) => {
        setRows(r.subscriptions || []);
        setTotal(r.total);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, sortCol, sortDir, page, pageSize, reload]);

  const onSort = (col: SCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortCol(col); setSortDir('desc'); }
    setPage(0);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 text-base font-bold text-slate-900">Subscriptions</h5>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                placeholder="Search product, supplier, dropshipper..."
                className="w-64 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>
            <button type="button" onClick={() => { setQ(''); setSortCol('saved'); setSortDir('desc'); setPage(0); setReload((n) => n + 1); }} title="Refresh" className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
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
                  {COLUMNS.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-left" style={{ minWidth: c.id === 'product' ? 200 : 140 }}>
                      <div className="flex items-center gap-1">
                        <span className="whitespace-nowrap text-[11px] font-semibold text-slate-900">{c.label}</span>
                        <button type="button" onClick={() => onSort(c.id)} title="Sort" className="inline-flex cursor-pointer text-sky-600">
                          <SortIcon />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 transition hover:bg-sky-50/40">
                    <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                      <div className="flex items-center gap-2.5">
                        {r.product_image ? (
                          <img src={r.product_image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-400">📦</span>
                        )}
                        <span className="min-w-0 text-xs font-semibold text-sky-600">{r.product_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.supplier_name} size="h-8 w-8 text-[10px]" />
                        <span className="text-xs font-semibold text-slate-800">{r.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.retailer_name} size="h-8 w-8 text-[10px]" />
                        <span className="text-xs font-semibold text-slate-800">{r.retailer_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-700">{r.cost.toFixed(3)} TND</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-700">
                        {r.my_price !== null ? (
                          <span className="text-emerald-600 font-semibold">{r.my_price.toFixed(3)} TND</span>
                        ) : (
                          <span>{r.price.toFixed(3)} TND</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${r.offer_type === 'dropshipping' ? 'bg-sky-50 text-sky-700' : r.offer_type === 'wholesale' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.offer_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="whitespace-nowrap text-[11px] text-slate-500">{rel(r.saved_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <div className="flex justify-center py-14 text-xs text-slate-400">No subscriptions found</div>}
          </div>
        )}

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>
    </>
  );
}
