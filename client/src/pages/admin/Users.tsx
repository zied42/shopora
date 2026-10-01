import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiErrorMessage, apiGet, apiPatch, apiPost, AuthUser } from '../../lib/api';
import { Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet<AuthUser[]>('/users').then(setUsers).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changeRole = async (id: number, role: string) => {
    try {
      await apiPatch(`/users/${id}`, { role });
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await apiDelete(`/users/${id}`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="User management" subtitle="Create accounts, assign roles and permissions" actions={<Button onClick={() => setAddOpen(true)}>+ Add user</Button>} />

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Card><EmptyState icon="👥" title="No users" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">User</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Cin Card</th>
                <th className="px-3 py-3">Role / permissions</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">{u.name.slice(0, 1)}</div>
                      <span className="font-semibold text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{u.email}</td>
                  <td className="px-3 py-3 text-slate-500">{u.cin ? u.cin : '—'}</td>
                  <td className="px-3 py-3">
                    <Select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="w-40">
                      <option value="admin">Admin</option>
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                    </Select>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <ButtonGhost className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50" onClick={() => remove(u.id, u.name)}>Delete</ButtonGhost>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [cin, setCin] = useState('');
  const [role, setRole] = useState('customer');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/users', { name, email, password, role, cin: cin.trim() || null });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add user">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Cin Card"><Input value={cin} onChange={(e) => setCin(e.target.value)} placeholder="e.g. 04678123" /></Field>
        <Field label="Password"><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="seller">Seller</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create user'}</Button>
        </div>
      </form>
    </Modal>
  );
}
