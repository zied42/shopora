import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiErrorMessage, apiGet, apiPost, apiUpload, ChatMessage, Conversation, timeFmt } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, ButtonGhost, PageHeader, Spinner } from '../../components/ui';

export default function ChatPage() {
  const { user } = useAuth();
  const { convId: urlConvId } = useParams<{ convId?: string }>();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(urlConvId ? Number(urlConvId) : null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);
  activeRef.current = activeId;

  const isAdmin = user?.role === 'admin';

  const loadConvs = useCallback(async () => {
    try {
      const list = await apiGet<Conversation[]>('/chat/conversations');
      setConvs(list);
      if (list.length && activeRef.current == null) setActiveId(list[0].id);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const ensureTeam = useCallback(async () => {
    if (!isAdmin) return;
    try {
      await apiPost('/chat/ensure-team', {});
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      if (isAdmin) await ensureTeam();
      await loadConvs();
    })();
  }, [ensureTeam, loadConvs, isAdmin]);

  const loadMessages = useCallback(async (convId: number) => {
    setLoadingMsgs(true);
    try {
      const msgs = await apiGet<ChatMessage[]>(`/chat/${convId}/messages`);
      setMessages(msgs);
      await apiPost(`/chat/${convId}/read`, {});
      setConvs((prev) => prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c)));
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (activeId != null) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loadingMsgs]);

  useEffect(() => {
    const iv = setInterval(async () => {
      void loadConvs();
      if (activeRef.current != null) {
        try {
          const msgs = await apiGet<ChatMessage[]>(`/chat/${activeRef.current}/messages`);
          setMessages(msgs);
        } catch {
          /* ignore */
        }
      }
    }, 6000);
    return () => clearInterval(iv);
  }, [loadConvs]);

  const openStaff = async (peer: 'admin') => {
    try {
      const { id } = await apiPost<{ id: number }>('/chat/ensure', { peer_role: peer });
      setActiveId(id);
      void loadConvs();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (activeId == null || (!body.trim() && !preview)) return;
    setSending(true);
    try {
      const msg = await apiPost<ChatMessage>(`/chat/${activeId}/messages`, { body: body.trim(), image_url: preview });
      setMessages((m) => [...m, msg]);
      setBody('');
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      void loadConvs();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const pickImage = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const url = await apiUpload(f);
      setPreview(url);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const active = convs.find((c) => c.id === activeId);

  return (
    <div>
      <PageHeader
        title="Chat"
        subtitle={isAdmin ? 'Talk with your admin team' : user?.role === 'seller' ? 'Talk with customers' : 'Talk with sellers'}
      />

      <div className="flex h-[calc(100dvh-190px)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[calc(100vh-220px)]">
        <aside className={`${activeId != null ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 md:w-72`}>
          {isAdmin && (
            <div className="flex gap-2 border-b border-slate-200 p-3">
              <ButtonGhost className="flex-1 px-2 py-1.5 text-xs" onClick={() => openStaff('admin')}>👑 Admin team</ButtonGhost>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-4"><Spinner /></div>
            ) : convs.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">{isAdmin ? 'Start a conversation with your admin team.' : 'No conversations yet.'}</p>
            ) : (
              convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3.5 text-left transition ${activeId === c.id ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {c.type === 'team' ? '👥' : c.title.startsWith('Chat with') ? '🏭' : '👤'} {c.title}
                    </p>
                    {c.unread > 0 && <Badge tone="red">{c.unread}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {c.last_message
                      ? `${c.last_message.sender_name}: ${c.last_message.image_url ? '🖼️ ' : ''}${c.last_message.body || 'image'}`
                      : 'No messages yet'}
                  </p>
                  {c.last_message && <p className="mt-0.5 text-[10px] text-slate-400">{timeFmt(c.last_message.created_at)}</p>}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`${active ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
          {active ? (
            <>
              <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-3 sm:px-5">
                <ButtonGhost
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="px-2 py-1 text-lg leading-none md:hidden"
                  aria-label="Back to conversations"
                  title="Back to conversations"
                >
                  ‹
                </ButtonGhost>
                <span className="text-base">{active.type === 'team' ? '👥' : active.title.startsWith('Chat with') ? '🏭' : '👤'}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{active.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {active.type === 'team'
                      ? `${active.participants.length} support team member${active.participants.length > 1 ? 's' : ''}`
                      : active.title.startsWith('Chat with')
                      ? `1:1 with ${active.participants.find((p) => p.id !== user?.id)?.name ?? 'supplier'}`
                      : `1:1 with ${active.participants.find((p) => p.id !== user?.id)?.name ?? 'staff'}`}
                  </p>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
                {loadingMsgs && messages.length === 0 ? (
                  <Spinner />
                ) : messages.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-slate-400">Say hello 👋</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[75%] sm:px-4 ${mine ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
                          <p className={`mb-0.5 text-[11px] font-semibold ${mine ? 'text-brand-100' : 'text-brand-600'}`}>
                            {m.sender_name}
                            {!mine && ` · ${m.sender_role}`}
                          </p>
                          {m.image_url && (
                            <a href={m.image_url} target="_blank" rel="noreferrer" className="block">
                              <img src={m.image_url} alt="attachment" className="mb-1 max-h-56 rounded-xl object-cover" />
                            </a>
                          )}
                          {m.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>}
                          <p className={`mt-1 text-right text-[10px] ${mine ? 'text-brand-100/80' : 'text-slate-400'}`}>{timeFmt(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="border-t border-slate-200 p-3 sm:p-4">
                {preview && (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={preview} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
                    <ButtonGhost className="px-2 py-1 text-xs" onClick={() => setPreview(null)}>Remove</ButtonGhost>
                  </div>
                )}
                <form onSubmit={send} className="flex items-end gap-1.5 sm:gap-2">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickImage(e.target.files?.[0])} />
                  <ButtonGhost
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0 px-2.5 sm:px-3"
                    title="Send an image"
                  >
                    {uploading ? '⏳' : '🖼️'}
                  </ButtonGhost>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={1}
                    placeholder={preview ? 'Add a caption…' : 'Write a message…'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    className="max-h-28 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <Button type="submit" className="shrink-0 px-3 sm:px-4" disabled={sending || (!body.trim() && !preview)}>{sending ? 'Sending…' : 'Send'}</Button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-400">
              {loadingConvs ? 'Loading…' : 'Select a conversation to start chatting'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
