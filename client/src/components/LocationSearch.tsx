import { useEffect, useMemo, useRef, useState } from 'react';
import { TUNISIA } from '../lib/tunisia';

interface Option {
  value: string;
  label: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

export default function LocationSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const [hl, setHl] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // When the field holds a full selection like "Tunis -> Tunis", filter against its
  // governorate so focusing again shows that region's options instead of "No results".
  const baseQuery = q.includes(' -> ') ? q.split(' -> ')[0].trim() : q;

  const options = useMemo<Option[]>(() => {
    const gOpts = (g: (typeof TUNISIA)[number]) => {
      const self = `${g.name} -> ${g.name}`;
      return [
        { value: self, label: self },
        ...g.cities
          .filter((c) => norm(c) !== norm(g.name))
          .map((c) => ({ value: `${g.name} -> ${c}`, label: `${g.name} -> ${c}` })),
      ];
    };
    const qn = norm(baseQuery);
    if (!qn) return TUNISIA.flatMap(gOpts);
    const out: Option[] = [];
    for (const g of TUNISIA) {
      const stateMatch = norm(g.name).includes(qn);
      if (stateMatch) {
        out.push(...gOpts(g));
        continue;
      }
      for (const c of g.cities) {
        if (norm(c).includes(qn)) {
          out.push({ value: `${g.name} -> ${c}`, label: `${g.name} -> ${c}` });
        }
      }
    }
    return out.slice(0, 200);
  }, [baseQuery]);

  useEffect(() => {
    setHl((h) => Math.min(h, Math.max(0, options.length - 1)));
  }, [options.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${hl}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [hl, options.length]);

  const pick = (opt: Option) => {
    setQ(opt.value);
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHl(0);
        }}
        onFocus={() => {
          setOpen(true);
          setHl(0);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            setHl((h) => Math.min(options.length - 1, h + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            setHl((h) => Math.max(0, h - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && options.length > 0) pick(options[Math.min(hl, options.length - 1)]);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          } else if (e.key === 'Tab') {
            setOpen(false);
          }
        }}
        placeholder="Type to search..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={listRef} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No results found</p>
            ) : (
              options.map((opt, i) => (
                <button
                  key={opt.value}
                  data-idx={i}
                  type="button"
                  onMouseEnter={() => setHl(i)}
                  onClick={() => pick(opt)}
                  className={`block w-full px-4 py-2 text-left text-sm transition ${i === hl ? 'bg-brand-50 text-brand-700' : 'text-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}