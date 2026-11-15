import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeadsOptions, LeadSource, LeadsOptions, LeadType } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { CheckIcon, SearchIcon } from './ui';

const SOURCES: { value: LeadSource | ''; label: string }[] = [
  { value: '', label: '--- Select ---' },
  { value: 'manual', label: 'Manual' },
  { value: 'import', label: 'Import' },
  { value: 'referral', label: 'Referral' },
  { value: 'organic', label: 'Organic' },
  { value: 'paid', label: 'Paid' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'directory', label: 'Directory' },
  { value: 'event', label: 'Event' },
  { value: 'competition_data', label: 'Competition Data' },
  { value: 'other', label: 'Other' },
];

const TYPES: { value: LeadType | ''; label: string }[] = [
  { value: '', label: '--- Select ---' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'retailer_supplier', label: 'Retailer & Supplier' },
];

function PhoneField({
  countries,
  dial,
  number,
  onDial,
  onNumber,
}: {
  countries: { id: number; name: string; dial: string; code: string }[];
  dial: string;
  number: string;
  onDial: (d: string) => void;
  onNumber: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = countries.find((c) => c.dial === dial) ?? countries[0];
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="flex items-center gap-2">
      <div ref={ref} className="relative w-32">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500"
        >
          <span className="flex items-center gap-1.5">
            <span className="font-bold">{sel?.code ?? 'TN'}</span>
            <span className="text-slate-500">{sel?.dial}</span>
          </span>
          <span className="text-[9px] text-slate-400">▼</span>
        </button>
        {open && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {countries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onDial(c.dial);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition hover:bg-slate-50 ${sel?.code === c.code ? 'font-semibold text-brand-700' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-bold">{c.code}</span>
                  <span className="text-slate-500">{c.dial}</span>
                </span>
                {sel?.code === c.code && <CheckIcon className="shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        inputMode="tel"
        value={number}
        onChange={(e) => onNumber(e.target.value)}
        placeholder="Number"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500"
      />
    </div>
  );
}

function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { id: number; name: string }[];
  value: { id: number; name: string } | null;
  onChange: (v: { id: number; name: string } | null) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-800 outline-none transition focus:border-brand-500"
      >
        <span className={value ? '' : 'text-slate-400'}>{value ? value.name : placeholder}</span>
        <span className="text-[9px] text-slate-400">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search..."
              className="w-full bg-slate-50/70 py-2 pl-8 pr-2 text-xs text-slate-700 outline-none focus:bg-white"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                  setQ('');
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition hover:bg-slate-50 ${value?.id === o.id ? 'font-semibold text-brand-700' : 'text-slate-700'}`}
              >
                {o.name}
                {value?.id === o.id && <CheckIcon className="shrink-0 text-brand-600" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChefLeadCreate() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<LeadsOptions | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [dial, setDial] = useState('+216');
  const [phone, setPhone] = useState('');
  const [dial2, setDial2] = useState('+216');
  const [phone2, setPhone2] = useState('');
  const [dial3, setDial3] = useState('+216');
  const [phone3, setPhone3] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [type, setType] = useState<LeadType | ''>('');
  const [link, setLink] = useState('');
  const [link2, setLink2] = useState('');
  const [link3, setLink3] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState<{ id: number; name: string } | null>(null);
  const [location, setLocation] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    getLeadsOptions()
      .then((o) => {
        setOptions(o);
        setCountry({ id: 227, name: 'Tunisia' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const valid = name.trim().length > 0 && phone.length >= 6;

  const submit = () => {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      phone: `${dial}${phone}`,
      phone2: phone2 ? `${dial2}${phone2}` : null,
      phone3: phone3 ? `${dial3}${phone3}` : null,
      email: email.trim() || null,
      source: source || 'manual',
      potential_type: type || 'unknown',
      link: link.trim() || null,
      link2: link2.trim() || null,
      link3: link3.trim() || null,
      description: description.trim() || null,
      country_id: country?.id ?? 227,
      location: location?.name ?? null,
    };
    console.log('Create lead', payload);
    alert('Lead created (fixture — no persistence)');
    navigate('/chef/leads/list');
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500';
  const labelCls = 'mb-1 block text-xs font-semibold text-slate-700';

  if (loading || !options) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const locationOptions = (options.locations ?? []).map((l, i) => ({ id: i, name: l }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h5 className="mb-0 text-base font-bold text-slate-900">Create Lead</h5>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="p-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>
              Name <span className="text-rose-500">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mohamed yassine walha" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>
              Phone <span className="text-rose-500">*</span>
            </label>
            <PhoneField countries={options.countries} dial={dial} number={phone} onDial={setDial} onNumber={setPhone} />
            <input type="hidden" name="phone" value={`${dial}${phone}`} />
          </div>
          <div>
            <label className={labelCls}>Phone 2</label>
            <PhoneField countries={options.countries} dial={dial2} number={phone2} onDial={setDial2} onNumber={setPhone2} />
            <input type="hidden" name="phone2" value={phone2 ? `${dial2}${phone2}` : ''} />
          </div>
          <div>
            <label className={labelCls}>Phone 3</label>
            <PhoneField countries={options.countries} dial={dial3} number={phone3} onDial={setDial3} onNumber={setPhone3} />
            <input type="hidden" name="phone3" value={phone3 ? `${dial3}${phone3}` : ''} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. contact@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Acquisition Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource | '')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500"
            >
              {SOURCES.map((s) => (
                <option key={s.value || 'empty'} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Potential Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeadType | '')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500"
            >
              {TYPES.map((t) => (
                <option key={t.value || 'empty'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Link</label>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Link 2</label>
            <input type="url" value={link2} onChange={(e) => setLink2(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Link 3</label>
            <input type="url" value={link3} onChange={(e) => setLink3(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <SearchSelect
              options={options.countries.map((c) => ({ id: c.id, name: c.name }))}
              value={country}
              onChange={setCountry}
              placeholder="Select country..."
            />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <SearchSelect options={locationOptions} value={location} onChange={setLocation} placeholder="Type to search..." />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Write a description..." className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/chef/leads/list')}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-sm leading-none">+</span>
            Create Lead
          </button>
        </div>
      </form>
    </div>
  );
}