/**
 * Voz de ubicación (desglosador conquista + ring situacional).
 * Reintenta si el navegador bloquea TTS sin gesto o si speechSynthesis queda colgado.
 */

import {
  recoverSpeechQueue,
  speakUbicacionQueue,
  unlockSpeechSynthesis,
  warmupSpeechSynthesis,
  isUbicacionPhraseQueued,
  isUbicacionSpeechActive,
  isSpeechSynthesisUnlocked,
  voiceEngine,
  type UbicacionVoiceSource,
} from "./speechQueue";
import {
  isDesglosadorVoiceEnabled,
  isPuertaVozEnabled,
  isSituacionAlertsEnabled,
} from "./tikSound";

type PendingVoice = {
  phrases: string[];
  cancelPrevious: boolean;
  source: UbicacionVoiceSource;
  onSpoken?: () => void;
  spoken: boolean;
  attempts: number;
};

const pending = new Map<string, PendingVoice>();
const cleanupByKey = new Map<string, () => void>();
const MAX_RELIABLE_ATTEMPTS = 6;
const RETRY_DELAYS_MS = [1500, 4000, 10_000, 20_000, 30_000];
const SPOKEN_SAFETY_MS = 12_000;
let voiceRetryHubRegistered = false;

function isVoiceEnabledFor(source: UbicacionVoiceSource): boolean {
  if (source === "desglosador") return isDesglosadorVoiceEnabled();
  if (source === "situacion") return isSituacionAlertsEnabled();
  if (source === "puerta") return isPuertaVozEnabled();
  return true;
}

/** Marca entrega exitosa — dispara onSpoken solo cuando realmente habló. */
function markVoiceDelivered(key: string): void {
  const entry = pending.get(key);
  if (!entry || entry.spoken) return;
  entry.spoken = true;
  entry.onSpoken?.();
  cleanupByKey.get(key)?.();
  cleanupByKey.delete(key);
  pending.delete(key);
}

/** Abandona reintentos sin marcar como hablado (evita silenciar intro del desglosador). */
function abandonVoicePending(key: string): void {
  cleanupByKey.get(key)?.();
  cleanupByKey.delete(key);
  pending.delete(key);
}

function trySpeak(key: string): void {
  const entry = pending.get(key);
  if (!entry || entry.spoken || !isVoiceEnabledFor(entry.source)) return;

  if (!isSpeechSynthesisUnlocked()) {
    return;
  }

  if (entry.attempts >= MAX_RELIABLE_ATTEMPTS) {
    abandonVoicePending(key);
    return;
  }

  const phrase = entry.phrases[0];
  if (!phrase) return;

  if (isUbicacionPhraseQueued(phrase)) {
    return;
  }

  if (voiceEngine.isKeyActive(key)) {
    return;
  }

  if (entry.attempts > 0 && isUbicacionSpeechActive()) {
    return;
  }

  entry.attempts += 1;
  if (entry.attempts === 1) {
    unlockSpeechSynthesis(true);
  } else {
    warmupSpeechSynthesis(true);
  }
  recoverSpeechQueue();

  queueMicrotask(() => {
    if (entry.spoken || !pending.has(key)) return;
    speakUbicacionQueue(
      entry.phrases,
      entry.cancelPrevious,
      entry.source,
      () => {
        markVoiceDelivered(key);
      },
      key
    );
  });
}

/** Hub global — visibility centralizado en voiceLifecycle; pointerdown en VoiceBootstrap. */
export function ensureUbicacionVoiceRetryHub(): void {
  if (voiceRetryHubRegistered || typeof window === "undefined") return;
  voiceRetryHubRegistered = true;
}

export function retryAllPendingUbicacionVoice(): void {
  for (const key of [...pending.keys()]) {
    const entry = pending.get(key);
    if (entry && !entry.spoken) trySpeak(key);
  }
}

/**
 * Encola guion con reintentos (gesto global, visibilidad, timeouts).
 * Solo marca `onSpoken` cuando el navegador realmente empieza a hablar.
 */
export function speakUbicacionVoiceReliable(
  key: string,
  phrases: string[],
  cancelPrevious: boolean,
  source: UbicacionVoiceSource,
  onSpoken?: () => void
): () => void {
  cleanupByKey.get(key)?.();
  ensureUbicacionVoiceRetryHub();

  if (!isVoiceEnabledFor(source)) {
    return () => {};
  }

  const filtered = phrases.map(p => p.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return () => {};
  }

  pending.set(key, { phrases: filtered, cancelPrevious, source, onSpoken, spoken: false, attempts: 0 });

  trySpeak(key);

  const retryTimers = RETRY_DELAYS_MS.map(ms => window.setTimeout(() => trySpeak(key), ms));
  const spokenSafetyTimer = window.setTimeout(() => {
    const entry = pending.get(key);
    if (entry && !entry.spoken) {
      trySpeak(key);
    }
  }, SPOKEN_SAFETY_MS);

  const cleanup = () => {
    retryTimers.forEach(t => window.clearTimeout(t));
    window.clearTimeout(spokenSafetyTimer);
    pending.delete(key);
    cleanupByKey.delete(key);
  };

  cleanupByKey.set(key, cleanup);
  return cleanup;
}

export function speakDesglosadorVoiceReliable(
  key: string,
  phrases: string[],
  cancelPrevious: boolean,
  onSpoken?: () => void
): () => void {
  return speakUbicacionVoiceReliable(key, phrases, cancelPrevious, "desglosador", onSpoken);
}

export function speakSituacionVoiceReliable(
  key: string,
  phrases: string[],
  cancelPrevious: boolean,
  onSpoken?: () => void
): () => void {
  return speakUbicacionVoiceReliable(key, phrases, cancelPrevious, "situacion", onSpoken);
}

export function cancelUbicacionVoice(key: string): void {
  cleanupByKey.get(key)?.();
}

/** Cancela voz pendiente de un vehículo (timers de retry incluidos). */
export function cancelUbicacionVoiceForVehicle(vehicleId: string): void {
  const scopedPrefix = `${vehicleId}:`;
  for (const key of [...cleanupByKey.keys()]) {
    if (key.startsWith(scopedPrefix) || key.includes(vehicleId)) {
      cleanupByKey.get(key)?.();
    }
  }
}

export function cancelAllUbicacionVoice(): void {
  for (const cleanup of cleanupByKey.values()) {
    cleanup();
  }
  cleanupByKey.clear();
  pending.clear();
}

/** @deprecated usar cancelUbicacionVoice */
export function cancelDesglosadorVoice(key: string): void {
  cancelUbicacionVoice(key);
}
