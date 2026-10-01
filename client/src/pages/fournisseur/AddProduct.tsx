import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiUpload, CategoryNode, ProductCategory, PRODUCT_CATEGORY_TREE, getMySupplierOrg, SupplierOrgEligibility } from '../../lib/api';
import { AppFooter, Button, ButtonGhost, Field, Input } from '../../components/ui';
import { warehouseNames } from '../../lib/warehouses';

type OfferType = 'both' | 'wholesale';

interface SpecRow {
  k: string;
  v: string;
}

interface WholesaleLine {
  min: string;
  max: string;
  price: string;
}

interface OptionRow {
  name: string;
  values: string[];
}

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

const money = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '—');

export default function AddProduct({ mode = 'marketplace' }: { mode?: 'marketplace' | 'fulfillment' } = {}) {
  const isFulfillment = mode === 'fulfillment';
  const navigate = useNavigate();
  const [offerType, setOfferType] = useState<OfferType>('wholesale');
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [quick, setQuick] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>(isFulfillment ? 'fulfillment' : 'wholesale');
  const [catPath, setCatPath] = useState<CategoryNode[]>([]);
  const [sku, setSku] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([{ k: '', v: '' }]);
  const [hasOptions, setHasOptions] = useState(false);
  const [grossPrice, setGrossPrice] = useState('');
  const [vat, setVat] = useState('19');
  const [recommendedPrice, setRecommendedPrice] = useState('');
  const [priceConstraint, setPriceConstraint] = useState<'no' | 'yes'>('no');
  const [wsLines, setWsLines] = useState<WholesaleLine[]>([{ min: '1', max: '', price: '' }]);

  const wsEffectiveLines = wsLines.map((l, i) =>
    i === 0
      ? l
      : {
          ...l,
          min: (() => {
            const prevMax = num(wsLines[i - 1].max);
            return Number.isFinite(prevMax) ? String(prevMax + 1) : l.min;
          })(),
        }
  );

  const updateWsMax = (i: number, value: string) =>
    setWsLines((prev) => prev.map((x, xi) => (xi === i ? { ...x, max: value } : x)));

  const [dims, setDims] = useState({ height: '', length: '', width: '', weight: '' });
  const [inventory, setInventory] = useState<Record<string, string>>(
    Object.fromEntries(warehouseNames().map((w) => [w, '0']))
  );
  const [options, setOptions] = useState<OptionRow[]>([{ name: '', values: [] }]);
  const [optValueInput, setOptValueInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVid, setUploadingVid] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const [supplierOrg, setSupplierOrg] = useState<SupplierOrgEligibility | null>(null);

  useEffect(() => {
    getMySupplierOrg().then(setSupplierOrg).catch(() => {});
  }, []);

  const isEligible = supplierOrg?.allow_marketplace && supplierOrg?.dropshipping_eligible;

  const pickOffer = (t: OfferType) => {
    setOfferType(t);
    setCategory(whiteLabel ? 'white_label' : t === 'both' ? 'dropshipping' : 'wholesale');
  };

  const pickOptions = (opts: boolean) => {
    setHasOptions(opts);
  };

  const uploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadingImg(true);
    for (const f of files) {
      try {
        const url = await apiUpload(f);
        setImages((prev) => [...prev, url]);
      } catch {
        alert('Image upload failed');
      }
    }
    setUploadingImg(false);
    e.target.value = '';
  };

  const uploadVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadingVid(true);
    for (const f of files) {
      try {
        const url = await apiUpload(f);
        setVideos((prev) => [...prev, url]);
      } catch {
        alert('Video upload failed');
      }
    }
    setUploadingVid(false);
    e.target.value = '';
  };

  const addKeyword = () => {
    const k = kwInput.trim();
    if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k]);
    setKwInput('');
  };

  const nameWords = name.trim().split(/\s+/).filter(Boolean).length;
  const descWords = description.trim().split(/\s+/).filter(Boolean).length;

  const totalStock = warehouseNames().reduce((s, w) => s + (num(inventory[w] ?? '') || 0), 0);

  const gross = num(grossPrice);
  const vatRate = num(vat) || 0;
  const vatAmount = Number.isFinite(gross) ? gross - gross / (1 + vatRate / 100) : NaN;
  const netPrice = Number.isFinite(gross) ? gross - vatAmount : NaN;
  const revIncl = Number.isFinite(gross) ? gross * 0.97 : NaN;
  const revExcl = Number.isFinite(netPrice) ? netPrice * 0.97 : NaN;

  const scoreItems: { label: string; done: boolean }[] = [
    { label: 'Name length between 3 and 10 words', done: nameWords >= 3 && nameWords <= 10 },
    { label: '2 Keywords or more', done: keywords.length >= 2 },
    { label: '5 Keywords or more', done: keywords.length >= 5 },
    { label: 'Upload 3 or more images', done: images.length >= 3 },
    { label: 'Upload 5 or more images', done: images.length >= 5 },
    { label: 'Upload one or more videos', done: videos.length >= 1 },
    { label: 'Description length is more than 50 words', done: descWords > 50 },
    { label: 'Description length is more than 100 words', done: descWords > 100 },
    { label: 'Stock is 100 units or greater', done: totalStock >= 100 },
    { label: 'Stock is 300 units or greater', done: totalStock >= 300 },
    { label: 'Stock is 1000 units or greater', done: totalStock >= 1000 },
  ];
  const score = Math.round((scoreItems.filter((s) => s.done).length / scoreItems.length) * 100);
  const R = 54;
  const CIRC = 2 * Math.PI * R;

  const retailCategory = catPath
    .map((n) => n.name)
    .join(' > ')
    .slice(0, 255);

  const offers: ProductCategory[] = (() => {
    if (isFulfillment) return ['fulfillment'];
    const base: ProductCategory[] = offerType === 'both' ? ['dropshipping', 'wholesale'] : ['wholesale'];
    if (whiteLabel) base.push('white_label');
    return base;
  })();

  const setCatLevel = (level: number, node: CategoryNode | undefined) => {
    setCatPath((prev) => (node ? [...prev.slice(0, level), node] : prev.slice(0, level)));
  };

  const submit = async () => {
    if (!name.trim()) return alert('Product name is required');
    if (!isFulfillment && (!Number.isFinite(gross) || gross <= 0)) return alert('Gross price is required');
    const wsTiers = isFulfillment
      ? []
      : wsEffectiveLines
          .map((l) => ({ min: num(l.min), max: num(l.max), price: num(l.price) }))
          .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.max) && Number.isFinite(t.price) && t.min >= 0 && t.max >= 0 && t.price >= 0);
    if (!isFulfillment && wsTiers.length !== wsEffectiveLines.length && wsEffectiveLines.some((l) => l.price.trim())) {
      return alert('Fill in all wholesale tier lines (quantity range + price).');
    }
    setSaving(true);
    try {
      await apiPost('/products', {
        name: name.trim(),
        description: description || null,
        price: isFulfillment ? 1 : gross,
        cost_price: isFulfillment ? 0 : gross,
        stock: totalStock,
        category,
        offers,
        retail_category: retailCategory || null,
        height: num(dims.height) || null,
        length: num(dims.length) || null,
        width: num(dims.width) || null,
        weight: num(dims.weight) || null,
        keywords,
        specifications: specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => ({ k: s.k.trim(), v: s.v.trim() })),
        sku: sku || null,
        images,
        videos,
        is_active: !quick,
        ...(wsTiers.length ? { wholesale_tiers: wsTiers } : {}),
      });
      navigate('/fournisseur/products');
    } catch (e) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const setSpec = (i: number, patch: Partial<SpecRow>) => setSpecs((prev) => prev.map((s, x) => (x === i ? { ...s, ...patch } : s)));

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-brand-50 via-slate-50 to-transparent px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Add Product</h5>
        </div>

        <div className="p-5">
          {/* Quick add */}
          <div className="mb-4 flex justify-end">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Quick Add (Save as Draft)
            </label>
          </div>

          {!isFulfillment && (
          <>
          {/* Offer type cards */}
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {isEligible ? (
              <button
                type="button"
                onClick={() => pickOffer('both')}
                className={`rounded-xl border p-4 text-left transition ${offerType === 'both' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">Sell Dropshipping &amp; Wholesale</span>
                    <span className="mt-2 text-center text-xs text-slate-500">Available for both dropshipping and wholesale orders</span>
                  </div>
                  <span className="text-2xl">💱</span>
                </div>
              </button>
            ) : (
              <div className="relative cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-4 opacity-60">
                <span className="absolute right-3 top-3 rounded-full bg-slate-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">🔒 Not eligible yet</span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-600">Sell Dropshipping &amp; Wholesale</span>
                    <span className="mt-2 text-center text-xs text-slate-500">Available for both dropshipping and wholesale orders</span>
                  </div>
                  <span className="text-2xl">💱</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => pickOffer('wholesale')}
              className={`rounded-xl border p-4 text-left transition ${offerType === 'wholesale' && category === 'wholesale' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Sell only wholesale</span>
                  <span className="mt-2 text-center text-xs text-slate-500">Accept only wholesale orders. The product won't be visible in the dropshipping market</span>
                </div>
                <span className="text-2xl">🏷️</span>
              </div>
            </button>
          </div>

          {/* White label question */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">Does this product is <span className="cursor-help underline decoration-dotted">White Label</span>?</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: 'No, it is normal product', val: false },
                { label: 'Yes, it is white label product', val: true },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => {
                    setWhiteLabel(opt.val);
                    setHasOptions(false);
                    setCategory(opt.val ? 'white_label' : offerType === 'wholesale' ? 'wholesale' : 'dropshipping');
                  }}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${whiteLabel === opt.val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          </>
          )}

          {/* Product information */}
          <div>
            <h5 className="my-2 font-bold text-slate-900">Product Information</h5>
            <hr className="mb-4 mt-2 border-slate-200" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name">
                <Input placeholder="Adidas shoes" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Categories">
                <div className="space-y-2">
                  {catPath.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      {catPath.map((n, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-slate-400">›</span>}
                          <span className={i === catPath.length - 1 ? 'font-semibold text-brand-700' : ''}>{n.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const levels: { options: CategoryNode[]; label: string; index: number }[] = [
                      { options: PRODUCT_CATEGORY_TREE, label: 'Main category', index: 0 },
                    ];
                    for (let i = 0; i < catPath.length && catPath[i]?.children; i++) {
                      levels.push({ options: catPath[i].children!, label: `Sub-category of ${catPath[i].name}`, index: i + 1 });
                    }
                    return levels.map((lv) => (
                      <div key={lv.index}>
                        <p className="mb-1 text-xs font-medium text-slate-500">{lv.label}</p>
                        <select
                          value={catPath[lv.index]?.name ?? ''}
                          onChange={(e) => setCatLevel(lv.index, lv.options.find((c) => c.name === e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        >
                          <option value="">— Select —</option>
                          {lv.options.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.children ? `${c.name} ›` : c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ));
                  })()}
                </div>
              </Field>
              <Field label="SKU">
                <Input placeholder="UGG-BB-PUR-06" value={sku} onChange={(e) => setSku(e.target.value)} />
              </Field>
              <Field label="Keywords">
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 ring-brand-100 focus-within:border-brand-500 focus-within:ring-2">
                  {keywords.map((k) => (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {k}
                      <button type="button" onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))} className="text-brand-400 hover:text-brand-700">×</button>
                    </span>
                  ))}
                  <input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    onBlur={addKeyword}
                    placeholder="Type something and press enter..."
                    className="min-w-[140px] flex-1 border-0 text-sm outline-none"
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Images</p>
                <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void uploadImages(e)} />
                <div
                  onClick={() => imgRef.current?.click()}
                  className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-brand-400 hover:bg-brand-50/50"
                >
                  <span className="text-2xl">{uploadingImg ? '⏳' : '🖼️'}</span>
                  <span className="text-xs text-slate-500">Drag &amp; drop images here or <span className="font-semibold text-brand-600">Browse</span></span>
                </div>
                {images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt="preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                        <button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Videos</p>
                <input ref={vidRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => void uploadVideos(e)} />
                <div
                  onClick={() => vidRef.current?.click()}
                  className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-brand-400 hover:bg-brand-50/50"
                >
                  <span className="text-2xl">{uploadingVid ? '⏳' : '🎬'}</span>
                  <span className="text-xs text-slate-500">Drag &amp; drop videos here or <span className="font-semibold text-brand-600">Browse</span></span>
                </div>
                {videos.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {videos.map((v, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        <span className="truncate">🎬 {v}</span>
                        <button type="button" onClick={() => setVideos(videos.filter((_, x) => x !== i))} className="ml-auto text-rose-500">remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-700">Product Description</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe your product in detail..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Characteristics */}
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-700">Product characteristics <span className="text-slate-400">(optional)</span></p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Specification</th>
                      <th className="px-3 py-2 text-left">Value</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {specs.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2"><Input value={s.k} onChange={(e) => setSpec(i, { k: e.target.value })} placeholder="e.g. Material" /></td>
                        <td className="px-3 py-2"><Input value={s.v} onChange={(e) => setSpec(i, { v: e.target.value })} placeholder="e.g. Cotton" /></td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, x) => x !== i))} className="text-rose-500 hover:text-rose-700">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <ButtonGhost type="button" onClick={() => setSpecs((prev) => [...prev, { k: '', v: '' }])}>+ Add another specification</ButtonGhost>
              </div>
            </div>

            {/* Options question */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Does this product have options (e.g. colors, sizes)?</p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { icon: '📓', label: 'No, product has no options', val: false },
                  { icon: '👕', label: 'Yes, product has options', val: true },
                ].map((opt) => {
                  const active = hasOptions === opt.val;
                  return (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => pickOptions(opt.val)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-brand-600' : 'border-slate-300'}`}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                      </span>
                      <span className="text-lg">{opt.icon}</span>
                      <span className={`text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-700'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                Please specify if your product has options (e.g., colors, sizes) to maintain a clear and organized product listing, and potentially increase sales.
              </div>

              {!hasOptions ? (
                <>
                  {!isFulfillment && (
                  <div>
                    <h5 className="my-2 font-bold text-slate-900">Sample pricing</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Gross Price">
                        <Input type="number" min="0" step="0.001" placeholder="1500.000 TND" value={grossPrice} onChange={(e) => setGrossPrice(e.target.value)} />
                      </Field>
                      <Field label="Value Added Tax">
                        <Input type="number" min="0" step="0.1" placeholder="19%" value={vat} onChange={(e) => setVat(e.target.value)} />
                      </Field>
                      <Field label="Recommended price for marketers">
                        <Input type="number" min="0" step="0.001" placeholder="1500.000 TND" value={recommendedPrice} onChange={(e) => setRecommendedPrice(e.target.value)} />
                      </Field>
                    </div>
                    <div className="mt-4 grid gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 md:grid-cols-3">
                      <Field label="Commission Rate">
                        <Input value="3%" disabled />
                      </Field>
                      <Field label="Revenue Including VAT">
                        <Input value={`${money(revIncl)} TND`} disabled />
                      </Field>
                      <Field label="Revenue Excluding VAT">
                        <Input value={`${money(revExcl)} TND`} disabled />
                      </Field>
                    </div>
                  </div>
                  )}

                  {/* Marketer price constraint */}
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Do you want to set a constraint on marketers selling price for this product?</p>
                    <div className="flex gap-4">
                      {(
                        [
                          { label: 'No', val: 'no' as const },
                          { label: 'Yes', val: 'yes' as const },
                        ]
                      ).map((opt) => {
                        const active = priceConstraint === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setPriceConstraint(opt.val)}
                            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${active ? 'border-brand-600' : 'border-slate-300'}`}>
                              {active && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!isFulfillment && (
                  <>
                  {/* Wholesale orders pricing */}
                  <div className="mt-4">
                    <h5 className="my-2 font-bold text-slate-900">Wholesale orders pricing</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Minimum quantity</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Maximum quantity</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Price</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Revenue after commission (3%)</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {wsEffectiveLines.map((l, i) => (
                            <tr key={i} className={i === 0 ? 'opacity-40' : ''}>
                              <td className="px-3 py-2">
                                <Input type="number" min="1" value={l.min} disabled />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" min="1" value={l.max} onChange={(e) => updateWsMax(i, e.target.value)} />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" min="0" step="0.001" value={l.price} onChange={(e) => setWsLines((prev) => prev.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)))} />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={l.price ? `${money(num(l.price) * 0.97)}` : ''} disabled />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setWsLines((prev) => prev.filter((_, x) => x !== i))}
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
                    <div className="mt-3">
                      <ButtonGhost type="button" onClick={() => setWsLines((prev) => {
                        const lastMax = num(prev[prev.length - 1].max);
                        return [...prev, { min: Number.isFinite(lastMax) ? String(lastMax + 1) : '', max: '', price: '' }];
                      })}>+ Add a new line</ButtonGhost>
                    </div>
                  </div>
                  </>
                  )}

                  {/* Dimensions */}
                  <div className="mt-4">
                    <h5 className="my-2 font-bold text-slate-900">Dimensions</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                        <span className="text-5xl">📦</span>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <span className="font-bold">Enter precise dimensions, including product packaging if applicable, to ensure accuracy and prevent issues.</span>
                          <div className="mt-1"><span className="mr-1 underline">Example:</span> For a smartphone, provide the package dimensions, not the phone's dimensions.</div>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <Field label="Height (in MM)">
                          <Input type="number" min="0" step="0.01" value={dims.height} onChange={(e) => setDims({ ...dims, height: e.target.value })} />
                        </Field>
                        <Field label="Length (in MM)">
                          <Input type="number" min="0" step="0.01" value={dims.length} onChange={(e) => setDims({ ...dims, length: e.target.value })} />
                        </Field>
                        <Field label="Width (in MM)">
                          <Input type="number" min="0" step="0.01" value={dims.width} onChange={(e) => setDims({ ...dims, width: e.target.value })} />
                        </Field>
                        <Field label="Weight (in Grams)">
                          <Input type="number" min="0" step="0.01" value={dims.weight} onChange={(e) => setDims({ ...dims, weight: e.target.value })} />
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="mt-4">
                    <h5 className="my-2 font-bold text-slate-900">Inventory</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    {warehouseNames().length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        No warehouses yet. Create one from the Warehouses page.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                            <tr>
                              <th className="px-4 py-2 text-left">Warehouse</th>
                              <th className="px-4 py-2 text-center" style={{ width: '30%' }}>
                                <div className="flex items-center justify-center gap-1">
                                  Quantity
                                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{totalStock} / 30</span>
                                </div>
                                <div className="mx-auto mt-1 h-1 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-200">
                                  <div className={`h-full ${totalStock === 0 ? 'bg-rose-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, (totalStock / 30) * 100)}%` }} />
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {warehouseNames().map((w) => (
                              <tr key={w}>
                                <td className="px-4 py-2 font-medium text-slate-700">{w}</td>
                                <td className="px-4 py-2">
                                  <Input type="number" min="0" value={inventory[w] ?? '0'} onChange={(e) => setInventory((prev) => ({ ...prev, [w]: e.target.value }))} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Wholesale orders pricing (options) */}
                  <div className="mt-4">
                    <h5 className="my-2 font-bold text-slate-900">Wholesale orders pricing</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Minimum quantity</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Maximum quantity</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Price</th>
                            <th className="px-3 py-2" style={{ width: '25%' }}>Revenue after commission (3%)</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {wsEffectiveLines.map((l, i) => (
                            <tr key={i} className={i === 0 ? 'opacity-40' : ''}>
                              <td className="px-3 py-2">
                                <Input type="number" min="1" value={l.min} disabled />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" min="1" value={l.max} onChange={(e) => updateWsMax(i, e.target.value)} />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" min="0" step="0.001" value={l.price} onChange={(e) => setWsLines((prev) => prev.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)))} />
                              </td>
                              <td className="px-3 py-2">
                                <Input value={l.price ? `${money(num(l.price) * 0.97)}` : ''} disabled />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setWsLines((prev) => prev.filter((_, x) => x !== i))}
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
                    <div className="mt-3">
                      <ButtonGhost type="button" onClick={() => setWsLines((prev) => {
                        const lastMax = num(prev[prev.length - 1].max);
                        return [...prev, { min: Number.isFinite(lastMax) ? String(lastMax + 1) : '', max: '', price: '' }];
                      })}>+ Add a new line</ButtonGhost>
                    </div>
                  </div>

                  {/* Options & Variations */}
                  <div className="mt-4">
                    <h5 className="my-2 font-bold text-slate-900">Options &amp; Variations</h5>
                    <hr className="mb-4 mt-2 border-slate-200" />
                    <datalist id="addProductOptions">
                      <option value="Color" />
                      <option value="Size" />
                    </datalist>
                    <div className="space-y-3">
                      {options.map((o, i) => (
                        <div key={i} className="rounded-xl border border-slate-300 p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Option Name">
                              <Input list="addProductOptions" placeholder="e.g. Color" value={o.name} onChange={(e) => setOptions((prev) => prev.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))} />
                            </Field>
                            <Field label="Option Values">
                              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 ring-brand-100 focus-within:border-brand-500 focus-within:ring-2">
                                {o.values.map((v) => (
                                  <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                                    {v}
                                    <button
                                      type="button"
                                      onClick={() => setOptions((prev) => prev.map((x, xi) => (xi === i ? { ...x, values: x.values.filter((xv) => xv !== v) } : x)))}
                                      className="text-brand-400 hover:text-brand-700"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                                <input
                                  value={i === options.length - 1 ? optValueInput : ''}
                                  onChange={(e) => setOptValueInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                                      e.preventDefault();
                                      const v = optValueInput.trim();
                                      if (v && !o.values.includes(v)) setOptions((prev) => prev.map((x, xi) => (xi === i ? { ...x, values: [...x.values, v] } : x)));
                                      setOptValueInput('');
                                    }
                                  }}
                                  onBlur={() => {
                                    const v = optValueInput.trim();
                                    if (v && !options[options.length - 1]?.values.includes(v)) setOptions((prev) => prev.map((x, xi) => (xi === options.length - 1 ? { ...x, values: [...x.values, v] } : x)));
                                    setOptValueInput('');
                                  }}
                                  placeholder="Type something and press enter..."
                                  className="min-w-[140px] flex-1 border-0 text-sm outline-none"
                                />
                              </div>
                            </Field>
                            <div className="flex items-end justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setOptions((prev) => prev.filter((_, x) => x !== i));
                                  if (i === options.length - 1) setOptValueInput('');
                                }}
                                disabled={options.length === 1}
                                className="text-sm text-rose-500 transition hover:text-rose-700 disabled:opacity-30"
                              >
                                Remove option
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <ButtonGhost type="button" onClick={() => setOptions((prev) => [...prev, { name: '', values: [] }])}>+ Add new option</ButtonGhost>
                    </div>

                    {/* Marketer price constraint */}
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-slate-800">Do you want to set a constraint on marketers selling price for this product?</p>
                      <div className="flex gap-4">
                        {(
                          [
                            { label: 'No', val: 'no' as const },
                            { label: 'Yes', val: 'yes' as const },
                          ]
                        ).map((opt) => {
                          const active = priceConstraint === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setPriceConstraint(opt.val)}
                              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                              <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${active ? 'border-brand-600' : 'border-slate-300'}`}>
                                {active && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                              </span>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                      Please fill in the product options and their values for the variations table to appear.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isFulfillment && (
            <>
          {/* Product score */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h5 className="my-2 font-bold text-slate-900">Product Score</h5>
            <hr className="mb-4 mt-2 border-slate-200" />
            <div className="grid gap-4 md:grid-cols-7">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🏆</span>
                  <div>
                    <p className="font-bold text-brand-600">Learn how to make your product stand out.</p>
                    <p className="text-xs text-slate-500">Meeting the following criteria can enhance the likelihood of obtaining approval for your product and achieving a higher market ranking.</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {scoreItems.map((s) => (
                    <div key={s.label} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${s.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      <span>{s.done ? '✅' : '❌'}</span>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center md:col-span-3">
                <p className="text-sm font-semibold text-slate-800">Product score</p>
                <div className="relative mt-3 h-36 w-36">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200" />
                    <circle
                      cx="60"
                      cy="60"
                      r={R}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={CIRC - (score / 100) * CIRC}
                      className={score >= 60 ? 'text-emerald-500' : score >= 30 ? 'text-amber-500' : 'text-rose-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-900">{score}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          <Button onClick={() => void submit()} disabled={saving} className="mt-4 w-full py-2">
            {saving ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}