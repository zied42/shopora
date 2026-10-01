import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { apiDelete, apiErrorMessage, apiPatch, apiPost, dateFmt, money, Order, TrackStep, DELIVERY_STATUS_LABELS } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { exportOrdersToExcel } from '../lib/export';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, orderStatusTone, paymentTone, Select, Spinner, Stars, Textarea } from './ui';

export function QrPanel({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <QRCodeCanvas value={value} size={128} />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">{value}</p>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="mt-1 text-xs font-medium text-brand-600 hover:underline"
        >
          {copied ? 'Copied ✓' : 'Copy code'}
        </button>
      </div>
    </div>
  );
}

const DELIVERY_COMPANIES: Record<string, { name: string; logo: string }> = {
  'navex': { name: 'Navex', logo: '/navex.jpg' },
  'first-delivery': { name: 'First Delivery', logo: '/first_delivery.png' },
  'jetpack': { name: 'Jetpack', logo: '/jetpack.jpg' },
  'intigo': { name: 'Intigo', logo: '/intigo.png' },
  'kamatcho': { name: 'Kamatcho', logo: '/kamatcho.png' },
  'lazajella': { name: 'LaZajella', logo: '/zajella.png' },
};

interface LifecycleStep {
  key: string;
  label: string;
  icon: string;
  status: string;
  timestamp: string | null;
}

function buildLifecycleSteps(order: Order): LifecycleStep[] {
  const statusOrder = ['draft', 'pending', 'confirmed', 'ready', 'shipped', 'delivered'];
  const cancelled = order.status === 'cancelled';
  const retour = order.status === 'retour';
  const currentIdx = statusOrder.indexOf(order.status);

  const steps: LifecycleStep[] = [
    { key: 'draft', label: 'Created', icon: '📝', status: order.status, timestamp: order.created_at },
    { key: 'pending', label: 'Sent', icon: '📤', status: order.status, timestamp: order.confirmed_at },
    { key: 'confirmed', label: 'Confirmed', icon: '✅', status: order.status, timestamp: order.confirmed_at },
    { key: 'ready', label: 'Preparing', icon: '📦', status: order.status, timestamp: order.shipped_at },
    { key: 'shipped', label: 'Shipped', icon: '🚚', status: order.status, timestamp: order.shipped_at },
    { key: 'delivered', label: 'Delivered', icon: '🏠', status: order.status, timestamp: order.delivered_at },
  ];

  if (cancelled) {
    return steps.filter((s) => statusOrder.indexOf(s.key) <= Math.max(currentIdx, 0)).concat([
      { key: 'cancelled', label: 'Cancelled', icon: '🚫', status: 'cancelled', timestamp: null },
    ]);
  }

  if (retour) {
    return steps.filter((s) => statusOrder.indexOf(s.key) <= currentIdx).concat([
      { key: 'retour', label: 'Returned', icon: '↩️', status: 'retour', timestamp: order.returned_at },
    ]);
  }

  return steps;
}

