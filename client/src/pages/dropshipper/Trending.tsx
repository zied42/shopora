import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, money, TrendingItem } from '../../lib/api';
import { Badge, EmptyState } from '../../components/ui';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const RANK_STYLE: Record<number, string> = {
  0: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-400/25',
  1: 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800',
  2: 'bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100',
};

const PAGE_SIZES = [12, 24, 48, 60];

type TrendSort = 'score' | 'confirmed' | 'created' | 'rating' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { id: TrendSort; label: string }[] = [
  { id: 'score', label: 'Win Score' },
  { id: 'confirmed', label: 'Most Confirmed' },
  { id: 'created', label: 'Most Orders' },
  { id: 'rating', label: 'Highest Rating' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
];

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

// ============================================================================
// COMPONENTS: TREND CARD (COMPACT)
// ============================================================================

interface TrendCardProps {
  item: TrendingItem;
  rank: number;
  list: boolean;
  onOpen: () => void;
}

function TrendCard({ item, rank, list, onOpen }: TrendCardProps) {
  const isTopRank = rank < 3;

  // Compact image block
  const imageBlock = (
    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
      {item.image_url ? (
        <>
          <img
            src={item.image_url}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent" />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-3xl text-slate-300">📦</div>
      )}

      {/* Rank Badge - Smaller */}
      <span
        className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ${
          isTopRank ? RANK_STYLE[rank] : 'bg-slate-100 text-slate-600'
        }`}
      >
        {rank + 1}
      </span>

      {/* Hot indicator - Smaller */}
      {isTopRank && (
        <span className="absolute right-2 top-2 text-sm drop-shadow-lg">🔥</span>
      )}

      {/* Stock badge - Smaller */}
      <div className="absolute bottom-2 left-2" onClick={(e) => e.stopPropagation()}>
        {!item.best.stock && <Badge tone="red" className="text-[8px] px-1.5 py-0.5">Out of stock</Badge>}
      </div>

      {/* Supplier count - Smaller */}
      <div className="absolute bottom-2 right-2">
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-medium text-white backdrop-blur-sm">
          {item.offers} {item.offers > 1 ? 'src' : 'src'}
        </span>
      </div>
    </div>
  );

  // Compact body
  const body = (
    <div className="flex flex-1 flex-col p-2.5 gap-1">
      {/* Supplier - Compact */}
      <div className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand-100 text-[8px] font-bold text-brand-700 uppercase">
          {(item.best.fournisseur_name ?? '?').charAt(0)}
        </span>
        <span className="truncate text-[10px] font-medium text-slate-500">{item.best.fournisseur_name}</span>
      </div>

      {/* Product name - Compact */}
      <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-900 min-h-[2rem]">
        {truncateText(item.name, 60)}
      </h3>

      {/* Rating - Compact */}
      <div className="flex items-center gap-1 text-[10px]">
        <span className="tracking-wide text-amber-400">{'★★★★★'.slice(0, Math.max(1, Math.round(item.rating)))}</span>
        <span className="font-semibold text-slate-700">{item.rating.toFixed(1)}</span>
        <span className="text-slate-400">({formatNumber(item.rating_count)})</span>
      </div>

      {/* Price & Stock - Compact */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-sm font-bold text-slate-900">{money(item.best.price)}</span>
        {item.best.stock > 0 && (
          <span className="text-[8px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            {formatNumber(item.best.stock)}
          </span>
        )}
      </div>

      {/* Stats - Compact horizontal */}
      <div className="flex items-center gap-3 mt-1 pt-1.5 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-emerald-600">{formatNumber(item.confirmed)}</span>
          <span className="text-[8px] text-slate-400">✓</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-700">{formatNumber(item.created)}</span>
          <span className="text-[8px] text-slate-400">📦</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-bold ${item.returns > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatNumber(item.returns)}
          </span>
          <span className="text-[8px] text-slate-400">↩</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[9px] font-bold text-brand-600">{item.score.toFixed(1)}</span>
          <span className="text-[7px] font-medium text-slate-400 uppercase">Score</span>
        </div>
      </div>

      {/* Profit - Compact */}
      <div className="flex items-center justify-end mt-0.5">
        <span className="text-[8px] font-medium text-slate-400">Profit:</span>
        <span className="text-[10px] font-bold text-emerald-600 ml-1">+{money(item.profit)}</span>
      </div>
    </div>
  );

  if (list) {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
      >
        <div className="relative w-28 shrink-0 cursor-pointer sm:w-32">{imageBlock}</div>
        <div className="flex min-w-0 flex-1 items-center p-2">{body}</div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      {imageBlock}
      {body}
    </div>
  );
}

// ============================================================================
// COMPONENTS: TOOLBAR
// ============================================================================

interface ToolbarProps {
  totalResults: number;
  searchQuery: string;
  sort: TrendSort;
  view: 'grid' | 'list';
  onSortChange: (sort: TrendSort) => void;
  onViewChange: (view: 'grid' | 'list') => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function Toolbar({
  totalResults,
  searchQuery,
  sort,
  view,
  onSortChange,
  onViewChange,
  onClearSearch,
  onRefresh,
  isRefreshing,
}: ToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-medium text-slate-600">
        <span className="font-semibold text-slate-900">{formatNumber(totalResults)}</span>
        {' winning products'}
        {searchQuery && (
          <>
            {' '}
            <span className="font-normal text-slate-400">for</span>
            {' '}
            <span className="font-medium text-slate-700">“{searchQuery}”</span>
            <button
              onClick={onClearSearch}
              className="ml-1.5 text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:underline transition"
            >
              Clear
            </button>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>

        <span className="text-[10px] font-medium text-slate-400">Sort</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TrendSort)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            onClick={() => onViewChange('grid')}
            title="Grid view"
            className={`flex h-8 w-8 items-center justify-center text-xs transition ${
              view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            ▦
          </button>
          <button
            onClick={() => onViewChange('list')}
            title="List view"
            className={`flex h-8 w-8 items-center justify-center text-xs transition ${
              view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTS: PAGINATION
// ============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
  startItem: number;
  endItem: number;
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizes,
  startItem,
  endItem,
}: PaginationProps) {
  const pageNumbers = useMemo(() => {
    const set = new Set<number>([1, 2, totalPages - 1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [totalPages, currentPage]);

  if (totalPages <= 1 && totalItems <= pageSizes[0]) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-700">{startItem}–{endItem}</span>
        {' of '}
        <span className="font-semibold text-slate-700">{formatNumber(totalItems)}</span>
      </p>

      <div className="flex items-center gap-0.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>

        {pageNumbers.map((n, i, arr) => (
          <span key={n} className="flex items-center gap-0.5">
            {i > 0 && arr[i - 1] !== n - 1 && (
              <span className="px-1 text-[10px] text-slate-400">…</span>
            )}
            <button
              onClick={() => onPageChange(n)}
              className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
                n === currentPage
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {n}
            </button>
          </span>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium text-slate-400">Show</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        >
          {pageSizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DsTrending() {
  // State
  const [items, setItems] = useState<TrendingItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<TrendSort>('score');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
      apiGet<TrendingItem[]>('/products/trending?limit=50')
        .then(setItems)
        .catch((e) => alert(apiErrorMessage(e)));
    }, []);
  // Data loading
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const data = await apiGet<TrendingItem[]>('/products/trending?limit=100');
      setItems(data);
    } catch (error) {
      alert(apiErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Filtering & sorting
  const filtered = useMemo(() => {
    let list = (items ?? []).filter((item) => {
      if (!searchQuery) return true;
      const hay = `${item.name} ${item.best.fournisseur_name ?? ''}`.toLowerCase();
      return hay.includes(searchQuery.toLowerCase());
    });

    switch (sort) {
      case 'confirmed':
        list = [...list].sort((a, b) => b.confirmed - a.confirmed || b.score - a.score);
        break;
      case 'created':
        list = [...list].sort((a, b) => b.created - a.created || b.confirmed - a.confirmed);
        break;
      case 'rating':
        list = [...list].sort((a, b) => b.rating - a.rating || b.rating_count - a.rating_count);
        break;
      case 'price_asc':
        list = [...list].sort((a, b) => a.best.price - b.best.price);
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => b.best.price - a.best.price);
        break;
      default:
        list = [...list].sort((a, b) => b.score - a.score);
    }

    return list;
  }, [items, searchQuery, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);
  const pageItems = useMemo(() => 
    filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sort, pageSize]);

  const handleRefresh = () => {
    loadData(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-full bg-slate-50">
      {/* ================= HEADER - COMPACT ================= */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
            <Link to="/dropshipper" className="hover:text-slate-700 transition">Dashboard</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Trending</span>
          </nav>

          {/* Main header - Compact */}
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <div className="shrink-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Trending Products</h1>
              <p className="text-[11px] text-slate-500">
                {items ? `${formatNumber(items.length)} winning products` : 'Loading...'}
                {' · Top performing items'}
              </p>
            </div>

            {/* Search - Compact */}
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
              <span className="text-slate-400 text-xs">🔥</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trending products..."
                className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="Search trending products"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Stats summary - Compact */}
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                onClick={() => {
                  setItems(null);
                  apiGet<TrendingItem[]>('/products/trending?limit=50')
                    .then(setItems)
                    .catch((e) => alert(apiErrorMessage(e)));
                }}

                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <Toolbar
          totalResults={filtered.length}
          searchQuery={searchQuery}
          sort={sort}
          view={view}
          onSortChange={setSort}
          onViewChange={setView}
          onClearSearch={() => setSearchQuery('')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Loading state */}
        {!items && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
              <p className="text-xs font-medium text-slate-500">Loading trending products…</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {items && items.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white">
            <EmptyState 
              icon="🔥" 
              title="No trending products found" 
              hint="Check back later for new winning products." 
            />
          </div>
        )}

        {/* No results */}
        {items && items.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white">
            <EmptyState 
              icon="🔍" 
              title="No matches found" 
              hint="Try adjusting your search term to find what you're looking for." 
            />
            <div className="pb-6 text-center">
              <button
                onClick={() => setSearchQuery('')}
                className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 shadow-sm"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Products grid - Compact */}
        {items && items.length > 0 && filtered.length > 0 && (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6">
                {pageItems.map((item, index) => (
                  <TrendCard
                    key={item.key}
                    item={item}
                    rank={(safePage - 1) * pageSize + index}
                    list={false}
                    onOpen={() => navigate(`/dropshipper/store/${item.best.product_id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pageItems.map((item, index) => (
                  <TrendCard
                    key={item.key}
                    item={item}
                    rank={(safePage - 1) * pageSize + index}
                    list={true}
                    onOpen={() => navigate(`/dropshipper/store/${item.best.product_id}`)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizes={PAGE_SIZES}
              startItem={startItem}
              endItem={endItem}
            />
          </>
        )}
      </main>
    </div>
  );
}