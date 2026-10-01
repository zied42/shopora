import { useEffect, useState } from 'react';
import { apiErrorMessage, DEFAULT_ZONE_COLOR, getStockShipments, setStockShipmentZone, SHIPMENT_ZONES, StockShipmentOrder, ShipmentZone, ZONE_COLORS } from '../../lib/api';
import { Badge, Card, PageHeader, Spinner } from '../../components/ui';

const STATUS_TONES: Record<string, 'green' | 'blue' | 'amber' | 'red'> = {
  ready: 'green',
  confirmed: 'blue',
  retour: 'red',
};

const ZONE_META: Record<ShipmentZone, { icon: string; blurb: string }> = {
  Tunis: { icon: '🏛️', blurb: 'Grand Tunis — Ariana, Ben Arous, Manouba, Bizerte, Nabeul' },
  Sousse: { icon: '🏖️', blurb: 'Sahel — Sousse, Monastir, Kairouan' },
  Sfax: { icon: '🏭', blurb: 'South — Sfax, Gabès, Gafsa, Kasserine, Kébili' },
  Eljem: { icon: '🏟️', blurb: 'Eljem — Eljem, Chebba, Souassi, Mahdia' },
};

function AgenceBadge({ zone }: { zone: ShipmentZone | null }) {
  const c = zone ? (ZONE_COLORS[zone] ?? DEFAULT_ZONE_COLOR) : { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-300', label: 'No agency matched' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}>
      🏢 Agence: {zone ? `Zone ${zone}` : 'Unassigned'}
    </span>
  );
}

function ShipmentCard({ order, onZoneChange }: { order: StockShipmentOrder; onZoneChange: (orderId: number, zone: ShipmentZone | null) => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">#{order.order_number}</p>
          <p className="truncate text-xs text-slate-500">
            {order.customer_name ?? 'Unknown customer'} · {order.city ?? '—'}{order.governorate ? `, ${order.governorate}` : ''}
          </p>
          {order.barcode && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{order.barcode}</p>}
        </div>
        <Badge tone={STATUS_TONES[order.status] ?? 'amber'}>{order.status}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <AgenceBadge zone={order.zone} />
        {!order.zone && order.auto_zone && <span className="text-[10px] text-slate-400">auto: Zone {order.auto_zone}</span>}
        {order.zone_override && order.zone && (
          <span className="text-[10px] font-semibold text-brand-600">manual override</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px]">
        <span className="text-slate-500"><span className="font-semibold text-slate-700">Retailer:</span> {order.dropshipper_name ?? '—'}</span>
        <span className="text-slate-500"><span className="font-semibold text-slate-700">Supplier:</span> {order.fournisseur_name ?? '—'}</span>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        {order.items.map((it) => (
          <div key={it.product_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded bg-white">
              {it.image_url ? <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-300">📦</div>}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{it.product_name}</p>
            <Badge tone="blue"><b>×{it.quantity}</b></Badge>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-400">{order.total_units} units</span>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          Zone
          <select
            value={order.zone ?? ''}
            onChange={(e) => onZoneChange(order.id, (e.target.value || null) as ShipmentZone | null)}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-brand-500 ${order.zone_override ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            <option value="">Unassigned</option>
            {SHIPMENT_ZONES.map((z) => (
              <option key={z} value={z}>{`Zone ${z}`}</option>
            ))}
          </select>
        </label>
      </div>
      {order.zone_override && order.auto_zone && order.zone !== order.auto_zone && (
        <p className="mt-1 text-right text-[10px] text-slate-400">auto-suggested: Zone {order.auto_zone}</p>
      )}
    </Card>
  );
}

export default function StockShipments() {
  const [orders, setOrders] = useState<StockShipmentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getStockShipments()
      .then(setOrders)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changeZone = (orderId: number, zone: ShipmentZone | null) => {
    setStockShipmentZone(orderId, zone)
      .then(load)
      .catch((e) => alert(apiErrorMessage(e)));
  };

  const grouped = new Map<string, StockShipmentOrder[]>();
  for (const z of SHIPMENT_ZONES) grouped.set(z, []);
  grouped.set('unassigned', []);
  for (const o of orders) {
    const key = o.zone ?? 'unassigned';
    grouped.get(key)!.push(o);
  }

  return (
    <div>
      <PageHeader
        title="Stock shipments"
        subtitle="Commandes awaiting shipment, placed in the agency zone closest to their destination"
        actions={<button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>}
      />

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="space-y-6">
          {[...SHIPMENT_ZONES, 'unassigned' as const].map((key) => (
            <section key={key}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {key === 'unassigned' ? '❓ Unassigned' : `${ZONE_META[key].icon} Zone ${key}`}
                </h2>
                <Badge tone="slate">0 commandes · 0 units</Badge>
              </div>
              {key !== 'unassigned' && <p className="mb-3 text-[11px] text-slate-400">{ZONE_META[key].blurb}</p>}
              <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-xs text-slate-400">Nothing to ship in this zone.</p>
            </section>
          ))}
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            ℹ️ No commandes are awaiting shipment right now — a commande appears here once it is confirmed by the chef or fully picked (status ready / confirmed).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...SHIPMENT_ZONES, 'unassigned' as const].map((key) => {
            const list = grouped.get(key)!;
            const units = list.reduce((s, o) => s + o.total_units, 0);
            return (
              <section key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {key === 'unassigned' ? '❓ Unassigned' : `${ZONE_META[key].icon} Zone ${key}`}
                  </h2>
                  <Badge tone={list.length ? 'green' : 'slate'}>{list.length} commandes · {units} units</Badge>
                </div>
                {key !== 'unassigned' && <p className="mb-3 text-[11px] text-slate-400">{ZONE_META[key].blurb}</p>}
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-xs text-slate-400">Nothing to ship in this zone.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((o) => (
                      <ShipmentCard key={o.id} order={o} onZoneChange={changeZone} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Each commande gets an 🏢 agence (zone) — auto-suggested from its governorate/city (Tunis, Sousse, Sfax, Eljem). Unmatched commandes land in ❓ Unassigned; use the Zone dropdown on the card to place them manually.
      </p>
    </div>
  );
}
