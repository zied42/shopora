import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, apiPatch, apiGet, money, Product, PRODUCT_CATEGORIES } from '../../lib/api';
import { AppFooter, Badge, Button, ButtonGhost, Input, Modal, orderStatusTone, Spinner, TablePagination } from '../../components/ui';
import { ProductFormModal } from '../../components/ProductTable';
import StockUpdateModal from '../../components/StockUpdateModal';
import PriceUpdateModal from '../../components/PriceUpdateModal';

interface WholesaleLine {
  min: string;
  max: string;
  price: string;
}

function WholesaleModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [lines, setLines] = useState<WholesaleLine[]>(() => {
    const tiers = product.wholesale_tiers ?? [];
    if (tiers.length) return tiers.map((t) => ({ min: String(t.min), max: String(t.max), price: String(t.price) }));
    return [{ min: '1', max: '300', price: String(product.price) }];
  });
  const [saving, setSaving] = useState(false);
  const wnum = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const money3 = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '—');
  const image = product.images[0] ?? product.image_url ?? '';

  const addLine = () =>
    setLines((prev) => {
      const lastMax = wnum(prev[prev.length - 1].max);
      return [...prev, { min: Number.isFinite(lastMax) ? String(lastMax + 1) : '', max: '', price: '' }];
    });

  const effectiveLines = lines.map((l, i) =>
    i === 0
      ? l
      : {
          ...l,
          min: (() => {
            const prevMax = wnum(lines[i - 1].max);
            return Number.isFinite(prevMax) ? String(prevMax + 1) : l.min;
          })(),
        }
  );

  const updateMax = (i: number, value: string) =>
    setLines((prev) => prev.map((x, xi) => (xi === i ? { ...x, max: value } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tiers = effectiveLines
      .map((l) => ({ min: wnum(l.min), max: wnum(l.max), price: wnum(l.price) }))
      .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.max) && Number.isFinite(t.price) && t.min >= 0 && t.max >= 0 && t.price >= 0);
    if (tiers.length !== effectiveLines.length) return alert('Fill in all wholesale tier lines (quantity range + price).');
    setSaving(true);
    try {
      await apiPatch(`/products/${product.id}`, { wholesale_tiers: tiers });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Update the product wholesale price">
      <form onSubmit={submit} className="space-y-4">
        <div className="py-2 text-center text-sm font-bold text-slate-800">{product.name}</div>
        {image && (
          <div
            className="h-56 w-full rounded-lg"
            style={{ backgroundImage: `url(${image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-2 py-2" style={{ width: '24%' }}>Minimum quantity</th>
                <th className="px-2 py-2" style={{ width: '24%' }}>Maximum quantity</th>
                <th className="px-2 py-2" style={{ width: '25%' }}>Price</th>
                <th className="px-2 py-2" style={{ width: '27%' }}>Revenue after commission (3.000%)</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {effectiveLines.map((l, i) => (
                <tr key={i} className={i === 0 ? 'opacity-60' : ''}>
                  <td className="px-2 py-2">
                    <Input type="number" min="1" value={l.min} disabled />
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" min="1" value={l.max} onChange={(e) => updateMax(i, e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" min="0" step="0.001" value={l.price} onChange={(e) => setLines((prev) => prev.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)))} />
                  </td>
                  <td className="px-2 py-2">
                    <Input value={money3(wnum(l.price) * 0.97)} disabled />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, x) => x !== i))}
                      disabled={i === 0}
                      className="text-rose-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Delete line"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <ButtonGhost type="button" onClick={addLine}>+ Add a new line</ButtonGhost>
        </div>

        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update product wholesale price'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FourProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set<number>());
  const [edit, setEdit] = useState<Product | 'new' | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [priceFor, setPriceFor] = useState<Product | null>(null);
  const [wholesaleFor, setWholesaleFor] = useState<Product | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [wsDraft, setWsDraft] = useState<'all' | 'have' | 'lack' | 'ineligible'>('all');
  const [wholesaleFilter, setWholesaleFilter] = useState<'all' | 'have' | 'lack' | 'ineligible'>('all');

  const load = () => {
    setLoading(true);
    apiGet<Product[]>('/products').then(setProducts).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = products.filter((p) => {
    if (query) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q) && !(p.barcode ?? '').toLowerCase().includes(q)) return false;
    }
    const tiers = p.wholesale_tiers?.length ?? 0;
    switch (wholesaleFilter) {
      case 'have':
        return tiers > 0;
      case 'lack':
        return tiers === 0 && (p.category === 'wholesale' || p.category === 'white_label');
      case 'ineligible':
        return p.category === 'dropshipping';
      default:
        return true;
    }
  });

  const total = filtered.length;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleAll = () => {
    setSelected((prev) => {
      const visibleIds = pageRows.map((p) => p.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleActive = async (p: Product) => {
    try {
      await apiPatch(`/products/${p.id}`, { is_active: !p.is_active });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const categoryLabel = (c: string) => PRODUCT_CATEGORIES.find((x) => x === c) ?? 'dropshipping';

  const dims = (p: Product) => (p.length && p.width && p.height ? `${p.length} × ${p.width} × ${p.height}` : '—');
  const weight = (p: Product) => (p.weight != null ? `${p.weight} g` : '—');

  const wholesaleCell = (p: Product) => {
    const tiers = [...(p.wholesale_tiers ?? [])].sort((a, b) => a.min - b.min);
    if (tiers.length === 0) return <span className="text-slate-400">—</span>;
    const label = tiers.length > 1 ? `${money(tiers[0].price)} ~ ${money(tiers[tiers.length - 1].price)}` : money(tiers[0].price);
    return (
      <div className="group/ws relative inline-block">
        <span className="cursor-help">{label}</span>
        {tiers.length > 1 && (
          <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg group-hover/ws:block">
            {tiers.map((t) => (
              <div key={`${t.min}-${t.max}`} className="flex items-center justify-between gap-4">
                <span className="text-slate-500">• {t.min} – {t.max}:</span>
                <span className="font-semibold tabular-nums">{money(t.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const openMenu = (id: number | null) => setMenuFor((cur) => (cur === id ? null : id));

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-base font-bold text-slate-900">Products</h5>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEdit('new')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z" />
                </svg>
                <span>Add Product</span>
              </button>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-52 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <svg className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M500.3 443.7l-119.7-119.7c27.22-40.41 40.65-90.9 33.46-144.7C401.8 87.79 326.8 13.32 235.2 1.723 99.01-15.51-15.51 99.01 1.724 235.2c11.6 91.64 86.08 166.7 177.6 178.9 53.8 7.189 104.3-6.236 144.7-33.46l119.7 119.7c15.62 15.62 40.95 15.62 56.57 0C515.9 484.7 515.9 459.3 500.3 443.7zM79.1 208c0-70.58 57.42-128 128-128s128 57.42 128 128c0 70.58-57.42 128-128 128S79.1 278.6 79.1 208z" />
                </svg>
              </div>
              <button type="button" title="Filter" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
                <svg className="h-4 w-4" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M0 416C0 398.3 14.33 384 32 384H86.66C99 355.7 127.2 336 160 336C192.8 336 220.1 355.7 233.3 384H480C497.7 384 512 398.3 512 416C512 433.7 497.7 448 480 448H233.3C220.1 476.3 192.8 496 160 496C127.2 496 99 476.3 86.66 448H32C14.33 448 0 433.7 0 416V416zM160 384C142.3 384 128 398.3 128 416C128 433.7 142.3 448 160 448C177.7 448 192 433.7 192 416C192 398.3 177.7 384 160 384zM352 176C384.8 176 412.1 195.7 425.3 224H480C497.7 224 512 238.3 512 256C512 273.7 497.7 288 480 288H425.3C412.1 316.3 384.8 336 352 336C319.2 336 291 316.3 278.7 288H32C14.33 288 0 273.7 0 256C0 238.3 14.33 224 32 224H278.7C291 195.7 319.2 176 352 176zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288C369.7 288 384 273.7 384 256C384 238.3 369.7 224 352 224zM192 128C209.7 128 224 113.7 224 96C224 78.33 209.7 64 192 64C174.3 64 160 78.33 160 96C160 113.7 174.3 128 192 128z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((p) => selected.has(p.id))} onChange={toggleAll} className="h-4 w-4 accent-brand-600" />
                </th>
                <th className="pl-4 pr-3 py-3">Product</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3 text-center">Subscriptions</th>
                <th className="px-3 py-3 text-center">Price</th>
                <th className="px-3 py-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setWsMenuOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-800"
                      title="Filter wholesale price"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M3.853 54.87C10.47 40.9 24.54 32 40 32H472C487.5 32 501.5 40.9 508.1 54.87C514.8 68.84 512.7 85.37 502.1 97.33L320 320.9V448C320 460.1 313.2 471.2 302.3 476.6C291.5 482 278.5 480.9 268.8 473.6L204.8 425.6C196.7 419.6 192 410.1 192 400V320.9L9.042 97.33C-.745 85.37-2.765 68.84 3.854 54.87L3.853 54.87z" />
                      </svg>
                      <span>Wholesale price</span>
                    </button>
                    {wsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setWsMenuOpen(false)} />
                        <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                          <div className="text-xs font-semibold text-slate-800">Add to filters</div>
                          <hr className="my-2 border-slate-100" />
                          <select
                            value={wsDraft}
                            onChange={(e) => setWsDraft(e.target.value as 'all' | 'have' | 'lack' | 'ineligible')}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          >
                            <option value="all">All</option>
                            <option value="have">Only have wholesale price</option>
                            <option value="lack">Only lack wholesale price</option>
                            <option value="ineligible">Only not eligible for wholesale</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => { setWholesaleFilter(wsDraft); setWsMenuOpen(false); setPage(1); }}
                            className="mt-2 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                          >
                            Save
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-center">Shipping status</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-center">Offer type</th>
                <th className="px-3 py-3 text-center">Marketplace</th>
                <th className="px-3 py-3 text-center">Package dims L x W x H (mm)</th>
                <th className="px-3 py-3 text-center">Weight (g)</th>
                <th className="px-5 py-3 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center"><Spinner /></td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={13}><div className="flex h-24 items-center justify-center text-sm text-slate-400">No results found</div></td>
                </tr>
              ) : (
                pageRows.map((p) => (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-brand-50/50' : 'hover:bg-slate-50/60'}>
                    <td className="px-5 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 accent-brand-600" />
                    </td>
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-400">📦</div>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-medium text-slate-800">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{p.sku ?? p.barcode ?? `#${p.id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={p.stock === 0 ? 'red' : p.stock < 20 ? 'amber' : 'green'}>{p.stock} in stock</Badge>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400">—</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-800 tabular-nums">{money(p.price)}</td>
                    <td className="px-3 py-3 text-slate-600 tabular-nums">{wholesaleCell(p)}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge tone={p.stock > 0 ? orderStatusTone('shipped') : 'red'}>{p.stock > 0 ? 'Ready' : 'Out'}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={
                        p.moderation_status === 'approved' ? 'green' :
                        p.moderation_status === 'refused' ? 'red' :
                        p.moderation_status === 'hidden' ? 'slate' :
                        'amber'
                      }>
                        {p.moderation_status === 'approved' ? 'Active' :
                         p.moderation_status === 'refused' ? 'Refused' :
                         p.moderation_status === 'hidden' ? 'Hidden' :
                         'In Review'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge tone={categoryLabel(p.category) === 'wholesale' ? 'purple' : categoryLabel(p.category) === 'white_label' ? 'blue' : categoryLabel(p.category) === 'fulfillment' ? 'green' : 'slate'}>
                        {categoryLabel(p.category)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">{p.fournisseur_name || '—'}</td>
                    <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{dims(p)}</td>
                    <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{weight(p)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => openMenu(p.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                          title="Actions"
                        >
                          ⋯
                        </button>
                        {menuFor === p.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                            <div className="absolute right-0 z-20 mt-1 w-64 overflow-visible rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <Link
                                to={`/fournisseur/products/preview/${p.id}`}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setMenuFor(null)}
                              >
                                <span className="text-slate-400">⤢</span> Preview
                              </Link>
                              {p.moderation_status === 'approved' && (
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => { setMenuFor(null); void toggleActive(p); }}>
                                  <span>🙈</span> {p.is_active ? 'Hide it from the marketplace' : 'Show it on the marketplace'}
                                </button>
                              )}
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setStockFor(p); setMenuFor(null); }}>
                                <span>🏭</span> Update the stock
                              </button>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setPriceFor(p); setMenuFor(null); }}>
                                <span>💲</span> Update the price
                              </button>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setWholesaleFor(p); setMenuFor(null); }}>
                                <span>🏷️</span> Update wholesale prices
                              </button>
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setMenuFor(null); alert('Fulfillment preferences are not available yet.'); }}>
                                <span>⏱️</span> Update the fulfillment preferences
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination count={total} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>

      <AppFooter />

      {edit && <ProductFormModal product={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {stockFor && <StockUpdateModal product={stockFor} onClose={() => setStockFor(null)} onDone={() => { setStockFor(null); load(); }} />}
      {priceFor && <PriceUpdateModal product={priceFor} onClose={() => setPriceFor(null)} onDone={() => { setPriceFor(null); load(); }} />}
      {wholesaleFor && <WholesaleModal product={wholesaleFor} onClose={() => setWholesaleFor(null)} onDone={() => { setWholesaleFor(null); load(); }} />}
    </div>
  );
}