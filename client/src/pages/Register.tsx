import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useApiError } from '../context/AuthContext';
import { Button, Field, Input, Select } from '../components/ui';
import AuthShell from '../components/AuthShell';

const KNOWS_OPTIONS = [
  { value: 'creative', label: 'Creative design' },
  { value: 'roas', label: 'ROAS optimization' },
  { value: 'landing_page', label: 'Landing pages' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const err = useApiError();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [intent, setIntent] = useState('');
  const [commitment, setCommitment] = useState('');
  const [budget, setBudget] = useState('');
  const [knows, setKnows] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleKnows = (v: string) => {
    setKnows((prev) => (prev.includes(v) ? prev.filter((k) => k !== v) : [...prev, v]));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const questionnaire = [
        intent ? `intent:${intent}` : '',
        commitment ? `commitment:${commitment}` : '',
        budget ? `budget:${budget}` : '',
        ...knows.map((k) => `knows:${k}`),
      ].filter(Boolean);
      const extra =
        role === 'customer'
          ? {
              shop_name: shopName.trim() || undefined,
              phone: phone.trim() || undefined,
              questionnaire,
            }
          : undefined;
      await register(name, email, password, role, extra);
      navigate('/intro');
    } catch (err2) {
      err(err2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create an account" subtitle="Join the platform as a customer or seller.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </Field>
        <Field label="I am a...">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="customer">Customer</option>
          <option value="seller">Seller</option>
          </Select>
        </Field>

        {role === 'customer' && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tell us about your store (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Store name">
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="My Store" />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 ..." />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="What do you want to do?">
                <Select value={intent} onChange={(e) => setIntent(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="dropshipping">Dropshipping</option>
                  <option value="marketplace">Sell on the marketplace</option>
                  <option value="both">Both</option>
                </Select>
              </Field>
              <Field label="Time commitment">
                <Select value={commitment} onChange={(e) => setCommitment(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="<10h">Less than 10h/week</option>
                  <option value="20-30h">20–30h/week</option>
                  <option value="30h+">Full time (30h+)</option>
                </Select>
              </Field>
            </div>
            <Field label="Monthly ad budget">
              <Select value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Select...</option>
                <option value="<300">Less than 300 TND</option>
                <option value="300-1000">300 – 1000 TND</option>
                <option value="1000+">More than 1000 TND</option>
              </Select>
            </Field>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">What do you know? (optional)</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {KNOWS_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={knows.includes(o.value)}
                      onChange={() => toggleKnows(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
