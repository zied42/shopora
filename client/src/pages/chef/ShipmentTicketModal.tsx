import { useState } from 'react';
import { XmarkIcon } from './ui';

const TICKET_TYPES = [
  { value: 'delivery_delay', label: 'Delivery delay' },
  { value: 'price_change', label: 'Change shipment price' },
  { value: 'address_change', label: 'Change customer address' },
  { value: 'phone_change', label: 'Change phone number' },
  { value: 'postpone_delivery_date', label: 'Postpone Delivery Date' },
  { value: 'cancel_shipment', label: 'Cancel Shipment' },
  { value: 'confirmation_service_access_request', label: 'Confirmation access request' },
  { value: 'dropshipping_eligibility_request', label: 'Dropshipping eligibility request' },
  { value: 'other', label: 'Other' },
];

export default function ShipmentTicketModal({ gid, onClose }: { shipmentId: number; gid: string; onClose: () => void }) {
  const [type, setType] = useState('');
  const [preview, setPreview] = useState(false);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h6 className="mb-0 text-sm font-bold text-slate-900">Create a ticket for shipment #{Number(gid)}</h6>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <div className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (type) setPreview(true);
            }}
          >
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold text-slate-800">
                Type <span className="text-rose-600">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPreview(false);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500"
              >
                <option value="">Select a type</option>
                {TICKET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {preview && type && (
              <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">Ticket preview</p>
                <p className="mb-0.5">
                  Shipment: <span className="font-semibold">#{gid}</span>
                </p>
                <p className="mb-0.5">
                  Type: <span className="font-semibold">{TICKET_TYPES.find((t) => t.value === type)?.label ?? type}</span>
                </p>
                <p className="mb-0 text-slate-500">A new ticket will be opened for this shipment once submitted.</p>
              </div>
            )}
          </form>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              Preview ticket data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}