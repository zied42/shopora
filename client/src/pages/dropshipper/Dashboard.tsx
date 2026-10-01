import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { apiErrorMessage, apiGet, Order } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { AnalyticsRange, hasProduct, inRange, RANGE_OPTIONS } from './dashboard/analytics';
import OverviewTab from './dashboard/OverviewTab';
import DeliveryTab from './dashboard/DeliveryTab';
import ConfirmationTab from './dashboard/ConfirmationTab';
import InternalConfirmationTab from './dashboard/InternalConfirmationTab';
import ProductsTab from './dashboard/ProductsTab';

const TABS = [
  { to: '/dropshipper', label: 'Overview', icon: '📊', end: true },
  { to: '/dropshipper/dashboard/delivery', label: 'Delivery', icon: '📍' },
  { to: '/dropshipper/dashboard/confirmation', label: 'Confirmation', icon: '📞' },
  { to: '/dropshipper/dashboard/internal-confirmation', label: 'Internal Confirmation', icon: '👥' },
  { to: '/dropshipper/dashboard/products', label: 'Products', icon: '🔷' },
];

export default function DsDashboard() {
  const { pathname } = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [productId, setProductId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<Order[]>('/orders')
      .then(setOrders)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const productOptions = useMemo(() => {
    const seen = new Map<number, { id: number; name: string }>();
    for (const o of orders) {
      for (const it of o.items) {
        if (!seen.has(it.product_id)) seen.set(it.product_id, { id: it.product_id, name: it.product_name });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  useEffect(() => {
    if (productId !== null && !productOptions.some((p) => p.id === productId)) setProductId(null);
  }, [productOptions, productId]);

  const filtered = useMemo(() => orders.filter((o) => inRange(o, range) && hasProduct(o, productId)), [orders, range, productId]);

  const active = (tab: (typeof TABS)[number]) => (tab.end ? pathname === tab.to : pathname.startsWith(tab.to));

  return (
    <div>
      {/* header card */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
        <div>
          <h5 className="text-lg font-bold text-slate-900">Dashboard</h5>
          <p className="text-xs text-slate-500">Select a date range or toggle to view all time data</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={productId ?? ''}
            onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-500"
          >
            <option value="">Select product..</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as AnalyticsRange)}
              className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <button onClick={load} className="border-l border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              active(t) ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {active(TABS[0]) && <OverviewTab orders={filtered} range={range} />}
          {active(TABS[1]) && <DeliveryTab orders={filtered} range={range} />}
          {active(TABS[2]) && <ConfirmationTab orders={filtered} />}
          {active(TABS[3]) && <InternalConfirmationTab orders={filtered} />}
          {active(TABS[4]) && <ProductsTab orders={filtered} />}
        </>
      )}
    </div>
  );
}
