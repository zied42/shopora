import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, dateFmt, listReservations, money, Reservation } from '../../lib/api';
import { ButtonGhost, Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

export default function DropshipperReservedInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dropshipperId = Number(id);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!Number.isFinite(dropshipperId)) return;
    setLoading(true);
    listReservations()
      .then((all) => setRows(all.filter((r) => r.dropshipper_id === dropshipperId)))
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [dropshipperId]);

  /** Live view: scanning a unit out on /stocking/reservations and returning a commande both move
   *  "Still free", so the numbers refresh on their own. */
  const loadQuiet = useCallback(() => {
    if (!Number.isFinite(dropshipperId)) return;
    listReservations()
      .then((all) => setRows(all.filter((r) => r.dropshipper_id === dropshipperId)))
      .catch(() => undefined);
  }, [dropshipperId]);

  useEffect(load, [load]);

  useEffect(() => {
    const t = window.setInterval(loadQuiet, 15000);
    return () => window.clearInterval(t);
  }, [loadQuiet]);

  const reservations = useMemo(
    () => [...rows].sort((a, b) => a.product_name.localeCompare(b.product_name) || a.id - b.id),
    [rows]
  );

  /** Same product reserved from two sellers keeps one row per seller, so you can see who owes what. */
  const bySeller = useMemo(() => {
    const map = new Map<number, { fournisseur_id: number; fournisseur_name: string; products: number }>();
    for (const r of reservations) {
      let g = map.get(r.fournisseur_id);
      if (!g) {
        g = { fournisseur_id: r.fournisseur_id, fournisseur_name: r.fournisseur_name, products: 0 };
        map.set(r.fournisseur_id, g);
      }
      g.products += 1;
    }
    return [...map.values()].sort((a, b) => a.fournisseur_name.localeCompare(b.fournisseur_name));
  }, [reservations]);

  const totals = useMemo(
    () =>
      reservations.reduce(
        (acc, r) => ({
          units: acc.units + r.quantity,
          stock: acc.stock + r.remaining,
          free: acc.free + r.free_qty,
          brought: acc.brought + r.got_qty,
          toBring: acc.toBring + Math.max(0, r.remaining - r.got_qty),
        }),
        { units: 0, stock: 0, free: 0, brought: 0, toBring: 0 }
      ),
    [reservations]
  );

  const name = reservations[0]?.dropshipper_name ?? `Dropshipper #${dropshipperId}`;

  return (
    <div>
      <PageHeader
        title={`${name} — reserved inventory`}
        subtitle="Each product he reserved, the seller it was reserved from, and what we brought into stock for him."
        breadcrumb={[
          { label: 'Home', to: '/stocking' },
          { label: 'Reservations', to: '/stocking/reservations' },
          { label: 'Inventory reservation', to: '/stocking/reservations/inventory' },
          { label: name },
        ]}
        actions={<ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Products reserved" value={new Set(reservations.map((r) => r.product_id)).size} icon="📦" accent="purple" />
        <StatCard label="Reserved units" value={totals.units} icon="🔒" accent="blue" />
        <StatCard label="Still free" value={totals.free} icon="✅" accent="purple" />
        <StatCard label="Brought for him" value={totals.brought} icon="📥" accent="green" />
        <StatCard label="Still to bring" value={totals.toBring} icon="📋" accent="amber" />
      </div>

      {bySeller.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved from</span>
          {bySeller.map((s) => (
            <span key={s.fournisseur_id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-700">
              {s.fournisseur_name}
              <span className="text-brand-400">· {s.products} product{s.products > 1 ? 's' : ''}</span>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : reservations.length === 0 ? (
        <Card>
          <EmptyState icon="📦" title="Nothing reserved" hint={`${name} has no reserved products.`} />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Seller</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved stock</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Brought</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Still free</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">To bring</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit price</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 transition hover:bg-brand-50/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {r.product_image && <img src={r.product_image} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-800">{r.product_name}</div>
                          <div className="text-[10px] text-slate-400">
                            #{r.id} · {r.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{r.fournisseur_name}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-900">{r.quantity}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-900">
                      {r.remaining}
                      <span className="block text-[10px] font-normal text-slate-400">{r.quantity - r.remaining} used</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">{r.got_qty}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-900">{r.free_qty}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-amber-600">{Math.max(0, r.remaining - r.got_qty)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-700">{money(r.price)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{dateFmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <ButtonGhost onClick={() => navigate('/stocking/reservations/inventory')}>← Back to inventory reservation</ButtonGhost>
      </div>
    </div>
  );
}
