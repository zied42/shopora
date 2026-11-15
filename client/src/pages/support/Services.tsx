import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, listSupportServices, ServiceInscription, dateFmt } from '../../lib/api';
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function SupportServices() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceInscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listSupportServices()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <PageHeader title="Services" subtitle="Confirmed confirmation-service dropshippers — number of commandes counts drafts not yet sent to the chef" />

      {loading ? (
        <div className="py-20 text-center"><Spinner /></div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="🎧" title="No confirmed services" hint="Confirmed confirmation-service inscriptions will appear here." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Dropshipper</th>
                  <th className="px-4 py-2.5 text-right">Number of orders</th>
                  <th className="px-4 py-2.5">Confirmed</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{r.user_name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {r.orders_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.confirmed_at ? dateFmt(r.confirmed_at) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/support/services/${r.id}`)}
                        className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm hover:bg-brand-700"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}