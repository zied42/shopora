import { useState } from 'react';
import { AppFooter, TablePagination } from '../../components/ui';

export default function Subscriptions() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Subscriptions</h5>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="ml-2 w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-3 py-3 text-center">Retailer</th>
                <th className="px-3 py-3 text-center">Delivered items</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-center">Price</th>
                <th className="px-5 py-3 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>
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
