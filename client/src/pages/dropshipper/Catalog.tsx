import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPost, apiDelete, money, Product, SavedProduct, STORE_SORTS, StoreSort, PRODUCT_CATEGORIES, PRODUCT_CATEGORY_TREE, ProductCategory } from '../../lib/api';
import { Badge, EmptyState } from '../../components/ui';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const recommendedScore = (p: Product) =>
  (p.rating ?? 0) * 3 +
  Math.min(p.rating_count ?? 0, 50) * 0.1 +
  ((p.stats?.created ?? 0) * 0.6) -
  ((p.stats?.returns ?? 0) * 2);

const PAGE_SIZES = [12, 24, 48, 96];

const CATEGORIES = PRODUCT_CATEGORY_TREE.map((n) => n.name);

const RATINGS = [
  { min: 4.5, stars: '★★★★★', label: '4.5 & up' },
  { min: 4.0, stars: '★★★★☆', label: '4.0 & up' },
  { min: 3.5, stars: '★★★☆☆', label: '3.5 & up' },
  { min: 3.0, stars: '★★★☆☆', label: '3.0 & up' },
];

const DISCOUNT_RANGES = [10, 20, 30, 40, 50];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function productImages(p: Product): string[] {
  const list = (p.images && p.images.length ? p.images : p.image_url ? [p.image_url] : []).filter(Boolean);
  return list;
}

const departmentOf = (p: Product) => (p.retail_category ?? '').split(' > ')[0] || 'Other';

const marginOf = (p: Product) => (p.price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0);

function priceBuckets(products: Product[]) {
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  if (prices.length === 0) return [];
  const min = prices[0];
  const max = prices[prices.length - 1];
  if (min === max) return [{ min, max, label: money(min) }];
  const step = (max - min) / 4;
  const buckets: { min: number; max: number; label: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const lo = min + step * i;
    const hi = i === 3 ? max : min + step * (i + 1);
    buckets.push({ min: Math.round(lo), max: Math.round(hi), label: `${money(Math.round(lo))} – ${money(Math.round(hi))}` });
  }
  return buckets;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// ============================================================================
// COMPONENTS: FILTERS
// ============================================================================

function FilterCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50">
        <h6 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</h6>
      </div>
      <div className="space-y-2.5 p-4">{children}</div>
    </div>
  );
}

