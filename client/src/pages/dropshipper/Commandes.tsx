import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { apiErrorMessage, apiGet, Order } from '../../lib/api';
import { OrderList } from '../../components/OrderCenter';
import { PageHeader } from '../../components/ui';
import CreateTab from './CommandesCreate';
import ReturnsTab from './ReturnsTab';

const TABS = (path: string) => [
  { to: '/orders', label: 'Orders', icon: '🧾', active: path === '/orders' },
  { to: '/orders/create', label: 'Create order', icon: '➕', active: path === '/orders/create' || path === '/orders/echange/create' },
  { to: '/orders/retours', label: 'Returns', icon: '↩️', active: path.includes('/orders/retours') },
  { to: '/orders/echange', label: 'Exchanges', icon: '🔁', active: path === '/orders/echange' },
];

export default function DsCommandes() {
  const { pathname } = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<Order[]>('/orders')
      .then(setOrders)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    if (pathname === '/orders') load();
  }, [pathname]);

  return (
    <div>
      <PageHeader
        title="My commandes"
        subtitle="Manage your orders, returns and exchanges"
        breadcrumb={[{ label: 'Home', to: '/shop' }, { label: 'Orders' }]}
      />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
        {TABS(pathname).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={() =>
              `inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                t.active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <span>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>

      {pathname === '/orders' && <OrderList orders={orders} loading={loading} onRefresh={load} />}
      {pathname === '/orders/create' && <CreateTab onCreated={load} />}
      {pathname === '/orders/echange/create' && <CreateTab onCreated={load} exchangeMode />}
      {pathname.includes('/orders/retours') && <ReturnsTab type="retour" />}
      {pathname === '/orders/echange' && <ReturnsTab type="echange" />}
    </div>
  );
}
