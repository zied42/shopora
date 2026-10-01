import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPostRaw, CreateOrderResponse, GOVERNORATES, money, Order, Product } from '../../lib/api';
import { Badge, Button, ButtonGhost, EmptyState, Field, Input, Select } from '../../components/ui';

interface Props {
  onCreated: () => void;
  exchangeMode?: boolean;
}

export default function FulfillmentNewOrder({ onCreated, exchangeMode = false }: Props) {
  const [searchParams] = useSearchParams();
  const isEchange = exchangeMode || searchParams.get('echange') === '1';

  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Record<number, number>>({});

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [telephone2, setTelephone2] = useState('');
  const [gouvernerat, setGouvernerat] = useState(GOVERNORATES[0]);
  const [delegation, setDelegation] = useState('');
  const [adresse, setAdresse] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [estFragile, setEstFragile] = useState<'oui' | 'non'>('non');
  const [ouvrirColis, setOuvrirColis] = useState<'oui' | 'non'>('non');
  const nombreEchange: 'oui' | 'non' = isEchange ? 'oui' : 'non';
  const [nombreArticleField, setNombreArticleField] = useState('1');
  const [priceField, setPriceField] = useState('');

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ order: Order; requested: CreateOrderResponse['requestedFromSupplier'] } | null>(null);

  const load = () =>
    apiGet<Product[]>('/products')
      .then((ps) => {
        const ff = ps.filter((p) => p.category === 'fulfillment');
        setProducts(ff);
        setSel(Object.fromEntries(ff.filter((p) => p.stock > 0).map((p) => [p.id, 1] as const)));
      })
      .catch((e) => alert(apiErrorMessage(e)));
  useEffect(() => { void load(); }, []);

  const toggle = (productId: number) =>
    setSel((s) => {
      const n = { ...s };
      if (n[productId]) delete n[productId];
      else n[productId] = 1;
      return n;
    });

  const chosen = products.filter((p) => sel[p.id]);
  const items = chosen.map((p) => ({ product: p, price: p.price, quantity: sel[p.id] }));
  const computedTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const enteredPrice = Number(priceField);
  const total = priceField.trim() !== '' && Number.isFinite(enteredPrice) && enteredPrice > 0 ? enteredPrice : computedTotal;
  const platformFee = Math.round(total * 0.03 * 100) / 100;
  const estProfit = Math.round((total - platformFee) * 100) / 100;
  const manualNombreArticle = Number(nombreArticleField) || 1;
  const designation = items.map((it) => it.product.name).join(', ') || '';

  const submit = async () => {
    if (items.length === 0) {
      alert('Pick at least one fulfillment product');
      return;
    }
    if (!nom.trim() || !telephone.trim() || !adresse.trim()) {
      alert('Please fill in all Client details');
      return;
    }
    setSaving(true);
    try {
      const res = await apiPostRaw<CreateOrderResponse>('/orders', {
        customer_name: nom.trim(),
        governorate: gouvernerat,
        city: delegation,
        shipping_address: adresse,
        customer_phone: telephone || null,
        telephone2: telephone2 || null,
        payment_method: 'cod',
        items: items.map((it) => ({ product_id: it.product.id, quantity: it.quantity })),
        offer_type: 'fulfillment',
        manual_price: total,
        commentaire: commentaire || null,
        est_fragile: estFragile,
        ouvrir_colis: ouvrirColis,
        nombre_article: manualNombreArticle,
        nombre_echange: nombreEchange,
      });
      setCreated({ order: res.data, requested: res.requestedFromSupplier ?? [] });
      onCreated();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✅</div>
          <p className="break-words text-lg font-bold text-slate-900">Fulfillment order {created.order.order_number} saved as draft</p>
          <p className="break-words text-sm text-slate-500">
            Total {money(created.order.total)} · Cash on delivery · {created.order.customer_name} — send it to the chef from your Fulfillment orders list when the details are final.
          </p>
          {created.requested.length > 0 && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-sm font-bold text-amber-800">📦 Stock to prepare</p>
              <p className="mt-1 break-words text-xs text-amber-700">
                House stock was not enough for {created.requested.map((r) => `"${r.product_name}" ×${r.quantity}`).join(', ')}. Once you send this
                commande to the chef, the chef will be notified to make them ready.
              </p>
            </div>
          )}
          <ButtonGhost onClick={() => setCreated(null)}>Create another</ButtonGhost>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {isEchange && (
        <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm font-semibold text-brand-700">
          🔁 Creating an exchange fulfillment order
        </div>
      )}
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
              <p className="text-sm font-semibold text-slate-800">Produit — Pick fulfillment products</p>
            </div>
            <div className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon="📦" title="No fulfillment products" hint="Add fulfillment products first from the Fulfillment Add product page." />
                </div>
              ) : (
                products.map((p) => {
                  const qty = sel[p.id] ?? 0;
                  const on = qty > 0;
                  const out = p.stock === 0;
                  const low = p.stock > 0 && p.stock < 20;
                  return (
                    <div key={p.id} className={`flex items-center gap-2 px-3 py-3 transition sm:gap-3 sm:px-5 ${on ? 'bg-brand-50/40' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600" />
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-slate-800 sm:text-sm">{p.name}</p>
                        <p className="truncate text-[11px] text-slate-500 sm:text-xs">{p.sku ?? '—'}</p>
                        <p className={`text-[11px] font-semibold ${out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-emerald-600'}`}>
                          📦 {out ? 'Out of stock' : `${p.stock} left`}
                        </p>
                      </div>
                      {on && (
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quantity</span>
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) => setSel((v) => ({ ...v, [p.id]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
                            className="h-8 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:mt-6 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
              <p className="text-sm font-semibold text-slate-800">Produit — Details</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Désignation</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 min-h-[36px]">
                  {designation || <span className="text-slate-400">Select products above</span>}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Nombre d'article</p>
                <input
                  type="number"
                  min={1}
                  value={nombreArticleField}
                  onChange={(e) => setNombreArticleField(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-slate-500">Price (including VAT)</p>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceField}
                onChange={(e) => setPriceField(e.target.value)}
                placeholder={`${computedTotal.toFixed(2)} DT`}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-lg font-bold text-brand-700 focus:border-brand-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">One price for the whole commande — leave empty to auto-calculate.</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-600">Ouvrir colis</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="radio" name="ouvrir" checked={ouvrirColis === 'non'} onChange={() => setOuvrirColis('non')} className="accent-brand-600" /> Non
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="radio" name="ouvrir" checked={ouvrirColis === 'oui'} onChange={() => setOuvrirColis('oui')} className="accent-brand-600" /> Oui
                  </label>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-600">Colis fragile</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="radio" name="fragile" checked={estFragile === 'non'} onChange={() => setEstFragile('non')} className="accent-brand-600" /> Non
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="radio" name="fragile" checked={estFragile === 'oui'} onChange={() => setEstFragile('oui')} className="accent-brand-600" /> Oui
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Field label="Commentaire">
                <Input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Special delivery instructions..." />
              </Field>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:mt-6 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
              <p className="text-sm font-semibold text-slate-800">Client — Delivery details</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="sm:col-span-2">
                <Field label="Nom complet"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Full name" /></Field>
              </div>
              <Field label="Téléphone"><Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+216..." /></Field>
              <Field label="Téléphone 2"><Input value={telephone2} onChange={(e) => setTelephone2(e.target.value)} placeholder="+216..." /></Field>
              <Field label="Gouvernorat">
                <Select value={gouvernerat} onChange={(e) => setGouvernerat(e.target.value)}>
                  {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Délegation"><Input value={delegation} onChange={(e) => setDelegation(e.target.value)} placeholder="Délegation / City" /></Field>
              <div className="sm:col-span-2">
                <Field label="Adresse"><Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Street, building, apartment" /></Field>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-8">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 pt-4 pb-3 sm:px-5">
                <p className="text-sm font-bold text-slate-900">Summary</p>
                <p className="text-xs text-slate-400">Live estimate while you build the order</p>
              </div>
              <div className="space-y-2 px-4 py-4 text-sm sm:px-5">
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Type</span><Badge tone="green">📦 Fulfillment</Badge></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Client</span><span>{nom || '—'}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Destination</span><span className="text-right">{delegation || '—'}, {gouvernerat}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Articles</span><span>{manualNombreArticle}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Fragile</span><span>{estFragile === 'oui' ? '🟢 Yes' : 'No'}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Open package</span><span>{ouvrirColis === 'oui' ? '🟢 Yes' : 'No'}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Exchange</span><span>{nombreEchange === 'oui' ? '🟢 Yes' : 'No'}</span></div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5">
                    <span className="text-sm font-semibold text-brand-700">Total (TTC)</span>
                    <span className="text-right text-lg font-bold tabular-nums text-brand-700">{money(total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 text-slate-500">Platform fee (3%)</span><span className="shrink-0 text-right">{money(platformFee)}</span></div>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 text-slate-500">Est. profit</span><span className="shrink-0 text-right font-semibold text-emerald-600">{money(estProfit)}</span></div>
              </div>
              {items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {items.map((it) => <Badge key={it.product.id} tone="green">{it.product.name} ×{it.quantity}</Badge>)}
                </div>
              )}
              <Button className="mt-4 w-full" disabled={saving || items.length === 0} onClick={submit}>
                {saving ? (isEchange ? 'Creating exchange order...' : 'Creating...') : (isEchange ? 'Create exchange order' : 'Create order')}
              </Button>
              <p className="mt-2 pb-4 text-center text-xs text-slate-400">Payment on delivery · saved as a draft, then sent to the chef</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}