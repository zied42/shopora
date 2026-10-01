import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  apiErrorMessage,
  apiGet,
  apiPatch,
  createOrderPick,
  dispatchFirstDelivery,
  getOrderPickPlan,
  inventoryUrl,
  listOrdersPickability,
  money,
  Order,
  PickPlan,
  scanOrderPick,
} from '../../lib/api';
import { BonLivraison } from '../../components/BonLivraison';
import QrScannerModal from '../../components/QrScannerModal';
import { Badge, ButtonGhost, Card, EmptyState, orderStatusTone, PageHeader, Spinner } from '../../components/ui';

const DELIVERY_COMPANIES = [
  { id: 'navex', name: 'Navex', logo: '/navex.jpg' },
  { id: 'first-delivery', name: 'First Delivery', logo: '/first_delivery.png' },
  { id: 'jetpack', name: 'Jetpack', logo: '/jetpack.jpg' },
  { id: 'intigo', name: 'Intigo', logo: '/intigo.png' },
  { id: 'kamatcho', name: 'Kamatcho', logo: '/kamatcho.png' },
  { id: 'lazajella', name: 'LaZajella', logo: '/zajella.png' },
];

function DeliveryCompanySelect({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const current = order.delivery_company ?? '';
  const shipped = order.status === 'shipped' || order.status === 'delivered' || order.status === 'retour';

  const handleChange = async (val: string) => {
    setSaving(true);
    try {
      await apiPatch(`/orders/${order.id}/delivery-company`, { delivery_company: val || null });
      onChanged();
    } catch (e) {
      console.warn(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (shipped) {
    const co = DELIVERY_COMPANIES.find((c) => c.id === current);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        {co && <img src={co.logo} alt="" className="h-4 w-4 rounded object-cover" />}
        {co?.name ?? current ?? '—'}
      </span>
    );
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 disabled:opacity-50"
    >
      <option value="">— Select —</option>
      {DELIVERY_COMPANIES.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

/* ── picking preview modal ───────────────────────────────────────────── */

export function PickPreviewModal({ orderId, onClose, onReady }: { orderId: number; onClose: () => void; onReady: () => void }) {
  const [plan, setPlan] = useState<PickPlan | null>(null);
  const [activeSample, setActiveSample] = useState<{ productId: number; inventoryId: number } | null>(null);
  const [scanning, setScanning] = useState<{ mode: 'location' | 'product'; productId: number; inventoryId: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    getOrderPickPlan(orderId)
      .then(setPlan)
      .catch((e) => setError(apiErrorMessage(e)));
  };
  useEffect(reload, [orderId]);

  const scan = async (productId: number, inventoryId: number, batchCode: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await scanOrderPick(orderId, productId, inventoryId, batchCode);
      setPlan(updated);
      if (updated.complete) onReady();
    } catch (e) {
      setError(apiErrorMessage(e));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const extractCode = (raw: string) => {
    const clean = raw.trim().split('?')[0];
    const parts = clean.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? clean;
  };

  const handleScan = (raw: string) => {
    const target = scanning;
    setScanning(null);
    if (!target || !plan) return;
    const code = extractCode(raw);
    if (target.mode === 'location') {
      const sample = plan.items.find((i) => i.product_id === target.productId)?.samples.find((x) => x.inventory_id === target.inventoryId);
      if (!sample) return;
      if (sample.inventory_code.toUpperCase() !== code.toUpperCase()) {
        setError(`That QR is "${code}" — expected location ${sample.inventory_code}`);
        return;
      }
      setError(null);
      setActiveSample({ productId: target.productId, inventoryId: target.inventoryId });
    } else {
      scan(target.productId, target.inventoryId, code);
    }
  };

  const totalNeeded = plan?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const totalPicked = plan?.items.reduce((s, i) => s + Math.min(i.picked, i.quantity), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="mx-auto w-full max-w-3xl">
        <div className="my-4 overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h5 className="text-sm font-bold text-slate-800">Picking — order {plan?.order_number ?? `#${orderId}`}</h5>
            <button type="button" onClick={onClose} aria-label="Close" className="text-lg leading-none text-slate-400 transition hover:text-slate-600">×</button>
          </div>

          {!plan ? (
            <div className="py-14"><Spinner /></div>
          ) : (
            <div className="px-5 py-4">
              {plan.complete && (
                <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-5 text-center">
                  <div className="text-4xl">🎉</div>
                  <p className="text-base font-bold text-emerald-600">Order is READY</p>
                  <p className="max-w-sm text-xs text-slate-500">All products have been picked from inventory. You can now print the order.</p>
                  <ButtonGhost onClick={onClose}>Close</ButtonGhost>
                </div>
              )}
              {!plan.complete && (
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${totalNeeded ? Math.round((totalPicked / totalNeeded) * 100) : 0}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{totalPicked}/{totalNeeded} units</span>
                </div>
              )}

              {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">⚠️ {error}</p>}

              <div className="space-y-4">
                {plan.items.map((item) => {
                  const done = item.remaining === 0;
                  return (
                    <div key={item.product_id} className={`rounded-xl border p-4 ${done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.product_image
                            ? <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                            : <div className="flex h-full items-center justify-center text-lg">📦</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.product_name}</p>
                          <p className="text-[11px] text-slate-400">{item.fournisseur_name}</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {done
                              ? <span className="text-emerald-600">✓ Fully picked ({item.picked}/{item.quantity})</span>
                              : <>Needs <b className="text-brand-700">{item.remaining}</b> more of {item.quantity} · picked {item.picked}</>}
                          </p>
                        </div>
                      </div>

                      {/* SAMPLES — hidden once this product is fully picked */}
                      {!done && (
                        <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">1️⃣ Scan the location's QR with the camera · 2️⃣ scan the product's batch QR — each scan takes 1 unit</p>
                          {item.samples.length === 0 && (
                            <p className="text-xs text-rose-500">No inventory currently holds this product.</p>
                          )}
                          {item.samples.map((s) => {
                            const active = activeSample?.productId === item.product_id && activeSample.inventoryId === s.inventory_id;
                            return (
                              <div key={s.inventory_id} className={`rounded-lg border p-3 ${active ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-100 bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 rounded-md border border-slate-200 bg-white p-2" title={`Inventory QR — ${s.inventory_name}`}>
                                    <QRCodeSVG value={inventoryUrl(s.inventory_code)} size={128} level="M" marginSize={4} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-700">🗄️ {s.inventory_name}</p>
                                    <p className="font-mono text-[10px] text-slate-400">{s.inventory_code}</p>
                                    <p className="text-[11px] font-semibold text-brand-700">{s.available} of this product available here</p>
                                  </div>
                                  {active ? (
                                    <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white">✓ {s.inventory_code}</span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => setScanning({ mode: 'location', productId: item.product_id, inventoryId: s.inventory_id })}
                                      className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                                    >
                                      📷 Scan location
                                    </button>
                                  )}
                                </div>

                                {active && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setScanning({ mode: 'product', productId: item.product_id, inventoryId: s.inventory_id })}
                                    className="mt-3 w-full rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-900 disabled:opacity-60"
                                  >
                                    📷 Scan batch code — takes 1 unit ({item.remaining} left)
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {scanning && (
        <QrScannerModal
          action={scanning.mode === 'location' ? 'Location' : 'Batch'}
          onScan={handleScan}
          onClose={() => setScanning(null)}
        />
      )}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

export default function StockingOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pickability, setPickability] = useState<Record<number, { coverable: boolean; picked: number; needed: number }>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    apiGet<Order[]>('/orders')
      .then((rows) => {
        setOrders(rows.filter((o) => o.order_type === 'dropshipping'));
        return listOrdersPickability();
      })
      .then((rows) => {
        const map: Record<number, { coverable: boolean; picked: number; needed: number }> = {};
        for (const r of rows) map[r.order_id] = { coverable: r.coverable, picked: r.picked, needed: r.needed };
        setPickability(map);
      })
      .catch((e) => setNotice({ ok: false, text: apiErrorMessage(e) }));
  };
  useEffect(load, []);

  const canPick = (o: Order) => ['pending', 'confirmed', 'draft'].includes(o.status);
  const coverable = (o: Order) => pickability[o.id]?.coverable !== false;

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle="Dropshipping commandes from the marketplace — preview shows where each product sits in inventory, pick it by scanning, print once ready"
        actions={
          <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
        }
      />

      {notice && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notice.text}</p>
      )}

      {orders === null ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card><EmptyState icon="🧾" title="No commandes" hint="Commandes created by dropshippers will appear here." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Dropshipper</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Delivery</th>
                <th className="px-5 py-3 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const ready = o.status === 'ready';
                const prog = pickability[o.id];
                const partial = !ready && canPick(o) && (prog?.picked ?? 0) > 0;
                const fullyPicked = ready || (prog && prog.needed > 0 && prog.picked >= prog.needed);
                const previewEnabled = canPick(o) && coverable(o);
                return (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs font-semibold text-brand-700">{o.order_number}</p>
                      <p className="font-mono text-[10px] text-slate-400">{o.barcode}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{o.customer_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{o.city ?? ''}{o.city && o.governorate ? ' / ' : ''}{o.governorate ?? ''}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{o.dropshipper_name}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(o.total)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                      {partial && (
                        <p className="mt-1 text-[10px] font-semibold text-brand-700">{prog?.picked}/{prog?.needed} units picked</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <DeliveryCompanySelect order={o} onChanged={load} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={!previewEnabled}
                          title={
                            !canPick(o)
                              ? ready
                                ? 'Already picked — commande is ready'
                                : 'This status cannot be picked'
                              : !coverable(o)
                                ? 'Inventories do not hold enough stock of the products yet'
                                : 'Preview the picking samples'
                          }
                          onClick={() => setPreviewId(o.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            previewEnabled
                              ? 'bg-brand-600 text-white hover:bg-brand-700'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                        >
                          👁 Preview
                        </button>
                        <ButtonGhost
                          className="px-3 py-1.5 text-xs"
                          disabled={!fullyPicked}
                          title={fullyPicked ? 'Print the commande paper' : 'Complete picking all products first'}
                          onClick={async () => {
                            const fresh = (await apiGet<Order[]>('/orders')).find((x) => x.id === o.id) ?? o;
                            setPrintOrder(fresh);
                          }}
                        >
                          🖨 Print
                        </ButtonGhost>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {previewId !== null && (
        <PickPreviewModal
          orderId={previewId}
          onClose={() => {
            setPreviewId(null);
            load();
          }}
          onReady={async () => {
            try {
              await createOrderPick(previewId);
              const fd = await dispatchFirstDelivery(previewId);
              load();
              setNotice({ ok: true, text: fd.barCode ? `🎉 Dispatched — barcode: ${fd.barCode} — click Print to view` : '🎉 All products picked' });
            } catch (e) {
              load();
              setNotice({ ok: false, text: apiErrorMessage(e) });
            }
          }}
        />
      )}

      {printOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 p-6 print:bg-white print:p-0">
          <div className="mx-auto max-w-4xl print:mx-auto">
            <div className="mb-4 flex justify-center gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">🖨 Print / Save PDF</button>
              <ButtonGhost onClick={() => setPrintOrder(null)}>Close</ButtonGhost>
            </div>
            <BonLivraison order={printOrder} />
          </div>
        </div>
      )}
    </div>
  );
}
