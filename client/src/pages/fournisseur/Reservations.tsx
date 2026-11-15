import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiErrorMessage,
  dateFmt,
  listReservations,
  money,
  Reservation,
  ReservationStatus,
  resolveReservation,
} from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

const STATUS_TONE: Record<ReservationStatus, 'amber' | 'green' | 'red' | 'slate'> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  cancelled: 'slate',
};

type Filter = 'all' | ReservationStatus;

export default function FourReservations() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');

  const load = useCallback(() => {
    setLoading(true);
    listReservations()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const decide = async (r: Reservation, status: 'accepted' | 'rejected') => {
    const verb = status === 'accepted' ? 'accept' : 'reject';
    if (!window.confirm(`${verb === 'accept' ? 'Accept' : 'Reject'} the reservation of ${r.quantity} × "${r.product_name}" from ${r.dropshipper_name}?`)) return;
    setBusy(r.id);
    try {
      await resolveReservation(r.id, status);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const pendingValue = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.deposit, 0);
  const acceptedUnits = rows.filter((r) => r.status === 'accepted').reduce((s, r) => s + r.remaining, 0);

  return (
    <div>
      <PageHeader
        title="Product reservations"
        subtitle="Sellers reserve your stock by paying 40% upfront. Accept to hold the units for them, or reject to refund the deposit."
        breadcrumb={[{ label: 'Home', to: '/fournisseur' }, { label: 'Reservations' }]}
        actions={<ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="To review" value={rows.filter((r) => r.status === 'pending').length} icon="⏳" accent="amber" />
        <StatCard label="Deposits held" value={money(pendingValue)} icon="💰" accent="green" />
        <StatCard label="Units committed" value={acceptedUnits} icon="📦" accent="blue" />
        <StatCard label="Sellers" value={new Set(rows.map((r) => r.dropshipper_id)).size} icon="👤" accent="purple" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['pending', 'accepted', 'rejected', 'cancelled', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
            <span className="ml-1.5 opacity-70">{f === 'all' ? rows.length : rows.filter((r) => r.status === f).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="🔒" title="Nothing here" hint={filter === 'pending' ? 'No reservation is waiting for your decision.' : 'Try another filter.'} /></Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Seller</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stocking took</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit price</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Deposit (40%)</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decision</th>
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
                      {r.status === 'accepted' && <span className="block text-[10px] font-normal text-slate-400">{r.remaining} left</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {r.refill_status === 'none' ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-900">{r.got_qty}</span>
                          <span className="block text-[10px] font-normal text-slate-400">
                            {r.refill_status === 'requested' ? 'asked, not received yet' : `${r.available_qty} still to ship`}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top text-xs text-slate-700">{money(r.price)}</td>
                    <td className="px-3 py-2.5 text-right align-top text-xs font-semibold text-amber-600">{money(r.deposit)}</td>
                    <td className="px-3 py-2.5 align-top text-xs text-slate-600">{dateFmt(r.created_at)}</td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <Badge tone={STATUS_TONE[r.status]} className="capitalize">{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {r.status === 'pending' ? (
                        <div className="flex justify-center gap-1.5">
                          <Button className="px-2.5 py-1 text-[11px]" onClick={() => decide(r, 'accepted')} disabled={busy !== null}>
                            {busy === r.id ? '…' : 'Accept'}
                          </Button>
                          <ButtonGhost className="px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-50" onClick={() => decide(r, 'rejected')} disabled={busy !== null}>
                            Reject
                          </ButtonGhost>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {r.status === 'accepted' ? 'Stock held' : r.status === 'rejected' ? 'Deposit refunded' : 'Cancelled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Accepting a reservation removes those units from the quantity other sellers can see and order. Once stocking receives the units
        for a reservation, the seller orders them without paying again. <span className="font-semibold text-slate-500">Stocking took</span> is the
        quantity stocking recorded collecting from you, and how many of them are still waiting to be shipped to the seller.
      </p>
    </div>
  );
}
