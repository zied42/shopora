import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, listReservations, Reservation } from '../../lib/api';
import { ButtonGhost, Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

interface DropshipperRow {
  dropshipper_id: number;
  dropshipper_name: string;
  /** Distinct products he reserved. */
  products: number;
  reservations: number;
  reservedUnits: number;
  reservedStock: number;
  brought: number;
  toBring: number;
}

export default function InventoryReservation() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listReservations()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const dropshippers = useMemo<DropshipperRow[]>(() => {
    const map = new Map<number, DropshipperRow & { productIds: Set<number> }>();
    for (const r of rows) {
      let g = map.get(r.dropshipper_id);
      if (!g) {
        g = {
          dropshipper_id: r.dropshipper_id,
          dropshipper_name: r.dropshipper_name,
          products: 0,
          reservations: 0,
          reservedUnits: 0,
          reservedStock: 0,
          brought: 0,
          toBring: 0,
          productIds: new Set<number>(),
        };
        map.set(r.dropshipper_id, g);
      }
      g.reservations += 1;
      g.productIds.add(r.product_id);
      g.reservedUnits += r.quantity;
      g.reservedStock += r.remaining;
      g.brought += r.got_qty;
      g.toBring += Math.max(0, r.remaining - r.got_qty);
    }
    return [...map.values()]
      .map(({ productIds, ...g }) => ({ ...g, products: productIds.size }))
      .sort((a, b) => a.dropshipper_id - b.dropshipper_id);
  }, [rows]);

  const totals = useMemo(
    () =>
      dropshippers.reduce(
        (acc, g) => ({
          products: acc.products + g.products,
          reservedUnits: acc.reservedUnits + g.reservedUnits,
          brought: acc.brought + g.brought,
          toBring: acc.toBring + g.toBring,
        }),
        { products: 0, reservedUnits: 0, brought: 0, toBring: 0 }
      ),
    [dropshippers]
  );

  return (
    <div>
      <PageHeader
        title="Inventory reservation"
        subtitle="Every dropshipper's reserved products, what we brought in for them, and what is still owed. Open a dropshipper to see each product and the seller it was reserved from."
        breadcrumb={[{ label: 'Home', to: '/stocking' }, { label: 'Reservations', to: '/stocking/reservations' }, { label: 'Inventory reservation' }]}
        actions={<ButtonGhost onClick={load}>↻ Refresh</ButtonGhost>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Dropshippers" value={dropshippers.length} icon="👤" accent="purple" />
        <StatCard label="Products reserved" value={totals.products} icon="📦" accent="blue" />
        <StatCard label="Units brought" value={totals.brought} icon="📥" accent="green" />
        <StatCard label="Still to bring" value={totals.toBring} icon="📋" accent="orange" />
      </div>

      {loading ? (
        <Spinner />
      ) : dropshippers.length === 0 ? (
        <Card>
          <EmptyState icon="📦" title="No reservations yet" hint="Once a dropshipper reserves a product, their reserved inventory appears here." />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dropshipper</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved products</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved units</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Brought</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">To bring</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserved inventory</th>
                </tr>
              </thead>
              <tbody>
                {dropshippers.map((g) => (
                  <tr key={g.dropshipper_id} className="border-t border-slate-100 transition hover:bg-brand-50/40">
                    <td className="px-3 py-3 text-xs font-semibold text-slate-500">#{g.dropshipper_id}</td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-800">{g.dropshipper_name}</td>
                    <td className="px-3 py-3 text-center text-sm font-bold text-slate-900">{g.products}</td>
                    <td className="px-3 py-3 text-center text-xs text-slate-700">
                      {g.reservedUnits}
                      <span className="block text-[10px] text-slate-400">{g.reservations} reservations</span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-emerald-600">{g.brought}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-amber-600">{g.toBring}</td>
                    <td className="px-3 py-3 text-right">
                      <ButtonGhost type="button" onClick={() => navigate(`/stocking/reservations/inventory/${g.dropshipper_id}`)}>
                        View inventory →
                      </ButtonGhost>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <ButtonGhost onClick={() => navigate('/stocking/reservations')}>← Back to reservations</ButtonGhost>
      </div>
    </div>
  );
}
