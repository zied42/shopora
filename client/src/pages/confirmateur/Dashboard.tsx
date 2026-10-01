import { useEffect, useState } from 'react';
import { apiErrorMessage, getConfirmateurDashboard, money, timeFmt } from '../../lib/api';
import type { ConfirmateurDashboard } from '../../lib/api';
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function ConfirmateurDashboard() {
  const [data, setData] = useState<ConfirmateurDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfirmateurDashboard()
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Confirmateur Dashboard" subtitle="All confirmations across all confirmateurs" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total confirmed', value: data.total_confirmed, icon: '✅' },
          { label: 'Confirmed today', value: data.today_confirmed, icon: '📅' },
          { label: 'Active confirmateurs', value: data.unique_confirmateurs, icon: '👥' },
          { label: 'Dropshippers served', value: data.unique_dropshippers, icon: '🛍️' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl">{s.icon}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {data.by_confirmateur.length > 0 && (
        <Card className="mb-6 p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Confirmations by Confirmateur</h3>
          <div className="space-y-2">
            {data.by_confirmateur.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{c.name}</span>
                <span className="text-sm font-bold text-emerald-600">{c.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Recent Confirmations</h3>
        {data.recent.length === 0 ? (
          <EmptyState icon="📋" title="No confirmations yet" hint="Confirmed orders will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">Order</th>
                  <th className="pb-2 pr-3">Dropshipper</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 pr-3">Confirmed by</th>
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
                    <td className="py-2 pr-3 text-slate-600">{r.confirmed_by_name}</td>
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
