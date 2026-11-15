import { useEffect, useState, useCallback } from 'react';
import { apiErrorMessage, getOrderPicks, scanOrderPickStatus, syncFirstDeliveryStatus, OrderPickRow, OrderPickStatus, ZONE_COLORS, DEFAULT_ZONE_COLOR, ShipmentZone, DELIVERY_STATUS_LABELS } from '../../lib/api';
import { playCancelAlert } from '../../lib/sound';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';
import QrScannerModal from '../../components/QrScannerModal';

const DELIVERY_COMPANIES: Record<string, { name: string; logo: string }> = {
  'navex': { name: 'Navex', logo: '/navex.jpg' },
  'first-delivery': { name: 'First Delivery', logo: '/first_delivery.png' },
  'jetpack': { name: 'Jetpack', logo: '/jetpack.jpg' },
  'intigo': { name: 'Intigo', logo: '/intigo.png' },
  'kamatcho': { name: 'Kamatcho', logo: '/kamatcho.png' },
  'lazajella': { name: 'LaZajella', logo: '/zajella.png' },
};

const STATUS_META: Record<OrderPickStatus, { label: string; tone: 'amber' | 'blue' | 'green' | 'red' | 'purple' }> = {
  unconfirmed: { label: 'Unconfirmed', tone: 'amber' },
  confirmed:   { label: 'Confirmed',   tone: 'blue' },
  shipped:     { label: 'Shipped',     tone: 'green' },
  cancelled:   { label: 'Cancelled',   tone: 'red' },
  return:      { label: 'Return',      tone: 'purple' },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ZoneBadge({ zone }: { zone: ShipmentZone | null }) {
  if (!zone) return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${DEFAULT_ZONE_COLOR.bg} ${DEFAULT_ZONE_COLOR.text} ${DEFAULT_ZONE_COLOR.ring}`}>Unassigned</span>;
  const c = ZONE_COLORS[zone] ?? DEFAULT_ZONE_COLOR;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}>{zone}</span>;
}

export default function Picks() {
  const [picks, setPicks] = useState<OrderPickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getOrderPicks()
      .then(setPicks)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const handleScan = async (code: string) => {
    const trimmed = code.trim();
    const pick = picks.find((p) => p.barcode === trimmed || p.order_number === trimmed);
    if (!pick) {
      alert(`No commande found in picks for "${trimmed}"`);
      return;
    }
        if (pick.status === 'cancelled') {
      playCancelAlert();
      alert('This commande is cancelled');
      setScanOpen(false);
      return;
    }
    if (pick.status === 'shipped') {
      alert('This commande is already shipped');
      setScanOpen(false);
      return;
    }
    try {
      const updated = await scanOrderPickStatus(pick.order_id);
      setPicks((prev) => prev.map((p) => (p.order_id === updated.order_id ? updated : p)));
      setScanOpen(false);
    } catch (e) {
      const msg = apiErrorMessage(e);
      if (/cancel/i.test(msg)) playCancelAlert();
      alert(msg);
    }
  };

  const handleSync = async (orderId: number) => {
    setSyncingId(orderId);
    try {
      const result = await syncFirstDeliveryStatus(orderId);
      setPicks((prev) => prev.map((p) => p.order_id === orderId ? { ...p, delivery_status: result.delivery_status } : p));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Picks"
        subtitle="Commandes sent from Orders — scan QR to confirm and ship"
        actions={
          <>
            <button onClick={() => setScanOpen(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">📷 Scan QR</button>
            <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
          </>
        }
      />

      {loading ? (
        <Spinner />
      ) : picks.length === 0 ? (
        <Card><EmptyState icon="✅" title="No picks yet" hint="Go to Commandes and click Print on a ready commande to send it here." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Dropshipper</th>
                <th className="px-4 py-3">Destinator</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">FD Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Arrives</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.id} className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{p.dropshipper_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{p.destinator ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{p.destination ?? '—'}{p.governorate ? `, ${p.governorate}` : ''}</td>
                  <td className="px-4 py-2.5"><ZoneBadge zone={p.agence} /></td>
                  <td className="px-4 py-2.5">
                    {p.delivery_company && DELIVERY_COMPANIES[p.delivery_company] ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <img src={DELIVERY_COMPANIES[p.delivery_company].logo} alt="" className="h-4 w-4 rounded object-cover" />
                        {DELIVERY_COMPANIES[p.delivery_company].name}
                      </span>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.delivery_status ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge tone={p.delivery_status === 'livre' ? 'green' : p.delivery_status.startsWith('retour') || p.delivery_status.startsWith('rtn') ? 'red' : p.delivery_status === 'supprime' ? 'red' : 'blue'}>
                          {DELIVERY_STATUS_LABELS[p.delivery_status] ?? p.delivery_status}
                        </Badge>
                        {p.delivery_company === 'first-delivery' && (
                          <button
                            type="button"
                            disabled={syncingId === p.order_id}
                            onClick={() => handleSync(p.order_id)}
                            className="text-[10px] text-slate-400 hover:text-brand-600 disabled:opacity-50"
                            title="Sync status from First Delivery"
                          >
                            {syncingId === p.order_id ? '⏳' : '🔄'}
                          </button>
                        )}
                      </span>
                    ) : p.delivery_company === 'first-delivery' ? (
                      <button
                        type="button"
                        disabled={syncingId === p.order_id}
                        onClick={() => handleSync(p.order_id)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {syncingId === p.order_id ? '⏳ Syncing...' : '🔄 Sync status'}
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">{p.total.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-600">{fmtDate(p.arrive_at)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {scanOpen && (
        <QrScannerModal
          action="Scan commande QR to confirm / ship"
          onScan={handleScan}
          onClose={() => setScanOpen(false)}
        />
      )}
    </div>
  );
}
