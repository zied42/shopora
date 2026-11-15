import { useEffect, useState } from 'react';
import { apiErrorMessage, getConfirmateurMyDashboard, money, timeFmt } from '../../lib/api';
import type { ConfirmateurMyDashboard } from '../../lib/api';
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function ConfirmateurMyDashboard() {
  const [data, setData] = useState<ConfirmateurMyDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfirmateurMyDashboard()
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle="Your confirmation activity" />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{data.my_confirmed}</p>
          <p className="text-xs text-slate-500">Total confirmed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl">📅</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{data.my_today}</p>
          <p className="text-xs text-slate-500">Confirmed today</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-900">My Recent Confirmations</h3>
        {data.recent.length === 0 ? (
          <EmptyState icon="📋" title="No confirmations yet" hint="Go to Pending Commandes and send orders to chef." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">Order</th>
                  <th className="pb-2 pr-3">Dropshipper</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{r.order_number}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.dropshipper_name}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.customer_name}</td>
                    <td className="py-2 pr-3 text-right font-bold text-emerald-600">{money(r.total)}</td>
                    <td className="py-2 text-slate-500">{timeFmt(r.confirmed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
