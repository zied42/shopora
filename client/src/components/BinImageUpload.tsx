import { useRef, useState } from 'react';
import { apiErrorMessage, apiUpload } from '../lib/api';
import { Spinner } from './ui';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function BinImageUpload({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await apiUpload(file);
      if (url) onChange(url);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const pick = () => fileRef.current?.click();

  return (
    <div className="mt-2">
      {value ? (
        <div className="relative h-[200px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={value} alt="Bin preview" className="h-full w-full object-contain" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pick(); }}
              className="rounded-lg bg-slate-900/70 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-slate-900"
            >
              Change
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="rounded-lg bg-rose-600/90 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-rose-600"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex h-[200px] cursor-pointer select-none flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
            dragging
              ? 'border-sky-400 bg-sky-50'
              : 'border-slate-300 bg-slate-50/50 hover:border-sky-400 hover:bg-sky-50/40'
          }`}
        >
          {uploading ? (
            <>
              <Spinner />
              <span className="mt-2 text-xs font-semibold text-slate-500">Uploading...</span>
            </>
          ) : (
            <>
              <span className="px-4 text-sm font-medium text-slate-500">Drag &amp; Drop your Bin image or Browse</span>
              <span className="mt-1 text-[10px] text-slate-400">PNG, JPG, SVG, WebP</span>
            </>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ''; }}
      />
    </div>
  );
}
