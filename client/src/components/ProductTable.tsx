import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { apiDelete, apiErrorMessage, apiGet, apiPatch, apiPost, money, Product, PRODUCT_CATEGORIES, ProductCategory, CATEGORY_META } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, Spinner, Stars, Textarea } from './ui';
import { BarcodePanel } from './OrderCenter';

interface Props {
  canManage?: boolean;
}

export function ProductTable({ canManage }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Product | 'new' | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<Product[]>('/products').then(setProducts).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = products.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(q.toLowerCase()) || (p.barcode ?? '').toLowerCase().includes(q.toLowerCase());
  });

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await apiDelete(`/products/${p.id}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await apiPatch(`/products/${p.id}`, { is_active: !p.is_active });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Input placeholder="Search name, SKU, barcode..." value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          <ButtonGhost onClick={load}>Refresh</ButtonGhost>
        </div>
        {canManage && <Button onClick={() => setEdit('new')}>+ Add product</Button>}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="📦" title="No products found" hint="Try a different search or add a product." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              <div className="relative h-40 w-full bg-slate-100">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-slate-300">📦</div>
                )}
                <div className="absolute right-2 top-2 flex gap-1">
                  <Badge tone={p.is_active ? 'green' : 'red'}>{p.is_active ? 'active' : 'inactive'}</Badge>
                  {p.stock < 20 && <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 font-semibold text-slate-900">{p.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(CATEGORY_META[p.category] ? <Badge tone="blue">{CATEGORY_META[p.category].icon} {CATEGORY_META[p.category].label}</Badge> : null)}
                  {p.fournisseur_name && <p className="text-xs text-slate-500">🏭 {p.fournisseur_name}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Stars value={p.rating} />
                  <span>({p.rating_count})</span>
                </div>
                <div className="mt-auto space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="font-semibold">{money(p.price)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Stock</span><span className="font-semibold">{p.stock} units</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <ButtonGhost className="flex-1 px-3 py-1.5 text-xs" onClick={() => setEdit(p)}>Edit</ButtonGhost>
                  {canManage && (
                    <>
                      <ButtonGhost className="flex-1 px-3 py-1.5 text-xs" onClick={() => setStockFor(p)}>Stock</ButtonGhost>
                      <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => toggleActive(p)}>{p.is_active ? 'Hide' : 'Show'}</ButtonGhost>
                      <ButtonGhost className="px-3 py-1.5 text-xs text-rose-600" onClick={() => remove(p)}>✕</ButtonGhost>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {edit && <ProductFormModal product={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {stockFor && <StockModal product={stockFor} onClose={() => setStockFor(null)} onDone={() => { setStockFor(null); load(); }} />}
    </div>
  );
}

export function ProductFormModal({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'dropshipping');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [images, setImages] = useState<string[]>(product?.images ?? (product?.image_url ? [product.image_url] : []));
  const [videos, setVideos] = useState<string[]>(product?.videos ?? (product?.video_url ? [product.video_url] : []));
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const uploadImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await apiPost<{ url: string }>('/upload', fd);
        setImages((prev) => [...prev, res.url]);
      } catch (err) {
        alert(apiErrorMessage(err));
      }
    }
  };

  const uploadVideos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await apiPost<{ url: string }>('/upload/video', fd);
        setVideos((prev) => [...prev, res.url]);
      } catch (err) {
        alert(apiErrorMessage(err));
      }
    }
  };

  const addUrl = (list: string[], set: (v: string[]) => void, value: string) => {
    const v = value.trim();
    if (v) set([...list, v]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      description: description || null,
      price: Number(price),
      stock: Number(stock),
      category,
      sku: sku || null,
      images,
      videos,
    };
    try {
      if (product) await apiPatch(`/products/${product.id}`, payload);
      else await apiPost('/products', payload);
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={product ? `Edit ${product.name}` : 'Add product'} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Product name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Selling price (TND)"><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
          <Field label="Stock"><Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required /></Field>
        </div>
        <Field label="Offer type">
          <div className="grid gap-2 sm:grid-cols-3">
            {PRODUCT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  category === c ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-bold text-slate-800">{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{CATEGORY_META[c].desc}</p>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU"><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-XXX-001" /></Field>
          <Field label="Barcode">
            {product?.barcode && user?.role !== 'seller' ? (
              <Input value={product.barcode} disabled />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Generated automatically when you create the product
              </p>
            )}
          </Field>
        </div>

        <Field label="Product images">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadImages} />
            <ButtonGhost type="button" onClick={() => imgRef.current?.click()}>⬆ Upload images</ButtonGhost>
            <UrlInput onAdd={(v) => addUrl(images, setImages, v)} placeholder="Add image URL" />
          </div>
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="preview" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, x) => x !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <Field label="Product videos">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={vidRef} type="file" accept="video/*" multiple className="hidden" onChange={uploadVideos} />
            <ButtonGhost type="button" onClick={() => vidRef.current?.click()}>⬆ Upload videos</ButtonGhost>
            <UrlInput onAdd={(v) => addUrl(videos, setVideos, v)} placeholder="Add video URL" />
          </div>
          {videos.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {videos.map((vid, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                  <span className="truncate">🎬 {vid}</span>
                  <button type="button" onClick={() => setVideos(videos.filter((_, x) => x !== i))} className="ml-auto text-rose-500 hover:underline">remove</button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : product ? 'Save changes' : 'Create product'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function UrlInput({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center gap-1">
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="w-56" />
      <ButtonGhost
        type="button"
        onClick={() => {
          onAdd(val);
          setVal('');
        }}
      >
        +
      </ButtonGhost>
    </div>
  );
}

export function StockModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [stock, setStock] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost(`/products/${product.id}/stock`, { stock: Number(stock) });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Update stock — ${product.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New stock quantity"><Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required /></Field>
        {user?.role !== 'seller' && <BarcodePanel value={product.barcode ?? ''} />}
        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update stock'}</Button>
        </div>
      </form>
    </Modal>
  );
}
