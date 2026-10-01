import { useEffect, useMemo, useRef, useState } from 'react';
import { apiErrorMessage, getSupplierConversationMessages, getSupplierConversations, ChatMessage, SupplierConversation, timeFmt } from '../../lib/api';
import { Spinner, TablePagination } from '../../components/ui';
import { Avatar } from './ui';

export default function ChefChatThreads() {
  const [rows, setRows] = useState<SupplierConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [active, setActive] = useState<SupplierConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);
  activeRef.current = active?.id ?? null;

  const load = () => {
    setLoading(true);
    getSupplierConversations()
      .then(setRows)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Poll conversation list when no thread is open
  useEffect(() => {
    const iv = setInterval(() => {
      if (activeRef.current == null) load();
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  // Poll messages when a thread is open
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(async () => {
      if (activeRef.current == null) return;
      try {
        const msgs = await getSupplierConversationMessages(activeRef.current);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, msgLoading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => {
      const hay = [c.supplier_name, c.dropshipper_name, c.title, c.last_sender_name, c.last_body].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const openThread = async (c: SupplierConversation) => {
    setActive(c);
    setMsgLoading(true);
    try {
      const msgs = await getSupplierConversationMessages(c.id);
      setMessages(msgs);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 w-full whitespace-nowrap text-base font-bold text-slate-900 lg:w-auto">Chat Threads</h5>
          <form
            className="flex w-full items-center overflow-hidden rounded-xl border border-slate-300 sm:w-auto"
            onSubmit={(e) => { e.preventDefault(); setPage(0); }}
          >
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              type="search"
              placeholder="Search supplier, message..."
              className="w-[220px] border-transparent bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
          </form>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead>
                  <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-50/80 align-middle text-xs text-slate-800">
                    <th className="px-4 py-2.5 font-semibold">Supplier</th>
                    <th className="px-4 py-2.5 font-semibold">Dropshipper</th>
                    <th className="px-4 py-2.5 font-semibold">Last Message By</th>
                    <th className="px-4 py-2.5 font-semibold">Last Message</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Messages</th>
                    <th className="px-4 py-2.5 font-semibold">Created</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr className="whitespace-nowrap border-b border-slate-50">
                      <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                        No supplier conversations found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((c) => (
                      <tr key={c.id} className="whitespace-nowrap border-b border-slate-50 align-middle transition odd:bg-slate-50/40 hover:bg-brand-50/40">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center">
                            <Avatar name={c.supplier_name} size="h-8 w-8 text-xs border border-slate-200" />
                            <span className="ms-2 text-[11px] font-semibold text-slate-900">{c.supplier_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center">
                            <Avatar name={c.dropshipper_name || ''} size="h-8 w-8 text-xs border border-slate-200" />
                            <span className="ms-2 text-[11px] font-semibold text-slate-900">{c.dropshipper_name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-600">{c.last_sender_name || '—'}</td>
                        <td className="max-w-[250px] truncate px-4 py-2.5 text-[11px] text-slate-500">
                          {c.last_body || (c.last_image_url ? '🖼️ image' : 'No messages yet')}
                        </td>
                        <td className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-700">{c.message_count}</td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-500">{timeFmt(c.created_at)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => void openThread(c)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <svg className="h-3 w-3" viewBox="0 0 512 512" fill="currentColor"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z" /></svg>
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <TablePagination count={total} page={current + 1} pageSize={pageSize} onPage={(p) => setPage(p - 1)} onPageSize={(n) => { setPageSize(n); setPage(0); }} />
          </>
        )}
      </div>

      {/* Message thread modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setActive(null)}>
          <div
            className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h6 className="text-sm font-bold text-slate-900">{active.supplier_name}</h6>
                <p className="text-[10px] text-slate-400">Supplier conversation · {active.message_count} messages</p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {msgLoading ? (
                <Spinner />
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No messages in this conversation.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isFournisseur = m.sender_role === 'seller';
                    return (
                      <div key={m.id} className={`flex ${isFournisseur ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${isFournisseur ? 'border border-slate-200 bg-slate-50 text-slate-800' : 'bg-brand-600 text-white'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold ${isFournisseur ? 'text-slate-600' : 'text-brand-100'}`}>
                              {m.sender_name}
                            </span>
                            <span className={`text-[9px] ${isFournisseur ? 'text-slate-400' : 'text-brand-200'}`}>
                              {m.sender_role}
                            </span>
                          </div>
                          {m.image_url && (
                            <a href={m.image_url} target="_blank" rel="noreferrer" className="mt-1.5 block">
                              <img src={m.image_url} alt="attachment" className="max-h-40 rounded-lg object-cover" />
                            </a>
                          )}
                          {m.body && <p className="mt-1 text-sm leading-relaxed">{m.body}</p>}
                          <p className={`mt-1 text-[9px] ${isFournisseur ? 'text-slate-400' : 'text-brand-200'}`}>
                            {timeFmt(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
