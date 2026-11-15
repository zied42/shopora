import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  apiErrorMessage,
  fetchPlatformEarnings,
  money,
  type PlatformCommissionRow,
  type PlatformEarnings,
  type PlatformReservationRow,
} from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

/** Explains, on the page itself, exactly how each line is earned so the numbers are auditable. */
function Formula({ children }: { children: string }) {
  return <p className="text-[11px] leading-relaxed text-slate-400">{children}</p>;
}

const orderTypeLabel = (t: string) => (t === 'dropshipping' ? 'Dropshipping' : t === 'fulfillment' ? 'Fulfillment' : t);

function OrderRow({ o }: { o: PlatformCommissionRow }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2.5">
        <Link to={`/chef/commandes/${o.id}`} className="font-semibold text-brand-600 hover:underline">
          {o.order_number}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-slate-700">{o.dropshipper_name}</td>
      <td className="px-3 py-2.5">
        <Badge tone={o.order_type === 'dropshipping' ? 'blue' : o.order_type === 'fulfillment' ? 'purple' : 'slate'}>
          {orderTypeLabel(o.order_type)}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-center text-slate-600">{o.units}</td>
      <td className="px-3 py-2.5 text-right text-slate-700">{money(o.seller_value)}</td>
      <td className="px-3 py-2.5 text-right text-slate-700">{money(o.commission)}</td>
      <td className="px-3 py-2.5 text-right text-slate-700">
        {o.valeur_entier > 0 ? <span className="text-emerald-600">{money(o.valeur_entier)}</span> : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{money(o.platform_profit)}</td>
      <td className="px-3 py-2.5 text-slate-500">{o.delivered_at ? new Date(o.delivered_at).toLocaleDateString() : '—'}</td>
    </tr>
  );
}

function ReservationRow({ r }: { r: PlatformReservationRow }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2.5 font-semibold text-slate-900">#{r.id}</td>
      <td className="px-3 py-2.5 text-slate-700">{r.product_name}</td>
      <td className="px-3 py-2.5 text-slate-700">{r.dropshipper_name}</td>
      <td className="px-3 py-2.5 text-center text-slate-600">{r.quantity}</td>
      <td className="px-3 py-2.5 text-right text-slate-700">{money(r.price)}</td>
      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{money(r.deposit)}</td>
      <td className="px-3 py-2.5 text-center text-slate-500">{money(r.valeur_entier)}</td>
      <td className="px-3 py-2.5">
        <Badge tone={r.status === 'accepted' ? 'green' : 'amber'}>{r.status}</Badge>
      </td>
      <td className="px-3 py-2.5 text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
    </tr>
  );
}

const th = 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const thR = 'px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const thC = 'px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500';

export default function PlatformProfit() {
  const [data, setData] = useState<PlatformEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchPlatformEarnings()
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const delivered = data.orders.length;
  const liveReservations = data.reservations.length;

  return (
    <div>
      <PageHeader
        title="Platform profit"
        subtitle="Everything the platform earns: flat fees and the 3% valeur_entier on delivered commandes, plus the 40% deposits held on reservations."
        actions={
          <button
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Refresh
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Platform profit" value={money(data.total)} icon="💰" accent="green" />
        <StatCard label="Flat fees" value={money(data.commissions_total)} icon="🧾" accent="blue" />
        <StatCard label="Valeur_entier (3%)" value={money(data.valeur_entier_total)} icon="📈" accent="indigo" />
        <StatCard label="Reservation deposits" value={money(data.deposits_total)} icon="🔒" accent="purple" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          {
            title: 'Flat fee per delivered commande',
            lines: [
              '3 DT — a dropshipper creates the commande',
              '2.5 DT — a fulfillment created by a fournisseur',
              '1 DT — an exchange',
            ],
            note: 'Counted when the colis is delivered.',
          },
          {
            title: 'Valeur_entier: 3%',
            lines: ['3% × quantity × seller putted price', 'The seller price set at product creation, not the marketplace price.'],
            note: 'Dropshipping commandes only. Counted on delivery.',
          },
          {
            title: 'Reservation deposit: 40%',
            lines: ['40% × quantity × reservation price', 'Paid up front by the dropshipper and kept by the platform.'],
            note: 'Counted when the reservation happens. Refunded reservations do not count.',
          },
        ].map((box) => (
          <Card key={box.title} className="p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-900">{box.title}</h3>
            <ul className="mb-2 space-y-1">
              {box.lines.map((l) => (
                <li key={l} className="text-xs text-slate-600">
                  • {l}
                </li>
              ))}
            </ul>
            <Formula>{box.note}</Formula>
          </Card>
        ))}
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Delivered commandes ({delivered})</h2>
          <Formula>Flat fee + 3% of the seller putted price on the units sold.</Formula>
        </div>
        {data.orders.length === 0 ? (
          <EmptyState icon="📦" title="No delivered commandes yet" hint="Profit from commandes appears here once a colis is delivered." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Commande</th>
                  <th className={th}>Created by</th>
                  <th className={th}>Type</th>
                  <th className={thC}>Units</th>
                  <th className={thR}>Seller value</th>
                  <th className={thR}>Flat fee</th>
                  <th className={thR}>3% valeur_entier</th>
                  <th className={thR}>Platform profit</th>
                  <th className={th}>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <OrderRow key={o.id} o={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Reservations holding a deposit ({liveReservations})</h2>
          <Formula>The 40% already paid is profit to the platform. Rejected and cancelled reservations were refunded.</Formula>
        </div>
        {data.reservations.length === 0 ? (
          <EmptyState icon="🔒" title="No deposits held" hint="A dropshipper pays 40% when reserving stock; that deposit shows up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Reservation</th>
                  <th className={th}>Product</th>
                  <th className={th}>Dropshipper</th>
                  <th className={thC}>Qty</th>
                  <th className={thR}>Unit price</th>
                  <th className={thR}>Deposit (profit)</th>
                  <th className={thC}>Valeur_entier</th>
                  <th className={th}>Status</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.reservations.map((r) => (
                  <ReservationRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
