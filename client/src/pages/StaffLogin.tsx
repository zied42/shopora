import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useApiError } from '../context/AuthContext';
import { Button, Field, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';

const STAFF_ROLES = ['admin'];

export default function StaffLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const err = useApiError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password, 'staff');
      if (!STAFF_ROLES.includes(user.role)) {
        logout();
        err(new Error('This login is reserved for the internal team. Please use the customer login.'));
        return;
      }
      navigate('/intro');
    } catch (err2) {
      err(err2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Internal access"
      subtitle="Restricted to SHOPORA team members."
    >
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <span className="h-2 w-2 rounded-full bg-brand-600" />
        Staff portal — authorised personnel only
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" placeholder="staff@shopora.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </AuthShell>
  );
}
