import { AppFooter, TablePagination } from '../../components/ui';

export default function OrderBatches() {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Orders batches</h5>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Batch creation is not available yet')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ➕ Create new batch
            </button>
            <button
              type="button"
              title="Refresh"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-50"
            >
              🔄
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-3 py-3 text-center">Date</th>
                <th className="px-3 py-3 text-center">Orders count</th>
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