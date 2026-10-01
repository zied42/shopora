import { AppFooter, PageHeader, TablePagination } from '../../components/ui';

export default function StockShipments() {

  return (
    <div>
      <PageHeader title="Stock shipments" subtitle="Review stock transfer shipments between your warehouse and our fulfillment center." />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-3 py-3">Products</th>
                <th className="px-3 py-3 text-center">Date</th>
                <th className="px-3 py-3 text-center">From</th>
                <th className="px-3 py-3 text-center">To</th>
                <th className="px-3 py-3 text-center">Type</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Toolbar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8}>
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