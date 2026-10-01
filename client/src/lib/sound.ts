/** Sound played when a scanned commande turns out to be cancelled. */
const SOURCES = ['/sound effects/sound effect.mp3', '/sound effects/sound effect.wav'];

let cachedAudio: HTMLAudioElement | null | undefined;

function warmUp(): void {
  if (cachedAudio !== undefined || typeof window === 'undefined') return;
  cachedAudio = undefined;
  const tryNext = (idx: number): void => {
    if (cachedAudio !== undefined || cachedAudio === null) return;
    if (idx >= SOURCES.length) {
      cachedAudio = null;
      return;
    }
    const probe = new Audio();
    probe.addEventListener('canplaythrough', () => {
      if (cachedAudio === undefined) cachedAudio = probe;
    }, { once: true });
    probe.addEventListener('error', () => tryNext(idx + 1), { once: true });
    probe.preload = 'auto';
    probe.src = SOURCES[idx];
    probe.load();
  };
  tryNext(0);
}

warmUp();

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    ([[880, 0], [587, 0.32]] as Array<[number, number]>).forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.3);
    });
  } catch {
    // audio not available
  }
}

export function playCancelAlert(): void {
  const audio = cachedAudio ?? null;
  if (audio && audio.readyState >= 2) {
    try {
      audio.currentTime = 0;
      audio.volume = 1;
      void audio.play();
      return;
    } catch {
      // fall through to beep
    }
  }
  beep();
}
