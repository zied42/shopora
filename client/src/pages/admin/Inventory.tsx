import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { apiErrorMessage, apiDelete, apiGet, apiPost, Inventory, InventoryDetail, inventoryUrl, Product } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';

function ProgressBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = Math.min(100, Math.round((used / capacity) * 100));
  const tone = pct >= 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{used}/{capacity}</span>
    </div>
  );
}

function QrBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <QRCodeCanvas value={value} size={96} />
      <p className="text-[11px] font-semibold text-slate-700">{value}</p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="text-[11px] font-medium text-brand-600 hover:underline"
      >
        {copied ? 'Copied ✓' : 'Copy URL'}
      </button>
    </div>
  );
}

export default function AdminInventory() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState<Inventory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    apiGet<Inventory[]>('/inventory')
      .then(setInventories)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openStock = async (inv: Inventory) => {
    setStockOpen(inv);
    setProductId('');
    setQty(1);
    setErr('');
    try {
      const list = await apiGet<Product[]>('/products');
      setProducts(list);
    } catch {
      setProducts([]);
    }
  };

  const create = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    if (capacity < 1) { setErr('Capacity must be at least 1'); return; }
    setBusy(true);
    setErr('');
    try {
      await apiPost('/inventory', { name: name.trim(), location: location.trim() || null, capacity });
      setCreateOpen(false);
      setName('');
      setLocation('');
      setCapacity(50);
      load();
    } catch (e) {
      setErr(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (inv: Inventory) => {
    if (!confirm(`Delete inventory "${inv.name}"? Its stock will be removed too.`)) return;
    try {
      await apiDelete(`/inventory/${inv.id}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const addStock = async (inv: Inventory) => {
    if (!productId) { setErr('Choose a product'); return; }
    if (qty < 1) { setErr('Quantity must be at least 1'); return; }
    setBusy(true);
    setErr('');
    try {
      const d = await apiPost<InventoryDetail>(`/inventory/${inv.id}/stock`, { product_id: Number(productId), quantity: qty });
      setDetail(d);
      setStockOpen(null);
      setProducts([]);
      load();
    } catch (e) {
      setErr(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Physical warehouse locations. Each location holds up to its capacity (50 units) and has its own QR code."
        actions={<Button onClick={() => setCreateOpen(true)}>＋ New location</Button>}
      />

      {loading ? (
        <Spinner />
      ) : inventories.length === 0 ? (
        <Card><EmptyState icon="🗄️" title="No inventory locations yet" hint="Create the physical locations where the chef keeps returned products." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventories.map((inv) => (
            <Card key={inv.id} className="flex flex-col p-4">
              <div className="flex items-start gap-4">
                <QrBox value={inventoryUrl(inv.code)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{inv.name}</p>
                  <p className="text-[11px] text-slate-500">{inv.location ?? 'No location specified'}</p>
                  <p className="mt-1 font-mono text-[11px] text-brand-600">{inv.code}</p>
                  <div className="mt-2"><ProgressBar used={inv.used} capacity={inv.capacity} /></div>
                  <p className="mt-1 text-[11px] text-slate-400">{inv.item_count} product line{inv.item_count === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <ButtonGhost className="flex-1" onClick={() => openStock(inv)}>＋ Add stock</ButtonGhost>
                <ButtonGhost className="flex-1" onClick={() => { setStockOpen(null); apiGet<InventoryDetail>(`/inventory/${inv.id}`).then(setDetail); }}>View items</ButtonGhost>
                <button onClick={() => remove(inv)} className="rounded-lg px-2 py-2 text-sm text-rose-500 hover:bg-rose-50" title="Delete">🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New inventory location">
        <div className="space-y-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zone E — Gabès" /></Field>
          <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Gabès warehouse" /></Field>
          <Field label={`Capacity (units, default 50) — capacity ${capacity}, max 50`}>
            <Input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </Field>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <ButtonGhost onClick={() => setCreateOpen(false)}>Cancel</ButtonGhost>
            <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!stockOpen} onClose={() => setStockOpen(null)} title={`Add stock — ${stockOpen?.name ?? ''}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Used {stockOpen?.used}/{stockOpen?.capacity} units. Available: {(stockOpen?.capacity ?? 0) - (stockOpen?.used ?? 0)}.</p>
          <Field label="Product">
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.stock} in stock</option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity (units)">
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </Field>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <ButtonGhost onClick={() => setStockOpen(null)}>Cancel</ButtonGhost>
            <Button onClick={() => stockOpen && addStock(stockOpen)} disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'Inventory'} wide>
        {detail && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">{detail.name} <span className="ml-1 font-mono text-[11px] text-brand-600">{detail.code}</span></p>
              <p className="text-xs text-slate-500">{detail.location ?? 'No location'} · {detail.used}/{detail.capacity} units</p>
            </div>
            {detail.items.length === 0 ? (
              <EmptyState icon="📦" title="Empty location" hint="Add stock to this inventory location." />
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {detail.items.map((it) => (
                  <div key={it.product_id} className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {it.image_url ? <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-lg text-slate-300">📦</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{it.product_name}</p>
                      <p className="text-[11px] text-slate-400">Product #{it.product_id}</p>
                    </div>
                    <Badge tone="blue"><b>{it.quantity}</b> unit{it.quantity === 1 ? '' : 's'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}