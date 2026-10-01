import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  apiErrorMessage, apiGet, apiPost, apiDelete, money, Product, SavedProduct, SupplierOffer, Invoice, CATEGORY_META, ProductCategory, ensureSupplierChat,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, Textarea } from '../../components/ui';

interface MediaItem {
  kind: 'image' | 'video';
  url: string;
}

function deriveBadges(p: Product): { label: string; hint: string; on: boolean; icon: string }[] {
  const confirmed = p.stats?.confirmed ?? 0;
  const returns = p.stats?.returns ?? 0;
  return [
    { label: 'Reliable Fulfillment', hint: 'Confirmed orders with zero returns', on: confirmed > 0 && returns === 0, icon: '🚚' },
    { label: 'Up to Date Stock', hint: "This supplier's stocks are up to date", on: p.stock > 0, icon: '📦' },
    { label: 'Quality Products', hint: 'This supplier has high rating products', on: p.rating >= 4, icon: '🏅' },
  ];
}

function StarBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="relative inline-block leading-none">
      <span className="text-slate-300">{'★★★★★'}</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${pct}%` }}>{'★★★★★'}</span>
    </span>
  );
}

function BadgeCard({ b }: { b: { label: string; hint: string; on: boolean; icon: string } }) {
  return (
    <div
      title={b.label}
      className={`flex flex-col items-center justify-center rounded-3 border p-2 text-center transition ${
        b.on
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50 opacity-60 grayscale'
      }`}
    >
      <span className="text-2xl">{b.icon}</span>
      <span className="mt-1 text-[10px] font-bold leading-tight text-slate-700">{b.label}</span>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOffer[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<string>('description');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBody, setChatBody] = useState('');
  const [chatSending, setChatSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiGet<Product>(`/products/${id}`), apiGet<SavedProduct[]>('/products/saved'), apiGet<SupplierOffer[]>(`/products/${id}/suppliers`)])
      .then(([p, sv, sup]) => {
        setProduct(p);
        setSaved(sv.some((s) => s.product.id === p.id));
        setSuppliers(sup);
        setIdx(0);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setInvoicesLoading(true);
    apiGet<Invoice[]>(`/products/${id}/invoices`)
      .then(setInvoices)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setInvoicesLoading(false));
  }, [id]);

  const media: MediaItem[] = useMemo(() => {
    if (!product) return [];
    const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
    const videos = product.videos?.length ? product.videos : product.video_url ? [product.video_url] : [];
    return [...videos.map((url) => ({ kind: 'video' as const, url })), ...images.map((url) => ({ kind: 'image' as const, url }))];
  }, [product]);

  const prevNext = (dir: number) => {
    const i = idx + dir;
    if (i < 0) setIdx(media.length - 1);
    else if (i >= media.length) setIdx(0);
    else setIdx(i);
  };
  const current = media[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (media.length <= 1) return;
      if (e.key === 'ArrowLeft') prevNext(-1);
      if (e.key === 'ArrowRight') prevNext(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length, idx]);

  if (loading) return <Spinner />;

  if (!product) {
    return (
      <Card>
        <EmptyState icon="📦" title="Product not found" hint={<Link className="text-brand-600 hover:underline" to="/dropshipper/store">Back to the store</Link>} />
      </Card>
    );
  }

  const catMeta = CATEGORY_META[product.category as ProductCategory] ?? CATEGORY_META.dropshipping;
  const profit = Math.max(0, product.price - product.cost_price);
  const badges = deriveBadges(product);
  const tags = [product.sku, product.barcode].filter(Boolean) as string[];

  const toggleSave = async () => {
    setBusy(true);
    try {
      if (saved) {
        await apiDelete(`/products/saved/${product.id}`);
        setSaved(false);
      } else {
        await apiPost(`/products/${product.id}/save`, {});
        setSaved(true);
      }
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendChatMessage = async () => {
    if (!product.fournisseur_id || !chatBody.trim()) return;
    setChatSending(true);
    try {
      const convId = await ensureSupplierChat(product.fournisseur_id);
      await apiPost(`/chat/${convId}/messages`, { body: chatBody.trim() });
      setChatOpen(false);
      setChatBody('');
      navigate(`/dropshipper/chat/${convId}`);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`${catMeta.icon} ${catMeta.label} offer · ${product.sku ?? 'No SKU'}${product.barcode ? ` · ${product.barcode}` : ''}`}
        breadcrumb={[
          { label: 'Home', to: '/dropshipper' },
          { label: 'Marketplace', to: '/dropshipper/store' },
          { label: product.name },
        ]}
        actions={
          <>
            <ButtonGhost className="px-3 py-2 text-xs" onClick={() => navigate('/dropshipper/store')}>← Back to store</ButtonGhost>
            <Link
              to="/dropshipper/products"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              ⭐ My products
            </Link>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-5">
          {/* ===== LEFT PANEL (media + actions + supplier) ===== */}
          <div className="flex flex-col border-slate-100 p-4 sm:p-5 lg:col-span-2 lg:border-r">
            {/* main slider */}
            <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 sm:h-80">
              {current ? (
                current.kind === 'image' ? (
                  <img key={current.url} src={current.url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <video key={current.url} controls preload="metadata" className="h-full w-full bg-slate-900">
                    <source src={current.url} />
                  </video>
                )
              ) : (
                <span className="text-7xl text-slate-300">📦</span>
              )}

              {media.length > 1 && (
                <>
                  <button
                    onClick={() => prevNext(-1)}
                    aria-label="Previous media"
                    className="absolute left-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-slate-700 shadow-lg transition hover:bg-white hover:text-slate-900 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-950 dark:hover:text-white"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => prevNext(1)}
                    aria-label="Next media"
                    className="absolute right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-slate-700 shadow-lg transition hover:bg-white hover:text-slate-900 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-950 dark:hover:text-white"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-semibold text-white">{idx + 1} / {media.length}</span>
                </>
              )}

              <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                {product.stock === 0 ? <Badge tone="red">out of stock</Badge> : product.stock < 20 ? <Badge tone="amber">only {product.stock} left</Badge> : <Badge tone="green">{product.stock} in stock</Badge>}
              </div>
            </div>

            {/* thumbnails */}
            {media.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto p-1">
                {media.map((m, i) => (
                  <button
                    key={`${m.kind}-${m.url}`}
                    onClick={() => setIdx(i)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === idx ? 'border-brand-600' : 'border-transparent hover:border-slate-300'}`}
                  >
                    {m.kind === 'image' ? (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-xs text-white">
                        <span className="text-base">🎬</span>
                        <span className="text-[9px]">video</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* action buttons */}
            <div className="mt-3 space-y-2">
              <button
                disabled={busy || product.stock === 0}
                onClick={() => void toggleSave()}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.99] ${
                  saved
                    ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100'
                    : 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {busy ? 'Working…' : saved ? '✕ Remove from my list' : '＋ Add to my list'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <ButtonGhost className="justify-center gap-2 py-2.5 text-sm" onClick={() => setChatOpen(true)}>
                  💬 Chat with supplier
                </ButtonGhost>
                <ButtonGhost className="justify-center gap-2 py-2.5 text-sm" onClick={() => setTicketOpen(true)}>
                  🎧 Create a ticket
                </ButtonGhost>
              </div>
            </div>

            {/* supplier box */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white shadow">
                    {(product.fournisseur_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">🏭 {product.fournisseur_name}</p>
                    <p className="text-[10px] text-slate-500">{suppliers.length > 1 ? `${suppliers.length} offers on platform` : 'Verified supplier'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {badges.map((b) => <BadgeCard key={b.label} b={b} />)}
              </div>
            </div>
          </div>

          {/* ===== RIGHT PANEL ===== */}
          <div className="flex flex-col p-4 sm:p-6 lg:col-span-3">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{product.name}</h1>

            {/* rating row */}
            <div className="mt-2 flex items-center gap-2">
              <StarBar value={product.rating} />
              <span className="text-xs font-semibold text-slate-600">({product.rating_count})</span>
              <span className="text-xs text-slate-400">· {money(product.cost_price)} cost</span>
            </div>

            {/* offer type + price block */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-50 via-slate-100 to-violet-50 p-4 ring-1 ring-brand-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-200">
                  {catMeta.icon} {catMeta.label}
                </span>
                <span className="text-[11px] text-slate-500">{catMeta.desc}</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/60">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cost</p>
                  <p className="text-lg font-extrabold text-slate-800">{money(product.cost_price)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/60">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Recommended selling price</p>
                  <p className="text-lg font-extrabold text-emerald-600">{money(product.price)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/60 ring-1 ring-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Your profit</p>
                  <p className="text-lg font-extrabold text-emerald-600">+{money(profit)}</p>
                </div>
              </div>
            </div>

            {/* stock table */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">📦 Stock availability</p>
                <span className="text-[11px] text-slate-400">Fulfiller · Quantity</span>
              </div>
              <table className="w-full overflow-hidden rounded-xl text-sm ring-1 ring-slate-100">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Fulfiller</th>
                    <th className="px-4 py-2.5 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">🏭 {product.fournisseur_name}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">{product.stock} units</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">
                      🏬 Company warehouse
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">{product.house_stock ?? 0} units</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* stats strip */}
            {(product.stats?.created || product.stats?.confirmed || product.stats?.returns) ? (
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
                <div>
                  <p className="text-lg font-extrabold text-slate-800">{product.stats?.created ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">orders created</p>
                </div>
                <div className="border-x border-slate-200">
                  <p className="text-lg font-extrabold text-emerald-600">{product.stats?.confirmed ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">confirmed</p>
                </div>
                <div>
                  <p className={`text-lg font-extrabold ${(product.stats?.returns ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{product.stats?.returns ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">returns</p>
                </div>
              </div>
            ) : null}

            {/* tags */}
            {tags.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Reference</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{t}</span>)}
                </div>
              </div>
            )}

            {/* description */}
            {product.description && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-1.5 text-sm font-bold text-slate-800">Description</p>
                <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
              </div>
            )}

            {/* sampling notice */}
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-lg">⚠️</span>
              <div className="text-sm">
                <p className="font-bold text-amber-800">Product sampling!</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                  We recommend you order a sample before shipping to customers. This step ensures the product matches the supplier's
                  description — especially verifying listed details and accessories.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {suppliers.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">🛒 {suppliers.length} supplier{suppliers.length > 1 ? 's' : ''} sell this product</h2>
              <p className="text-xs text-slate-500">Ranked by orders, confirmed orders, fewest returns, rating, and activity</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((o, i) => {
              const current = o.product_id === product.id;
              return (
                <Card
                  key={o.product_id}
                  onClick={() => navigate(`/dropshipper/store/${o.product_id}`)}
                  className={`flex cursor-pointer flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${current ? 'ring-2 ring-brand-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        🏭 {o.fournisseur_name}
                        {current && <Badge tone="blue">this offer</Badge>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">#{i + 1} for this product · {o.total_products} products listed</p>
                    </div>
                    <div className="rounded-xl bg-brand-50 px-3 py-1.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">score</p>
                      <p className="text-lg font-extrabold leading-none text-brand-700">{o.score.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <StarBar value={o.rating} />
                    <span>({o.rating_count})</span>
                    {!o.is_active && <Badge tone="red">inactive</Badge>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{o.confirmed}</p>
                      <p className="text-[10px] text-slate-500">confirmed</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{o.created}</p>
                      <p className="text-[10px] text-slate-500">orders</p>
                    </div>
                    <div>
                      <p className={`font-bold ${o.returns > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{o.returns}</p>
                      <p className="text-[10px] text-slate-500">returns</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[11px] text-slate-500">Price</p>
                      <p className="text-lg font-bold text-slate-900">{money(o.price)}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-slate-500">{o.stock > 0 ? `${o.stock} in stock` : 'out of stock'}</p>
                      <p className="font-semibold text-emerald-600">{money(o.profit)} earned</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== BOTTOM TABS ===== */}
      <div className="mt-8">
        <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-slate-200 p-2">
          {[
            { key: 'description', label: 'Description', icon: '📝' },
            { key: 'specifications', label: 'Specifications', icon: '📋' },
            { key: 'reviews', label: 'Product reviews', icon: '⭐' },
            { key: 'stock_movements', label: 'Stock movements', icon: '📦' },
            { key: 'policies', label: 'Return & Refund Policy', icon: '↩️' },
            { key: 'invoices', label: 'Invoices', icon: '🧾' },
          ].map((t) => (
<button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === t.key
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <Card className="mt-3">
          {tab === 'description' && (
            <div className="p-5">
              <h3 className="mb-2 text-base font-bold text-slate-900">Description</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {product.description ?? 'No description provided by the supplier yet.'}
              </p>
            </div>
          )}

          {tab === 'specifications' && (
            <div className="p-5">
              <h3 className="mb-3 text-base font-bold text-slate-900">Specifications</h3>
              <table className="w-full overflow-hidden rounded-xl text-sm ring-1 ring-slate-100">
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Offer type', `${catMeta.icon} ${catMeta.label}`],
                    ['SKU', product.sku ?? '—'],
                    ['Barcode', product.barcode ?? '—'],
                    ['Cost price', money(product.cost_price)],
                    ['Recommended selling price', money(product.price)],
                    ['Your profit per unit', `+${money(profit)}`],
                    ['Supplier stock', `${product.stock} units`],
                    ['Company warehouse (from retours)', `${product.house_stock ?? 0} units`],
                    ['Rating', `${product.rating.toFixed(1)} / 5 (${product.rating_count} reviews)`],
                  ].map(([k, v]) => (
                    <tr key={k} className="bg-white">
                      <td className="w-1/3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{k}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'reviews' && (
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
                  <p className="text-4xl font-extrabold text-slate-900">{product.rating.toFixed(1)}</p>
                  <div className="mt-1"><StarBar value={product.rating} /></div>
                  <p className="mt-1 text-xs text-slate-500">{product.rating_count} review{product.rating_count !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">
                  No written reviews for this product yet. The score is aggregated from commandes placed by dropshippers — a high rating with few retours
                  means customers receive products matching the description.
                </p>
              </div>
            </div>
          )}

          {tab === 'stock_movements' && (
            <div className="p-5">
              <h3 className="mb-1 text-base font-bold text-slate-900">Stock movements</h3>
              <p className="mb-3 text-xs text-slate-500">
                Stock is claimed in this order: company warehouse (retour pool) first, then the supplier's stock is asked to make units ready.
              </p>
              <table className="w-full overflow-hidden rounded-xl text-sm ring-1 ring-slate-100">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Pool</th>
                    <th className="px-4 py-2.5 text-right">Units</th>
                    <th className="px-4 py-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">🏭 {product.fournisseur_name}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">{product.stock}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">Fresh stock made ready by the supplier</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">🏬 Company warehouse</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">{product.house_stock ?? 0}</td>
                    <td className="px-4 py-2.5 text-xs text-amber-700">Units collected from returns, ready to reship</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {tab === 'policies' && (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl bg-sky-50 px-5 py-4 ring-1 ring-sky-100">
                <p className="text-sm leading-relaxed text-sky-900">
                  These are the return and refund policies for this product. We will apply these policies when you request a return or exchange for this product.
                  <br />
                  Please ensure that you provide compelling evidence when creating the return or exchange request. Failure to provide sufficient evidence may result in the rejection of your request.
                  <br />
                  By placing an order, you acknowledge and agree to abide by these policies and our 'Return, Refund, Exchange and Dispute Policy'.
                  <br />
                  It's important to note that any updates or modifications to these policies will only take effect after a waiting period of 2 business days. You will be notified accordingly if this product is included in your list.
                </p>
              </div>

              {[
                { title: 'Order Cancellation', body: 'You can cancel an order if it has not been marked as prepared yet' },
                { title: 'Duration to Request a Return or an Exchange', body: 'You can request a return or an exchange within 2 business days after order delivery' },
              ].map((row) => (
                <div key={row.title} className="relative border-l-2 border-sky-400 pl-4">
                  <h6 className="mb-1 text-sm font-bold text-sky-700">{row.title}</h6>
                  <p className="text-sm text-slate-600">{row.body}</p>
                </div>
              ))}

              <div>
                <h6 className="mb-2 text-sm font-bold text-sky-700">Return &amp; Exchange Fees</h6>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Reason</th>
                        <th className="px-4 py-2.5">Return/Exchange Fees</th>
                        <th className="px-4 py-2.5">Restocking/Repacking Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {[
                        ['Unwanted / Unsatisfied with Quality', '100% on the Reseller', '0 TND'],
                        ['Product Confirmed to be Defective', '100% on the Supplier', '0 TND'],
                        ['Supplier Sent the Wrong Item', '100% on the Supplier', '0 TND'],
                        ['Wrong Order Passed', '100% on the Reseller', '0 TND'],
                      ].map(([r, fee, restock]) => (
                        <tr key={r} className="even:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{r}</td>
                          <td className="px-4 py-2.5 text-slate-600">{fee}</td>
                          <td className="px-4 py-2.5 text-slate-600">{restock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h6 className="mb-2 text-sm font-bold text-sky-700">Return will be accepted if the following conditions are met</h6>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-2.5">Return/Refund reason</th>
                        <th className="px-4 py-2.5 text-center">In new conditions</th>
                        <th className="px-4 py-2.5 text-center">In sealed condition</th>
                        <th className="px-4 py-2.5 text-center">
                          Complete
                          <span className="block text-[10px] font-medium normal-case text-slate-500">with original free gifts, accessories</span>
                        </th>
                        <th className="px-4 py-2.5 text-center">With original tags and labels attached</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {[
                        { reason: 'Wrong product (e.g wrong size/colour, different product', cond: [true, false, true, true] },
                        { reason: 'Incomplete/missing product', cond: [true, true, false, true] },
                        { reason: 'Damaged/faulty product', cond: [false, false, true, true] },
                        { reason: 'Change of mind', cond: [true, true, true, true] },
                      ].map((row) => (
                        <tr key={row.reason} className="even:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{row.reason}</td>
                          {row.cond.map((ok, i) => (
                            <td key={i} className="px-4 py-2.5 text-center">
                              {ok ? <span className="font-bold text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Invoices</h3>
                <span className="text-xs text-slate-500">Generated from your delivered orders including this product</span>
              </div>
              {invoicesLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : invoices.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No invoices yet"
                  hint={
                    <span className="text-sm text-slate-500">
                      Invoices are generated for delivered commandes. Create a commande from your{' '}
                      <Link className="text-brand-600 hover:underline" to="/dropshipper/commandes/create">saved products</Link> to get started.
                    </span>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">🧾 {inv.invoice_number}</p>
                          <p className="text-xs text-slate-500">
                            Commande {inv.order_number} · {new Date(inv.delivered_at).toLocaleDateString()} · {inv.customer_name ?? '—'}
                            {inv.city ? ` · ${inv.city}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{inv.payment_method ?? '—'}</span>
                          {inv.payment_status === 'paid'
                            ? <Badge tone="green">paid</Badge>
                            : <Badge tone="amber">unpaid</Badge>}
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {inv.items.map((it) => (
                              <tr key={it.product_id}>
                                <td className="py-2 font-semibold text-slate-700">{it.product_name}</td>
                                <td className="py-2 text-right text-slate-500">× {it.quantity}</td>
                                <td className="py-2 text-right font-semibold text-slate-700">{money(it.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-sm">
                          <span className="text-slate-500">Commission (3%)</span>
                          <span className="font-semibold text-slate-600">−{money(inv.commission)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-700">Total</span>
                          <span className="text-emerald-600">{money(inv.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      {ticketOpen && product && <ProductTicketModal product={product} onClose={() => setTicketOpen(false)} />}
      {chatOpen && (
        <Modal open onClose={() => setChatOpen(false)} title={`Chat with ${product.fournisseur_name ?? 'supplier'}`}>
          <p className="mb-3 text-sm text-slate-500">Send a message to {product.fournisseur_name ?? 'your supplier'} about this product.</p>
          <textarea
            value={chatBody}
            onChange={(e) => setChatBody(e.target.value)}
            rows={3}
            placeholder="Write your message…"
            autoFocus
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-3 flex justify-end gap-2">
            <ButtonGhost onClick={() => setChatOpen(false)}>Cancel</ButtonGhost>
            <Button onClick={sendChatMessage} disabled={chatSending || !chatBody.trim()}>
              {chatSending ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const PRODUCT_REASONS = [
  'Product information request',
  'Inventory / Stock question',
  'Pricing inquiry',
  'Quality concern',
  'Other',
];

function ProductTicketModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const img = product.image_url || product.images?.[0] || '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/support', {
        email: user?.email ?? '',
        type: reason,
        message: `[Product #${product.id}: ${product.name}] ${message}`,
      });
      setSent(true);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <Modal open onClose={onClose} title="Ticket submitted">
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600">Your ticket about <span className="font-semibold">{product.name}</span> has been sent to your account manager.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Create a ticket about this product">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          {img && <img src={img} alt={product.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />}
          <p className="text-sm font-semibold text-slate-800">{product.name}</p>
        </div>
        <p className="text-xs text-slate-400">This ticket will be sent to your account responsible, not the supplier.</p>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} required>
            <option value="">Select a reason</option>
            {PRODUCT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Message">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe your request..." required />
        </Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Discard</ButtonGhost>
          <Button type="submit" disabled={saving || !reason}>{saving ? 'Submitting...' : 'Submit'}</Button>
        </div>
      </form>
    </Modal>
  );
}