function FilterCheck({ 
  label, 
  count, 
  checked, 
  onChange, 
  disabled = false,
  className = '' 
}: { 
  label: string; 
  count?: number; 
  checked: boolean; 
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`group flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 transition hover:text-slate-900 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 transition disabled:opacity-50"
      />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {formatNumber(count)}
        </span>
      )}
    </label>
  );
}

function FilterRatingRow({ stars, label, checked, onChange }: { stars: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 transition hover:text-slate-900">
      <input
        type="radio"
        name="rating"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
      />
      <span className="tracking-wide text-amber-400 text-sm">{stars}</span>
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ============================================================================
// COMPONENTS: PRODUCT CARD
// ============================================================================

interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  busy: boolean;
  list: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  onQuickView?: () => void;
}

function ProductCard({ product, isSaved, busy, list, onOpen, onToggleSave }: ProductCardProps) {
  const images = useMemo(() => productImages(product), [product]);
  const ordered = product.stats?.created ?? 0;
  const hot = (product.stats?.confirmed ?? 0) >= 3;
  const margin = marginOf(product);
  const hasDiscount = margin > 0;

  const priceBlock = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
      <span className="text-lg font-bold text-slate-900 sm:text-xl">{money(product.price)}</span>
      {product.cost_price > 0 && product.cost_price < product.price && (
        <span className="text-sm text-slate-400 line-through">{money(product.cost_price)}</span>
      )}
      {hasDiscount && (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
          -{margin}%
        </span>
      )}
    </div>
  );

  const supplierBadge = (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-100 text-[10px] font-bold text-brand-700 uppercase">
        {(product.fournisseur_name ?? '?').charAt(0)}
      </span>
      <span className="truncate text-xs font-medium text-slate-500">{product.fournisseur_name}</span>
    </div>
  );

  const ratingBlock = (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-amber-400">★</span>
      <span className="font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
      <span className="text-slate-400">({formatNumber(product.rating_count)})</span>
    </div>
  );

  const soldBlock = (
    <span className="text-[10px] font-medium text-slate-400">
      {ordered > 0 ? `${formatNumber(ordered)} sold` : 'New'}
    </span>
  );

  const stockBadge = (
    <div onClick={(e) => e.stopPropagation()}>
      {product.stock === 0 ? (
        <Badge tone="red">Out of stock</Badge>
      ) : product.stock < 20 ? (
        <Badge tone="amber">Low stock</Badge>
      ) : (
        <Badge tone="green">{formatNumber(product.stock)} in stock</Badge>
      )}
    </div>
  );

  const actionButton = (
    <button
      disabled={busy || product.stock === 0}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSave();
      }}
      className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-4 sm:px-4 sm:py-2.5 sm:text-sm ${
        isSaved
          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md'
      }`}
    >
      {busy ? (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Processing…
        </span>
      ) : isSaved ? (
        '✓ Added to list'
      ) : (
        'Add to list'
      )}
    </button>
  );

  const imageBlock = (
    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
      {images[0] ? (
        <>
          <img
            src={images[0]}
            alt={product.name}
            onClick={onOpen}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/50 to-transparent" />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 flex gap-1">
              {images.slice(0, 3).map((_, idx) => (
                <span key={idx} className="h-1.5 w-1.5 rounded-full bg-white/60" />
              ))}
            </div>
          )}
        </>
      ) : (
        <button onClick={onOpen} className="flex h-full w-full items-center justify-center text-5xl text-slate-300 hover:text-slate-400 transition">
          📦
        </button>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
        {hot && (
          <span className="rounded bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            ⚡ Popular
          </span>
        )}
        {hasDiscount && margin >= 30 && (
          <span className="rounded bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {margin}% off
          </span>
        )}
      </div>

      <div className="absolute right-3 top-3">{stockBadge}</div>
    </div>
  );

  if (list) {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
      >
        <div className="relative w-40 shrink-0 cursor-pointer sm:w-52">{imageBlock}</div>
        <div className="flex min-w-0 flex-1 items-center p-5 sm:p-6">
          <div className="flex flex-1 flex-col gap-1">
            {supplierBadge}
            <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
              {product.name}
            </h3>
            {ratingBlock}
            <div className="mt-2">{priceBlock}</div>
            {soldBlock}
          </div>
          <div className="ml-6 hidden sm:flex sm:flex-col sm:items-end sm:gap-3">
            {priceBlock}
            <span className="text-xs text-slate-400">{formatNumber(product.stock)} in stock</span>
            {actionButton}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      {imageBlock}
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        {supplierBadge}
        <h3 className="mt-2.5 line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-slate-900">
          {product.name}
        </h3>
        {ratingBlock}
        <div className="mt-3">{priceBlock}</div>
        {soldBlock}
        {actionButton}
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

  const renderPageButton = (n: number) => (
    <button
      key={n}
      onClick={() => onPageChange(n)}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition ${
        n === currentPage
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {n}
    </button>
  );

  if (totalPages <= 1 && totalItems <= pageSizes[0]) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-700">{startItem}–{endItem}</span>
        {' of '}
        <span className="font-semibold text-slate-700">{formatNumber(totalItems)}</span>
        {' results'}
      </p>

      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>

        {pageNumbers.map((n, i, arr) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && arr[i - 1] !== n - 1 && (
              <span className="px-1 text-xs text-slate-400">…</span>
            )}
            {renderPageButton(n)}
          </span>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-400">Show</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
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
// COMPONENTS: TOOLBAR
// ============================================================================

interface ToolbarProps {
  totalResults: number;
  searchQuery: string;
  sort: StoreSort;
  view: 'grid' | 'list';
  onSortChange: (sort: StoreSort) => void;
  onViewChange: (view: 'grid' | 'list') => void;
  onClearSearch: () => void;
}

function Toolbar({ totalResults, searchQuery, sort, view, onSortChange, onViewChange, onClearSearch }: ToolbarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-600">
        <span className="font-semibold text-slate-900">{formatNumber(totalResults)}</span>
        {' result'}{totalResults !== 1 ? 's' : ''}
        {searchQuery && (
          <>
            {' '}
            <span className="font-normal text-slate-400">for</span>
            {' '}
            <span className="font-medium text-slate-700">“{searchQuery}”</span>
            <button
              onClick={onClearSearch}
              className="ml-2 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Clear
            </button>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-400">Sort by</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as StoreSort)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        >
          {STORE_SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            onClick={() => onViewChange('grid')}
            title="Grid view"
            className={`flex h-9 w-9 items-center justify-center text-sm transition ${
              view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            ▦
          </button>
          <button
            onClick={() => onViewChange('list')}
            title="List view"
            className={`flex h-9 w-9 items-center justify-center text-sm transition ${
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
// MAIN COMPONENT
// ============================================================================

export default function DsCatalog() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<StoreSort>('recommended');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [department, setDepartment] = useState('All');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [ratingMin, setRatingMin] = useState(0);
  const [priceFilters, setPriceFilters] = useState<boolean[]>([false, false, false, false]);
  const [discountFilters, setDiscountFilters] = useState<boolean[]>([false, false, false, false, false]);
  const [busy, setBusy] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const navigate = useNavigate();
  const filterRef = useRef<HTMLDivElement>(null);

  // Data loading
  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<Product[]>('/products'),
      apiGet<SavedProduct[]>('/products/saved')
    ])
      .then(([productsData, savedData]) => {
        setProducts(productsData);
        setSaved(savedData.map((s) => s.product.id));
      })
      .catch((error) => alert(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived data
  const priceBucketsData = useMemo(() => priceBuckets(products), [products]);
  const brandsList = useMemo(() => 
    [...new Set(products.map((p) => p.fournisseur_name).filter(Boolean))].sort(),
    [products]
  );

  // Filtering
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      // Search
      if (searchQuery) {
        const hay = `${p.name} ${p.sku ?? ''} ${p.fournisseur_name ?? ''}`.toLowerCase();
        if (!hay.includes(searchQuery.toLowerCase())) return false;
      }

      // Department
      if (department !== 'All' && departmentOf(p) !== department) return false;

      // Category/Offer type
      if (categories.length > 0) {
        const pool = p.offers ?? [p.category];
        if (!categories.some((c) => pool.includes(c))) return false;
      }

      // Rating
      if (ratingMin > 0 && p.rating < ratingMin) return false;

      // Price
      if (priceFilters.some(Boolean) && priceBucketsData.length) {
        const hit = priceBucketsData.some((b, i) => 
          priceFilters[i] && p.price >= b.min && p.price <= b.max
        );
        if (!hit) return false;
      }

      // Discount
      if (discountFilters.some(Boolean)) {
        const margin = marginOf(p);
        if (!discountFilters.some((on, i) => on && margin >= DISCOUNT_RANGES[i])) return false;
      }

      return true;
    });

    // Sorting
    switch (sort) {
      case 'rating':
        list = [...list].sort((a, b) => b.rating - a.rating || b.rating_count - a.rating_count);
        break;
      case 'orders':
        list = [...list].sort((a, b) => (b.stats?.created ?? 0) - (a.stats?.created ?? 0) || b.rating - a.rating);
        break;
      case 'price_asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      default:
        list = [...list].sort((a, b) => recommendedScore(b) - recommendedScore(a));
    }

    return list;
  }, [products, searchQuery, sort, department, categories, ratingMin, priceFilters, discountFilters, priceBucketsData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredProducts.length);
  const pageItems = useMemo(() => 
    filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredProducts, safePage, pageSize]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sort, department, categories, ratingMin, priceFilters, discountFilters, pageSize]);

  // Handlers
  const toggleSave = async (product: Product) => {
    setBusy(product.id);
    try {
      if (saved.includes(product.id)) {
        await apiDelete(`/products/saved/${product.id}`);
        setSaved((s) => s.filter((id) => id !== product.id));
      } else {
        await apiPost(`/products/${product.id}/save`, { 
          offer_type: (categories[0] ?? 'dropshipping') as 'dropshipping' | 'wholesale' 
        });
        setSaved((s) => [...s, product.id]);
      }
    } catch (error) {
      alert(apiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSort('recommended');
    setDepartment('All');
    setCategories([]);
    setRatingMin(0);
    setPriceFilters([false, false, false, false]);
    setDiscountFilters([false, false, false, false, false]);
  };

  const isFilterActive = 
    searchQuery || 
    department !== 'All' || 
    categories.length > 0 || 
    ratingMin > 0 || 
    priceFilters.some(Boolean) || 
    discountFilters.some(Boolean);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-full bg-slate-50">
      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white top-0 z-30 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link to="/dropshipper" className="hover:text-slate-700 transition">Dashboard</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Product Catalogue</span>
          </nav>

          {/* Main header */}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Catalogue</h1>
              <p className="mt-1 text-sm text-slate-500">
                {formatNumber(products.length)} products · {CATEGORIES.length} categories · {brandsList.length} suppliers
              </p>
            </div>

            {/* Search */}
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, or supplier..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>⚙️</span>
                Filters
                {isFilterActive && (
                  <span className="flex h-2 w-2 rounded-full bg-brand-600" />
                )}
              </button>

              <Link
                to="/dropshipper/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md"
              >
                <span>★</span>
                My products ({saved.length})
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          {/* ================= SIDEBAR FILTERS ================= */}
          <aside 
            ref={filterRef}
            className={`${showMobileFilters ? 'block' : 'hidden'} lg:block space-y-6`}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Filters</h3>
              <div className="flex items-center gap-3">
                {isFilterActive && (
                  <button 
                    onClick={resetFilters} 
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline transition"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="lg:hidden text-sm text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <FilterCard title="Category">
              <FilterCheck 
                label="All categories" 
                count={products.length} 
                checked={department === 'All'} 
                onChange={() => setDepartment('All')} 
              />
              {CATEGORIES.map((c) => (
                <FilterCheck
                  key={c}
                  label={c}
                  count={products.filter((p) => departmentOf(p) === c).length}
                  checked={department === c}
                  onChange={() => setDepartment(department === c ? 'All' : c)}
                />
              ))}
            </FilterCard>

            <FilterCard title="Offer Type">
              {PRODUCT_CATEGORIES.map((c) => (
                <FilterCheck
                  key={c}
                  label={c === 'dropshipping' ? 'Dropshipping' : c === 'wholesale' ? 'Wholesale' : 'White Label'}
                  count={products.filter((p) => (p.offers ?? [p.category]).includes(c)).length}
                  checked={categories.includes(c)}
                  onChange={() => setCategories((cur) => 
                    cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
                  )}
                />
              ))}
            </FilterCard>

            {priceBucketsData.length > 0 && (
              <FilterCard title="Price Range">
                {priceBucketsData.map((b, i) => (
                  <FilterCheck
                    key={i}
                    label={b.label}
                    checked={priceFilters[i]}
                    onChange={() => setPriceFilters((cur) => 
                      cur.map((x, j) => (j === i ? !x : x))
                    )}
                  />
                ))}
              </FilterCard>
            )}

            <FilterCard title="Discount">
              {DISCOUNT_RANGES.map((d, i) => (
                <FilterCheck
                  key={d}
                  label={`${d}% and above`}
                  checked={discountFilters[i]}
                  onChange={() => setDiscountFilters((cur) => 
                    cur.map((x, j) => (j === i ? !x : x))
                  )}
                />
              ))}
            </FilterCard>

            <FilterCard title="Rating">
              {RATINGS.map((r) => (
                <FilterRatingRow
                  key={r.min}
                  stars={r.stars}
                  label={r.label}
                  checked={ratingMin === r.min}
                  onChange={() => setRatingMin(r.min)}
                />
              ))}
              {ratingMin > 0 && (
                <button
                  onClick={() => setRatingMin(0)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline transition mt-2"
                >
                  Clear rating filter
                </button>
              )}
            </FilterCard>

            {/* Filter summary */}
            {isFilterActive && (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Active filters</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      “{searchQuery}”
                      <button onClick={() => setSearchQuery('')} className="hover:text-slate-900">×</button>
                    </span>
                  )}
                  {department !== 'All' && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {department}
                      <button onClick={() => setDepartment('All')} className="hover:text-slate-900">×</button>
                    </span>
                  )}
                  {categories.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {c}
                      <button onClick={() => setCategories((cur) => cur.filter((x) => x !== c))} className="hover:text-slate-900">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ================= PRODUCTS SECTION ================= */}
          <section className="min-w-0">
            {/* Toolbar */}
            <Toolbar
              totalResults={filteredProducts.length}
              searchQuery={searchQuery}
              sort={sort}
              view={view}
              onSortChange={setSort}
              onViewChange={setView}
              onClearSearch={() => setSearchQuery('')}
            />

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
                  <p className="text-sm font-medium text-slate-500">Loading products…</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredProducts.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white">
                <EmptyState 
                  icon="🔍" 
                  title="No products found" 
                  hint="Try adjusting your search or filters to find what you're looking for." 
                />
                <div className="pb-8 text-center">
                  <button
                    onClick={resetFilters}
                    className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 shadow-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}

            {/* Products grid */}
            {!loading && filteredProducts.length > 0 && (
              <>
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    {pageItems.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSaved={saved.includes(product.id)}
                        busy={busy === product.id}
                        list={false}
                        onOpen={() => navigate(`/dropshipper/store/${product.id}`)}
                        onToggleSave={() => void toggleSave(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pageItems.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSaved={saved.includes(product.id)}
                        busy={busy === product.id}
                        list={true}
                        onOpen={() => navigate(`/dropshipper/store/${product.id}`)}
                        onToggleSave={() => void toggleSave(product)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredProducts.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizes={PAGE_SIZES}
                  startItem={startItem}
                  endItem={endItem}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}