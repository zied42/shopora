import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addProductToCollection,
  apiErrorMessage,
  Collection,
  FacetValue,
  FindProduct,
  FindProductsResult,
  FindProductType,
  getCollections,
  searchFindProducts,
  supportSearchFindProducts,
} from '../../lib/api';
import { Spinner } from '../../components/ui';
import { EyeIcon, InfoIcon, RotateIcon, SearchIcon } from './ui';

const PER_PAGE_OPTIONS = [5, 10, 20, 40, 100, 1000];
const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'activated_at_desc', label: 'Recently activated' },
  { value: 'price_asc', label: 'Price (Lowest)' },
  { value: 'price_desc', label: 'Price (Highest)' },
];

const TYPE_LABELS: Record<FindProductType, string> = {
  dropshipping: 'Dropshipping',
  wholesale: 'Wholesale',
  oem: 'OEM',
};

function ChevronIcon({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 320 512"
      fill="currentColor"
      aria-hidden="true"
      className={dir === 'next' ? 'rotate-180' : ''}
    >
      <path d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 278.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z" />
    </svg>
  );
}

function DoubleChevronIcon({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      className={dir === 'next' ? 'rotate-180' : ''}
    >
      <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
    </svg>
  );
}

function FilterCheckRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 transition hover:text-slate-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
      />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-slate-400">{count.toLocaleString('en-US')}</span>
    </label>
  );
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h6 className="mb-0 border-b border-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-900">{title}</h6>
      <div className="space-y-2.5 p-4">{children}</div>
    </div>
  );
}

function RangeRow({
  minValue,
  maxValue,
  onMin,
  onMax,
  onGo,
}: {
  minValue: string;
  maxValue: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  onGo: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={minValue}
        onChange={(e) => onMin(e.target.value)}
        placeholder="0"
        className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-500"
      />
      <span className="text-[10px] text-slate-400">to</span>
      <input
        value={maxValue}
        onChange={(e) => onMax(e.target.value)}
        placeholder="max"
        className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-500"
      />
      <button
        type="button"
        onClick={onGo}
        className="shrink-0 rounded-xl bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-700"
      >
        Go
      </button>
    </div>
  );
}

