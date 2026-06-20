import {
  cancelSpeechSynthesisHard,
  getSpeechDiagnostics,
  recoverSpeechQueue,
  unlockSpeechSynthesis,
} from "./speechQueue";
import { stopPleasantVoice } from "./puntoCeroVoice";

/** Reset fulminante de TTS + cola Punto Cero — usar solo en gesto del usuario o watchdog. */
export function hardResetSpeechSystems(fromUserGesture = false): void {
  try {
    stopPleasantVoice();
  } catch {
    /* noop */
  }
  try {
    cancelSpeechSynthesisHard();
  } catch {
    /* noop */
  }
  if (fromUserGesture) {
    try {
      unlockSpeechSynthesis(true);
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
let watchdogInstalled = false;

/** Autorecuperación suave cuando el synth queda colgado (no revoca unlock). */
export function installSpeechStuckWatchdog(): () => void {
  if (watchdogInstalled || typeof window === "undefined") return () => {};
  watchdogInstalled = true;
  const id = window.setInterval(() => {
    if (document.hidden) return;
    if (!isSpeechSystemStuck()) return;
    recoverSpeechQueue();
  }, WATCHDOG_MS);
  return () => {
    window.clearInterval(id);
    watchdogInstalled = false;
  };
}
