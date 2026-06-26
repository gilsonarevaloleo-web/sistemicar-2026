/**
 * Retraso obligatorio tras hidden→visible (p. ej. llamada telefónica en Android)
 * antes de tocar speechSynthesis — evita secuestro del hilo principal.
 */
export const POST_CALL_AUDIO_SHIELD_MS = 1500;

let shieldUntilMs = 0;
let shieldReleaseTimer: ReturnType<typeof setTimeout> | null = null;
const releaseListeners = new Set<() => void>();

function notifyShieldReleased(): void {
  releaseListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export function armPostCallAudioShield(): void {
  shieldUntilMs = Date.now() + POST_CALL_AUDIO_SHIELD_MS;
  if (shieldReleaseTimer) clearTimeout(shieldReleaseTimer);
  shieldReleaseTimer = setTimeout(() => {
    shieldReleaseTimer = null;
    shieldUntilMs = 0;
    notifyShieldReleased();
  }, POST_CALL_AUDIO_SHIELD_MS);
}

export function isPostCallAudioShieldActive(): boolean {
  return Date.now() < shieldUntilMs;
}

export function msUntilPostCallAudioAllowed(): number {
  return Math.max(0, shieldUntilMs - Date.now());
}

export function onPostCallAudioShieldReleased(listener: () => void): () => void {
  releaseListeners.add(listener);
  return () => releaseListeners.delete(listener);
}

/** Solo tests. */
export function resetPostCallAudioShieldForTests(): void {
  if (shieldReleaseTimer) clearTimeout(shieldReleaseTimer);
  shieldReleaseTimer = null;
  shieldUntilMs = 0;
  releaseListeners.clear();
}
