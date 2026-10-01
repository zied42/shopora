import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiErrorMessage, apiGet, apiPatch, Product } from '../../lib/api';
import { AppFooter, Badge, Spinner, TablePagination } from '../../components/ui';
import { ProductFormModal, StockModal } from '../../components/ProductTable';
import { warehouseNames } from '../../lib/warehouses';

const MENU_H = 168;

export default function StockInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const WAREHOUSES = warehouseNames();
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0] ?? '');
  const [query, setQuery] = useState('');
  const [zeroOnly, setZeroOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [editFor, setEditFor] = useState<Product | null>(null);
  const [menu, setMenu] = useState<{ id: number; x: number; y: number; up: boolean } | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const up = r.bottom + MENU_H + 8 > window.innerHeight;
    setMenu({ id, x: r.right, y: up ? r.top : r.bottom, up });
  };

  const load = () => {
    setLoading(true);
    apiGet<Product[]>('/products').then(setProducts).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleActive = async (p: Product) => {
    setMenu(null);
    try {
      await apiPatch(`/products/${p.id}`, { is_active: !p.is_active });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const remove = async (p: Product) => {
    setMenu(null);
    if (!confirm(`Delete "${p.name}" permanently?`)) return;
    try {
      await apiDelete(`/products/${p.id}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const needUpdate = useMemo(() => products.filter((p) => p.stock === 0).length, [products]);
  const lowStock = useMemo(() => products.filter((p) => p.stock > 0 && p.stock < 20).length, [products]);

  const filtered = products.filter((p) => {
    if (zeroOnly && p.stock !== 0) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q);
  });

  const total = filtered.length;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <div>
            <p className="text-sm font-bold text-slate-900">All my warehouses</p>
            <p className="text-xs text-slate-500">Manage the stock of your products across your warehouses.</p>
          </div>
        </div>
        <select
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {WAREHOUSES.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">⚠️</div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Products stocks need update</p>
            <p className="text-xl font-bold text-slate-900">{needUpdate}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg">🔥</div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-rose-600">Low stock products</p>
            <p className="text-xl font-bold text-slate-900">{lowStock}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={zeroOnly} onChange={(e) => setZeroOnly(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Only products with zero quantity
          </label>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product / SKU..."
              className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              title="Refresh"
              onClick={load}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-50"
            >
              🔄
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-3 py-3">Warehouse</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3 text-center">Total</th>
                  <th className="px-3 py-3 text-center">Available</th>
                  <th className="px-3 py-3 text-center">Reserved</th>
                  <th className="px-3 py-3 text-center">MRQ</th>
                  <th className="px-3 py-3 text-center">AC</th>
                  <th className="px-3 py-3 text-center">Shipping status</th>
                  <th className="px-3 py-3 text-center">Last update time</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className="flex h-24 items-center justify-center text-sm text-slate-400">No results found</div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">📦</span>
                          )}
                          <span className="max-w-[200px] truncate font-medium text-slate-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{warehouse}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{p.sku ?? '—'}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-slate-700">{p.stock}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-slate-700">{p.stock}</td>
                      <td className="px-3 py-3 text-center text-slate-400">—</td>
                      <td className="px-3 py-3 text-center text-slate-400">—</td>
                      <td className="px-3 py-3 text-center text-slate-400">—</td>
                      <td className="px-3 py-3 text-center">
                        <Badge tone={p.stock > 0 ? (p.is_active ? 'green' : 'slate') : 'red'}>{!p.is_active ? 'Hidden' : p.stock > 0 ? 'Ready' : 'Out'}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400">—</td>
                      <td className="px-5 py-3 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => openMenu(e, p.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            title="Actions"
                          >
                            Actions <span className="text-slate-400">▾</span>
                          </button>
                          {menu?.id === p.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                              <div
                                className="fixed z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                                style={{ left: Math.min(menu.x - 176, window.innerWidth - 192), top: menu.up ? menu.y - MENU_H - 8 : menu.y + 4 }}
                              >
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setStockFor(p); setMenu(null); }}>
                                  <span>📦</span> Edit stock
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setEditFor(p); setMenu(null); }}>
                                  <span>✏️</span> Edit product
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => toggleActive(p)}>
                                  <span>{p.is_active ? '🙈' : '👁️'}</span> {p.is_active ? 'Hide' : 'Show'}
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => remove(p)}>
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination count={total} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>
      {stockFor && (
        <StockModal product={stockFor} onClose={() => setStockFor(null)} onDone={() => { setStockFor(null); load(); }} />
      )}
      {editFor && (
        <ProductFormModal product={editFor} onClose={() => setEditFor(null)} onDone={() => { setEditFor(null); load(); }} />
      )}
      <AppFooter />
    </div>
  );
}
