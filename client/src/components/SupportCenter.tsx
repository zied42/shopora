import { FormEvent, useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, apiPatch, apiPost, SERVICE_TYPES, timeFmt, Ticket } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from './ui';

const STATUS_TONE: Record<string, 'amber' | 'blue' | 'green'> = { open: 'amber', answered: 'blue', closed: 'green' };

export function SupportCenter() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [replyFor, setReplyFor] = useState<Ticket | null>(null);
  const [viewFor, setViewFor] = useState<Ticket | null>(null);
  const isAgent = user?.role === 'admin';
  const unread = tickets.filter((t) => t.status !== 'closed').length;

  const load = () => {
    setLoading(true);
    apiGet<Ticket[]>('/support').then(setTickets).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Support center"
        subtitle={isAgent ? 'Answer tickets from users' : 'Ask a question or report an issue'}
        actions={
          !isAgent && (
            <div className="flex items-center gap-3">
              {unread > 0 && <Badge tone="red">{unread} unread</Badge>}
              <Button onClick={() => setNewOpen(true)}>+ New ticket</Button>
            </div>
          )
        }
      />

      {loading ? (
        <Spinner />
      ) : tickets.length === 0 ? (
        <Card><EmptyState icon="🎧" title="No tickets" hint={isAgent ? 'No user tickets yet.' : 'Create a ticket and our team will help you.'} /></Card>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isAgent ? 'Open' : 'Submitted'}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tickets.filter((t) => t.status === 'open').length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Answered</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tickets.filter((t) => t.status === 'answered').length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Closed</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{tickets.filter((t) => t.status === 'closed').length}</p>
            </div>
          </div>

          {tickets.map((t) => (
            <Card key={t.id} className="overflow-hidden rounded-2xl transition hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge tone="blue">{t.type}</Badge>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  {isAgent && t.status !== 'closed' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" /> awaiting
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{timeFmt(t.created_at)}</span>
              </div>
              <div className="px-5 py-4">
                {isAgent && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                      {(t.user_name || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-700">{t.user_name}</span>
                    <span className="text-slate-400">· {t.user_email}</span>
                    {t.assigned_to_name && <span className="text-slate-400">· assigned to <span className="font-medium text-slate-600">{t.assigned_to_name}</span></span>}
                  </div>
                )}
                <p className="line-clamp-3 text-sm text-slate-600">{t.message}</p>
                {t.answer && isAgent && (
                  <div className="mt-3 rounded-xl border-l-4 border-brand-500 bg-brand-50 p-3">
                    <p className="text-xs font-semibold text-brand-700">Our response</p>
                    <p className="mt-1 text-sm text-slate-700">{t.answer}</p>
                  </div>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  {!isAgent && <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => setViewFor(t)}>View</ButtonGhost>}
                  {!isAgent && t.answer && <Badge tone="blue">answered</Badge>}
                  {isAgent && <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => setReplyFor(t)}>Reply</ButtonGhost>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {newOpen && <NewTicketModal onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); load(); }} />}
      {viewFor && <ViewTicketModal ticket={viewFor} onClose={() => setViewFor(null)} />}
      {replyFor && <ReplyModal ticket={replyFor} onClose={() => setReplyFor(null)} onDone={() => { setReplyFor(null); load(); }} />}
    </div>
  );
}

function NewTicketModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [type, setType] = useState(SERVICE_TYPES[0]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/support', { email, type, message });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New support ticket">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Type of service">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Description"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required /></Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ViewTicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const { user } = useAuth();
  return (
    <Modal open onClose={onClose} title={ticket.type}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>
          <span className="text-xs text-slate-400">{timeFmt(ticket.created_at)}</span>
        </div>
        {user?.role !== 'admin' && ticket.user_name && <p className="text-sm text-slate-600">Sender: <span className="font-medium">{ticket.user_name}</span></p>}
        {ticket.assigned_to_name && <p className="text-sm text-slate-600">Assigned to: <span className="font-medium">{ticket.assigned_to_name}</span></p>}
        {!ticket.user_name && <p className="text-sm text-slate-600">Type of service: <span className="font-medium">{ticket.type}</span></p>}
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-1 text-xs font-semibold text-slate-500">Description</p>
          <p className="text-sm text-slate-700">{ticket.message}</p>
        </div>
        {ticket.answer && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <p className="mb-1 text-xs font-semibold text-brand-700">Our response</p>
            <p className="text-sm text-slate-700">{ticket.answer}</p>
          </div>
        )}
        <div className="flex justify-end">
          <ButtonGhost onClick={onClose}>Close</ButtonGhost>
        </div>
      </div>
    </Modal>
  );
}

function ReplyModal({ ticket, onClose, onDone }: { ticket: Ticket; onClose: () => void; onDone: () => void }) {
  const [answer, setAnswer] = useState(ticket.answer ?? '');
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch(`/support/${ticket.id}`, { answer, status });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Reply — ${ticket.type}`}>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <p className="text-xs font-semibold text-slate-500">{ticket.user_name} · {ticket.email}</p>
        {ticket.message}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Answer"><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} required /></Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Ticket['status'])}>
            <option value="open">Open</option>
            <option value="answered">Answered</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send reply'}</Button>
        </div>
      </form>
    </Modal>
  );
}
