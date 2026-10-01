import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, Order } from '../../lib/api';
import { OrderList } from '../../components/OrderCenter';
import { PageHeader } from '../../components/ui';

export default function DsOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<Order[]>('/orders').then(setOrders).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader title="My orders" subtitle="Track, pay, rate and export your orders" />
      <OrderList orders={orders} loading={loading} onRefresh={load} canExport />
    </div>
  );
}