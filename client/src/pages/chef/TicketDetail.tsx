import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPatch, ChefTicket, ChefTicketsResult, updateChefTicket, updateStockingTicket, updateSupportTicket } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function Avatar({ name, className = '', img }: { name: string; className?: string; img?: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-brand-100 text-brand-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700'];
  const color = colors[name.length % colors.length];
  if (img) return <img src={img} alt={name} className={`rounded-full object-cover ${className}`} />;
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${color} ${className}`}>{initials}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ChefTicketDetail({ basePath = '/chef/tickets' }: { basePath?: string } = {}) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ChefTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'unresolved' | 'resolved'>('unresolved');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium'>('medium');
  const [sidebarOpen, setSidebarOpen] = useState({ details: true, entities: true, notes: false, labels: true, activity: false, assignees: true });
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateTicket = basePath.includes('/stocking')
    ? updateStockingTicket
    : basePath.includes('/support')
      ? updateSupportTicket
      : updateChefTicket;

  useEffect(() => {
    apiGet<ChefTicketsResult>(basePath)
      .then((d) => {
        const t = d.tickets.find((x) => x.id === Number(id)) ?? null;
        setTicket(t);
        if (t) { setStatus(t.status); setPriority(t.priority); }
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      apiGet<ChefTicketsResult>(basePath)
        .then((d) => {
          const t = d.tickets.find((x) => x.id === Number(id)) ?? null;
          if (t) setTicket(t);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [id, basePath]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [ticket]);

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !ticket) return;
    const msgText = reply.trim();
    const userName = user?.name ?? 'Chef';
    const userOrg = 'SHOPORA Network Service Tunisia - TI460';
    setReply('');
    setSending(true);
    try {
      await apiPatch<ChefTicket>(`/support/${ticket.id}`, { answer: msgText, status });
      const newMsg = { user: userName, org: userOrg, text: msgText, time: new Date().toISOString() };
      setTicket((t) => t ? {
        ...t,
        messages: [...(t.messages ?? []), newMsg],
        last_message: { user: userName, org: userOrg, text: msgText },
        status,
      } : t);
    } catch (err) {
      setReply(msgText);
      alert(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const toggleSection = (key: keyof typeof sidebarOpen) => setSidebarOpen((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-5xl">&#127915;</p>
        <h3 className="mt-3 text-lg font-bold text-slate-900">Ticket not found</h3>
        <p className="mt-1 text-sm text-slate-500">This ticket does not exist.</p>
        <Link to={basePath} className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">&larr; Back to tickets</Link>
      </div>
    );
  }

  const authorName = ticket.author.name;
  const orgName = 'SHOPORA Network Service Tunisia- TI460';
  const isAuthor = user?.name === authorName;
  const isMentioned = isAuthor || (ticket.owners ?? []).some((o) => o.name === user?.name) || ticket.assignees.includes(user?.name ?? '');

  const allMessages = (ticket.messages ?? []).map((m, i) => ({
    id: `msg-${i}`,
    user: m.user,
    org: m.org,
    text: m.text,
    time: m.time,
    type: m.type ?? 'normal' as const,
  }));

  if (allMessages.length === 0) {
    allMessages.push({
      id: 'initial',
      user: authorName,
      org: orgName,
      text: ticket.last_message.text,
      time: ticket.created_at,
      type: 'normal',
    });
  }

  const groupedMessages: { user: string; org: string; messages: typeof allMessages }[] = [];
  allMessages.forEach((m) => {
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.user === m.user) {
      last.messages.push(m);
    } else {
      groupedMessages.push({ user: m.user, org: m.org, messages: [m] });
    }
  });

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:h-[calc(100vh-4rem)] lg:flex-row">
      {/* ── Chat area ── */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b-2 border-slate-200 px-3 py-2 sm:items-center sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to={basePath} className="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <div>
              <h3 className="truncate text-sm font-bold text-slate-900">#{ticket.id} &mdash; {ticket.subject}</h3>
              <p className="text-[11px] text-slate-500">{authorName} &middot; {fmtShortDate(ticket.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
              {ticket.status === 'resolved' ? 'Resolved' : 'Unresolved'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
          <div className="mb-2 text-center">
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">{fmtDate(ticket.created_at)}</span>
          </div>

          {groupedMessages.map((group) => {
            const isFirst = group.messages[0];
            return (
              <div key={isFirst.id} className="mt-3">
                {group.messages.map((m, idx) => (
                  <div key={m.id} className={`chat-row flex ${idx === 0 ? 'mt-3' : 'mt-0'}`}>
                    <div className="flex w-full flex-col px-3 pt-1 pb-0">
                      <div className="flex-1">
                        <div className="w-full max-w-[92%] sm:max-w-[75%]">
                          <div className="flex flex-col items-start">
                            {idx === 0 && (
                              <div className="mb-2 flex items-center">
                                <Avatar name={m.user} className="h-10 w-10 text-xs" />
                                <div className="ml-2 flex flex-col">
                                  <span className="text-[11px] text-slate-500">{m.org}</span>
                                  <span className="text-[11px] font-bold text-slate-900">{m.user}</span>
                                </div>
                              </div>
                            )}
                            <div className="group/row hover-actions-trigger relative flex items-center">
                              <div className="pt-2 ps-1">
                                <ul className="relative mb-0 inline-flex list-none gap-1 text-slate-400 opacity-0 transition group-hover/row:opacity-100">
                                  <li className="cursor-pointer rounded p-1 hover:bg-slate-100 hover:text-brand-600" title="Reply">
                                    <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M205 34.8c11.5 5.1 19 16.6 19 29.2v64H336c97.2 0 176 78.8 176 176c0 113.3-81.5 163.9-100.2 174.1c-2.5 1.4-5.3 1.9-8.1 1.9c-10.9 0-19.7-8.9-19.7-19.7c0-7.5 4.3-14.4 9.8-19.5c9.4-8.8 22.2-26.4 22.2-56.7c0-53-43-96-96-96H224v64c0 12.6-7.4 24.1-19 29.2s-25 3-34.4-5.4l-160-144C3.9 225.7 0 217.1 0 208s3.9-17.7 10.6-23.8l160-144c9.4-8.5 22.9-10.6 34.4-5.4z" /></svg>
                                  </li>
                                </ul>
                              </div>
                              <div className="w-full flex-grow-1">
                                {m.type === 'resolution_request' ? (
                                  <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                                      <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" /></svg>
                                      Resolution request
                                    </div>
                                    <p className="mb-0 text-sm text-slate-700">{m.text}</p>
                                    <div className="mt-1 text-right text-[10px] text-slate-400">
                                      <span>{fmtTime(m.time)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`relative rounded-3xl border border-slate-200 bg-slate-50 p-2 ${idx > 0 ? 'chat-bubble-grouped-prev mt-0' : 'mt-2'}`}>
                                    <div className="flex items-center">
                                      <p className="mb-0 text-sm text-slate-800">{m.text}</p>
                                    </div>
                                    <div className="chat-meta text-right text-[10px] text-slate-400">
                                      <span>{fmtTime(m.time)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Reply area */}
        <form onSubmit={submitReply} className="border-t border-slate-200 p-3 pt-0">
          <div className="pt-2">
            <div className="relative">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your message"
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                style={{ minHeight: 63, maxHeight: 160 }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white text-slate-300 shadow-sm transition hover:bg-slate-50" title="Formatting">
                <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M373.5 27.1C388.5 9.9 410.2 0 433 0c43.6 0 79 35.4 79 79c0 22.8-9.9 44.6-27.1 59.6L277.7 319l-10.3-10.3-64-64L193 234.3 373.5 27.1zM170.3 256.9l10.4 10.4 64 64 10.4 10.4-19.2 83.4c-3.9 17.1-16.9 30.7-33.8 35.4L24.4 510.3l95.4-95.4c2.6.7 5.4 1.1 8.3 1.1c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32c0 2.9.4 5.6 1.1 8.3L1.7 487.6 51.5 310c4.7-16.9 18.3-29.9 35.4-33.8l83.4-19.2z" /></svg>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white text-slate-300 shadow-sm transition hover:bg-slate-50" title="Attach">
                <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M396.2 83.8c-24.4-24.4-64-24.4-88.4 0l-184 184c-42.1 42.1-42.1 110.3 0 152.4s110.3 42.1 152.4 0l152-152c10.9-10.9 28.7-10.9 39.6 0s10.9 28.7 0 39.6l-152 152c-64 64-167.6 64-231.6 0s-64-167.6 0-231.6l184-184c46.3-46.3 121.3-46.3 167.6 0s46.3 121.3 0 167.6l-176 176c-28.6 28.6-75 28.6-103.6 0s-28.6-75 0-103.6l144-144c10.9-10.9 28.7-10.9 39.6 0s10.9 28.7 0 39.6l-144 144c-6.7 6.7-6.7 17.7 0 24.4s17.7 6.7 24.4 0l176-176c24.4-24.4 24.4-64 0-88.4z" /></svg>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white text-emerald-500 shadow-sm transition hover:bg-slate-50" title="Voice">
                <svg width="14" height="14" viewBox="0 0 384 512" fill="currentColor"><path d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z" /></svg>
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white text-brand-500 shadow-sm transition hover:bg-slate-50" title="Screen record">
                <svg width="14" height="14" viewBox="0 0 576 512" fill="currentColor"><path d="M64 0C28.7 0 0 28.7 0 64V352c0 35.3 28.7 64 64 64H240l-10.7 32H160c-17.7 0-32 14.3-32 32s14.3 32 32 32H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H346.7L336 416H512c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zM512 64V288H64V64H512z" /></svg>
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:ms-auto">
                <label className="flex items-center gap-1 text-[11px] text-slate-500">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Enter to send
                </label>
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor"><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L277.3 424.9l-40.1 74.5c-5.2 9.7-16.3 14.6-27 11.9S192 499 192 488V392c0-5.3 1.8-10.5 5.1-14.7L362.4 164.7c2.5-7.1-6.5-14.3-13-8.4L170.4 318.2l-32 28.9 0 0c-9.2 8.3-22.3 10.6-33.8 5.8l-85-35.4C8.4 312.8.8 302.2.1 290s5.5-23.7 16.1-29.8l448-256c10.7-6.1 23.9-5.5 34 1.4z" /></svg>
                  Send
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white lg:w-80 lg:border-l lg:border-t-0">
        {/* Next Ticket */}
        <div className="border-b border-slate-200 p-3">
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            Next Ticket
            <svg width="12" height="12" viewBox="0 0 384 512" fill="currentColor"><path d="M342.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L274.7 256 105.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" /></svg>
          </button>
        </div>

        {/* Details */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('details')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" className="text-slate-400"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z" /></svg>
              Details
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.details ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.details && (
            <div className="px-3 pb-3">
              <div className="mb-3 flex items-center justify-center gap-2">
                <div className="rounded-full border-2 border-amber-400 p-[2px]">
                  <Avatar name={authorName} className="h-10 w-10 text-xs" />
                </div>
                <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">Internal Ticket</span>
                <div className="flex items-center gap-1">
                  {(ticket.owners ?? []).slice(0, 2).map((o) => (
                    <div key={o.name} className="rounded-full border-2 border-slate-200 p-[2px]">
                      <Avatar name={o.name} className="h-10 w-10 text-xs" />
                    </div>
                  ))}
                </div>
              </div>

              {[
                { label: 'Subject', value: <span className="text-xs font-medium text-slate-800">{ticket.subject}</span> },
                { label: 'Type', value: <span className="text-xs font-bold text-brand-600">{ticket.type}</span> },
                { label: 'Created', value: <span className="text-xs text-slate-600">{fmtShortDate(ticket.created_at)}</span> },
                { label: 'Status', value: (
                  <select value={status} onChange={(e) => {
                    if (!isAuthor) return;
                    const v = e.target.value as 'unresolved' | 'resolved';
                    setStatus(v);
                    setTicket((t) => t ? { ...t, status: v } : t);
                    if (ticket) updateTicket(ticket.id, { status: v }).catch(() => {});
                  }} disabled={!isAuthor} className={`cursor-pointer border-0 bg-transparent text-xs font-medium outline-none ${isAuthor ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                  </select>
                )},
                { label: 'Priority', value: (
                  <select value={priority} onChange={(e) => {
                    const v = e.target.value as 'urgent' | 'high' | 'medium';
                    setPriority(v);
                    setTicket((t) => t ? { ...t, priority: v } : t);
                    if (ticket) updateTicket(ticket.id, { priority: v }).catch(() => {});
                  }} className="cursor-pointer border-0 bg-transparent text-xs font-medium text-brand-600 outline-none">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                )},
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between py-2">
                  <span className="w-24 shrink-0 text-[11px] text-slate-500">{label}</span>
                  <div className="flex flex-grow-1 items-center justify-end gap-1">{value}</div>
                </div>
              ))}

              {!isAuthor && isMentioned && ticket.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={async () => {
                    const msgText = `@${authorName} This request has been handled on my end. Please mark it as resolved if your issue is resolved.`;
                    const userName = user?.name ?? 'Staff';
                    const userOrg = 'SHOPORA Network Service Tunisia- TI460';
                    try {
                      await apiPatch<ChefTicket>(`/support/${ticket.id}`, { answer: msgText, status: ticket.status, msg_type: 'resolution_request' });
                      const newMsg = { user: userName, org: userOrg, text: msgText, time: new Date().toISOString(), type: 'resolution_request' as const };
                      setTicket((t) => t ? {
                        ...t,
                        messages: [...(t.messages ?? []), newMsg],
                        last_message: { user: userName, org: userOrg, text: msgText },
                      } : t);
                    } catch (err) {
                      alert(apiErrorMessage(err));
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                >
                  Request resolution
                </button>
              )}
            </div>
          )}
        </div>

        {/* Related Entities */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('entities')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor" className="text-slate-400"><path d="M50.7 58.5L0 160H208V32H93.7C75.5 32 58.9 42.3 50.7 58.5zM240 160H448L397.3 58.5C389.1 42.3 372.5 32 354.3 32H240V160zm208 32H0V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V192z" /></svg>
              Related Entities
              {ticket.related_to && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">1</span>}
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.entities ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.entities && (
            <div className="px-3 pb-2">
              {ticket.related_to ? (
                <div className="rounded border border-slate-200 bg-white p-2">
                  <span className="text-xs font-medium text-slate-800">{ticket.related_to}</span>
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-400">No related entities</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('notes')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor" className="text-slate-400"><path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H290.7c17 0 33.3-6.7 45.3-18.7L429.3 368c12-12 18.7-28.3 18.7-45.3V96c0-35.3-28.7-64-64-64H64zm0 64H384V320H320c-17.7 0-32 14.3-32 32v64H64V96z" /></svg>
              Notes
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.notes ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.notes && (
            <div className="px-3 pb-2">
              <button type="button" className="text-xs text-brand-600 hover:underline">+ Add note</button>
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('labels')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" className="text-slate-400"><path d="M345 39.1L472.8 168.4c52.4 53 52.4 138.2 0 191.2L360.8 472.9c-9.3 9.4-24.5 9.5-33.9.2s-9.5-24.5-.2-33.9L438.6 325.9c33.9-34.3 33.9-89.4 0-123.7L310.9 72.9c-9.3-9.4-9.2-24.6.2-33.9s24.6-9.2 33.9.2zM0 229.5V80C0 53.5 21.5 32 48 32H197.5c17 0 33.3 6.7 45.3 18.7l168 168c25 25 25 65.5 0 90.5L277.3 442.7c-25 25-65.5 25-90.5 0l-168-168C6.7 262.7 0 246.5 0 229.5zM144 144c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32z" /></svg>
              Labels
              {ticket.labels.length > 0 && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">{ticket.labels.length}</span>}
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.labels ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.labels && (
            <div className="px-3 pb-2">
              {ticket.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {ticket.labels.map((l) => (
                    <span key={l} className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">{l}</span>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-400">No labels</p>
              )}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('activity')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" className="text-slate-400"><path d="M75 75L41 41C25.9 25.9 0 36.6 0 57.9V168c0 13.3 10.7 24 24 24H134.1c21.4 0 32.1-25.9 17-41l-30.8-30.8C155 85.5 203 64 256 64c106 0 192 86 192 192s-86 192-192 192c-40.8 0-78.6-12.7-109.7-34.4c-14.5-10.1-34.4-6.6-44.6 7.9s-6.6 34.4 7.9 44.6C151.2 495 201.7 512 256 512c141.4 0 256-114.6 256-256S397.4 0 256 0C185.3 0 121.3 28.7 75 75zm181 53c-13.3 0-24 10.7-24 24V256c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65V152c0-13.3-10.7-24-24-24z" /></svg>
              Activity
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.activity ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.activity && (
            <div className="px-3 pb-2">
              <div className="py-2 text-center text-[11px] text-slate-400">No activity yet</div>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggleSection('assignees')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <svg width="14" height="14" viewBox="0 0 640 512" fill="currentColor" className="text-slate-400"><path d="M144 160c-44.2 0-80-35.8-80-80S99.8 0 144 0s80 35.8 80 80s-35.8 80-80 80zm368 0c-44.2 0-80-35.8-80-80s35.8-80 80-80s80 35.8 80 80s-35.8 80-80 80zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2.4-.4.7-.7 1H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2-.4-.4-.7-.7-1c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM416 224c0 53-43 96-96 96s-96-43-96-96s43-96 96-96s96 43 96 96zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z" /></svg>
              Assignees
            </span>
            <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" className={`text-slate-400 transition ${sidebarOpen.assignees ? '' : 'rotate-180'}`}><path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
          </button>
          {sidebarOpen.assignees && (
            <div className="px-3 pb-2">
              {/* Author */}
              <div className="flex items-start justify-between border-b border-slate-100 py-2">
                <div className="flex items-start gap-2">
                  <div className="rounded-full border-2 border-amber-400 p-[2px]">
                    <Avatar name={authorName} className="h-8 w-8 text-[10px]" />
                  </div>
                  <span className="text-xs font-medium text-slate-800">{authorName}</span>
                </div>
                <span className="flex items-center gap-1 rounded-full border border-amber-200/50 bg-amber-50/60 px-2" style={{ height: 22 }}>
                  <svg width="8" height="8" viewBox="0 0 512 512" fill="currentColor" className="text-amber-500"><path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" /></svg>
                  <span className="font-medium text-amber-500" style={{ fontSize: 10 }}>Author</span>
                </span>
              </div>
              {/* Owners */}
              {(ticket.owners ?? []).map((o) => (
                <div key={o.name} className="flex items-start justify-between border-b border-slate-100 py-2">
                  <div className="flex items-start gap-2">
                    <div className="rounded-full p-[2px]" style={{ border: '2px solid transparent' }}>
                      <Avatar name={o.name} className="h-8 w-8 text-[10px]" />
                    </div>
                    <span className="text-xs font-medium text-slate-800">{o.name}</span>
                  </div>
                  <span className="flex items-center gap-1 rounded-full border border-slate-200/50 bg-slate-50/60 px-2" style={{ height: 22 }}>
                    <svg width="8" height="8" viewBox="0 0 576 512" fill="currentColor" className="text-brand-600"><path d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z" /></svg>
                    <span className="font-medium text-brand-600" style={{ fontSize: 10 }}>Owner</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
