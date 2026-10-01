import { useState } from 'react';
import { apiErrorMessage, apiPost, Product } from '../lib/api';
import { Button, ButtonGhost, Input, Modal } from './ui';
import { warehouseNames } from '../lib/warehouses';

export default function StockUpdateModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const warehouses = warehouseNames();
  const rows = warehouses.length
    ? warehouses
    : [warehouses[0] ?? 'Warehouse'];
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((w) => [w, '']))
  );
  const [saving, setSaving] = useState(false);

  const image = product.images[0] ?? product.image_url ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = rows.reduce((sum, w) => {
      const n = Number(quantities[w]);
      return sum + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
    if (total <= 0) return alert('Enter a valid new quantity');
    setSaving(true);
    try {
      await apiPost(`/products/${product.id}/stock`, { stock: total });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (warehouses.length === 0) {
    return (
      <Modal open onClose={onClose} title="Update the product stocks">
        <div className="space-y-4">
          <div className="py-2 text-center text-sm font-bold text-slate-800">{product.name}</div>
          {image && (
            <div
              className="h-56 w-full rounded-lg"
              style={{ backgroundImage: `url(${image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
            />
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
            No warehouses yet. Create one from the Warehouses page to manage stock.
          </div>
          <div className="flex justify-end gap-2">
            <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Update the product stocks">
      <form onSubmit={submit} className="space-y-4">
        <div className="py-2 text-center text-sm font-bold text-slate-800">{product.name}</div>
        {image && (
          <div
            className="h-56 w-full rounded-lg"
            style={{ backgroundImage: `url(${image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
        )}

        {rows.map((w) => (
          <div key={w}>
            <h6 className="mb-2 text-sm font-semibold text-slate-800">{w}</h6>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-center">Current quantity</th>
                    <th className="px-3 py-2 text-center">New quantity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2">
                      <div className="min-w-[100px]">
                        <Input value={String(product.stock)} disabled />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="min-w-[100px]">
                        <Input
                          type="number"
                          min="0"
                          value={quantities[w] ?? ''}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [w]: e.target.value }))}
                          placeholder="New quantity"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update my product stocks'}</Button>
        </div>
      </form>
    </Modal>
  );
}