export default function ChefFindProducts({ basePath = '/chef/find-products', readonly = false }: { basePath?: string; readonly?: boolean }) {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? '';
  const perPage = Number(params.get('per_page') ?? 10);
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const [data, setData] = useState<FindProductsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedInStock, setSelectedInStock] = useState<string[]>([]);
  const [selectedExpress, setSelectedExpress] = useState<string[]>([]);
  const [selectedHigh, setSelectedHigh] = useState<string[]>([]);
  const [selectedReliable, setSelectedReliable] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedColls, setSelectedColls] = useState<string[]>([]);

  const [collSearch, setCollSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [collLimit, setCollLimit] = useState(6);
  const [catLimit, setCatLimit] = useState(6);

  const [minPrice, setMinPrice] = useState(params.get('price_min') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('price_max') ?? '');
  const [minQty, setMinQty] = useState(params.get('quantity_min') ?? '');
  const [maxQty, setMaxQty] = useState(params.get('quantity_max') ?? '');
  const [minRating, setMinRating] = useState(params.get('rating_min') ?? '');
  const [maxRating, setMaxRating] = useState(params.get('rating_max') ?? '');

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collPickerOpen, setCollPickerOpen] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const collPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (collPickerRef.current && !collPickerRef.current.contains(e.target as Node)) setCollPickerOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openCollPicker = (productId: number) => {
    if (collPickerOpen === productId) { setCollPickerOpen(null); return; }
    setCollPickerOpen(productId);
    if (collections.length === 0) {
      getCollections().then((r) => setCollections(r.collections ?? [])).catch(() => {});
    }
  };

  const handleAddToCollection = async (collectionId: number, productId: number) => {
    setAddingTo(productId);
    try {
      await addProductToCollection(collectionId, productId);
      const collName = collections.find((c) => c.id === collectionId)?.title;
      if (collName && data) {
        setData({
          ...data,
          hits: data.hits.map((h) =>
            h.id === productId && !h.collections.includes(collName)
              ? { ...h, collections: [...h.collections, collName] }
              : h
          ),
        });
      }
      setCollPickerOpen(null);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setAddingTo(null);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────
  const addParam = (key: string, value: string | number | undefined, resetPage = true) => {
    const p = new URLSearchParams(params);
    if (value === undefined || value === '' || Number(value) === 0) p.delete(key);
    else p.set(key, String(value));
    if (resetPage) p.delete('page');
    setParams(p, { replace: true });
  };

  const toggleArr = (arr: string[], set: (a: string[]) => void) => (v: string) => {
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    set(next);
    return next;
  };

  // ── load data ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const search = readonly ? supportSearchFindProducts : searchFindProducts;
    search({
      page,
      per_page: perPage,
      q: q || undefined,
      sort: sort || undefined,
      type: selectedTypes.length ? (selectedTypes.join(',') as FindProductType) : undefined,
      in_stock: selectedInStock.length ? (selectedInStock.join(',') as 'true' | 'false') : undefined,
      shipper_express: selectedExpress.length ? (selectedExpress.join(',') as 'true' | 'false') : undefined,
      high_rating: selectedHigh.length ? (selectedHigh.join(',') as 'true' | 'false') : undefined,
      reliable_fulfillment: selectedReliable.length ? (selectedReliable.join(',') as 'true' | 'false') : undefined,
      category: selectedCat || undefined,
      collections: selectedColls.length ? selectedColls.join(',') : undefined,
      price_min: params.get('price_min') ? Number(params.get('price_min')) : undefined,
      price_max: params.get('price_max') ? Number(params.get('price_max')) : undefined,
      rating_min: params.get('rating_min') ? Number(params.get('rating_min')) : undefined,
      rating_max: params.get('rating_max') ? Number(params.get('rating_max')) : undefined,
      quantity_min: params.get('quantity_min') ? Number(params.get('quantity_min')) : undefined,
      quantity_max: params.get('quantity_max') ? Number(params.get('quantity_max')) : undefined,
    })
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, reload, q, sort, selectedTypes, selectedInStock, selectedExpress, selectedHigh, selectedReliable, selectedCat, selectedColls, params]);

  const pages = useMemo(() => Math.max(1, Math.ceil((data?.total ?? 0) / perPage)), [data, perPage]);
  const visiblePages = useMemo(() => {
    const wanted = 7;
    let start = Math.max(1, Math.min(page - Math.floor(wanted / 2), Math.max(1, pages - wanted + 1)));
    return Array.from({ length: Math.min(wanted, pages) }, (_, i) => start + i);
  }, [page, pages]);

  const visibleColls = useMemo(() => {
    const list = data?.facets.collections ?? [];
    const s = collSearch.trim().toLowerCase();
    const filtered = s ? list.filter((c) => c.value.toLowerCase().includes(s)) : list;
    return { list: filtered.slice(0, collLimit), total: filtered.length };
  }, [data, collSearch, collLimit]);

  const visibleCats = useMemo(() => {
    const list = data?.facets.categories ?? [];
    const s = catSearch.trim().toLowerCase();
    const filtered = s ? list.filter((c) => c.value.toLowerCase().includes(s)) : list;
    return { list: filtered.slice(0, catLimit), total: filtered.length };
  }, [data, catSearch, catLimit]);

  const toggleType = (v: string) => {
    const next = toggleArr(selectedTypes, setSelectedTypes)(v);
    addParam('type', next.join(','));
  };
  const toggleInStock = (v: string) => {
    const next = toggleArr(selectedInStock, setSelectedInStock)(v);
    addParam('in_stock', next.join(','));
  };
  const toggleExpress = (v: string) => {
    const next = toggleArr(selectedExpress, setSelectedExpress)(v);
    addParam('shipper_express', next.join(','));
  };
  const toggleHigh = (v: string) => {
    const next = toggleArr(selectedHigh, setSelectedHigh)(v);
    addParam('high_rating', next.join(','));
  };
  const toggleReliable = (v: string) => {
    const next = toggleArr(selectedReliable, setSelectedReliable)(v);
    addParam('reliable_fulfillment', next.join(','));
  };
  const toggleColl = (v: string) => {
    const next = toggleArr(selectedColls, setSelectedColls)(v);
    addParam('collections', next.join(','));
  };

  const applyPrice = () => {
    addParam('price_min', minPrice || undefined);
    addParam('price_max', maxPrice || undefined);
  };
  const applyRating = () => {
    addParam('rating_min', minRating || undefined);
    addParam('rating_max', maxRating || undefined);
  };
  const applyQty = () => {
    addParam('quantity_min', minQty || undefined);
    addParam('quantity_max', maxQty || undefined);
  };

  const statLine = data
    ? `${data.total.toLocaleString('en-US')}${q ? ` results for “${q}”` : ' products'} found in ${data.ms}ms`
    : '';

  const maxPriceHolder = data?.facets.price.max ? String(Math.round(data.facets.price.max)) : '150510';

  return (
    <div>
      {/* Top row — searchbox + actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => addParam('q', e.target.value || undefined)}
            placeholder="Search for products"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            title="Refresh"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateIcon />
            Refresh
          </button>
          {!readonly && (
            <button
              type="button"
              onClick={() => alert('The product catalog is displayed as in the Falcon marketplace.')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <InfoIcon />
              Add product to my catalog
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left panel — filters */}
        <div className="space-y-4 lg:col-span-3">
          <FilterCard title="Product Type">
            {(data?.facets.productType ?? []).map((f: FacetValue) => (
              <FilterCheckRow
                key={f.value}
                label={TYPE_LABELS[f.value as FindProductType] ?? f.value}
                count={f.count}
                checked={selectedTypes.includes(f.value)}
                onToggle={() => toggleType(f.value)}
              />
            ))}
          </FilterCard>

          <FilterCard title="In Stock">
            {(data?.facets.inStock ?? []).map((f) => (
              <FilterCheckRow
                key={`stock-${f.value}`}
                label={f.value === 'true' ? 'In stock' : 'Out of stock'}
                count={f.count}
                checked={selectedInStock.includes(f.value)}
                onToggle={() => toggleInStock(f.value)}
              />
            ))}
          </FilterCard>

          <FilterCard title="Shipper Express">
            {(data?.facets.shipperExpress ?? []).map((f) => (
              <FilterCheckRow
                key={`expr-${f.value}`}
                label={f.value === 'true' ? 'Express delivery' : 'Standard'}
                count={f.count}
                checked={selectedExpress.includes(f.value)}
                onToggle={() => toggleExpress(f.value)}
              />
            ))}
          </FilterCard>

          <FilterCard title="Collections">
            {data && (
              <>
                <input
                  value={collSearch}
                  onChange={(e) => {
                    setCollSearch(e.target.value);
                    setCollLimit(6);
                  }}
                  placeholder="Search for collections…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-500"
                />
                <div className="space-y-2.5">
                  {visibleColls.list.map((f) => (
                    <FilterCheckRow
                      key={`coll-${f.value}`}
                      label={f.value}
                      count={f.count}
                      checked={selectedColls.includes(f.value)}
                      onToggle={() => toggleColl(f.value)}
                    />
                  ))}
                  {visibleColls.list.length === 0 && <p className="text-[11px] text-slate-400">No collections found</p>}
                </div>
                {visibleColls.total > 6 && (
                  <button
                    type="button"
                    onClick={() => setCollLimit((n) => (n >= visibleColls.total ? 6 : visibleColls.total))}
                    className="text-[11px] font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    {collLimit >= visibleColls.total ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </FilterCard>

          <FilterCard title="Categories">
            {data && (
              <>
                <input
                  value={catSearch}
                  onChange={(e) => {
                    setCatSearch(e.target.value);
                    setCatLimit(6);
                  }}
                  placeholder="Search for categories…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-500"
                />
                <div className="space-y-2.5">
                  {visibleCats.list.map((f) => (
                    <label key={`cat-${f.value}`} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 transition hover:text-slate-900">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCat === f.value}
                        onChange={() => {
                          setSelectedCat(f.value);
                          addParam('category', f.value);
                        }}
                        className="h-3.5 w-3.5 accent-brand-600"
                      />
                      <span className="flex-1 truncate">{f.value}</span>
                      <span className="text-slate-400">{f.count}</span>
                    </label>
                  ))}
                </div>
                {visibleCats.total > 6 && (
                  <button
                    type="button"
                    onClick={() => setCatLimit((n) => (n >= visibleCats.total ? 6 : visibleCats.total))}
                    className="text-[11px] font-semibold text-brand-600 transition hover:text-brand-700"
                  >
                    {catLimit >= visibleCats.total ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </FilterCard>

          <FilterCard title="Price">
            <RangeRow minValue={minPrice} maxValue={maxPrice} onMin={setMinPrice} onMax={setMaxPrice} onGo={applyPrice} />
            <p className="mb-0 text-[10px] text-slate-400">Max: {maxPriceHolder}</p>
          </FilterCard>

          <FilterCard title="Quantity">
            <RangeRow minValue={minQty} maxValue={maxQty} onMin={setMinQty} onMax={setMaxQty} onGo={applyQty} />
          </FilterCard>

          <FilterCard title="Rating">
            <RangeRow minValue={minRating} maxValue={maxRating} onMin={setMinRating} onMax={setMaxRating} onGo={applyRating} />
          </FilterCard>

          <FilterCard title="Up-to-date Stocks">
            <FilterCheckRow
              label="Only up-to-date stock"
              count={data?.facets.upToDateStocks[0]?.count ?? 0}
              checked={false}
              onToggle={() => {}}
            />
          </FilterCard>

          <FilterCard title="High Rating Products">
            {(data?.facets.highRating ?? []).map((f) => (
              <FilterCheckRow
                key={`high-${f.value}`}
                label={f.value === 'true' ? 'High rating products' : 'Others'}
                count={f.count}
                checked={selectedHigh.includes(f.value)}
                onToggle={() => toggleHigh(f.value)}
              />
            ))}
          </FilterCard>

          <FilterCard title="Reliable Fulfillment">
            {(data?.facets.reliableFulfillment ?? []).map((f) => (
              <FilterCheckRow
                key={`rel-${f.value}`}
                label={f.value === 'true' ? 'Reliable fulfillment' : 'Others'}
                count={f.count}
                checked={selectedReliable.includes(f.value)}
                onToggle={() => toggleReliable(f.value)}
              />
            ))}
          </FilterCard>
        </div>

        {/* Right panel — hits */}
        <div className="space-y-3 lg:col-span-9">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <p className="mb-0 flex-1 text-xs text-slate-600">{loading ? 'Loading…' : statLine}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">Hits per page:</span>
              <select
                value={perPage}
                onChange={(e) => addParam('per_page', e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => addParam('sort', e.target.value || undefined)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-[11px] text-slate-400">Page {page} of {pages}</span>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            ) : (data?.hits ?? []).length ? (
              (data?.hits ?? []).map((h, i) => (
                <HitCard
                  key={`${h.uuid}-${i}`}
                  hit={h}
                  collections={collections}
                  collPickerOpen={collPickerOpen}
                  addingTo={addingTo}
                  basePath={basePath}
                  readonly={readonly}
                  onOpenPicker={openCollPicker}
                  onAddToCollection={handleAddToCollection}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400">
                No products found for the selected filters.
              </div>
            )}
          </div>

          <Pager page={page} pages={pages} visiblePages={visiblePages} onGo={(p) => addParam('page', p !== 1 ? p : undefined)} />
        </div>
      </div>
    </div>
  );
}

function Pager({ page, pages, visiblePages, onGo }: { page: number; pages: number; visiblePages: number[]; onGo: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onGo(1)}
        className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="First page"
      >
        <DoubleChevronIcon dir="prev" />
      </button>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onGo(page - 1)}
        className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="Previous page"
      >
        <ChevronIcon dir="prev" />
      </button>
      {visiblePages[0]! > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
      {visiblePages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onGo(p)}
          className={`min-w-7 rounded-xl px-2 py-1 text-xs font-semibold transition ${
            p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {p}
        </button>
      ))}
      {visiblePages[visiblePages.length - 1]! < pages && <span className="px-1 text-xs text-slate-400">…</span>}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onGo(page + 1)}
        className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="Next page"
      >
        <ChevronIcon dir="next" />
      </button>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onGo(pages)}
        className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="Last page"
      >
        <DoubleChevronIcon dir="next" />
      </button>
    </div>
  );
}

function HitCard({ hit, collections, collPickerOpen, addingTo, basePath = '/chef/find-products', readonly = false, onOpenPicker, onAddToCollection }: {
  hit: FindProduct;
  collections: Collection[];
  collPickerOpen: number | null;
  addingTo: number | null;
  basePath?: string;
  readonly?: boolean;
  onOpenPicker: (productId: number) => void;
  onAddToCollection: (collectionId: number, productId: number) => void;
}) {
  const navigate = useNavigate();
  const collPickerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        {hit.image ? (
          <img src={hit.image} alt={hit.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl text-slate-300">📦</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h5 className="mb-0 text-sm font-bold text-slate-900">{hit.name}</h5>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled
              title="Edit"
              className="inline-flex cursor-not-allowed items-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-300"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              title="Preview"
              onClick={() => navigate(`${basePath}/${hit.uuid}`)}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
            >
              <EyeIcon />
            </button>
          </div>
        </div>

        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{hit.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Collections:</span>
            {hit.collections.length ? (
              hit.collections.map((c) => (
                <span key={c} className="inline-flex rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">{c}</span>
              ))
            ) : (
              <span className="text-slate-300">—</span>
            )}
            {!readonly && (
              <div className="relative" ref={collPickerRef}>
                <button
                  type="button"
                  title="Add to collection"
                  onClick={() => onOpenPicker(hit.id)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-brand-300 text-[11px] font-bold text-brand-600 transition hover:bg-brand-100"
                >
                  +
                </button>
                {collPickerOpen === hit.id && (
                  <div className="absolute left-0 top-6 z-30 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-900">Add to collection</div>
                    <div className="max-h-48 overflow-y-auto">
                      {collections.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400">No collections yet</div>
                      ) : (
                        collections.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={addingTo === hit.id}
                            onClick={() => onAddToCollection(c.id, hit.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-slate-700 transition hover:bg-brand-50 disabled:opacity-50"
                          >
                            <span className="flex-1 truncate font-medium">{c.title}</span>
                            {addingTo === hit.id ? (
                              <span className="text-[10px] text-slate-400">Adding…</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-brand-600">+ Add</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            Category: <span className="font-semibold text-slate-700">{hit.hierarchicalCategories ?? hit.category}</span>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          <span className={`font-semibold ${hit.in_stock ? 'text-emerald-600' : 'text-rose-600'}`}>
            {hit.in_stock ? `In stock (${hit.quantity})` : 'Out of Stock'}
          </span>
          <span className="rounded-xl bg-brand-50 px-2 py-0.5 font-bold text-brand-700">{tnd(hit.price)}</span>
          <span className="text-[11px] text-slate-400">{TYPE_LABELS[hit.type]}</span>
        </div>
      </div>
    </div>
  );
}

function tnd(n: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' TND';
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}