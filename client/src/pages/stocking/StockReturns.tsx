import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiGet, listStockReturns, scanStockReturn, storeStockReturns, StockReturnRow } from '../../lib/api';
import { Badge, ButtonGhost, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';
import QrScannerModal from '../../components/QrScannerModal';

interface InventoryOption {
  id: number;
  name: string;
  capacity: number;
  used?: number;
}

interface ProductAgg {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
  pending: number;
  commandes: number;
}

interface SupplierAgg {
  supplier_id: number;
  supplier_name: string;
  units: number;
  pending: number;
  products: Map<number, ProductAgg>;
}

export default function StockReturns() {
  const [rows, setRows] = useState<StockReturnRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storing, setStoring] = useState<{ supplierId: number; supplierName: string; units: number } | null>(null);
  const [storeLocationId, setStoreLocationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanLocationId, setScanLocationId] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [locations, setLocations] = useState<InventoryOption[]>([]);

  const load = () => {
    listStockReturns()
      .then(setRows)
      .catch((e) => setError(apiErrorMessage(e)));
  };
  useEffect(load, []);

  const ensureLocations = () => {
    if (locations.length === 0) {
      apiGet<InventoryOption[]>('/inventory')
        .then((list) => setLocations(list))
        .catch((e) => setError(apiErrorMessage(e)));
    }
  };

  const openStore = (supplierId: number, supplierName: string) => {
    const s = bySupplier.find((x) => x.supplier_id === supplierId);
    const units = s?.pending ?? 0;
    if (units <= 0) return;
    ensureLocations();
    setStoring({ supplierId, supplierName, units });
    setStoreLocationId(scanLocationId || '');
  };

  const confirmStore = async () => {
    if (!storing || !storeLocationId) {
      alert('Pick an inventory location');
      return;
    }
    setBusy(true);
    try {
      const r = await storeStockReturns(storing.supplierId, Number(storeLocationId));
      setNotice(`✅ ${r.stored_units} unit${r.stored_units === 1 ? '' : 's'} of ${r.products} product${r.products === 1 ? '' : 's'} from ${storing.supplierName} stored in ${r.inventory_name} — available in Suppliers inventory`);
      setStoring(null);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async (code: string) => {
    if (!scanLocationId) {
      alert('Choose the inventory location first — every scanned unit goes into it');
      return;
    }
    try {
      const r = await scanStockReturn(code.trim(), Number(scanLocationId));
      setNotice(`✅ ${r.product_name} (${r.supplier_name}) → +1 unit in ${r.inventory_name}${r.remaining_pending > 0 ? ` · ${r.remaining_pending} still pending` : ' · retour fully stored'}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const bySupplier = useMemo(() => {
    const map = new Map<string, SupplierAgg>();
    for (const r of rows ?? []) {
      let s = map.get(r.supplier_name);
      if (!s) {
        s = { supplier_id: r.supplier_id, supplier_name: r.supplier_name, units: 0, pending: 0, products: new Map() };
        map.set(r.supplier_name, s);
      }
      s.units += r.quantity;
      s.pending += r.pending;
      const p = s.products.get(r.product_id);
      if (p) {
        p.quantity += r.quantity;
        p.pending += r.pending;
        p.commandes += 1;
      } else {
        s.products.set(r.product_id, { product_id: r.product_id, product_name: r.product_name, image_url: r.image_url, quantity: r.quantity, pending: r.pending, commandes: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [rows]);

  const totalUnits = (rows ?? []).reduce((s, r) => s + r.quantity, 0);
  const totalPending = (rows ?? []).reduce((s, r) => s + r.pending, 0);
  const totalProducts = new Set((rows ?? []).map((r) => r.product_id)).size;

  return (
    <div>
      <PageHeader
        title="Stock returns"
        subtitle="Every product coming back from returned commandes — grouped per supplier. Scan a product's QR to put it back into an inventory location"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scanLocationId}
              onChange={(e) => setScanLocationId(e.target.value)}
              onFocus={ensureLocations}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Target location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button onClick={() => { if (!scanLocationId) { alert('Choose the target inventory location first'); return; } setScanOpen(true); }} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">📷 Scan product QR</button>
            <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
          </div>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">⚠️ {error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}

      {rows !== null && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">↩️ {rows.length} returned commande line{rows.length === 1 ? '' : 's'}</div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">🏭 {bySupplier.length} supplier{bySupplier.length === 1 ? '' : 's'}</div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">📦 {totalUnits} unit{totalUnits === 1 ? '' : 's'} overall</div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">⏳ {totalPending} not stored yet</div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">🏷️ {totalProducts} distinct product{totalProducts === 1 ? '' : 's'}</div>
        </div>
      )}

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="↩️" title="No stock returns yet" hint="Scan a shipped commande in Delivery returns — its products will be listed here per supplier." /></Card>
      ) : (
        <div className="space-y-5">
          {bySupplier.map((s) => (
            <Card key={s.supplier_name} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-sm font-bold text-slate-900">🏭 {s.supplier_name}</p>
                <div className="flex items-center gap-2">
                  <Badge tone="purple">{s.units} unit{s.units === 1 ? '' : 's'} returned overall</Badge>
                  {s.pending > 0 ? (
                    <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => openStore(s.supplier_id, s.supplier_name)}>📥 Store into inventory</ButtonGhost>
                  ) : (
                    <Badge tone="green">✓ all stored</Badge>
                  )}
                </div>
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5">Product</th>
                    <th className="px-3 py-2.5 text-right">overall_returned</th>
                  </tr>
                </thead>
                <tbody>
                  {[...s.products.values()].sort((a, b) => b.quantity - a.quantity).map((p) => (
                    <tr key={p.product_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {p.image_url ? <img src={p.image_url} alt={p.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm">📦</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{p.product_name}</p>
                            <p className="text-[11px] text-slate-400">
                              from {p.commandes} returned commande{p.commandes === 1 ? '' : 's'}
                              {p.pending === 0 ? ' · ✓ stored' : p.pending < p.quantity ? ` · ${p.pending} pending` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-purple-700">{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {scanOpen && (
        <QrScannerModal
          action={`Scan product QR — each scan stores 1 unit${scanLocationId && locations.find((l) => String(l.id) === scanLocationId) ? ` into ${locations.find((l) => String(l.id) === scanLocationId)!.name}` : ''}`}
          onScan={handleScan}
          onClose={() => setScanOpen(false)}
        />
      )}

      {storing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto my-10 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h5 className="text-sm font-bold text-slate-800">Store returns — {storing.supplierName}</h5>
              <button type="button" onClick={() => setStoring(null)} aria-label="Close" className="text-lg leading-none text-slate-400 transition hover:text-slate-600">×</button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">↩️ {storing.units} returned unit{storing.units === 1 ? '' : 's'} will be added to the chosen location's stock.</p>
              <label className="block text-xs font-semibold text-slate-500">
                Inventory location
                <select
                  value={storeLocationId}
                  onChange={(e) => setStoreLocationId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Select a location…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-slate-400">Stored units become available stock again — they can cover future commandes from Suppliers inventory.</p>
              <div className="flex justify-end gap-2">
                <ButtonGhost onClick={() => setStoring(null)}>Cancel</ButtonGhost>
                <button
                  type="button"
                  disabled={busy || !storeLocationId}
                  onClick={confirmStore}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Storing…' : '📥 Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
