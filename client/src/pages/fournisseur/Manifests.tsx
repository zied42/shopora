import { AppFooter, TablePagination } from '../../components/ui';

export default function Manifests() {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Manifests</h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-3 py-3 text-center">Date</th>
                <th className="px-3 py-3 text-center">Warehouse</th>
                <th className="px-3 py-3 text-center">Carrier</th>
                <th className="px-3 py-3 text-center">Status</th>
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
        <TablePagination count={0} page={1} pageSize={5} onPage={() => {}} onPageSize={() => {}} />
      </div>
      <AppFooter />
    </div>
  );
}