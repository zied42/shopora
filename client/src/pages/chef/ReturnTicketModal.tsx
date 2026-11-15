import { useState } from 'react';

type NewTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_PICKS: { value: NewTicketPriority; label: string; icon: string; active: string }[] = [
  { value: 'low', label: 'Low', icon: '−', active: 'border-slate-400 bg-slate-50 text-slate-700' },
  { value: 'medium', label: 'Medium', icon: '◫', active: 'border-brand-400 bg-brand-50 text-brand-600' },
  { value: 'high', label: 'High', icon: '↑', active: 'border-amber-400 bg-amber-50 text-amber-600' },
  { value: 'urgent', label: 'Urgent', icon: '!', active: 'border-rose-400 bg-rose-50 text-rose-600' },
];

/* ═══════════════════════════ local icons ═══════════════════════════ */

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M192 0c-41.8 0-77.4 26.7-90.5 64H64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H282.5C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM305 273L177 401c-9.4 9.4-24.6 9.4-33.9 0L79 337c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L271 239c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
    </svg>
  );
}

function CircleUserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M399 384.2C376.9 345.8 335.4 320 288 320H224c-47.4 0-88.9 25.8-111 64.2c35.2 39.2 86.2 63.8 143 63.8s107.8-24.7 143-63.8zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 16a72 72 0 1 0 0-144 72 72 0 1 0 0 144z" />
    </svg>
  );
}

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z" />
    </svg>
  );
}

function CirclePlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
    </svg>
  );
}

/* ═══════════════════════════ modal ═══════════════════════════ */

export default function ReturnTicketModal({ gid, onClose }: { gid: string; onClose: () => void }) {
  const [priority, setPriority] = useState<NewTicketPriority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedType, setRelatedType] = useState('ID');
  const [linkInput, setLinkInput] = useState('');
  const [related, setRelated] = useState<string[]>([`Return ID: #${Number(gid)}`]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [assignees, setAssignees] = useState<string[]>([]);

  const canAddLink = linkInput.trim().length > 0;
  const addLink = () => {
    if (!canAddLink) return;
    setRelated((r) => [...r, `${relatedType}: ${linkInput.trim()}`]);
    setLinkInput('');
  };
  const addAssignee = () => {
    const name = assigneeSearch.trim();
    if (!name) return;
    setAssignees((a) => (a.includes(name) ? a : [...a, name]));
    setAssigneeSearch('');
  };

  const valid = title.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <ClipboardCheckIcon />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Internal Ticket</h3>
              <p className="text-xs text-slate-500">Assign tasks to internal team members · related to return #{Number(gid)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">
          {/* left column */}
          <div className="space-y-4 md:col-span-7">
            {/* priority */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Priority</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_PICKS.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        selected ? p.active + ' shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {selected && <CheckIcon className="text-current" />}
                      {p.label}
                      <span className="text-xs opacity-70">{p.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter ticket title"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what needs to be done"
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* related entities */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Related entities</p>
                <span className="text-[11px] text-slate-400">
                  <LinkIcon className="mr-1 inline" />
                  {related.length} linked
                </span>
              </div>
              <div className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                {related.length === 0 ? (
                  <span className="text-xs text-slate-400">No related entities</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {related.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700">
                        <LinkIcon />
                        {r}
                        <button type="button" onClick={() => setRelated((list) => list.filter((x) => x !== r))} className="text-brand-600 hover:text-rose-500">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-start gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <select
                    value={relatedType}
                    onChange={(e) => setRelatedType(e.target.value)}
                    className="w-[76px] rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-500"
                  >
                    <option>Link</option>
                    <option>ID</option>
                  </select>
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLink()}
                    placeholder="Paste a link or enter an ID"
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canAddLink}
                  onClick={addLink}
                  className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <PlusIcon className="text-current" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* right column */}
          <div className="rounded-xl bg-slate-50 p-4 md:col-span-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CircleUserIcon className="text-slate-500" />
              Assignees
            </p>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CirclePlusIcon />
              </span>
              <input
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAssignee()}
                placeholder="Add users"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="All">All Dept</option>
              <option value="Commercial">Commercial</option>
              <option value="Technical">Technical</option>
            </select>

            <div className="mt-3 flex min-h-[88px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white px-3 py-2">
              {assignees.length === 0 ? (
                <span className="text-xs text-slate-400">No assignees added yet</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-slate-200 py-1 pl-1 pr-1.5 text-[11px] font-medium text-slate-700">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[8px] font-bold text-white">
                        {a.slice(0, 1).toUpperCase()}
                      </span>
                      {a}
                      <button type="button" onClick={() => setAssignees((list) => list.filter((x) => x !== a))} className="text-slate-500 hover:text-rose-500">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="text-current" />
            Create
          </button>
        </div>
      </div>
    </div>
  );
}