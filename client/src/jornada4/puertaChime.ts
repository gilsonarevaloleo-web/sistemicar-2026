/**
 * Timbre de puerta Dual Kernel — Web Audio one-shot + vibración.
 * Sin speechSynthesis, sin speechQueue, sin voz.
 * El beneficio anti-miopía vive en el texto (ordinal/total); el sonido solo despierta.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getCtx(): AudioContext | null {
  const AC = getAudioContextClass();
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AC();
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  t0: number,
  durationSec: number,
  gainPeak: number,
  type: OscillatorType = "sine"
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationSec + 0.03);
}

/** Desbloquea AudioContext tras gesto del usuario (móvil). */
export async function unlockPuertaAudio(): Promise<void> {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  } catch {
    /* noop */
  }
}

/**
 * Campana puerta: Do–Sol–Do (~0.7 s).
 * Una sola ráfaga — no loops, no timers persistentes.
 */
export async function playPuertaDoorChime(kind: "abrir" | "cerrar" = "abrir"): Promise<void> {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    if (ctx.state !== "running") return;
    const t = ctx.currentTime;
    if (kind === "abrir") {
      // Ascendente: llama a la atención
      tone(ctx, 523.25, t, 0.18, 0.38, "triangle");
      tone(ctx, 659.25, t + 0.2, 0.18, 0.34, "triangle");
      tone(ctx, 783.99, t + 0.4, 0.28, 0.32, "sine");
    } else {
      // Descendente: cierra con intención
      tone(ctx, 783.99, t, 0.18, 0.36, "triangle");
      tone(ctx, 659.25, t + 0.22, 0.18, 0.32, "triangle");
      tone(ctx, 523.25, t + 0.44, 0.3, 0.3, "sine");
    }
  } catch {
    /* noop */
  }
}

export function vibratePuerta(kind: "abrir" | "cerrar" = "abrir"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    if (kind === "abrir") {
      navigator.vibrate([200, 80, 200, 80, 350]);
    } else {
      navigator.vibrate([120, 60, 120, 60, 120, 60, 400]);
    }
  } catch {
    /* noop */
  }
}

/** Timbre + vibración juntos (entrega sensorial sin voz). */
export function deliverPuertaSensory(kind: "abrir" | "cerrar"): void {
  vibratePuerta(kind);
  void playPuertaDoorChime(kind);
}
