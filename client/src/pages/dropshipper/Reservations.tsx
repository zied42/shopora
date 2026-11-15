import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  apiErrorMessage,
  cancelReservation,
  dateFmt,
  listReservations,
  money,
  Reservation,
  ReservationStatus,
  updateReservationPrice,
} from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const STATUS_TONE: Record<ReservationStatus, 'amber' | 'green' | 'red' | 'slate'> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  cancelled: 'slate',
};

const REFILL_LABEL: Record<Reservation['refill_status'], string> = {
  none: '—',
  requested: 'Refill requested',
  received: 'Received by stocking',
};

type Filter = 'all' | ReservationStatus;

export default function DsReservations() {
  const { user, setBalance } = useAuth();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [priceEdit, setPriceEdit] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    listReservations()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  /** Keeps "Still free" live: stocking scans units out of this reserved inventory and
   *  returned commandes put them back, so the number must refresh without a manual reload. */
  const loadQuiet = useCallback(() => {
    listReservations().then(setRows).catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const t = window.setInterval(loadQuiet, 15000);
    return () => window.clearInterval(t);
  }, [loadQuiet]);

  const cancel = async (r: Reservation) => {
    if (!window.confirm(`Cancel reservation #${r.id}? The ${money(r.deposit)} deposit goes back to your balance.`)) return;
    setBusy(r.id);
    try {
      const { balance } = await cancelReservation(r.id);
      setBalance(balance);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const savePrice = async (r: Reservation) => {
    const raw = priceEdit[r.id]?.trim();
    const value = raw === '' || raw === undefined ? r.price : Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      alert('Enter your price per unit (zero or more).');
      return;
    }
    setBusy(r.id);
    try {
      const { balance } = await updateReservationPrice(r.id, value);
      setBalance(balance);
      setPriceEdit((v) => {
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

  const filtered = useMemo(() => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const open = rows.filter((r) => r.status === 'pending' || r.status === 'accepted');
  const stats = {
    units: open.reduce((s, r) => s + r.free_qty, 0),
    deposit: open.reduce((s, r) => s + r.deposit, 0),
    pending: rows.filter((r) => r.status === 'pending').length,
  };

  return (
    <div>
      <PageHeader
        title="My reservations"
        subtitle="Lock supplier stock for your commandes. You pay 40% upfront; the rest is only charged when you order the reserved units."
        breadcrumb={[{ label: 'Home', to: '/dropshipper' }, { label: 'My reservations' }]}
        actions={<ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Still free" value={stats.units} icon="📦" />
        <StatCard label="Deposit paid" value={money(stats.deposit)} icon="💰" />
        <StatCard label="Awaiting supplier" value={stats.pending} icon="⏳" />
        <StatCard label="Balance" value={money(user?.balance ?? 0)} icon="🏦" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'accepted', 'rejected', 'cancelled'] as Filter[]).map((f) => (
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
        <Card>
          <EmptyState
            icon="🔒"
            title={rows.length === 0 ? 'No reservations yet' : 'Nothing with this status'}
            hint={
              rows.length === 0 ? (
                <>
                  Open <Link to="/dropshipper/products" className="font-semibold text-brand-600">My products</Link> and reserve the
                  quantity you need on a product.
                </>
              ) : (
                'Try another status filter.'
              )
            }
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Brought</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Still free</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Deposit</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit price</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Refill</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isOpen = r.status === 'pending' || r.status === 'accepted';
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition hover:bg-brand-50/40">
                      <td className="px-3 py-2.5 align-middle text-xs font-bold text-slate-900">#{r.id}</td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {r.product_image ? (
                              <img src={r.product_image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center text-slate-300">📦</div>
                            )}
                          </div>
                          <Link to={`/dropshipper/store/${r.product_id}`} className="text-xs font-semibold text-slate-800 hover:text-brand-600">
                            {r.product_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <Badge tone={STATUS_TONE[r.status]} className="capitalize">{r.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-slate-900">{r.quantity}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-emerald-600" title="Units we brought into stock for you from the fournisseur">{r.got_qty}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-slate-900" title="Units of your reserved stock still physically available to send out — drops when stocking scans one, and comes back if a commande is returned">
                        {isOpen ? r.free_qty : 0}
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle text-xs font-semibold text-amber-700">{money(r.deposit)}</td>
                      <td className="px-3 py-2.5 text-right align-middle">
                        {r.status === 'pending' ? (
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            title="Deposit is 40% of your price and adjusts when you change it"
                            value={priceEdit[r.id] ?? String(r.price)}
                            onChange={(e) => setPriceEdit((v) => ({ ...v, [r.id]: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">{money(r.price)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {isOpen ? (
                          <>
                            <span className="text-[11px] text-slate-500">{REFILL_LABEL[r.refill_status]}</span>
                            {r.status === 'accepted' && r.refill_status === 'received' && (
                              <span className="mt-0.5 block text-[10px] font-semibold text-emerald-600">
                                {r.available_qty} unit{r.available_qty === 1 ? '' : 's'} ready to ship
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-slate-600">{dateFmt(r.created_at)}</td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {r.status === 'pending' && (
                            <>
                              {Number(priceEdit[r.id] ?? r.price) !== r.price && (
                                <ButtonGhost className="px-2.5 py-1 text-[11px]" onClick={() => savePrice(r)} disabled={busy !== null}>
                                  {busy === r.id ? '…' : 'Save price'}
                                </ButtonGhost>
                              )}
                              <Button className="px-2.5 py-1 text-[11px]" onClick={() => cancel(r)} disabled={busy !== null}>
                                {busy === r.id ? '…' : 'Cancel & refund'}
                              </Button>
                            </>
                          )}
                          {(r.status === 'rejected' || r.status === 'cancelled') && (
                            <span className="text-[11px] text-emerald-600">Deposit refunded</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        A pending reservation is not yet blocking other buyers — it only reserves the stock once the supplier accepts it. Reserved units
        you order are deducted from the reservation and are not charged again; everything you did not order stays available until you
        cancel it.
      </p>
    </div>
  );
}
