import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MIN_SHOW_MS = 1800;
const FALLBACK_MS = 8000;

function readStoredUser() {
  try {
    const raw = localStorage.getItem('d42_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { role?: string };
    return u && typeof u.role === 'string' ? u.role : null;
  } catch {
    return null;
  }
}

export default function SceneSplash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'idle' | 'video'>('idle');
  const startAt = useRef(0);
  const done = useRef(false);

  const goRef = useRef(() => {});
  goRef.current = () => {
    if (done.current) return;
    done.current = true;
    const role = user?.role ?? readStoredUser();
    const dest = role === 'customer' ? '/dropshipper/store' : role === 'seller' ? '/fournisseur' : role === 'admin' ? '/admin' : '/login';
    navigate(dest, { replace: true });
  };

  const finish = () => {
    const elapsed = Date.now() - startAt.current;
    const remaining = MIN_SHOW_MS - elapsed;
    if (remaining > 0) window.setTimeout(() => goRef.current(), remaining);
    else goRef.current();
  };

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('video'), 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'video') return;
    startAt.current = Date.now();
    const v = videoRef.current;
    if (!v) {
      goRef.current();
      return;
    }
    v.muted = true;
    v.play().catch(() => {});
    let metaTimer = 0;
    let fallbackTimer = window.setTimeout(() => finish(), FALLBACK_MS);
    const onMeta = () => {
      const dur = v.duration;
      if (Number.isFinite(dur) && dur > 0) {
        window.clearTimeout(fallbackTimer);
        const cap = Math.min(1000 * dur + 2000, 45000);
        metaTimer = window.setTimeout(() => finish(), cap);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(metaTimer);
    };
  }, [phase]);

  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh w-full select-none items-center justify-center overflow-hidden bg-[#020618]"
    >
      {phase === 'video' && (
        <video
          ref={videoRef}
          src="/Scene-1.mp4"
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={() => finish()}
          onError={() => finish()}
          className="h-full w-full object-contain md:object-cover"
        />
      )}
    </div>
  );
}
