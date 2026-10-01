import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiErrorMessage, apiGet, apiPost, money, ProductCategory, CATEGORY_META, StockingProduct } from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

const STATUS_META: Record<string, { label: string; icon: string; tone: string }> = {
  pending: { label: 'Pending', icon: '⏳', tone: 'amber' },
  approved: { label: 'Approved', icon: '✅', tone: 'green' },
  refused: { label: 'Refused', icon: '❌', tone: 'red' },
  hidden: { label: 'Hidden', icon: '👁️‍🗨️', tone: 'slate' },
};

type Tab = 'all' | 'pending' | 'approved' | 'refused' | 'hidden';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'pending', label: 'Pending', icon: '⏳' },
  { id: 'approved', label: 'Approved', icon: '✅' },
  { id: 'refused', label: 'Refused', icon: '❌' },
  { id: 'hidden', label: 'Hidden', icon: '👁️‍🗨️' },
];

/* ─── Portal dropdown (never clipped by overflow) ─── */

function ActionDropdown({ anchorRef, open, onClose, product, onPreview, onApprove, onRefuse, onHide }: {
  anchorRef: React.RefObject<HTMLButtonElement>;
  open: boolean;
  onClose: () => void;
  product: StockingProduct;
  onPreview: (p: StockingProduct) => void;
  onApprove: (id: number) => void;
  onRefuse: (p: StockingProduct) => void;
  onHide: (id: number) => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 8 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const ms = product.moderation_status ?? 'approved';

  const menu = (
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
    >
      <button onClick={() => { onPreview(product); onClose(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
        <span className="text-base">👁️</span> Preview
      </button>
      <div className="border-t border-slate-100" />
      <button onClick={() => { onApprove(product.id); onClose(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 transition hover:bg-emerald-50">
        <span className="text-base">✅</span> Approve
      </button>
      <button onClick={() => { onRefuse(product); onClose(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-700 transition hover:bg-red-50">
        <span className="text-base">❌</span> Refuse
      </button>
      <div className="border-t border-slate-100" />
      {ms !== 'hidden' ? (
        <button onClick={() => { onHide(product.id); onClose(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
          <span className="text-base">👁️‍🗨️</span> Hide
        </button>
      ) : (
        <button onClick={() => { onApprove(product.id); onClose(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
          <span className="text-base">👁️‍🗨️</span> Unhide
        </button>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}

/* ─── Main page ─── */

export default function Inventory() {
  const [products, setProducts] = useState<StockingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [busy, setBusy] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [preview, setPreview] = useState<StockingProduct | null>(null);
  const [refuseFor, setRefuseFor] = useState<StockingProduct | null>(null);
  const btnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const load = () => {
    setLoading(true);
    apiGet<StockingProduct[]>('/stocking/products')
      .then(setProducts)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const moderate = async (id: number, status: 'approved' | 'refused' | 'hidden', note?: string) => {
    setBusy(id);
    setOpenMenu(null);
    try {
      await apiPost(`/stocking/products/${id}/moderate`, { status, note: note ?? null });
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, moderation_status: status, moderation_note: note ?? null, is_active: status === 'approved' } : p));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const filtered = products.filter((p) => {
    if (tab !== 'all' && (p.moderation_status ?? 'approved') !== tab) return false;
    if (q) {
      const hay = `${p.name} ${p.sku ?? ''} ${p.barcode ?? ''} ${p.fournisseur_name}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: products.length,
    pending: products.filter((p) => (p.moderation_status ?? 'approved') === 'pending').length,
    approved: products.filter((p) => (p.moderation_status ?? 'approved') === 'approved').length,
    refused: products.filter((p) => (p.moderation_status ?? 'approved') === 'refused').length,
    hidden: products.filter((p) => (p.moderation_status ?? 'approved') === 'hidden').length,
  };

  const anchorForMenu = openMenu !== null ? btnRefs.current.get(openMenu) ?? null : null;
  const productForMenu = openMenu !== null ? products.find((p) => p.id === openMenu) ?? null : null;

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Review, approve, or refuse supplier products before they appear on the marketplace"
        actions={<button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === t.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.icon} {t.label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
        <span className="text-slate-400">🔎</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, SKU, supplier..." className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        {q && <button onClick={() => setQ('')} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-200">✕</button>}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="📦" title="No products found" hint="Products created by suppliers will appear here for moderation." /></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const ms = p.moderation_status ?? 'approved';
                const meta = STATUS_META[ms] ?? STATUS_META.approved;
                return (
                  <tr key={p.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover rounded-lg" /> : <div className="flex h-full items-center justify-center text-slate-300">📦</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{p.name}</p>
                          {p.sku && <p className="text-xs text-slate-400">SKU: {p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{p.fournisseur_name}</p>
                      {p.supplier_org_name && <p className="text-xs text-slate-400">{p.supplier_org_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.offers ?? [p.category]).map((o) => (
                          <Badge key={o} tone={(o === 'dropshipping' ? 'blue' : o === 'white_label' ? 'purple' : 'slate') as 'blue'}>{CATEGORY_META[o]?.icon} {CATEGORY_META[o]?.label ?? o}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{money(p.price)}</td>
                    <td className="px-4 py-3 text-right"><Badge tone={p.stock > 0 ? 'green' : 'red'}>{p.stock}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge tone={meta.tone as 'green'}>{meta.icon} {meta.label}</Badge>
                      {p.moderation_note && ms === 'refused' && (
                        <p className="mt-1 max-w-[200px] truncate text-xs text-red-500" title={p.moderation_note ?? ''}>📝 {p.moderation_note}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          ref={(el) => { if (el) btnRefs.current.set(p.id, el); }}
                          disabled={busy === p.id}
                          onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {busy === p.id ? '⏳' : '⋯'} Actions
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {productForMenu && anchorForMenu && (
        <ActionDropdown
          anchorRef={{ current: anchorForMenu } as React.RefObject<HTMLButtonElement>}
          open={openMenu !== null}
          onClose={() => setOpenMenu(null)}
          product={productForMenu}
          onPreview={(p) => setPreview(p)}
          onApprove={(id) => moderate(id, 'approved')}
          onRefuse={(p) => setRefuseFor(p)}
          onHide={(id) => moderate(id, 'hidden')}
        />
      )}

      {preview && (
        <PreviewModal
          product={preview}
          onClose={() => setPreview(null)}
          onApprove={(id) => { moderate(id, 'approved'); setPreview(null); }}
          onRefuse={(id) => { setRefuseFor(products.find((pp) => pp.id === id) ?? null); setPreview(null); }}
        />
      )}
      {refuseFor && <RefuseModal product={refuseFor} onClose={() => setRefuseFor(null)} onDone={(note) => { moderate(refuseFor.id, 'refused', note); setRefuseFor(null); }} />}
    </div>
  );
}

/* ─── Preview: full-page overlay ─── */

interface MediaItem { kind: 'image' | 'video'; url: string; }

function StarBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="relative inline-block leading-none">
      <span className="text-slate-300">{'★★★★★'}</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${pct}%` }}>{'★★★★★'}</span>
    </span>
  );
}

function PreviewModal({ product: p, onClose, onApprove, onRefuse }: { product: StockingProduct; onClose: () => void; onApprove: (id: number) => void; onRefuse: (id: number) => void }) {
  const [idx, setIdx] = useState(0);

  const media: MediaItem[] = useMemo(() => {
    const images = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
    const videos = p.videos?.length ? p.videos : p.video_url ? [p.video_url] : [];
    return [...images.map((url) => ({ kind: 'image' as const, url })), ...videos.map((url) => ({ kind: 'video' as const, url }))];
  }, [p]);

  const prevNext = (dir: number) => {
    const i = idx + dir;
    if (i < 0) setIdx(media.length - 1);
    else if (i >= media.length) setIdx(0);
    else setIdx(i);
  };
  const current = media[idx];
  const catMeta = CATEGORY_META[p.category as ProductCategory] ?? CATEGORY_META.dropshipping;
  const profit = Math.max(0, p.price - p.cost_price);
  const ms = p.moderation_status ?? 'approved';

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-white">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:px-4">← Back</button>
          <Badge tone={STATUS_META[ms]?.tone as 'green'}>{STATUS_META[ms]?.icon} {STATUS_META[ms]?.label}</Badge>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1 text-[10px] font-bold text-white">
            {catMeta.icon} {catMeta.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button onClick={() => { onApprove(p.id); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-700 sm:px-5 sm:text-sm">✅ Approve Product</button>
          <button onClick={() => { onRefuse(p.id); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 sm:px-5 sm:text-sm">❌ Refuse Product</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
          <div className="grid gap-6 sm:gap-10 lg:grid-cols-2">

            {/* ── Left: images ── */}
            <div>
              {/* main image */}
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
                {current ? (
                  current.kind === 'image' ? (
                    <img key={current.url} src={current.url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <video key={current.url} controls preload="metadata" className="h-full w-full bg-slate-900">
                      <source src={current.url} />
                    </video>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center"><span className="text-8xl text-slate-300">📦</span></div>
                )}
                {media.length > 1 && (
                  <>
                    <button onClick={() => prevNext(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 shadow-lg backdrop-blur transition hover:bg-white">‹</button>
                    <button onClick={() => prevNext(1)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 shadow-lg backdrop-blur transition hover:bg-white">›</button>
                    <span className="absolute bottom-4 right-4 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{idx + 1} / {media.length}</span>
                  </>
                )}
                <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                  {p.stock === 0 ? <Badge tone="red">out of stock</Badge> : p.stock < 20 ? <Badge tone="amber">only {p.stock} left</Badge> : <Badge tone="green">{p.stock} in stock</Badge>}
                </div>
              </div>

              {/* thumbnails */}
              {media.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {media.map((m, i) => (
                    <button key={`${m.kind}-${m.url}`} onClick={() => setIdx(i)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === idx ? 'border-brand-600 shadow-md' : 'border-transparent hover:border-slate-300'}`}>
                      {m.kind === 'image' ? (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white"><span className="text-lg">🎬</span><span className="text-[10px] font-semibold">video</span></span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* supplier info */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">🏭 Supplier Information</h3>
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white shadow-lg">
                    {(p.fournisseur_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900">{p.fournisseur_name}</p>
                    {p.supplier_org_name && <p className="truncate text-sm text-slate-500">{p.supplier_org_name}</p>}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {p.supplier_email && (
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
                      <span className="w-5 shrink-0 text-center text-base">📧</span><span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400 sm:w-20">Email</span><span className="min-w-0 truncate">{p.supplier_email}</span>
                    </div>
                  )}
                  {p.supplier_phone && (
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
                      <span className="w-5 shrink-0 text-center text-base">📱</span><span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400 sm:w-20">Phone</span><span className="min-w-0 truncate">{p.supplier_phone}</span>
                    </div>
                  )}
                  {p.supplier_city && (
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
                      <span className="w-5 shrink-0 text-center text-base">📍</span><span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400 sm:w-20">City</span><span className="min-w-0 truncate">{p.supplier_city}</span>
                    </div>
                  )}
                  {p.supplier_account_manager && (
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-700 ring-1 ring-slate-100">
                      <span className="w-5 text-center text-base">👤</span><span className="text-xs font-bold uppercase tracking-wide text-slate-400 w-20 shrink-0">Manager</span><span>{p.supplier_account_manager}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: product info ── */}
            <div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900">{p.name}</h1>

              <div className="mt-3 flex items-center gap-3">
                <StarBar value={p.rating} />
                <span className="text-sm font-semibold text-slate-600">({p.rating_count} reviews)</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(p.offers ?? [p.category]).map((o) => (
                  <span key={o} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-200">
                    {CATEGORY_META[o]?.icon} {CATEGORY_META[o]?.label ?? o}
                  </span>
                ))}
              </div>

              {/* sample pricing */}
              <div className="mt-6">
                <h5 className="mb-1 font-bold text-slate-900">Sample pricing</h5>
                <hr className="mb-4 border-slate-200" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Gross Price</span>
                    <div className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800">{money(p.cost_price)}</div>
                  </div>
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Commission Rate</span>
                    <div className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800">3%</div>
                  </div>
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Recommended price for marketers</span>
                    <div className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800">{money(p.price)}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 md:grid-cols-2">
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Revenue Including VAT</span>
                    <div className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800">{money(p.price * 0.97)}</div>
                  </div>
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Revenue Excluding VAT</span>
                    <div className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800">{money(p.price * 0.97)}</div>
                  </div>
                </div>
              </div>

              {/* stock */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-bold text-slate-800">📦 Stock availability</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <span>Fulfiller</span><span>Quantity</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">🏭 {p.fournisseur_name}</span>
                    <span className="text-sm font-extrabold text-emerald-600">{p.stock} units</span>
                  </div>
                </div>
              </div>

              {/* stats */}
              {(p.stats?.created || p.stats?.confirmed || p.stats?.returns) ? (
                <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-800">{p.stats?.created ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">commande created</p>
                  </div>
                  <div className="border-x border-slate-200">
                    <p className="text-2xl font-extrabold text-emerald-600">{p.stats?.confirmed ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">confirmed</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-extrabold ${(p.stats?.returns ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{p.stats?.returns ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">retours</p>
                  </div>
                </div>
              ) : null}

              {/* wholesale pricing */}
              <div className="mt-6">
                <h5 className="my-2 font-bold text-slate-900">Wholesale orders pricing</h5>
                <hr className="mb-4 mt-2 border-slate-200" />
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2" style={{ width: '25%' }}>Minimum quantity</th>
                        <th className="px-3 py-2" style={{ width: '25%' }}>Maximum quantity</th>
                        <th className="px-3 py-2" style={{ width: '25%' }}>Price</th>
                        <th className="px-3 py-2" style={{ width: '25%' }}>Revenue after commission (3%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {p.wholesale_tiers && p.wholesale_tiers.length > 0 ? (
                        p.wholesale_tiers.map((t, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-3 py-2.5 font-semibold text-slate-700">{t.min}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-700">{t.max}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-800">{money(t.price)}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-600">{money(t.price * 0.97)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="opacity-40">
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* description */}
              {p.description && (
                <div className="mt-8">
                  <h3 className="mb-2 text-sm font-bold text-slate-800">📝 Description</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>
                </div>
              )}

              {/* policies */}
              <div className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-5">
                <h3 className="mb-2 text-sm font-bold text-sky-800">↩️ Return &amp; Refund Policies</h3>
                <p className="mb-3 text-sm leading-relaxed text-sky-900">
                  Return and refund policies apply when requesting a return or exchange for this product.
                  Please provide compelling evidence when creating a return or exchange request.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-sky-100">
                    <p className="mb-1 text-sm font-bold text-slate-800">Order Cancellation</p>
                    <p className="text-xs text-slate-600">Cancel an order if it has not been marked as prepared yet.</p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-sky-100">
                    <p className="mb-1 text-sm font-bold text-slate-800">Return Window</p>
                    <p className="text-xs text-slate-600">Request a return or exchange within 2 business days after delivery.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Specifications (full-width, bottom) ── */}
          <div className="mt-10 border-t border-slate-200 pt-8">
            <h3 className="mb-4 text-base font-bold text-slate-800">📋 Specifications</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-0 overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Dimensions', (p.height || p.length || p.width) ? `${p.height ?? '—'} × ${p.length ?? '—'} × ${p.width ?? '—'} mm` : '—'],
                ['Weight', p.weight ? `${p.weight} g` : '—'],
                ['Cost price', money(p.cost_price)],
                ['Selling price', money(p.price)],
                ['Profit per unit', `+${money(profit)}`],
                ['Stock', `${p.stock} units`],
                ['Rating', `${p.rating.toFixed(1)} / 5 (${p.rating_count})`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 last:border-b-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{k}</span>
                  <span className="text-sm font-semibold text-slate-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Refuse Modal ─── */

function RefuseModal({ product, onClose, onDone }: { product: StockingProduct; onClose: () => void; onDone: (note: string) => void }) {
  const [note, setNote] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return alert('Please write a reason for refusal.');
    onDone(note.trim());
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-900">Refuse "{product.name}"</h2>
        <p className="mt-1 text-sm text-slate-500">Write a note to the supplier explaining why this product is refused.</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">Supplier: <span className="font-semibold text-slate-700">{product.fournisseur_name}</span></p>
          <p className="text-xs text-slate-500">Product: <span className="font-semibold text-slate-700">{product.name}</span></p>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Refusal reason *</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="e.g. Missing certifications, unclear description, pricing issue..." required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button type="submit" className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700">❌ Refuse Product</button>
          </div>
        </form>
      </div>
    </div>
  );
}
