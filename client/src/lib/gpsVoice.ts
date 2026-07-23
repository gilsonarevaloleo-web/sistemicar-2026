/**
 * Voz tipo GPS — Web Audio + clips precargados.
 *
 * Por qué: speechSynthesis del navegador se cuelga / exige gesto / pelea con el
 * hilo principal. Los GPS (y Maps) hablan con audio de sesión (AudioContext /
 * HTMLAudioElement) desbloqueado una vez; luego pueden anunciar sin bloquear UI.
 *
 * Flujo:
 * 1. unlockGpsVoice() en el mismo gesto del operador (pointerdown / abrir ring)
 * 2. playGpsClipIds([...]) reproduce mp3 de /voice/ sin pasar por speechSynthesis
 * 3. Si el clip falta o AudioContext falla → el caller puede caer a TTS
 */

const VOICE_BASE = "/voice";

let sharedCtx: AudioContext | null = null;
let unlocked = false;
const bufferCache = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
let playToken = 0;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function ensureCtx(): AudioContext | null {
  const AC = getAudioContextClass();
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Desbloquea la sesión de audio (obligatorio en móvil). Llamar en gesto. */
export function unlockGpsVoice(): void {
  const ctx = ensureCtx();
  if (!ctx) return;
  const resume = () => {
    unlocked = true;
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(resume).catch(resume);
  } else {
    resume();
  }
  // Beep inaudible: algunos WebViews solo marcan "user activated" tras start().
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {
    /* noop */
  }
}

export function isGpsVoiceUnlocked(): boolean {
  return unlocked && !!sharedCtx && sharedCtx.state !== "closed";
}

export function gpsClipUrl(clipId: string): string {
  return `${VOICE_BASE}/${clipId}.mp3`;
}

async function loadBuffer(clipId: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(clipId);
  if (cached) return cached;
  const pending = inflight.get(clipId);
  if (pending) return pending;

  const job = (async () => {
    const ctx = ensureCtx();
    if (!ctx) return null;
    try {
      const res = await fetch(gpsClipUrl(clipId), { cache: "force-cache" });
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(raw.slice(0));
      bufferCache.set(clipId, buf);
      return buf;
    } catch {
      return null;
    } finally {
      inflight.delete(clipId);
    }
  })();

  inflight.set(clipId, job);
  return job;
}

/** Precarga clips en idle (tras unlock). */
export function prefetchGpsClips(clipIds: string[]): void {
  if (typeof window === "undefined") return;
  for (const id of clipIds) {
    void loadBuffer(id);
  }
}

export type GpsPlayResult = {
  ok: boolean;
  reason?: "no-ctx" | "locked" | "missing-clip" | "aborted";
};

/**
 * Reproduce clips en secuencia (como turn-by-turn del GPS).
 * Cancela una reproducción anterior del motor GPS al empezar otra.
 */
export async function playGpsClipIds(clipIds: string[]): Promise<GpsPlayResult> {
  const ids = clipIds.map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: false, reason: "missing-clip" };

  unlockGpsVoice();
  const ctx = ensureCtx();
  if (!ctx) return { ok: false, reason: "no-ctx" };
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return { ok: false, reason: "locked" };
    }
  }
  unlocked = true;

  const token = ++playToken;
  for (const id of ids) {
    if (token !== playToken) return { ok: false, reason: "aborted" };
    const buf = await loadBuffer(id);
    if (!buf) return { ok: false, reason: "missing-clip" };
    if (token !== playToken) return { ok: false, reason: "aborted" };

    await new Promise<void>(resolve => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      try {
        src.start();
      } catch {
        resolve();
      }
    });
  }
  return { ok: true };
}

export function stopGpsVoice(): void {
  playToken += 1;
}

/** Packs de clips alineados a los guiones de producto. */
export const GPS_CLIP_PACKS = {
  ringBienvenidaPrimera: ["ring-bienvenida-1a", "ring-bienvenida-1b", "ring-bienvenida-1c"],
  ringBienvenidaSiguiente: ["ring-bienvenida-2a", "ring-bienvenida-2b"],
  conquistaIntro: ["conquista-intro-a", "conquista-intro-b"],
  conquistaConcentrado: ["conquista-concentrado-a", "conquista-concentrado-b"],
  conquistaLimite: ["conquista-limite-a", "conquista-limite-b"],
} as const;

export function ringBienvenidaClipIds(retoNumero: number): string[] {
  return retoNumero > 1
    ? [...GPS_CLIP_PACKS.ringBienvenidaSiguiente]
    : [...GPS_CLIP_PACKS.ringBienvenidaPrimera];
}

/** Solo tests. */
export function resetGpsVoiceForTests(): void {
  playToken += 1;
  unlocked = false;
  bufferCache.clear();
  inflight.clear();
  if (sharedCtx && sharedCtx.state !== "closed") {
    try {
      void sharedCtx.close();
    } catch {
      /* noop */
    }
  }
  sharedCtx = null;
}
