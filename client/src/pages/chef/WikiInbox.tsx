import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPatch, timeFmt, Ticket } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, Textarea } from '../../components/ui';

const STATUS_TONE: Record<string, 'amber' | 'blue' | 'green'> = { open: 'amber', answered: 'blue', closed: 'green' };

const PRODUCT_RE = /^\[Product #(\d+): (.+?)\]\s*/;

function parseProductRef(message: string): { id: number; name: string; rest: string } | null {
  const m = message.match(PRODUCT_RE);
  return m ? { id: Number(m[1]), name: m[2], rest: message.slice(m[0].length) } : null;
}

function TicketMessage({ message }: { message: string }) {
  const ref = parseProductRef(message);
  if (!ref) return <p className="mt-2 line-clamp-3 text-sm text-slate-600">{message}</p>;
  return (
    <div className="mt-2 space-y-1">
      <Link to={`/chef/products/${ref.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100">
        📦 {ref.name}
      </Link>
      {ref.rest && <p className="line-clamp-3 text-sm text-slate-600">{ref.rest}</p>}
    </div>
  );
}

export default function WikiInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState<Ticket | null>(null);
  const unread = tickets.filter((t) => t.status !== 'closed').length;

  const load = () => {
    setLoading(true);
    apiGet<Ticket[]>('/support').then(setTickets).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="My Inbox"
        subtitle="Tickets assigned to you as account manager"
        actions={unread > 0 ? <Badge tone="red">{unread} open</Badge> : undefined}
      />

      {loading ? (
        <Spinner />
      ) : tickets.length === 0 ? (
        <Card><EmptyState icon="📭" title="No tickets" hint="No tickets are currently assigned to you." /></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{t.type}</span>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                </div>
                <span className="text-xs text-slate-400">{timeFmt(t.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.user_name} · {t.user_email}</p>
              <TicketMessage message={t.message} />
              {t.answer && (
                <div className="mt-3 rounded-lg border-l-4 border-brand-500 bg-brand-50 p-3">
                  <p className="text-xs font-semibold text-brand-700">Your response</p>
                  <p className="mt-1 text-sm text-slate-700">{t.answer}</p>
                </div>
              )}
              <div className="mt-3 flex justify-end gap-2">
                {t.status !== 'closed' && <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => setReplyFor(t)}>Reply</ButtonGhost>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {replyFor && <ReplyModal ticket={replyFor} onClose={() => setReplyFor(null)} onDone={() => { setReplyFor(null); load(); }} />}
    </div>
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

  const ref = parseProductRef(ticket.message);

  return (
    <Modal open onClose={onClose} title={`Reply — ${ticket.type}`}>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <p className="text-xs font-semibold text-slate-500">{ticket.user_name} · {ticket.email}</p>
        {ref && (
          <Link to={`/chef/products/${ref.id}`} className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100">
            📦 {ref.name}
          </Link>
        )}
        <p className={ref ? 'mt-1' : ''}>{ref ? ref.rest : ticket.message}</p>
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
