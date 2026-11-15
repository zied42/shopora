import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  apiErrorMessage,
  dateFmt,
  listReservations,
  money,
  recordReservationRefillGot,
  Reservation,
  ReservationRefillStatus,
  reservationRefillCode,
  scanReservationRefill,
} from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Input, Modal, PageHeader, Spinner, StatCard } from '../../components/ui';

const REFILL_TONE: Record<ReservationRefillStatus, 'slate' | 'amber' | 'green'> = {
  none: 'slate',
  requested: 'amber',
  received: 'green',
};

const REFILL_LABEL: Record<ReservationRefillStatus, string> = {
  none: 'No refill',
  requested: 'Awaiting supplier',
  received: 'Received',
};

type Filter = 'all' | 'accepted' | 'with-refill' | 'to-scan';

export default function StockingReservations() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('accepted');
  const [got, setGot] = useState<Record<number, string>>({});
  const [qrOpen, setQrOpen] = useState<Reservation | null>(null);
  const [code, setCode] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listReservations()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'accepted') return rows.filter((r) => r.status === 'accepted');
    if (filter === 'with-refill') return rows.filter((r) => r.refill_status === 'requested');
    return rows.filter((r) => r.refill_status === 'received' && r.available_qty > 0);
  }, [rows, filter]);

  const saveGot = async (r: Reservation) => {
    const value = Number(got[r.id] ?? r.got_qty);
    if (!Number.isFinite(value) || value < 0) {
      alert('Enter how many units you actually took from the fournisseur.');
      return;
    }
    setBusy(r.id);
    try {
      await recordReservationRefillGot(r.id, Math.floor(value));
      setGot((v) => {
        const next = { ...v };
        delete next[r.id];
        return next;
      });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const scan = async () => {
    const value = code.trim();
    if (!value) return;
    setScanning(true);
    setScanResult(null);
    try {
      const { refill, reservation } = await scanReservationRefill(value);
      setScanResult(
        `✅ ${reservation?.product_name ?? `Reservation #${refill.reservation_id}`} — ${refill.available_qty} unit(s) still available to ship.`,
      );
      setCode('');
      load();
    } catch (e) {
      setScanResult(`❌ ${apiErrorMessage(e)}`);
    } finally {
      setScanning(false);
    }
  };

  const stats = {
    toAsk: rows.filter((r) => r.status === 'accepted' && r.refill_status === 'none').length,
    awaiting: rows.filter((r) => r.refill_status === 'requested').length,
    toScan: rows.filter((r) => r.refill_status === 'received' && r.available_qty > 0).reduce((s, r) => s + r.available_qty, 0),
    took: rows.reduce((s, r) => s + r.got_qty, 0),
    units: rows.filter((r) => r.status === 'accepted').reduce((s, r) => s + r.remaining, 0),
  };

  return (
    <div>
      <PageHeader
        title="Reservation refills"
        subtitle="Ask the fournisseur to prepare reserved units, record what you took, then scan each unit to release it."
        breadcrumb={[{ label: 'Home', to: '/stocking' }, { label: 'Reservation refills' }]}
        actions={
          <>
            <ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>
            <ButtonGhost type="button" onClick={() => navigate('/stocking/reservations/inventory')}>
              Inventory reservation
            </ButtonGhost>
            <Button type="button" onClick={() => navigate('/stocking/reservations/new')}>
              Create reservation refill request
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="To ask supplier" value={stats.toAsk} icon="📝" accent="amber" />
        <StatCard label="Awaiting supplier" value={stats.awaiting} icon="⏳" accent="blue" />
        <StatCard label="Took from supplier" value={stats.took} icon="📥" accent="purple" />
        <StatCard label="Units to scan" value={stats.toScan} icon="📷" accent="green" />
        <StatCard label="Units committed" value={stats.units} icon="📦" accent="purple" />
      </div>

      <Card className="mb-5 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-900">Scan a reservation unit</p>
            <p className="text-xs text-slate-500">Scan the QR code of the reserved unit, or type its code (RSV-12).</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') scan();
            }}
            placeholder="RSV-12"
            className="w-48"
          />
          <Button onClick={scan} disabled={scanning || !code.trim()}>
            {scanning ? 'Scanning…' : 'Scan unit'}
          </Button>
        </div>
        {scanResult && <p className="mt-2 text-sm font-semibold text-slate-700">{scanResult}</p>}
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          ['accepted', 'Accepted'],
          ['with-refill', 'Awaiting supplier'],
          ['to-scan', 'Ready to scan'],
          ['all', 'All'],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="📦" title="No reservation here" hint="Accepted reservations appear here once a fournisseur holds stock for a seller." /></Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Seller</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Took</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit price</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Refill</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 transition hover:bg-brand-50/40">
                    <td className="px-3 py-2.5 align-top text-xs font-bold text-slate-900">#{r.id}</td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center gap-2">
                        {r.product_image && <img src={r.product_image} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                        <span className="text-xs font-semibold text-slate-800">{r.product_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-slate-700">{r.dropshipper_name}</td>
                    <td className="px-3 py-2.5 text-center align-top text-xs font-bold text-slate-900">
                      {r.quantity}
                      <span className="block text-[10px] font-normal text-slate-400">{r.remaining} not ordered yet</span>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {r.refill_status === 'none' ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={got[r.id] ?? String(r.got_qty)}
                              onChange={(e) => setGot((v) => ({ ...v, [r.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveGot(r);
                              }}
                              className="w-16 px-2 py-1 text-center text-xs"
                            />
                            {Number(got[r.id] ?? r.got_qty) !== r.got_qty && (
                              <ButtonGhost className="px-2 py-1 text-[11px]" onClick={() => saveGot(r)} disabled={busy !== null}>
                                {busy === r.id ? '…' : 'Save'}
                              </ButtonGhost>
                            )}
                          </div>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {r.refill_status === 'requested' ? 'asked, not received yet' : `${r.available_qty} still to scan`}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top text-xs text-slate-700">{money(r.price)}</td>
                    <td className="px-3 py-2.5 align-top text-xs text-slate-600">{dateFmt(r.created_at)}</td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <Badge tone={REFILL_TONE[r.refill_status]}>{REFILL_LABEL[r.refill_status]}</Badge>
                      {r.refill_status === 'requested' && (
                        <p className="mt-1 text-[10px] text-slate-500">asked {r.demanded_qty}</p>
                      )}
                      {r.refill_status === 'received' && (
                        <p className="mt-1 text-[10px] text-emerald-600">{r.available_qty} of {r.got_qty} left to scan</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {r.refill_status !== 'none' && (
                          <>
                            <ButtonGhost className="px-2.5 py-1 text-[11px]" onClick={() => setQrOpen(r)}>
                              QR
                            </ButtonGhost>
                            <Button
                              className="px-2.5 py-1 text-[11px]"
                              onClick={() => {
                                setCode(reservationRefillCode(r.id));
                                scan();
                              }}
                              disabled={r.available_qty <= 0}
                            >
                              Scan
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        <span className="font-semibold text-slate-500">Reserved</span> is what the seller holds for you,{' '}
        <span className="font-semibold text-slate-500">Took</span> is what you actually collected from the fournisseur. Change{' '}
        <span className="font-semibold text-slate-500">Took</span> any time and save: units you already scanned stay scanned, so only the
        quantity still waiting is adjusted. Every took unit can then be scanned once to release it to the seller.
      </p>

      <Modal open={!!qrOpen} onClose={() => setQrOpen(null)} title={`Reservation #${qrOpen?.id ?? ''} label`}>
        {qrOpen && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <QRCodeCanvas value={reservationRefillCode(qrOpen.id)} size={168} />
            </div>
            <p className="font-mono text-lg font-bold tracking-wider text-slate-900">{reservationRefillCode(qrOpen.id)}</p>
            <p className="text-center text-xs text-slate-500">
              {qrOpen.product_name} · {qrOpen.available_qty} of {qrOpen.got_qty} took unit(s) still to scan
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
