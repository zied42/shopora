import { useEffect, useState } from 'react';
import { apiErrorMessage, getConfirmateurPending, confirmateurConfirm, ConfirmateurPendingOrder, money, timeFmt } from '../../lib/api';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function ConfirmateurPending() {
  const [orders, setOrders] = useState<ConfirmateurPendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getConfirmateurPending()
      .then(setOrders)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleConfirm = async (orderId: number) => {
    setConfirming(orderId);
    try {
      await confirmateurConfirm(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div>
      <PageHeader title="Pending Commandes" subtitle={`${orders.length} commande${orders.length !== 1 ? 's' : ''} waiting to be sent to chef`} />

      {loading ? (
        <div className="py-20 text-center"><Spinner /></div>
      ) : orders.length === 0 ? (
        <Card><EmptyState icon="✅" title="All caught up" hint="No pending commandes to confirm." /></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{o.order_number}</p>
                  <Badge tone="amber">{o.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  🛍️ {o.dropshipper_name} · 👤 {o.customer_name} · {o.item_count} item{o.item_count !== 1 ? 's' : ''} · {money(o.total)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{timeFmt(o.created_at)}</p>
              </div>
              <Button
                onClick={() => void handleConfirm(o.id)}
                disabled={confirming === o.id}
                className="ml-4 shrink-0 bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
              >
                {confirming === o.id ? 'Sending…' : '📤 Send to chef'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
