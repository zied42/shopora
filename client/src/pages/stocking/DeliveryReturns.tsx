import { useEffect, useMemo, useState, useCallback } from 'react';
import { apiErrorMessage, getOrderPicks, scanOrderPickStatus, OrderPickRow, ZONE_COLORS, DEFAULT_ZONE_COLOR, ShipmentZone } from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';
import QrScannerModal from '../../components/QrScannerModal';

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

export default function DeliveryReturns() {
  const [picks, setPicks] = useState<OrderPickRow[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    getOrderPicks()
      .then(setPicks)
      .catch((e) => setNotice({ ok: false, text: apiErrorMessage(e) }));
  }, []);
  useEffect(load, [load]);

  const returned = useMemo(() => (picks ?? []).filter((p) => p.status === 'return'), [picks]);

  const handleScan = async (code: string) => {
    const trimmed = code.trim();
    const pick = picks?.find((p) => p.barcode === trimmed || p.order_number === trimmed);
    if (!pick) {
      alert(`No commande found in picks for "${trimmed}"`);
      return;
    }
    if (pick.status === 'return') {
      alert('This commande is already returned');
      setScanOpen(false);
      return;
    }
    if (pick.status !== 'shipped') {
      alert('This commande has not been shipped yet — confirm and ship it in Picks first');
      return;
    }
    try {
      await scanOrderPickStatus(pick.order_id);
      setNotice({ ok: true, text: `↩️ Commande ${pick.order_number} marked as returned` });
      load();
      setScanOpen(false);
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Delivery returns"
        subtitle="Shipped commandes out with the courier — scan the QR when a parcel comes back to mark it returned"
        actions={
          <>
            <button onClick={() => setScanOpen(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">📷 Scan QR</button>
            <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
          </>
        }
      />

      {notice && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notice.text}</p>
      )}

      {picks === null ? (
        <Spinner />
      ) : returned.length === 0 ? (
        <Card><EmptyState icon="🔙" title="No returned commandes yet" hint="Scan a shipped commande's QR to mark it as returned — it will appear here." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Dropshipper</th>
                <th className="px-4 py-3">Destinator</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Arrives</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {returned.map((p) => (
                <tr key={p.id} className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${p.status === 'return' ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{p.dropshipper_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{p.destinator ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{p.destination ?? '—'}{p.governorate ? `, ${p.governorate}` : ''}</td>
                  <td className="px-4 py-2.5"><ZoneBadge zone={p.agence} /></td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">{p.total.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-2.5 text-[11px] font-semibold text-slate-600">{fmtDate(p.arrive_at)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={p.status === 'return' ? 'red' : 'green'}>{p.status === 'return' ? '↩️ Returned' : '🚚 Shipped'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {scanOpen && (
        <QrScannerModal
          action="Scan commande QR to mark as returned"
          onScan={handleScan}
          onClose={() => setScanOpen(false)}
        />
      )}
    </div>
  );
}
