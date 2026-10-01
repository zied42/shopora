import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  apiErrorMessage,
  dateFmt,
  getSupportServiceInscription,
  listSupportServiceCommandes,
  money,
  Order,
  sendSupportServiceDraftToChef,
  ServiceInscription,
  timeFmt,
} from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, orderStatusTone, paymentTone, Spinner } from '../../components/ui';
import { OrderTrackingView } from '../../components/OrderCenter';

export default function SupportServicesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const n = Number(id);
  const [row, setRow] = useState<ServiceInscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [commandes, setCommandes] = useState<Order[]>([]);
  const [commandesLoading, setCommandesLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);
  const [tracking, setTracking] = useState<Order | null>(null);

  const loadCommandes = () => {
    if (!Number.isFinite(n) || n <= 0) return;
    setCommandesLoading(true);
    listSupportServiceCommandes(n)
      .then(setCommandes)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setCommandesLoading(false));
  };

  useEffect(() => {
    if (!Number.isFinite(n) || n <= 0) {
      setLoading(false);
      return;
    }
    getSupportServiceInscription(n)
      .then(setRow)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
    loadCommandes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendToChef = async (o: Order) => {
    if (sending !== null) return;
    if (!window.confirm(`Send commande ${o.order_number} to the chef? After sending it can no longer be edited or deleted by the dropshipper.`)) return;
    setSending(o.id);
    try {
      await sendSupportServiceDraftToChef(o.id);
      setCommandes((list) => list.map((x) => (x.id === o.id ? { ...x, status: 'pending' } : x)));
      setTracking((t) => (t && t.id === o.id ? null : t));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSending(null);
    }
  };

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  if (!row) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-4xl">🔍</div>
        <p className="text-sm font-semibold text-slate-600">Service not found</p>
        <button
          type="button"
          onClick={() => navigate('/support/services')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition shadow-sm hover:bg-brand-700"
        >
          Back to Services
        </button>
      </Card>
    );
  }

  const drafts = commandes.filter((c) => c.status === 'draft');
  const sent = commandes.filter((c) => c.status === 'pending');

  return (
    <div className="space-y-4">
      <PageHeader title={`${row.user_name ?? 'Dropshipper'} — Confirmation service`} subtitle="Every commande this dropshipper has, with its current status" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Dropshipper</span><span className="font-semibold text-slate-700">{row.user_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-700">{row.email ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total orders</span><span className="font-semibold text-slate-700">{commandes.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Draft</span><span className="font-semibold text-slate-700">{drafts.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sent to chef</span><span className="font-semibold text-amber-600">{sent.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-semibold text-emerald-600">Confirmed</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Confirmed on</span><span className="font-semibold text-slate-700">{row.confirmed_at ? dateFmt(row.confirmed_at) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Confirmed by</span><span className="font-semibold text-slate-700">{row.confirmed_by ?? '—'}</span></div>
          </div>
        </Card>
        <div className="lg:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">🎧 About this service</p>
          <p className="mt-1 text-xs text-amber-700">
            All of this dropshipper's commandes are shown here — drafts, commandes sent to the chef, confirmed, shipped, delivered,
            cancelled or returned (échanger/retour). Sending a draft from here works exactly like the dropshipper's own "Send to chef": the
            commande becomes pending and awaits chef confirmation, then flows to the delivery company.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <h6 className="text-sm font-bold text-slate-800">Orders</h6>
            <Badge tone="amber">{commandes.length}</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commandesLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center"><Spinner /></td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10">
                    <EmptyState icon="✅" title="No commandes" hint="This dropshipper has no draft or awaiting-chef commandes." />
                  </td>
                </tr>
              ) : (
                commandes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{o.order_number}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{timeFmt(o.created_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{o.customer_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(o.total)}</td>
                    <td className="px-3 py-2.5"><Badge tone={orderStatusTone(o.status)}>{o.status}</Badge></td>
                    <td className="px-3 py-2.5"><Badge tone={paymentTone(o.payment_status)}>{o.payment_status}</Badge></td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {o.status === 'draft' ? (
                          <button
                            type="button"
                            disabled={sending !== null}
                            onClick={() => sendToChef(o)}
                            className="rounded-xl bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white transition shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sending === o.id ? 'Sending…' : 'Send to chef'}
                          </button>
                        ) : o.status === 'pending' ? (
                          <span className="text-[11px] font-medium text-slate-400">Sent — awaiting chef confirmation</span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">—</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setTracking(o)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          👁 View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {tracking && <OrderTrackingView order={tracking} open onClose={() => setTracking(null)} hideCancel />}
    </div>
  );
}