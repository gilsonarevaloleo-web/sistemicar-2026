import {
  cancelSpeechSynthesisHard,
  getSpeechDiagnostics,
  isSpeechSynthesisUnlocked,
  recoverSpeechQueue,
  unlockSpeechSynthesis,
} from "./speechQueue";

/** Reset fulminante de TTS — usar solo en gesto del usuario o watchdog. */
export function hardResetSpeechSystems(fromUserGesture = false): void {
  const wasUnlocked = isSpeechSynthesisUnlocked();
  try {
    cancelSpeechSynthesisHard(false);
  } catch {
    /* noop */
  }
  if (fromUserGesture || wasUnlocked) {
    try {
      unlockSpeechSynthesis(fromUserGesture);
    } catch {
      /* noop */
    }
  }
  try {
    recoverSpeechQueue();
  } catch {
    /* noop */
  }
}



/** Cola interna atascada o synth colgado sin utterance activo. */

export function isSpeechSystemStuck(): boolean {

  if (typeof window === "undefined") return false;

  const diag = getSpeechDiagnostics();

  if (!diag.synthAvailable) return false;

  const synth = window.speechSynthesis;

  const synthActive = !!(synth?.speaking || synth?.pending);

  if (diag.speaking && !synthActive) return true;

  if (diag.queueLength > 0 && !diag.speaking && !synthActive && !diag.speechUnlocked) return true;

  return false;

}



const WATCHDOG_MS = 8_000;

const STUCK_CONFIRM_MS = 12_000;

let watchdogInstalled = false;

let stuckSinceMs: number | null = null;



/** Autorecuperación suave cuando el synth queda colgado (no revoca unlock). */

export function installSpeechStuckWatchdog(): () => void {

  if (watchdogInstalled || typeof window === "undefined") return () => {};

  watchdogInstalled = true;

  const id = window.setInterval(() => {

    if (document.hidden) {

      stuckSinceMs = null;

      return;

    }

    if (!isSpeechSystemStuck()) {

      stuckSinceMs = null;

      return;

    }

    const now = Date.now();

    if (stuckSinceMs === null) stuckSinceMs = now;

    if (now - stuckSinceMs >= STUCK_CONFIRM_MS) {

      stuckSinceMs = null;

      recoverSpeechQueue();

    }

  }, WATCHDOG_MS);

  return () => {

    window.clearInterval(id);

    watchdogInstalled = false;

    stuckSinceMs = null;

  };

}



/** Solo tests. */

export function resetSpeechWatchdogForTests(): void {

  stuckSinceMs = null;

  watchdogInstalled = false;

}


