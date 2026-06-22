/**
 * Guard de montaje / retorno a Jornada: evita TTS + heavy compute compitiendo al volver
 * desde otra app (p. ej. Voice) o al remontar el chunk lazy de planeacion.
 */

const JORNADA_HEAVY_DEFER_MS = 1500;
const JORNADA_VOICE_FLUSH_DELAY_MS = 1500;
const JORNADA_VOICE_PHRASE_GAP_MS = 2000;

let isRemountingJornada = false;
let heavyComputeAllowedAfterMs = 0;
let voiceFlushTimer: ReturnType<typeof setTimeout> | null = null;
let voiceDrainTimer: ReturnType<typeof setTimeout> | null = null;
let voiceFlushInProgress = false;

type PendingVoiceFn = () => void;
const pendingVoiceQueue: PendingVoiceFn[] = [];

export function getIsRemountingJornada(): boolean {
  return isRemountingJornada;
}

export function isJornadaHeavyComputeAllowed(): boolean {
  return !isRemountingJornada && Date.now() >= heavyComputeAllowedAfterMs;
}

export function msUntilJornadaHeavyComputeAllowed(): number {
  return Math.max(0, heavyComputeAllowedAfterMs - Date.now());
}

export function shouldDeferJornadaVoice(): boolean {
  return isRemountingJornada;
}

export function deferJornadaVoice(fn: PendingVoiceFn): void {
  pendingVoiceQueue.push(fn);
}

export function clearJornadaVoiceFlushTimers(): void {
  if (voiceFlushTimer) {
    clearTimeout(voiceFlushTimer);
    voiceFlushTimer = null;
  }
  if (voiceDrainTimer) {
    clearTimeout(voiceDrainTimer);
    voiceDrainTimer = null;
  }
  voiceFlushInProgress = false;
}

/** Vacía cola diferida — 1 frase cada 2s vía requestIdleCallback. */
export function flushJornadaVoiceQueue(): void {
  if (voiceFlushInProgress || pendingVoiceQueue.length === 0) return;
  voiceFlushInProgress = true;

  const drainNext = () => {
    if (pendingVoiceQueue.length === 0) {
      voiceFlushInProgress = false;
      voiceDrainTimer = null;
      return;
    }
    const run = () => {
      const fn = pendingVoiceQueue.shift();
      try {
        fn?.();
      } catch {
        /* noop */
      }
      voiceDrainTimer = setTimeout(drainNext, JORNADA_VOICE_PHRASE_GAP_MS);
    };
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(run, { timeout: JORNADA_VOICE_PHRASE_GAP_MS });
    } else {
      run();
    }
  };

  drainNext();
}

export function beginJornadaRemount(opts?: { heavyDeferMs?: number }): void {
  isRemountingJornada = true;
  heavyComputeAllowedAfterMs = Date.now() + (opts?.heavyDeferMs ?? JORNADA_HEAVY_DEFER_MS);
  clearJornadaVoiceFlushTimers();
}

export function endJornadaRemount(opts?: { voiceFlushDelayMs?: number }): void {
  isRemountingJornada = false;
  clearJornadaVoiceFlushTimers();
  const delay = opts?.voiceFlushDelayMs ?? JORNADA_VOICE_FLUSH_DELAY_MS;
  voiceFlushTimer = setTimeout(() => {
    voiceFlushTimer = null;
    flushJornadaVoiceQueue();
  }, delay);
}

export function cancelJornadaRemountGuard(): void {
  isRemountingJornada = false;
  clearJornadaVoiceFlushTimers();
}

/** Solo tests — reinicia estado global. */
export function resetJornadaRemountForTests(): void {
  isRemountingJornada = false;
  heavyComputeAllowedAfterMs = 0;
  pendingVoiceQueue.length = 0;
  clearJornadaVoiceFlushTimers();
}

export function getJornadaPendingVoiceCountForTests(): number {
  return pendingVoiceQueue.length;
}
