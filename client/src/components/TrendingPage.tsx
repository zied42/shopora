import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, money, TrendingItem } from '../lib/api';
import { Badge, EmptyState, PageHeader, Spinner, Stars } from './ui';

const PAGE_SIZES = [10, 20];

type TrendSort = 'score' | 'confirmed' | 'created' | 'rating' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { id: TrendSort; label: string }[] = [
  { id: 'score', label: 'Win score' },
  { id: 'confirmed', label: 'Most confirmed' },
  { id: 'created', label: 'Most commande' },
  { id: 'rating', label: 'Highest rating' },
  { id: 'price_asc', label: 'Price (Lowest)' },
  { id: 'price_desc', label: 'Price (Highest)' },
];

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold shadow-sm ring-1 ring-inset ${
        rank < 3
          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white ring-brand-600/30'
          : 'bg-slate-100 text-slate-600 ring-slate-600/10'
      }`}
    >
      {rank + 1}
    </span>
  );
}

function TrendCard({
  t,
  rank,
  list,
  onOpen,
}: {
  t: TrendingItem;
  rank: number;
  list: boolean;
  onOpen: () => void;
}) {
  const img = (
    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
      {t.image_url ? (
        <>
          <img
            src={t.image_url}
            alt={t.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 to-transparent" />
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="rounded-2xl bg-slate-200/60 px-4 py-3 text-2xl">📦</span>
        </div>
      )}

      <div className="absolute left-3 top-3">
        <RankBadge rank={rank} />
      </div>

      <div className="absolute bottom-3 left-3">
        {!t.best.stock && <Badge tone="red">out of stock</Badge>}
      </div>
    </div>
  );

  const body = (
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
          {(t.best.fournisseur_name ?? '?').charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-xs font-semibold text-slate-500">{t.best.fournisseur_name}</span>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          🛒 {t.offers} {t.offers > 1 ? 'suppliers' : 'supplier'}
        </span>
      </div>

      <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">{t.name}</h3>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        <Stars value={t.rating} />
        <span className="font-bold text-slate-800">{t.rating.toFixed(1)}</span>
        <span className="text-slate-400">({t.rating_count})</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-lg font-extrabold text-slate-900">{money(t.best.price)}</span>
        {t.best.stock > 0 && <Badge tone="green">{t.best.stock} in stock</Badge>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
        <div>
          <p className="text-base font-extrabold text-emerald-600">{t.confirmed}</p>
          <p className="text-[10px] text-slate-500">confirmed</p>
        </div>
        <div>
          <p className="text-base font-extrabold text-slate-800">{t.created}</p>
          <p className="text-[10px] text-slate-500">commande</p>
        </div>
        <div>
          <p className={`text-base font-extrabold ${t.returns > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{t.returns}</p>
          <p className="text-[10px] text-slate-500">retours</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Win score</p>
          <p className="text-2xl font-extrabold text-brand-600">{t.score.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">profit / unit</p>
          <p className="text-sm font-bold text-emerald-600">+{money(t.profit)}</p>
        </div>
      </div>
    </div>
  );

  if (list) {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="relative w-40 shrink-0 sm:w-56">{img}</div>
        <div className="flex min-w-0 flex-1 items-center p-4 sm:p-5">{body}</div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-600/10"
    >
      {img}
      {body}
    </div>
  );
}

export function TrendingPage({ onOpen, subtitle }: { onOpen?: (t: TrendingItem) => void; subtitle?: string }) {
  const [items, setItems] = useState<TrendingItem[] | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<TrendSort>('score');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const load = () => {
    apiGet<TrendingItem[]>('/products/trending?limit=50')
      .then(setItems)
      .catch((e) => alert(apiErrorMessage(e)));
  };

  useEffect(load, []);

  const open = (t: TrendingItem) => {
    if (onOpen) onOpen(t);
    else if (t.best.product_id) navigate(`/dropshipper/store/${t.best.product_id}`);
  };

  const filtered = useMemo(() => {
    let list = (items ?? []).filter((t) => {
      if (!q) return true;
      const hay = `${t.name} ${t.best.fournisseur_name ?? ''}`.toLowerCase();
      return hay.includes(q.toLowerCase());
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
  }, [items, q, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q, sort, pageSize]);

  const pageNumbers = useMemo(() => {
    const total = pageCount;
    const current = safePage;
    const set = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
    return [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  }, [pageCount, safePage]);

  return (
    <div>
      <PageHeader
        title="Trending"
        subtitle={subtitle ?? 'Winning products — most confirmed & created commandes, fewest returns'}
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            ↻ Refresh
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
          <span className="text-slate-400">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search trending products or suppliers..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TrendSort)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-400"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setView('grid')}
              title="Grid view"
              className={`flex h-9 w-9 items-center justify-center text-sm transition ${view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              ▦
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              title="List view"
              className={`flex h-9 w-9 items-center justify-center text-sm transition ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {!items ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon="🔥" title="No trending products found" hint="Try a different search." />
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pageItems.map((t, i) => (
            <TrendCard
              key={t.key}
              t={t}
              rank={(safePage - 1) * pageSize + i}
              list={false}
              onOpen={() => open(t)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {pageItems.map((t, i) => (
            <TrendCard
              key={t.key}
              t={t}
              rank={(safePage - 1) * pageSize + i}
              list
              onOpen={() => open(t)}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Showing{' '}
            <span className="font-extrabold text-slate-800">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of{' '}
            <span className="font-extrabold text-slate-800">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            {pageNumbers.map((n, i, arr) => (
              <span key={n} className="flex items-center gap-1">
                {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-xs text-slate-400">…</span>}
                <button
                  type="button"
                  onClick={() => setPage(n)}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-bold transition ${
                    n === safePage ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              </span>
            ))}
            <button
              type="button"
              disabled={safePage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-400">Show</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition focus:border-brand-400"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}