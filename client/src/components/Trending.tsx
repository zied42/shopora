import { TrendingItem } from '../lib/api';
import { Badge, Stars } from './ui';

const RANK_STYLE: Record<number, string> = {
  0: 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
  1: 'bg-slate-300 text-slate-800',
  2: 'bg-amber-700 text-amber-100',
};

export function TrendingStrip({ items, onOpen, title = '🔥 Trending', subtitle = 'The 20 winning products — most confirmed & created commandes, fewest returns' }: {
  items: TrendingItem[];
  onOpen: (t: TrendingItem) => void;
  title?: string;
  subtitle?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold text-brand-600">Top {items.length}</span>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
        {items.map((t, i) => (
          <button
            key={t.key}
            onClick={() => onOpen(t)}
            className="group relative w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative h-40 w-full bg-gradient-to-br from-slate-100 to-slate-200">
              {t.image_url ? (
                <img src={t.image_url} alt={t.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <span className="flex h-full items-center justify-center text-4xl text-slate-300">📦</span>
              )}
              <span className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold shadow ${RANK_STYLE[i] ?? 'bg-slate-100 text-slate-600'}`}>
                {i + 1}
              </span>
              {i < 3 && <span className="absolute right-2 top-2 text-xl drop-shadow">🔥</span>}
              {!t.best.stock && <span className="absolute bottom-2 left-2"><Badge tone="red">out of stock</Badge></span>}
            </div>

            <div className="p-4">
              <p className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">{t.name}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Stars value={t.rating} /> <span className="font-medium">{t.rating.toFixed(1)}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">🛒 {t.offers} {t.offers > 1 ? 'suppliers' : 'supplier'}</span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="text-emerald-500">✓</span>{t.confirmed} confirmed</span>
                <span className="inline-flex items-center gap-1"><span>🧾</span>{t.created} created</span>
                {t.returns > 0 && <span className="inline-flex items-center gap-1 text-rose-500"><span>↩</span>{t.returns}</span>}
              </div>

              <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Win rate score</p>
                  <p className="text-lg font-bold text-brand-600">{t.score.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">from</p>
                  <p className="text-base font-bold text-slate-900">{`${t.best.price.toFixed(2)} TND`}</p>
                  <p className="text-[10px] text-slate-400">by {t.best.fournisseur_name}</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function TrendingCardSkeleton() {
  return (
    <section className="mb-8">
      <div className="mb-3 h-6 w-40 rounded bg-slate-200" />
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-80 w-64 shrink-0 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    </section>
  );
}