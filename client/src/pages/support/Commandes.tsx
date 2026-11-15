import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, AuthUser, Order } from '../../lib/api';
import { OrderList } from '../../components/OrderCenter';
import { EmptyState, PageHeader, Spinner } from '../../components/ui';
import CreateTab from '../dropshipper/CommandesCreate';

type Tab = 'create' | 'list';

export default function SupportCommandes() {
  const [tab, setTab] = useState<Tab>('create');
  const [drops, setDrops] = useState<AuthUser[]>([]);
  const [dsId, setDsId] = useState<number | null>(null);
  const [loadingDrops, setLoadingDrops] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    apiGet<AuthUser[]>('/staff/dropshippers')
      .then((d) => {
        setDrops(d);
        if (d.length) setDsId(d[0].id);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoadingDrops(false));
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    apiGet<Order[]>('/orders').then(setOrders).catch((e) => alert(apiErrorMessage(e))).finally(() => setOrdersLoading(false));
  };

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle="Create commandes on behalf of a dropshipper — same flow as the dropshipper's own creation — and review every commande on the platform"
      />

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('create')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'create' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          ➕ Create commande
        </button>
        <button
          onClick={() => { setTab('list'); loadOrders(); }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          🧾 All commandes
        </button>
      </div>

      {tab === 'list' ? (
        <OrderList orders={orders} loading={ordersLoading} onRefresh={loadOrders} canExport />
      ) : loadingDrops ? (
        <Spinner />
      ) : drops.length === 0 ? (
        <EmptyState icon="👥" title="No dropshippers" hint="Create a dropshipper account first." />
      ) : (
        <CreateTab
          onCreated={() => {}}
          dropshippers={drops}
          dropshipperId={dsId ?? undefined}
          onDropshipperChange={(id) => setDsId(id)}
        />
      )}
    </div>
  );
}