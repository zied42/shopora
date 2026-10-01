import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppFooter, PageHeader, TablePagination } from '../../components/ui';
import { warehouseNames } from '../../lib/warehouses';

export default function Packaging() {
  const navigate = useNavigate();
  const WAREHOUSES = warehouseNames();
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0] ?? '');
  const [query, setQuery] = useState('');

  return (
    <div>
      <PageHeader
        title={`${warehouse || 'No warehouse'} — Transfer shipments`}
        subtitle="Select the warehouse to inspect bins, packing materials and transfer shipments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {WAREHOUSES.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate('/fournisseur/stock-shipments/create')}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              Create transfer request
            </button>
          </div>
        }
      />

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
            <h5 className="font-bold text-slate-900">Bins</h5>
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs uppercase tracking-wide text-slate-600">
              <span className="flex items-center gap-2">📦 Bin</span>
              <span className="flex items-center gap-6">
                <span>Stock</span>
                <span className="text-right">Consumption</span>
              </span>
            </div>
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-400">
              <span className="text-4xl">🧺</span>
              <span className="text-xs">You have no bins in this warehouse yet</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
            <h5 className="font-bold text-slate-900">Packing materials</h5>
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs uppercase tracking-wide text-slate-600">
              <span className="flex items-center gap-2">📎 Packing material</span>
              <span className="flex items-center gap-6">
                <span>Stock</span>
                <span className="text-right">Consumption</span>
              </span>
            </div>
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-400">
              <span className="text-4xl">📦</span>
              <span className="text-xs">You have no packing materials in this warehouse yet</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-bold text-slate-900">Transfer shipments</h5>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="ml-2 w-44 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <input
            readOnly
            value="Jul 19 - Aug 20"
            className="cursor-default rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-3 py-3 text-center">Date</th>
                <th className="px-3 py-3 text-center">Items</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5}>
                  <div className="flex h-24 items-center justify-center text-sm text-slate-400">No results found</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePagination count={0} page={1} pageSize={10} onPage={() => {}} onPageSize={() => {}} />
      </div>
      <AppFooter />
    </div>
  );
}