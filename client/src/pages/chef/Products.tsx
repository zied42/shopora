import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiErrorMessage,
  addProductToCollection,
  Collection,
  getCollections,
  removeProductFromCollection,
  searchSupplierProducts,
  SupplierProduct,
  SupplierProductOffer,
  SupplierProductStatus,
  SupplierProductsResult,
} from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Avatar, BanIcon, BoxIcon, CheckIcon, CheckRow, EyeIcon, FilterOverlay, FunnelIcon, HourglassIcon, Pagination, RotateIcon, SearchIcon, ThContent, TruckIcon, XmarkIcon, clockSlot } from './ui';

const SORT_OPTIONS = [
  { field: 'created_at', dir: 'desc', label: 'Created at (newest)' },
  { field: 'created_at', dir: 'asc', label: 'Created at (oldest)' },
  { field: 'gid', dir: 'asc', label: 'GID' },
  { field: 'name', dir: 'asc', label: 'Product name' },
  { field: 'supplier', dir: 'asc', label: 'Supplier' },
  { field: 'status', dir: 'asc', label: 'Status' },
] as const;

const OFFER_TILE: Record<SupplierProductOffer, { icon: string; cls: string; label: string }> = {
  dropshipping: { icon: '🪂', cls: 'bg-sky-50 text-sky-700', label: 'Dropshipping' },
  wholesale: { icon: '📦', cls: 'bg-violet-50 text-violet-700', label: 'Wholesale' },
  white_label: { icon: '🏷️', cls: 'bg-amber-50 text-amber-700', label: 'White label' },
};

function statusBadge(s: SupplierProductStatus) {
  if (s === 'Active') return { cls: 'bg-emerald-50 text-emerald-700', icon: <CheckIcon /> };
  if (s === 'In Review') return { cls: 'bg-amber-50 text-amber-700', icon: <HourglassIcon /> };
  if (s === 'Declined') return { cls: 'bg-rose-50 text-rose-700', icon: <BanIcon /> };
  return { cls: 'bg-slate-100 text-slate-500', icon: <CircleIcon /> };
}

function ellipsisIcon({ className = '' }: { className?: string } = {}) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 144a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm0 144a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm0 160a32 32 0 1 0 0-64 32 32 0 1 0 0 64z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function CircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z" />
    </svg>
  );
}