export function OrderTrackingView({ order, open, onClose, hideCancel = false }: { order: Order; open: boolean; onClose: () => void; hideCancel?: boolean }) {
  const steps = buildLifecycleSteps(order);
  const statusOrder = ['draft', 'pending', 'confirmed', 'ready', 'shipped', 'delivered'];
  const currentIdx = order.status === 'cancelled' || order.status === 'retour'
    ? statusOrder.indexOf(order.status) !== -1 ? statusOrder.indexOf(order.status) : steps.length - 1
    : statusOrder.indexOf(order.status);
  const finishedIdx = order.status === 'cancelled' || order.status === 'retour'
    ? steps.length - 1
    : currentIdx;

  const fd = order.delivery_company ? DELIVERY_COMPANIES[order.delivery_company] : null;
  const fdLabel = order.delivery_status ? DELIVERY_STATUS_LABELS[order.delivery_status] ?? order.delivery_status : null;

  return (
    <Modal open={open} onClose={onClose} title={`Suivi — ${order.order_number}`} wide>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={orderStatusTone(order.status)}>{order.status}</Badge>
          <Badge tone={paymentTone(order.payment_status)}>{order.payment_status}</Badge>
          {fd && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              <img src={fd.logo} alt="" className="h-4 w-4 rounded object-cover" />
              {fd.name}
            </span>
          )}
          {fdLabel && <Badge tone={order.status === 'delivered' ? 'green' : 'blue'}>{fdLabel}</Badge>}
        </div>

        <Card className="p-6">
          <div className="relative flex items-start justify-between">
            {steps.map((step, idx) => {
              const isPast = idx < finishedIdx;
              const isCurrent = idx === finishedIdx;
              const isEnd = step.key === 'cancelled' || step.key === 'retour';

              let circle = 'bg-slate-200 text-slate-400 border-2 border-slate-300';
              let textColor = 'text-slate-400';
              let labelBg = '';

              if (isPast) {
                circle = 'bg-emerald-500 text-white border-2 border-emerald-500';
                textColor = 'text-slate-700';
              } else if (isCurrent) {
                if (isEnd) {
                  circle = 'bg-rose-500 text-white border-4 border-rose-200 shadow-lg';
                  textColor = 'text-rose-700';
                  labelBg = 'bg-rose-50';
                } else {
                  circle = 'bg-brand-500 text-white border-4 border-brand-200 shadow-lg';
                  textColor = 'text-brand-700';
                  labelBg = 'bg-brand-50';
                }
              }

              return (
                <div key={step.key} className="relative flex flex-1 flex-col items-center">
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 ${isPast ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                  <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg shadow-sm transition-all ${circle}`}>
                    {step.icon}
                  </div>
                  <p className={`mt-2 text-center text-[11px] font-semibold leading-tight ${textColor} ${labelBg} rounded px-1.5 py-0.5`}>
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="mt-1 text-center text-[10px] text-slate-400">
                      {new Date(step.timestamp).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {order.delivery_company && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              {fd && <img src={fd.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />}
              <div>
                <p className="text-xs text-slate-500">Transporteur</p>
                <p className="text-sm font-semibold text-slate-800">{fd?.name ?? order.delivery_company}</p>
              </div>
              {fdLabel && (
                <div className="ml-auto">
                  <Badge tone={order.delivery_status === 'livre' ? 'green' : order.delivery_status?.startsWith('retour') || order.delivery_status?.startsWith('rtn') ? 'red' : 'blue'}>
                    {fdLabel}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Client</p>
            <p className="font-semibold text-slate-800">{order.customer_name}</p>
            <p className="text-sm text-slate-500">{order.customer_phone}</p>
            <p className="mt-1 text-sm text-slate-600">{order.governorate}{order.city ? `, ${order.city}` : ''}</p>
            {order.shipping_address && <p className="mt-0.5 text-xs text-slate-400">{order.shipping_address}</p>}
          </Card>
          <Card className="p-4">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Détails</p>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{money(order.total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Articles</span><span className="text-slate-700">{order.items.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Paiement</span><span className="text-slate-700">{order.payment_method ?? '—'}</span></div>
          </Card>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Articles</p>
          <Card className="divide-y divide-slate-100">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-3">
                {it.product_image && <img src={it.product_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{it.product_name}</p>
                  <p className="text-xs text-slate-500">×{it.quantity}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{money(it.price * it.quantity)}</p>
              </div>
            ))}
          </Card>
        </div>

        {order.tracking.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Suivi</p>
            <Card className="p-4">
              <TrackTimeline steps={order.tracking} />
            </Card>
          </div>
        )}

        {!hideCancel && ['draft', 'pending', 'confirmed', 'ready'].includes(order.status) && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Annuler cette commande ?')) return;
                try {
                  await apiPatch(`/orders/${order.id}/status`, { status: 'cancelled' });
                  onClose();
                } catch (e) {
                  alert(apiErrorMessage(e));
                }
              }}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              ✕ Annuler la commande
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function BarcodePanel({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Barcode value={value} format="CODE128" height={46} width={1.4} margin={0} />
      <p className="text-xs font-medium text-slate-600">{value}</p>
    </div>
  );
}

/** Platform fee: 3% of the total (like a tax). Always charged, applied at delivery. */
const platformFee = (o: Order) => Math.round(o.total * 0.03 * 100) / 100;

/** Dropshipper final profit = Total − supplier cost − 3% platform fee. */
const feeAdjustedProfit = (o: Order) => Math.round((o.total - o.total_cost - platformFee(o)) * 100) / 100;

function TrackTimeline({ steps }: { steps: TrackStep[] }) {
  if (!steps.length) {
    return <p className="text-sm text-slate-400">No tracking updates yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {steps.map((s) => (
        <li key={s.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-2 ring-brand-200" />
          <p className="text-sm font-semibold text-slate-800">{s.status}</p>
          <p className="text-xs text-slate-500">
            {s.carrier} · {s.tracking_number}
          </p>
          {s.detail && <p className="text-xs text-slate-400">{s.detail}</p>}
          <p className="text-[11px] text-slate-400">{dateFmt(s.updated_at)}</p>
        </li>
      ))}
    </ol>
  );
}

interface OrderListProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  canExport?: boolean;
}

export function OrderList({ orders, loading, onRefresh, canExport }: OrderListProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [trackViewOpen, setTrackViewOpen] = useState(false);

  const totals = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.total, 0);
    const profit = orders.reduce((s, o) => s + feeAdjustedProfit(o), 0);
    return { total, profit };
  }, [orders]);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orders</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total revenue</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{money(totals.total)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total profit</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">{money(totals.profit)}</p>
        </div>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        <ButtonGhost onClick={onRefresh}>Refresh</ButtonGhost>
        {canExport && orders.length > 0 && (
          <Button onClick={() => exportOrdersToExcel(orders, 'orders.xlsx')}>⬇ Export Excel</Button>
        )}
      </div>

      {orders.length === 0 ? (
        <Card>
          <EmptyState icon="🧾" title="No orders" hint="Orders will appear here once created." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Customer</th>
                  {user?.role !== 'seller' && <th className="px-3 py-3">Supplier</th>}
                  <th className="px-3 py-3">Items</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Profit</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 transition last:border-0 hover:bg-brand-50/40">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-semibold text-brand-700">{o.order_number}</p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{dateFmt(o.created_at)}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-medium text-slate-800">{o.customer_name}</p>
                      {o.customer_phone && <p className="text-xs text-slate-400">{o.customer_phone}</p>}
                    </td>
                    {user?.role !== 'seller' && (
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                            {(o.fournisseur_name || '?').charAt(0).toUpperCase()}
                          </span>
                          {o.fournisseur_name}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-3.5 text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">{money(o.total)}</td>
                    <td className={`px-3 py-3.5 text-right font-semibold tabular-nums ${feeAdjustedProfit(o) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(feeAdjustedProfit(o))}</td>
                    <td className="px-3 py-3.5">
                      <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge tone={paymentTone(o.payment_status)}>{o.payment_status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {user?.role === 'customer' && o.dropshipper_id === user.id && o.status === 'draft' && (
                          <>
                            <Button
                              className="px-3 py-1.5 text-xs"
                              onClick={async () => {
                                if (!window.confirm(`Send commande ${o.order_number} to the chef? Once sent you can no longer edit or delete it.`)) return;
                                try {
                                  await apiPatch(`/orders/${o.id}/status`, { status: 'pending' });
                                  onRefresh();
                                } catch (e) {
                                  alert(apiErrorMessage(e));
                                }
                              }}
                            >
                              Send to chef
                            </Button>
                            <ButtonGhost
                              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={async () => {
                                if (!window.confirm(`Permanently delete draft commande ${o.order_number}? This cannot be undone.`)) return;
                                try {
                                  await apiDelete(`/orders/${o.id}`);
                                  onRefresh();
                                } catch (e) {
                                  alert(apiErrorMessage(e));
                                }
                              }}
                            >
                              Delete
                            </ButtonGhost>
                          </>
                        )}
                        {user?.role === 'customer' && o.dropshipper_id === user.id && o.status === 'pending' && (
                          <span className="text-[11px] font-medium text-slate-400">Sent — awaiting chef confirmation</span>
                        )}
                        {user?.role === 'customer' && o.dropshipper_id === user.id && (
                          <ButtonGhost
                            className="px-3 py-1.5 text-xs"
                            onClick={() => {
                              setSelected(o);
                              setTrackViewOpen(true);
                            }}
                          >
                            👁 View
                          </ButtonGhost>
                        )}
                        {user?.role !== 'customer' && (
                          <ButtonGhost
                            className="px-3 py-1.5 text-xs"
                            onClick={() => {
                              setSelected(o);
                              setDetailOpen(true);
                            }}
                          >
                            Manage
                          </ButtonGhost>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && <OrderDetailModal order={selected} open={detailOpen} onClose={() => setDetailOpen(false)} onChanged={onRefresh} />}
      {selected && <OrderTrackingView order={selected} open={trackViewOpen} onClose={() => setTrackViewOpen(false)} />}
    </div>
  );
}

export function OrderDetailModal({ order, open, onClose, onChanged }: { order: Order; open: boolean; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [trackOpen, setTrackOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSupplier = user?.role === 'seller' && order.items.some((i) => i.fournisseur_id === user.id);
  const isOwner = user?.role === 'customer' && order.dropshipper_id === user.id;
  const canManage = user?.role === 'admin' || (isSupplier && order.items.length > 0 && order.items.every((i) => i.fournisseur_id === user.id));

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await apiPatch(`/orders/${order.id}/status`, { status });
      onChanged();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Order ${order.order_number}`} wide>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={orderStatusTone(order.status)}>{order.status}</Badge>
            <Badge tone={paymentTone(order.payment_status)}>payment: {order.payment_status}</Badge>
            <Badge tone="blue">{order.payment_method}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Customer</p>
              <p className="font-semibold text-slate-800">{order.customer_name}</p>
              <p className="text-sm text-slate-500">{order.customer_phone}</p>
              <p className="mt-1 text-sm text-slate-600">{order.shipping_address}</p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Breakdown</p>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Selling total</span><span>{money(order.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Supplier total</span><span>{money(order.total_cost)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Platform fee (3%)</span><span className="text-rose-600">−{money(platformFee(order))}</span></div>
              <div className="mt-1 flex justify-between text-sm font-bold"><span>Profit</span><span className={feeAdjustedProfit(order) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{money(feeAdjustedProfit(order))}</span></div>
              <div className="mt-1 flex justify-between text-xs"><span className="text-slate-400">Margin</span><span className="text-slate-500">{order.total ? Math.round((feeAdjustedProfit(order) / order.total) * 100) : 0}%</span></div>
            </Card>
          </div>

          {user?.role === 'admin' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <QrPanel value={order.barcode ?? order.order_number} />
              <BarcodePanel value={order.barcode ?? order.order_number} />
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Items</p>
            <Card className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  {it.product_image && <img src={it.product_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{it.product_name}</p>
                    <p className="text-xs text-slate-500">×{it.quantity} · supplier {money(it.cost)} · sold {money(it.price)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{money(it.price * it.quantity)}</p>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Tracking</p>
            <Card className="p-4">
              <TrackTimeline steps={order.tracking} />
            </Card>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                <Select value={order.status} onChange={(e) => setStatus(e.target.value)} className="w-40" disabled={saving}>
                  {['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <ButtonGhost onClick={() => setTrackOpen(true)}>📦 Add tracking</ButtonGhost>
              {order.payment_method === 'cod' && (
                <ButtonGhost
                  onClick={async () => {
                    await apiPatch(`/orders/${order.id}/payment`, { status: order.payment_status === 'paid' ? 'unpaid' : 'paid' });
                    onChanged();
                  }}
                >
                  Mark {order.payment_status === 'paid' ? 'unpaid' : 'paid'}
                </ButtonGhost>
              )}
            </div>
          )}

          {user?.role === 'customer' && isOwner && !['shipped', 'retour', 'cancelled', 'delivered'].includes(order.status) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ButtonGhost onClick={() => setRateOpen(true)}>⭐ Rate products</ButtonGhost>
              <button
                type="button"
                disabled={saving || !['draft', 'pending', 'confirmed', 'ready'].includes(order.status)}
                title={
                  ['draft', 'pending', 'confirmed', 'ready'].includes(order.status)
                    ? 'Cancel this commande'
                    : 'This commande can no longer be cancelled'
                }
                onClick={() => {
                  if (window.confirm('Cancel this commande?')) setStatus('cancelled');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✖ Cancel commande
              </button>
            </div>
          )}
        </div>
      </Modal>

      {trackOpen && (
        <AddTrackingModal
          order={order}
          onClose={() => setTrackOpen(false)}
          onDone={() => {
            setTrackOpen(false);
            onChanged();
          }}
        />
      )}
      {rateOpen && <RateModal order={order} onClose={() => setRateOpen(false)} onDone={() => setRateOpen(false)} />}
    </>
  );
}

function AddTrackingModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [carrier, setCarrier] = useState('');
  const [tracking_number, setTrackingNumber] = useState('');
  const [status, setStatus] = useState('shipped');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!carrier || !tracking_number) return alert('Carrier and tracking number are required');
    setSaving(true);
    try {
      await apiPost(`/orders/${order.id}/tracking`, { carrier, tracking_number, status, detail: detail || null });
      onDone();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Add tracking — ${order.order_number}`}>
      <div className="space-y-4">
        <Field label="Carrier">
          <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="DHL, Yalidine, Aramex..." />
        </Field>
        <Field label="Tracking number">
          <Input value={tracking_number} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. DHL-ALG-88231" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="in_transit">In transit</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="failed_attempt">Failed attempt</option>
          </Select>
        </Field>
        <Field label="Details">
          <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional details" rows={2} />
        </Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save tracking'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function RateModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [productId, setProductId] = useState(order.items[0]?.product_id);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      await apiPost(`/products/${productId}/rating`, { score, comment: comment || null });
      alert('Thanks for your rating!');
      onDone();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Rate products">
      <div className="space-y-4">
        <Field label="Product">
          <Select value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            {order.items.map((it) => (
              <option key={it.product_id} value={it.product_id}>{it.product_name}</option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Score</p>
          <Stars value={score} onChange={setScore} />
        </div>
        <Field label="Comment (optional)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost onClick={onClose}>Cancel</ButtonGhost>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Submit rating'}</Button>
        </div>
      </div>
    </Modal>
  );
}
