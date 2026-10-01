import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiErrorMessage, apiGet, apiPost, money, SavedProduct } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Input, PageHeader, Search, Spinner, Stars } from '../../components/ui';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  price: 'Price',
  stock: 'Stock',
  sku: 'SKU',
  barcode: 'Barcode',
  is_active: 'Availability',
};

function fmtField(field: string, v: string | null): string {
  if (v === null || v === '') return '—';
  if (field === 'price') return money(Number(v));
  if (field === 'is_active') return v === '1' ? 'active' : 'inactive';
  return v;
}

export default function DsProducts() {
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<'all' | 'custom' | 'supplier'>('all');

  const load = () => {
    setLoading(true);
    apiGet<SavedProduct[]>('/products/saved')
      .then((list) => {
        setSaved(list);
        setPrices(Object.fromEntries(list.map((s) => [s.product.id, String(s.my_price ?? s.product.price)])));
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (p: SavedProduct) => {
    if (!window.confirm(`Remove "${p.product.name}" from your products?`)) return;
    try {
      await apiDelete(`/products/saved/${p.product.id}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const savePrice = async (s: SavedProduct) => {
    const val = Number(prices[s.product.id]);
    if (!Number.isFinite(val) || val < 0) {
      alert('Enter a valid price');
      return;
    }
    setSaving(s.product.id);
    try {
      await apiPost(`/products/saved/${s.product.id}/price`, { my_price: val });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const resetPrice = async (s: SavedProduct) => {
    setSaving(s.product.id);
    try {
      await apiPost(`/products/saved/${s.product.id}/price`, { my_price: null });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const filtered = saved.filter((s) => {
    if (q) {
      const hay = `${s.product.name} ${s.product.fournisseur_name ?? ''} ${s.product.sku ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (src === 'custom') return s.my_price != null;
    if (src === 'supplier') return s.my_price == null;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="My products"
        subtitle="Set your own selling price on each product — save it from the store, pick your price, and keep the difference between your price and the supplier's price"
        breadcrumb={[{ label: 'Home', to: '/dropshipper' }, { label: 'My products' }]}
        actions={
          <>
            <ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>
            <Link to="/dropshipper/store">
              <Button>+ Add from store</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Search value={q} onChange={setQ} placeholder="Search your products..." compact />
          <select
            value={src}
            onChange={(e) => setSrc(e.target.value as typeof src)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-400"
          >
            <option value="all">All products</option>
            <option value="custom">Custom price</option>
            <option value="supplier">Supplier price</option>
          </select>
        </div>
        <p className="text-sm font-semibold text-slate-600">
          {filtered.length} product{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="⭐" title={saved.length === 0 ? 'No saved products yet' : 'Nothing matches these filters'} hint={saved.length === 0 ? 'Go to the store and click "Add to my product".' : 'Try a different search or filter.'} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const myPrice = Number(prices[s.product.id]);
            const cost = s.product.price;
            const benefit = round2(myPrice - cost);
            const benefitPct = myPrice > 0 ? Math.round((benefit / myPrice) * 100) : 0;
            const usingCustom = s.my_price != null;
            return (
              <Card key={s.id} className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-600/10">
                <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-slate-100">
                  {s.product.image_url ? (
                    <img src={s.product.image_url} alt={s.product.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300">📦</div>
                  )}
                  <div className="absolute right-3 top-3">
                    {s.product.stock === 0 ? <Badge tone="red">out of stock</Badge> : <Badge tone="green">{s.product.stock} in stock</Badge>}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                      {(s.product.fournisseur_name ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-500">{s.product.fournisseur_name}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-slate-400">saved {new Date(s.saved_at).toLocaleDateString()}</span>
                  </div>

                  <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">{s.product.name}</h3>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <Stars value={s.product.rating} />
                    <span className="text-slate-400">({s.product.rating_count})</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Supplier price</p>
                      <p className="text-base font-extrabold text-slate-900">{money(cost)}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2 ring-1 ring-inset ${benefit >= 0 ? 'bg-emerald-50 ring-emerald-100' : 'bg-rose-50 ring-rose-100'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Your benefit</p>
                      <p className={`text-base font-extrabold ${benefit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(benefit)}</p>
                      <p className={`text-[11px] font-semibold ${benefit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{benefitPct}% margin</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Your selling price</p>
                      {usingCustom && <Badge tone="blue">custom</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[s.product.id] ?? ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [s.product.id]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button className="px-3 py-2 text-xs" onClick={() => savePrice(s)} disabled={saving !== null && saving !== s.product.id}>
                        {saving === s.product.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {usingCustom && <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => resetPrice(s)} disabled={saving !== null}>Use supplier price</ButtonGhost>}
                    <ButtonGhost className="ml-auto px-3 py-1.5 text-xs" onClick={() => remove(s)}>Remove</ButtonGhost>
                  </div>

                  {s.updates.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">Supplier updates</p>
                      <ul className="space-y-1">
                        {s.updates.map((u) => (
                          <li key={u.id} className="text-xs leading-relaxed text-slate-700">
                            <span className="font-semibold">{FIELD_LABELS[u.changed_field] ?? u.changed_field}</span> changed:{' '}
                            <span className="text-rose-600 line-through decoration-rose-300">{fmtField(u.changed_field, u.old_value)}</span>
                            {' → '}
                            <span className="font-semibold text-emerald-700">{fmtField(u.changed_field, u.new_value)}</span>
                            <span className="ml-1 text-amber-500">{new Date(u.created_at).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Your benefit = your selling price − the supplier's price. When you create a commande, the order is priced at your custom price and
        the fournisseur receives their listed price per unit.
      </p>
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}