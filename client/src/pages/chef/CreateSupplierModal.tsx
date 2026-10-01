import { FormEvent, useState } from 'react';
import { apiErrorMessage, chefOrgApi, supportOrgApi } from '../../lib/api';
import { XmarkIcon } from './ui';

interface Props {
  base?: 'chef' | 'support';
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white';
const labelCls = 'mb-1 block text-[11px] font-semibold text-slate-600';

export default function CreateSupplierModal({ base = 'chef', onClose, onCreated }: Props) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [form, setForm] = useState({
    company_name: '',
    tax_id: '',
    company_description: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.company_name.trim()) return setError('Company name is required');
    if (!form.tax_id.trim()) return setError('Tax Id is required');
    if (!form.first_name.trim() || !form.last_name.trim()) return setError('Owner name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('A valid email is required');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm_password) return setError('Passwords do not match');
    setSaving(true);
    try {
      await api.createSupplierOrganization({
        company_name: form.company_name.trim(),
        tax_id: form.tax_id.trim(),
        company_description: form.company_description.trim() || null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl" noValidate>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Create Supplier</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Company Name *</label>
            <input value={form.company_name} onChange={set('company_name')} placeholder="Company name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tax Id *</label>
            <input value={form.tax_id} onChange={set('tax_id')} placeholder="Tax Id" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Company Description</label>
            <textarea value={form.company_description} onChange={set('company_description')} rows={3} placeholder="Short description of the company" className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>First Name *</label>
            <input value={form.first_name} onChange={set('first_name')} placeholder="First name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input value={form.last_name} onChange={set('last_name')} placeholder="Last name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Number</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500">+216</span>
              <input value={form.phone} onChange={set('phone')} placeholder="XX XXX XXX" className={`${inputCls} rounded-l-none`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Password *</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirm Password *</label>
            <input type="password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="••••••••" className={inputCls} />
          </div>
        </div>
        {error && (
          <div className="mx-4 mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
}
