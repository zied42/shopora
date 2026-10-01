import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { apiErrorMessage, apiGet, apiPost, ChatMessage, Conversation, timeFmt } from '../../lib/api';
import { AppFooter, Badge, Button, Modal, Spinner, TablePagination } from '../../components/ui';

export default function ChatThreads() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showFields, setShowFields] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({
    created_by: true,
    related_to: true,
    created_at: true,
    last_message: true,
    subject: false,
    toolbar: true,
  });

  const FIELDS: { key: string; label: string }[] = [
    { key: 'created_by', label: 'Created by' },
    { key: 'related_to', label: 'Related to' },
    { key: 'created_at', label: 'Created at' },
    { key: 'last_message', label: 'Last message' },
    { key: 'subject', label: 'Subject' },
    { key: 'toolbar', label: 'Toolbar' },
  ];
  const cols = FIELDS.filter((f) => visible[f.key]);

  const toggleField = (key: string) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const cell = (c: Conversation, key: string) => {
    switch (key) {
      case 'created_by':
        return <td className="px-5 py-3 font-medium text-slate-800">{c.last_message?.sender_name ?? '—'}</td>;
      case 'related_to':
        return (
          <td className="px-3 py-3 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-base">{c.type === 'team' ? '👥' : c.title.startsWith('Chat with') ? '🏭' : '👤'}</span>
              {c.title}
              {c.unread > 0 && <Badge tone="red">{c.unread}</Badge>}
            </div>
          </td>
        );
      case 'last_message':
        return (
          <td className="max-w-[220px] truncate px-3 py-3 text-slate-500">
            {c.last_message ? `${c.last_message.image_url ? '🖼️ ' : ''}${c.last_message.body || 'image'}` : 'No messages yet'}
          </td>
        );
      case 'created_at':
        return <td className="px-3 py-3 text-slate-500">{c.last_message ? timeFmt(c.last_message.created_at) : '—'}</td>;
      case 'subject':
        return <td className="px-3 py-3 text-slate-400">—</td>;
      case 'toolbar':
        return (
          <td className="px-5 py-3 text-right">
            <button
              onClick={() => void openThread(c)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open
            </button>
          </td>
        );
      default:
        return null;
    }
  };

  const load = () => {
    setLoading(true);
    apiGet<Conversation[]>('/chat/conversations')
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (activeRef.current == null) load();
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => {
      const last = c.last_message?.body ?? '';
      return c.title.toLowerCase().includes(q) || c.last_message?.sender_name.toLowerCase().includes(q) || last.toLowerCase().includes(q);
    });
  }, [rows, query]);

  const total = filtered.length;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize))));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openThread = async (c: Conversation) => {
    setActive(c);
    setBody('');
    setMsgLoading(true);
    try {
      const msgs = await apiGet<ChatMessage[]>(`/chat/${c.id}/messages`);
      setMessages(msgs);
      await apiPost(`/chat/${c.id}/read`, {});
      setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, unread: 0 } : r)));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setMsgLoading(false);
    }
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!active || !body.trim()) return;
    setSending(true);
    try {
      const msg = await apiPost<ChatMessage>(`/chat/${active.id}/messages`, { body: body.trim() });
      setMessages((m) => [...m, msg]);
      setBody('');
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const activeRef = useRef<number | null>(null);
  activeRef.current = active?.id ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, msgLoading]);

  useEffect(() => {
    if (!active) return;
    const iv = setInterval(async () => {
      if (activeRef.current == null) return;
      try {
        const msgs = await apiGet<ChatMessage[]>(`/chat/${activeRef.current}/messages`);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Chat Threads</h5>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-52 rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <svg className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 512 512" fill="currentColor">
                <path d="M500.3 443.7l-119.7-119.7c27.22-40.41 40.65-90.9 33.46-144.7C401.8 87.79 326.8 13.32 235.2 1.723 99.01-15.51-15.51 99.01 1.724 235.2c11.6 91.64 86.08 166.7 177.6 178.9 53.8 7.189 104.3-6.236 144.7-33.46l119.7 119.7c15.62 15.62 40.95 15.62 56.57 0C515.9 484.7 515.9 459.3 500.3 443.7zM79.1 208c0-70.58 57.42-128 128-128s128 57.42 128 128c0 70.58-57.42 128-128 128S79.1 278.6 79.1 208z" />
              </svg>
            </div>
            <div className="relative">
              <button
                type="button"
                title="Filter"
                onClick={() => setShowFields((v) => !v)}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M0 416C0 398.3 14.33 384 32 384H86.66C99 355.7 127.2 336 160 336C192.8 336 220.1 355.7 233.3 384H480C497.7 384 512 398.3 512 416C512 433.7 497.7 448 480 448H233.3C220.1 476.3 192.8 496 160 496C127.2 496 99 476.3 86.66 448H32C14.33 448 0 433.7 0 416V416zM160 384C142.3 384 128 398.3 128 416C128 433.7 142.3 448 160 448C177.7 448 192 433.7 192 416C192 398.3 177.7 384 160 384zM352 176C384.8 176 412.1 195.7 425.3 224H480C497.7 224 512 238.3 512 256C512 273.7 497.7 288 480 288H425.3C412.1 316.3 384.8 336 352 336C319.2 336 291 316.3 278.7 288H32C14.33 288 0 273.7 0 256C0 238.3 14.33 224 32 224H278.7C291 195.7 319.2 176 352 176zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288C369.7 288 384 273.7 384 256C384 238.3 369.7 224 352 224zM480 64C497.7 64 512 78.33 512 96C512 113.7 497.7 128 480 128H265.3C252.1 156.3 224.8 176 192 176C159.2 176 131 156.3 118.7 128H32C14.33 128 0 113.7 0 96C0 78.33 14.33 64 32 64H118.7C131 35.75 159.2 16 192 16C224.8 16 252.1 35.75 265.3 64H480zM192 128C209.7 128 224 113.7 224 96C224 78.33 209.7 64 192 64C174.3 64 160 78.33 160 96C160 113.7 174.3 128 192 128z" />
                </svg>
              </button>
              {showFields && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFields(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <p className="border-b border-slate-200 px-3 pb-2 pt-1 text-center text-xs font-bold text-slate-600">Showing fields</p>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {FIELDS.map((f) => (
                        <label key={f.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                          <input type="checkbox" checked={!!visible[f.key]} onChange={() => toggleField(f.key)} className="h-4 w-4 accent-brand-600" />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {cols.map((f) => (
                  <th key={f.key} className={f.key === 'created_by' || f.key === 'toolbar' ? 'px-5 py-3' : 'px-3 py-3'} {...(f.key === 'toolbar' ? { style: { textAlign: 'right' } } : {})}>
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={cols.length} className="py-10 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length}>
                    <div className="flex h-24 items-center justify-center text-sm text-slate-400">No results found</div>
                  </td>
                </tr>
              ) : (
                pageRows.map((c) => <tr key={c.id} className="hover:bg-slate-50/60">{cols.map((f) => cell(c, f.key))}</tr>)
              )}
            </tbody>
          </table>
        </div>

        <TablePagination count={total} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>

      <AppFooter />

      {active && (
        <Modal open onClose={() => setActive(null)} title={active.title} wide>
          <div className="flex max-h-[55vh] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {msgLoading ? (
                <Spinner />
              ) : messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Say hello 👋</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-brand-600">
                          {m.sender_name} <span className="font-normal text-slate-400">· {m.sender_role}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">{timeFmt(m.created_at)}</p>
                      </div>
                      {m.image_url && (
                        <a href={m.image_url} target="_blank" rel="noreferrer" className="mt-2 block">
                          <img src={m.image_url} alt="attachment" className="max-h-40 rounded-lg object-cover" />
                        </a>
                      )}
                      {m.body && <p className="mt-1 text-sm text-slate-700">{m.body}</p>}
                    </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="mt-3 flex items-end gap-2 border-t border-slate-200 pt-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={1}
                placeholder="Write a message…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="max-h-28 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <Button type="submit" disabled={sending || !body.trim()}>{sending ? 'Sending…' : 'Send'}</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}