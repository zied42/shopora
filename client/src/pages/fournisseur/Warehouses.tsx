import { useNavigate } from 'react-router-dom';
import { AppFooter, EmptyState } from '../../components/ui';
import { getWarehouses } from '../../lib/warehouses';

export default function Warehouses() {
  const navigate = useNavigate();
  const warehouses = getWarehouses();

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Warehouses</h5>
          <button
            type="button"
            onClick={() => navigate('/fournisseur/warehouses/add')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ➕ Add New Warehouse
          </button>
        </div>

        {warehouses.length === 0 ? (
          <EmptyState icon="🏭" title="No warehouses yet" hint="Click “Add New Warehouse” to create your first warehouse." />
        ) : (
          <div className="divide-y divide-slate-100 p-5">
            {warehouses.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">🏭</span>
                  <span className="font-bold text-slate-900">{w.name}</span>
                </div>
                <div className="ml-2 min-w-0 flex-1 ps-3">
                  <h6 className="mb-1 font-semibold text-slate-800">{w.name}</h6>
                  <p className="mb-1 text-xs text-slate-500">Location: <span className="text-slate-700">{w.location || '—'}</span></p>
                  <p className="mb-1 text-xs text-slate-500">Contact: {w.phone1 || '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/fournisseur/warehouses/${w.id}/edit`)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                  title="Edit warehouse"
                >
                  ✏️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
