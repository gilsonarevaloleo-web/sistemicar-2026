/**
 * Voz tipo GPS — HTMLAudioElement + clips precargados en /voice/*.mp3.
 *
 * Patrón GPS/Maps: desbloquear audio en un gesto y reproducir archivos,
 * sin speechSynthesis en el hot path.
 *
 * Importante: los mp3 viven en `client/public/voice/` (Vite root = client/).
 */

const VOICE_BASE = "/voice";

let unlocked = false;
let playGeneration = 0;
let sharedPlayer: HTMLAudioElement | null = null;
/** Evita que un play abortado por supersede dispare TTS de fallback. */
const activePlayControllers = new Set<{ gen: number }>();

function ensurePlayer(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (!sharedPlayer) {
    sharedPlayer = new Audio();
    sharedPlayer.preload = "auto";
    sharedPlayer.setAttribute("playsinline", "true");
  }
  return sharedPlayer;
}

/** Desbloquea la sesión de audio (obligatorio en móvil). Llamar en gesto. */
export function unlockGpsVoice(): void {
  const player = ensurePlayer();
  if (!player) return;
  unlocked = true;
  // Play silencioso: marca user-activation para plays posteriores (incl. timers).
  try {
    const prevVolume = player.volume;
    const prevSrc = player.src;
    player.volume = 0.001;
    // data-uri wav silencioso (~0.1s) — no depende de /voice/ estando desplegado
    player.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    void player.play().then(
      () => {
        player.pause();
        player.volume = prevVolume || 1;
        if (prevSrc) player.src = prevSrc;
      },
      () => {
        player.volume = prevVolume || 1;
      }
    );
  } catch {
    /* noop */
  }
}

export function isGpsVoiceUnlocked(): boolean {
  return unlocked;
}

export function gpsClipUrl(clipId: string): string {
  return `${VOICE_BASE}/${clipId}.mp3`;
}

function isLikelyMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  // ID3 tag
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  // MPEG frame sync
  if (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0) return true;
  return false;
}

async function assertClipReachable(clipId: string): Promise<boolean> {
  try {
    const res = await fetch(gpsClipUrl(clipId), { method: "GET", cache: "no-cache" });
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html")) return false;
    const buf = new Uint8Array(await res.arrayBuffer());
    return isLikelyMp3(buf);
  } catch {
    return false;
  }
}

/** Precarga clips (HEAD/GET) tras unlock — no envenena con HTML del SPA. */
export function prefetchGpsClips(clipIds: string[]): void {
  if (typeof window === "undefined") return;
  for (const id of clipIds) {
    void assertClipReachable(id);
  }
}

export type GpsPlayResult = {
  ok: boolean;
  reason?: "no-audio" | "locked" | "missing-clip" | "aborted" | "play-error";
};

function playOneOnPlayer(player: HTMLAudioElement, url: string): Promise<"ok" | "error"> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (result: "ok" | "error") => {
      if (settled) return;
      settled = true;
      player.onended = null;
      player.onerror = null;
      resolve(result);
    };
    player.onended = () => finish("ok");
    player.onerror = () => finish("error");
    player.src = url;
    player.currentTime = 0;
    player.volume = 1;
    void player.play().then(
      () => {
        /* onended resolve */
      },
      () => finish("error")
    );
  });
}

/**
 * Reproduce clips en secuencia (turn-by-turn).
 * Una nueva llamada cancela la anterior (gen++); la anterior devuelve `aborted`
 * y NO debe caer a TTS.
 */
export async function playGpsClipIds(clipIds: string[]): Promise<GpsPlayResult> {
  const ids = clipIds.map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: false, reason: "missing-clip" };

  unlockGpsVoice();
  const player = ensurePlayer();
  if (!player) return { ok: false, reason: "no-audio" };

  const gen = ++playGeneration;
  const handle = { gen };
  activePlayControllers.add(handle);

  try {
    // Verificar el primero: si el SPA devolvió HTML, fallar limpio → TTS fallback.
    const firstOk = await assertClipReachable(ids[0]!);
    if (gen !== playGeneration) return { ok: false, reason: "aborted" };
    if (!firstOk) return { ok: false, reason: "missing-clip" };

    for (const id of ids) {
      if (gen !== playGeneration) return { ok: false, reason: "aborted" };
      const result = await playOneOnPlayer(player, gpsClipUrl(id));
      if (gen !== playGeneration) return { ok: false, reason: "aborted" };
      if (result !== "ok") return { ok: false, reason: "play-error" };
    }
    return { ok: true };
  } finally {
    activePlayControllers.delete(handle);
  }
}

export function stopGpsVoice(): void {
  playGeneration += 1;
  if (sharedPlayer) {
    try {
      sharedPlayer.pause();
    } catch {
      /* noop */
    }
  }
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
  playGeneration += 1;
  unlocked = false;
  activePlayControllers.clear();
  if (sharedPlayer) {
    try {
      sharedPlayer.pause();
      sharedPlayer.removeAttribute("src");
      sharedPlayer.load();
    } catch {
      /* noop */
    }
  }
  sharedPlayer = null;
}
