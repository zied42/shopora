import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, chefOrgApi, ManagerStaffOption, supportOrgApi } from '../../lib/api';
import { Avatar } from './ui';
import { XmarkIcon } from './ui';

const ROLE_TONES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  chef: 'bg-sky-100 text-sky-700',
  support: 'bg-emerald-100 text-emerald-700',
};

export default function ManagerPickerModal({
  title,
  current,
  base = 'chef',
  onClose,
  onPick,
}: {
  title: string;
  current?: string | null;
  base?: 'chef' | 'support';
  onClose: () => void;
  onPick: (name: string | null) => Promise<void> | void;
}) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [options, setOptions] = useState<ManagerStaffOption[] | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listManagerStaffOptions()
      .then(setOptions)
      .catch((e) => {
        alert(apiErrorMessage(e));
        setOptions([]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!options) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.name.toLowerCase().includes(needle) || o.role.includes(needle));
  }, [options, q]);

  const pick = async (name: string | null) => {
    setSaving(true);
    try {
      await onPick(name);
      onClose();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">{title}</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>

        <div className="px-4 pt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white"
          />
        </div>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {options === null ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading…</div>
          ) : (
            <>
              <button
                type="button"
                disabled={saving || current == null}
                onClick={() => pick(null)}
                className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-left transition hover:bg-slate-50 disabled:opacity-50 ${current == null ? 'bg-sky-50' : 'bg-white'}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs">—</span>
                <span className="text-xs font-semibold text-slate-500">No user assigned</span>
              </button>
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={saving}
                  onClick={() => pick(o.name)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-sky-50 ${current === o.name ? 'bg-sky-50' : ''}`}
                >
                  <Avatar name={o.name} size="h-7 w-7 text-[9px]" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{o.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${ROLE_TONES[o.role]}`}>{o.role}</span>
                  {current === o.name && (
                    <span className="text-[10px] font-bold text-sky-600">✓</span>
                  )}
                </button>
              ))}
              {options !== null && filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">No staff match your search</div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-right">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