export default function ChefProducts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SupplierProduct[]>([]);
  const [filtersInfo, setFiltersInfo] = useState<{ statuses: string[]; offers: string[]; shippings: string[] }>({ statuses: [], offers: [], shippings: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>(SORT_OPTIONS[0]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reload, setReload] = useState(0);

  const [statuses, setStatuses] = useState<string[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const [shipping, setShipping] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftOffers, setDraftOffers] = useState<string[]>([]);
  const [draftShipping, setDraftShipping] = useState<string[]>([]);
  const [draftVisibility, setDraftVisibility] = useState<'all' | 'visible' | 'hidden'>('all');

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionAssignments, setCollectionAssignments] = useState<Record<number, number[]>>({});
  const [picker, setPicker] = useState<{ productId: number; left: number; top: number } | null>(null);
  const [pickerQ, setPickerQ] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const [actionsMenu, setActionsMenu] = useState<{ productId: number; left: number; top: number } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    getCollections()
      .then((r) => setCollections(r.collections))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPicker(null);
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setLoading(true);
    searchSupplierProducts({
      page: page + 1,
      per_page: pageSize,
      q: debouncedQ || undefined,
      sort: sort.field,
      dir: sort.dir,
      statuses,
      offers,
      shipping: shipping.join(','),
      visibility: visibility === 'all' ? undefined : visibility,
    })
      .then((r: SupplierProductsResult) => {
        setRows(r.rows);
        setTotal(r.total);
        setFiltersInfo(r.filters);
        setCollectionAssignments((cur) => {
          const next: Record<number, number[]> = { ...cur };
          for (const row of r.rows) if (!(row.id in next)) next[row.id] = [...row.collection_ids];
          return next;
        });
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, sort, page, pageSize, statuses, offers, shipping, visibility, reload]);

  const openFilters = () => {
    setDraftStatuses(statuses);
    setDraftOffers(offers);
    setDraftShipping(shipping);
    setDraftVisibility(visibility);
    setFiltersOpen(true);
  };

  const openPicker = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerQ('');
    setPicker((cur) =>
      cur && cur.productId === productId ? null : { productId, left: Math.max(8, Math.min(rect.left, window.innerWidth - 420)), top: rect.bottom }
    );
  };

  const openActions = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionsMenu((cur) =>
      cur && cur.productId === productId ? null : { productId, left: Math.max(8, Math.min(rect.right - 200, window.innerWidth - 216)), top: rect.bottom }
    );
  };

  const assignedIds = (productId: number): number[] => collectionAssignments[productId] ?? [];
  const assignedTitles = (productId: number): string[] => {
    const map = new Map(collections.map((c) => [c.id, c.title]));
    return assignedIds(productId).map((id) => map.get(id) ?? `#${id}`).filter(Boolean);
  };

  const toggleCollection = (productId: number, collectionId: number) => {
    const curIds = assignedIds(productId);
    const adding = !curIds.includes(collectionId);
    const next = adding ? [...curIds, collectionId] : curIds.filter((x) => x !== collectionId);
    setCollectionAssignments((cur) => ({ ...cur, [productId]: next }));
    const action = adding ? addProductToCollection(collectionId, productId) : removeProductFromCollection(collectionId, productId);
    action
      .then(() => {
        setPage(0);
        setReload((n) => n + 1);
      })
      .catch((e) => {
        setCollectionAssignments((cur) => ({ ...cur, [productId]: curIds }));
        alert(apiErrorMessage(e));
      });
  };

  const pickerCollections = useMemo(() => {
    const query = pickerQ.trim().toLowerCase();
    return collections.filter((c) => !query || `${c.title} ${c.description}`.toLowerCase().includes(query));
  }, [collections, pickerQ]);

  const thumbCls = 'flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-2xl';

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 text-base font-bold text-slate-900">Supplier products</h5>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search"
                className="w-44 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>
            <select
              value={`${sort.field}:${sort.dir}`}
              onChange={(e) => {
                const o = SORT_OPTIONS.find((x) => `${x.field}:${x.dir}` === e.target.value);
                if (o) setSort(o);
                setPage(0);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={`${o.field}:${o.dir}`} value={`${o.field}:${o.dir}`}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={openFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <FunnelIcon className="text-sky-600" />
              Filter
            </button>
            <button type="button" title="Refresh" onClick={() => setReload((n) => n + 1)} className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <RotateIcon />
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
                <tr className="bg-slate-100">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="GID" sort />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Product" sort />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Is visible in marketplace" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Offer type" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Status" sort />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Shipping status" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Product Labels" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Collections" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Supplier" sort />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Supplier Labels" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">
                    <ThContent label="Created at" sort />
                  </th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-900">
                    <span>Toolbar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sb = statusBadge(r.status);
                  const offerTiles = (r.offer_type ?? []).map((o) => OFFER_TILE[o]).filter((t): t is (typeof OFFER_TILE)[SupplierProductOffer] => !!t);
                  const titles = assignedTitles(r.id);
                  return (
                    <tr key={r.id} className="border-b border-slate-100 odd:bg-slate-50/40 transition hover:bg-sky-50/40">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <a href="/chef/products" onClick={(e) => e.preventDefault()} className="cursor-pointer text-xs font-bold text-slate-900 hover:text-sky-600">
                          #{r.gid}
                        </a>
                      </td>
                      <td className="px-3 py-2.5" style={{ minWidth: 260 }}>
                        <div className="flex items-center gap-2.5">
                          {r.image_url ? (
                            <img src={r.image_url} alt={r.name} loading="lazy" className="h-[50px] w-[50px] shrink-0 rounded-xl border border-slate-100 bg-white object-cover" />
                          ) : (
                            <span className={thumbCls}>{r.emoji}</span>
                          )}
                          <button type="button" onClick={() => navigate(`/chef/supplier-organizations/${r.supplier_id}`)} className="max-w-[220px] text-left text-xs font-semibold text-slate-800 transition hover:text-sky-600">
                            <span className="line-clamp-2 break-words">{r.name}</span>
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.visible ? (
                          <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Visible</span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">Invisible</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex gap-1">
                          {offerTiles.map((t, i) => (
                            <span key={i} title={t.label} className={`inline-flex h-8 w-10 items-center justify-center rounded-lg border text-sm ${t.cls}`}>
                              {t.icon}
                            </span>
                          ))}
                          {offerTiles.length === 0 && <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${sb.cls}`}>
                          {sb.icon}
                          {r.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            r.shipping === 'Can be shipped' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {r.shipping === 'Can be shipped' ? <CircleIcon className="fill-current" /> : <XmarkIcon />}
                          {r.shipping}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" style={{ minWidth: 160 }}>
                        {r.product_labels.length ? (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {r.product_labels.map((l) => (
                              <span key={l} className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                {l}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {titles.map((t) => (
                            <span key={t} className="inline-flex max-w-[120px] truncate rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                              {t}
                            </span>
                          ))}
                          <button
                            type="button"
                            title="Add to collection"
                            onClick={(e) => openPicker(e, r.id)}
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-sky-300 bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                          >
                            <PlusIcon />
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <button type="button" onClick={() => navigate(`/chef/supplier-organizations/${r.supplier_id}`)} className="flex cursor-pointer items-center gap-2">
                          <Avatar name={r.supplier_name} size="h-8 w-8 text-[10px]" />
                          <span className="max-w-[140px] truncate text-xs font-semibold text-slate-700 hover:text-sky-600">{r.supplier_name}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.supplier_labels.length ? (
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {r.supplier_labels.map((l) => (
                              <span key={l} className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                {l}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">{clockSlot(r.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center">
                        <button type="button" title="Actions" onClick={(e) => openActions(e, r.id)} className="inline-flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
                          {ellipsisIcon()}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-14 text-center text-xs text-slate-400">
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

      {filtersOpen && (
        <FilterOverlay pos={{ left: 16, top: 140 }} width={320} onClose={() => setFiltersOpen(false)}>
          <div>
            <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Filters</div>
            <div className="mx-3 my-1 h-px bg-slate-100" />
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Status</div>
            <div className="max-h-[150px] overflow-y-auto px-2 py-0.5">
              {filtersInfo.statuses.map((o) => (
                <CheckRow key={o} checked={draftStatuses.includes(o)} onChange={() => setDraftStatuses((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]))}>
                  <span className="ml-2 text-[11px] font-medium text-slate-700">{o}</span>
                </CheckRow>
              ))}
            </div>
            <div className="mx-3 my-1 h-px bg-slate-100" />
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Offer type</div>
            <div className="px-2 py-0.5">
              {filtersInfo.offers.map((o) => (
                <CheckRow key={o} checked={draftOffers.includes(o)} onChange={() => setDraftOffers((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]))}>
                  <span className="ml-2 text-[11px] font-medium text-slate-700">{OFFER_TILE[o as SupplierProductOffer]?.label ?? o}</span>
                </CheckRow>
              ))}
            </div>
            <div className="mx-3 my-1 h-px bg-slate-100" />
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Shipping status</div>
            <div className="px-2 py-0.5">
              {filtersInfo.shippings.map((o) => (
                <CheckRow key={o} checked={draftShipping.includes(o)} onChange={() => setDraftShipping((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]))}>
                  <span className="ml-2 text-[11px] font-medium text-slate-700">{o}</span>
                </CheckRow>
              ))}
            </div>
            <div className="mx-3 my-1 h-px bg-slate-100" />
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Marketplace visibility</div>
            <div className="px-2 py-0.5">
              {(['all', 'visible', 'hidden'] as const).map((o) => (
                <CheckRow
                  key={o}
                  checked={draftVisibility === o}
                  onChange={() => setDraftVisibility(o)}
                >
                  <span className="ml-2 text-[11px] font-medium text-slate-700">{o === 'all' ? 'All' : o === 'visible' ? 'Visible' : 'Invisible'}</span>
                </CheckRow>
              ))}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <div className="flex items-center justify-between px-3 pb-2">
              <button
                type="button"
                onClick={() => {
                  setDraftStatuses([]);
                  setDraftOffers([]);
                  setDraftShipping([]);
                  setDraftVisibility('all');
                }}
                className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatuses(draftStatuses);
                  setOffers(draftOffers);
                  setShipping(draftShipping);
                  setVisibility(draftVisibility);
                  setPage(0);
                  setFiltersOpen(false);
                }}
                className="rounded-md bg-sky-500 px-4 py-1 text-[11px] font-bold text-white transition hover:bg-sky-600"
              >
                Apply filters
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}

      {picker && (
        <div ref={pickerRef} className="fixed z-[70]" style={{ left: picker.left, top: picker.top, minWidth: '25rem', maxHeight: '60vh' }}>
          <div className="flex max-h-[60vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <h6 className="mb-0 px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Select Collections</h6>
            <div className="px-3 pt-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
            </div>
            <div className="grid max-h-full grid-cols-2 content-start gap-2 overflow-y-auto px-3 py-2">
              {pickerCollections.map((c) => {
                const on = assignedIds(picker.productId).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCollection(picker.productId, c.id)}
                    className={`inline-flex min-w-0 items-center justify-start gap-1 rounded border px-2 py-1 text-left text-[10px] font-semibold transition ${
                      on
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {on && <CheckIcon className="shrink-0" />}
                    <span className="truncate">{c.title}</span>
                  </button>
                );
              })}
              {pickerCollections.length === 0 && (
                <div className="col-span-2 py-6 text-center text-[11px] text-slate-400">No collections found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {actionsMenu && (
        <div ref={actionsRef} className="fixed z-[70]" style={{ left: actionsMenu.left, top: actionsMenu.top }}>
          <div className="w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/chef/products/${actionsMenu.productId}`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <EyeIcon className="text-slate-400" />
              Preview
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert('Update the packing preferences coming soon.');
                setActionsMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <BoxIcon className="text-slate-400" />
              Update the packing preferences
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert('Update the shipping preferences coming soon.');
                setActionsMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <TruckIcon className="text-slate-400" />
              Update the shipping preferences
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert('Create copy from product coming soon.');
                setActionsMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <CopyIcon className="text-slate-400" />
              Create copy from product
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M384 336H192c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16l140.1 0L384 107.9V336zM416 352V107.9c0-12.7-5.1-24.9-14.1-33.9L369.9 14.1C360.9 5.1 348.7 0 336 0H192c-35.3 0-64 28.7-64 64v256c0 35.3 28.7 64 64 64H352c35.3 0 64-28.7 64-64zM64 128c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H256c35.3 0 64-28.7 64-64V416H272v32c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V192c0-8.8 7.2-16 16-16H96V128H64z" />
    </svg>
  );
}