import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useApiError } from '../context/AuthContext';
import { Button, Field, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const err = useApiError();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (error) {
      err(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create an account" subtitle="Create a customer account to shop on Shopora.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" /></Field>
        <p className="text-xs text-slate-500">Use at least 12 characters.</p>
        <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
