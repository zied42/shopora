import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiUpload } from '../lib/api';

const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', chef: 'Chef', support: 'Support', dropshipper: 'Dropshipper', fournisseur: 'Fournisseur', stocking: 'Stocking', confirmateur: 'Confirmateur' };
const ROLE_TONE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  chef: 'bg-amber-100 text-amber-700',
  support: 'bg-violet-100 text-violet-700',
  dropshipper: 'bg-emerald-100 text-emerald-700',
  fournisseur: 'bg-sky-100 text-sky-700',
  stocking: 'bg-teal-100 text-teal-700',
  confirmateur: 'bg-indigo-100 text-indigo-700',
};

function CameraIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, impersonator, updateProfile } = useAuth();
  const navigate = useNavigate();
  const me = impersonator ?? user;

  const [name, setName] = useState(me?.name ?? '');
  const [photo, setPhoto] = useState<string | null>(me?.photo ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!me) return null;

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setUploading(true);
    setError('');
    setSaved(false);
    try {
      const url = await apiUpload(file);
      setPhoto(url);
      await updateProfile({ photo: url });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setPhoto(null);
    setError('');
    setSaved(false);
    try {
      await updateProfile({ photo: null });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const save = async () => {
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile({ name: name.trim(), photo });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const initial = me.name.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-full bg-slate-50">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link to={`/${me.role}`} className="transition hover:text-slate-700">Dashboard</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">My Profile</span>
          </nav>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
              <p className="mt-0.5 text-sm text-slate-500">Update your personal information and profile picture</p>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckIcon />
              )}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* ================= PHOTO CARD ================= */}
          <div className="h-fit space-y-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-brand-500 to-violet-500 text-3xl font-bold text-white shadow-lg ring-2 ring-brand-100">
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
              </span>
              <p className="mt-4 text-base font-semibold text-slate-900">{me.name}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_TONE[me.role]}`}>
                {ROLE_LABEL[me.role]}
              </span>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CameraIcon />
                {uploading ? 'Uploading…' : 'Upload profile image'}
              </button>
              {photo && (
                <button
                  onClick={() => void removePhoto()}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Remove image
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
                PNG, JPG or GIF up to 5&nbsp;MB — saved automatically when you upload it
              </p>
            </div>
          </div>

          {/* ================= INFO CARD ================= */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Account information</h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={me.email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">Your email is used to sign in and cannot be changed here.</p>
              </div>

              <div>
                <label htmlFor="profile-cin" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  National ID
                </label>
                <input
                  id="profile-cin"
                  type="text"
                  value={me.cin ?? '—'}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}
              {saved && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <CheckIcon />
                  Your profile has been updated successfully.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}