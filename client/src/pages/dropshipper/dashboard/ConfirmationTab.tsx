import { useEffect, useMemo, useState } from 'react';
import { applyConfirmationService, apiErrorMessage, dateFmt, getMyConfirmationStatus, Order, ServiceInscription } from '../../../lib/api';
import { Badge, Card } from '../../../components/ui';
import { orderStatusTone } from '../../../components/ui';

interface Props {
  orders: Order[];
}

function Step({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <span className={`text-2xl font-bold ${tone}`}>{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

export default function ConfirmationTab({ orders }: Props) {
  const [q, setQ] = useState('');
  const [inscription, setInscription] = useState<ServiceInscription | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getMyConfirmationStatus()
      .then(setInscription)
      .catch((e) => alert(apiErrorMessage(e)));
  }, []);

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      setInscription(await applyConfirmationService());
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setApplying(false);
    }
  };

  const pipe = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    }),
    [orders]
  );

  const awaiting = useMemo(() => {
    const list = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter((o) => [o.order_number, o.customer_name, o.customer_phone, o.city].filter(Boolean).join(' ').toLowerCase().includes(qq));
  }, [orders, q]);

  const totalAwaiting = pipe.pending + pipe.confirmed;
  const confirmRate = totalAwaiting ? Math.round((pipe.confirmed / totalAwaiting) * 100) : 0;
  const moved = pipe.shipped + pipe.delivered;
  const successRate = moved ? Math.round((pipe.delivered / moved) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Confirmation service card */}
      <Card className="overflow-hidden">
        <div className="relative flex flex-col items-center gap-1 p-6 text-center">
          {inscription === null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200">
              <span>🚫</span> Not active
            </span>
          )}
          {inscription?.status === 'pending' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              <span>⏳</span> Waiting confirmation
            </span>
          )}
          {inscription?.status === 'confirmed' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <span>✅</span> Active
            </span>
          )}
          {inscription?.status === 'rejected' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200">
              <span>❌</span> Rejected
            </span>
          )}
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>🎧</span> Confirmation service
          </div>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            We call your customers to confirm each order before shipping — reducing failed deliveries and improving your delivery rate.
          </p>
          {inscription?.status === 'confirmed' && inscription.confirmed_at ? (
            <span className="mt-1 text-[11px] text-slate-400">Active since {dateFmt(inscription.confirmed_at)}</span>
          ) : null}
          {inscription === null || inscription.status === 'rejected' ? (
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? 'Submitting…' : 'Apply now'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="mt-3 cursor-not-allowed rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500"
            >
              {inscription.status === 'confirmed' ? 'Confirmed' : 'Waiting…'}
            </button>
          )}
        </div>
      </Card>

      {/* Confirmation pipeline */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Confirmation pipeline</h6>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-stretch gap-2">
            <Step label="Awaiting confirmation" value={pipe.pending} tone="text-amber-600" />
            <span className="flex items-center text-slate-300">→</span>
            <Step label="Confirmed" value={pipe.confirmed} tone="text-sky-600" />
            <span className="flex items-center text-slate-300">→</span>
            <Step label="Shipped" value={pipe.shipped} tone="text-violet-600" />
            <span className="flex items-center text-slate-300">→</span>
            <Step label="Delivered" value={pipe.delivered} tone="text-emerald-600" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Orders awaiting confirmation still need to be verified before stock is committed and the order is shipped.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-600">🎧</span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Confirmation rate</p>
                <p className="text-xl font-bold text-slate-900">{totalAwaiting ? `${confirmRate}%` : '—'}</p>
                <p className="text-[11px] text-slate-500">{pipe.confirmed} of {totalAwaiting} orders confirmed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg text-sky-600">✅</span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Delivery success</p>
                <p className="text-xl font-bold text-slate-900">{moved ? `${successRate}%` : '—'}</p>
                <p className="text-[11px] text-slate-500">{pipe.delivered} of {moved} shipped orders delivered</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Awaiting confirmation table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <h6 className="text-sm font-bold text-slate-800">Awaiting confirmation</h6>
            <Badge tone="amber">{totalAwaiting}</Badge>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order, customer, phone…"
            className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Order</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">City</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Confirmed by</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {awaiting.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    {q ? 'No orders match your search' : 'No orders awaiting confirmation'}
                  </td>
                </tr>
              )}
              {awaiting.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{o.order_number}</td>
                  <td className="px-3 py-2.5 text-slate-700">{o.customer_name ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{o.customer_phone ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{o.city ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)} units</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{dateFmt(o.created_at)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-800">{Number(o.total).toFixed(2)} TND</td>
                  <td className="px-3 py-2.5 text-slate-600">{o.confirmed_by_name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
