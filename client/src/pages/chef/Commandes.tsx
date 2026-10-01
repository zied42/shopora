import { FormEvent, useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, apiPatch, money, Order, scanOrder, ScanAction } from '../../lib/api';
import { OrderDetailModal } from '../../components/OrderCenter';
import QrScannerModal from '../../components/QrScannerModal';
import { BonLivraison } from '../../components/BonLivraison';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, orderStatusTone, PageHeader, Select, Spinner } from '../../components/ui';

export default function ChefCommandes() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [action, setAction] = useState<ScanAction>('confirm');
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<Order[]>('/orders')
      .then(setOrders)
      .catch((e) => setNotice({ ok: false, text: apiErrorMessage(e) }))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const doScan = async (scanCode: string, scanAction: ScanAction) => {
    if (!scanCode.trim()) return;
    setScanning(true);
    setNotice(null);
    try {
      const updated = await scanOrder(scanCode, scanAction);
      setNotice({ ok: true, text: `${updated.order_number} → ${updated.status}` });
      setCode('');
      load();
    } catch (e) {
      setNotice({ ok: false, text: apiErrorMessage(e) });
      load();
    } finally {
      setScanning(false);
    }
  };

  const doTestDeliver = async (o: Order) => {
    setScanning(true);
    setNotice(null);
    try {
      const updated = await apiPatch<Order>(`/orders/${o.id}/status`, { status: 'delivered' });
      setNotice({ ok: true, text: `${updated.order_number} delivered — platform 3% = ${money(updated.commission ?? 0)}` });
      load();
    } catch (e) {
      setNotice({ ok: false, text: apiErrorMessage(e) });
      load();
    } finally {
      setScanning(false);
    }
  };

  const doPageStatus = async (o: Order, status: 'confirmed' | 'cancelled') => {
    setScanning(true);
    setNotice(null);
    try {
      const updated = await apiPatch<Order>(`/orders/${o.id}/status`, { status });
      setNotice({
        ok: true,
        text: status === 'confirmed'
          ? `${updated.order_number} confirmed — ready to be shipped`
          : `${updated.order_number} deleted — retour pool restored`,
      });
      load();
    } catch (e) {
      setNotice({ ok: false, text: apiErrorMessage(e) });
      load();
    } finally {
      setScanning(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      doScan(code, action);
    } else {
      setScanOpen(true);
    }
  };

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    retour: orders.filter((o) => o.status === 'retour').length,
  };

  return (
    <div>
      <PageHeader title="Commandes" subtitle="Scan a commande to confirm it, mark it shipped, or register a retour" />

      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white shadow-sm shadow-brand-600/20">📷</span>
          <div>
            <p className="text-sm font-bold text-slate-900">Scan commande</p>
            <p className="text-xs text-slate-400">Confirm, ship or register a retour with a barcode scan</p>
          </div>
        </div>
        <div className="p-5">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <Field label="Scan code (barcode or order number)">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="D42-CMD-000001 or D42-…"
                className="font-mono"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Action">
            <Select value={action} onChange={(e) => setAction(e.target.value as ScanAction)} className="w-44">
              <option value="confirm">Confirm</option>
              <option value="shipping">Shipping</option>
              <option value="retour">Returned</option>
            </Select>
          </Field>
          <Button type="submit" disabled={scanning}>📷 {scanning ? 'Scanning…' : `Scan → ${action}`}</Button>
          <ButtonGhost type="button" onClick={load}>Refresh</ButtonGhost>
        </form>
        {notice && (
          <p className={`mt-3 text-sm font-semibold ${notice.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {notice.ok ? '✅ ' : '⚠️ '}{notice.text}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          A commande is confirmed with one scan, shipped with a second, and only then can its retour be scanned. After it ships, it auto-delivers 12h
          later if no retour was registered.
        </p>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          ['pending', stats.pending, 'text-amber-600'],
          ['confirmed', stats.confirmed, 'text-brand-600'],
          ['shipped', stats.shipped, 'text-violet-600'],
          ['delivered', stats.delivered, 'text-emerald-600'],
          ['retour', stats.retour, 'text-rose-600'],
        ] as const).map(([st, n, tone]) => (
          <div key={st} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{st}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${tone}`}>{n}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card><EmptyState icon="🧾" title="No commandes" hint="Commandes created by dropshippers will appear here." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Supplier / Dropshipper</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Auto-deliver</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  return (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0 transition hover:bg-brand-50/40">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold text-brand-700">{o.order_number}</p>
                        <p className="font-mono text-[10px] text-slate-400">{o.barcode}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-slate-800">{o.customer_name}</p>
                        <p className="text-xs text-slate-400">{o.city} / {o.governorate}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs text-slate-600">{o.fournisseur_name}</p>
                        <p className="text-[11px] text-slate-400">by {o.dropshipper_name}</p>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">{money(o.total)}</td>
                      <td className="px-3 py-3.5">
                        <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                      </td>
                      <td className="px-3 py-3.5">
                        {o.auto_deliver_at ? (
                          <p className="text-xs text-slate-500">{new Date(o.auto_deliver_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        ) : (
                          <p className="text-xs text-slate-300">—</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {o.status === 'pending' && (
                            <>
                              <Button
                                className="px-3 py-1.5 text-xs"
                                disabled={scanning}
                                onClick={() => doPageStatus(o, 'confirmed')}
                              >
                                Confirm
                              </Button>
                            </>
                          )}
                          <Button
                            className="px-3 py-1.5 text-xs"
                            disabled={scanning}
                            onClick={() => doTestDeliver(o)}
                          >
                            Delivered
                          </Button>
                          <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => setPrintOrder(o)}>🖨 Paper</ButtonGhost>
                          <ButtonGhost
                            className="px-3 py-1.5 text-xs"
                            onClick={() => {
                              setSelected(o);
                              setDetailOpen(true);
                            }}
                          >
                            Manage
                          </ButtonGhost>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && <OrderDetailModal order={selected} open={detailOpen} onClose={() => setDetailOpen(false)} onChanged={load} />}

      {scanOpen && (
        <QrScannerModal
          action={action}
          onScan={(scannedCode) => {
            setScanOpen(false);
            doScan(scannedCode, action);
          }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {printOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 p-6 print:bg-white print:p-0">
          <div className="mx-auto max-w-4xl print:mx-auto">
            <div className="mb-4 flex justify-center gap-2 print:hidden">
              <Button onClick={() => window.print()}>🖨 Print / Save PDF</Button>
              <ButtonGhost onClick={() => setPrintOrder(null)}>Close</ButtonGhost>
            </div>
            <BonLivraison order={printOrder} />
          </div>
        </div>
      )}
    </div>
  );
}