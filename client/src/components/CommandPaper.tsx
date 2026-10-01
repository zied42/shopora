import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { money, Order } from '../lib/api';

/** Printable shipping paper for a commande: destination on the left, QR on the right, sender below, then items + total. */
export function CommandPaper({ order }: { order: Order }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-sm" style={{ maxWidth: 420 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">SHOPORA</p>
          <p className="text-sm font-extrabold">Commande {order.order_number}</p>
          <Barcode value={order.barcode ?? order.order_number} format="CODE128" height={34} width={1.3} margin={0} />
          <p className="mt-0.5 text-[11px] tracking-wider text-slate-500">{order.barcode ?? order.order_number}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <QRCodeCanvas value={order.barcode ?? order.order_number} size={92} />
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Scan to verify</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Deliver to</p>
        <p className="mt-1 text-sm font-bold">{order.customer_name}</p>
        {order.customer_phone && <p className="text-xs text-slate-600">{order.customer_phone}</p>}
        <p className="text-xs text-slate-600">
          {[order.governorate, order.city].filter(Boolean).join(' / ')}
        </p>
        <p className="text-xs text-slate-600">{order.shipping_address}</p>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Sender</span>
          <span className="font-semibold text-slate-800">{order.fournisseur_name}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-slate-500">Placed by</span>
          <span className="font-semibold text-slate-800">{order.dropshipper_name}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-slate-500">CIN card</span>
          <span className="font-semibold text-slate-800">{order.dropshipper_cin ?? '—'}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-slate-500">Payment</span>
          <span className="font-semibold capitalize text-slate-800">{order.payment_method ?? '—'}{order.payment_method === 'cod' ? ' (on delivery)' : ''}</span>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-1.5">Product</th>
              <th className="px-2 py-1.5 text-center">Qty</th>
              <th className="px-3 py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-700">{it.product_name}</td>
                <td className="px-2 py-2 text-center text-slate-600">×{it.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{money(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between bg-slate-900 px-3 py-2 text-white">
          <span className="text-xs font-bold uppercase tracking-wide">Total</span>
          <span className="text-sm font-extrabold">{money(order.total)}</span>
        </div>
      </div>
    </div>
  );
}