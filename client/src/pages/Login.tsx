import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useApiError } from '../context/AuthContext';
import { Button, Field, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';

const FRONT_ROLES = ['customer', 'seller'];

export default function Login() {
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
      const user = await login(email, password, 'front');
      if (!FRONT_ROLES.includes(user.role)) {
        logout();
        err(new Error('This login is reserved for customers and sellers. Please use the admin login.'));
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
      title="Welcome back"
      subtitle="Sign in as a dropshipper or fournisseur to manage your business on one platform."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" placeholder="enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        No account? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create one</Link>
      </p>
    </AuthShell>
  );
}
