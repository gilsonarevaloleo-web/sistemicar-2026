/**
 * Coordinador único de ciclo de vida TTS — visibility / focus / pageshow.
 */
import { getIsRemountingJornada } from "./jornadaRemount";
import { logVoiceEvent, recoverSpeechQueue, warmupSpeechSynthesis } from "./speechQueue";
import { retryAllPendingUbicacionVoice } from "./ubicacionVoiceReliable";

export type VoiceVisibleContext = {
  hiddenDurationMs: number;
};

type VisibleHandler = (ctx: VoiceVisibleContext) => void;

const visibleHandlers = new Set<VisibleHandler>();
let hiddenAtMs = 0;
let hubInstalled = false;

export function registerVoiceVisibleHandler(handler: VisibleHandler): () => void {
  visibleHandlers.add(handler);
  return () => visibleHandlers.delete(handler);
}

function runVisibleRecovery(): void {
  const hiddenDurationMs = hiddenAtMs > 0 ? Date.now() - hiddenAtMs : 0;
  hiddenAtMs = 0;
  logVoiceEvent("visible-recovery", {
    hiddenDurationMs,
    remounting: getIsRemountingJornada(),
  });
  warmupSpeechSynthesis(true);
  recoverSpeechQueue();
  retryAllPendingUbicacionVoice();
  const ctx: VoiceVisibleContext = { hiddenDurationMs };
  for (const fn of visibleHandlers) {
    try {
      fn(ctx);
    } catch {
      /* noop */
    }
  }
}

/** Un solo hub — registrar desde VoiceBootstrap (App.tsx). */
export function installVoiceLifecycleHub(): () => void {
  if (hubInstalled || typeof document === "undefined") return () => {};
  hubInstalled = true;

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAtMs = Date.now();
      logVoiceEvent("hidden");
      return;
    }
    runVisibleRecovery();
  };

  const onFocusLike = () => {
    if (document.visibilityState === "hidden") return;
    runVisibleRecovery();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocusLike);
  window.addEventListener("pageshow", onFocusLike);

  return () => {
    hubInstalled = false;
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocusLike);
    window.removeEventListener("pageshow", onFocusLike);
  };
}

/** Solo tests. */
export function triggerVoiceVisibleRecoveryForTests(): void {
  runVisibleRecovery();
}

export function getVoiceHiddenAtMsForTests(): number {
  return hiddenAtMs;
}

export function resetVoiceLifecycleForTests(): void {
  hiddenAtMs = 0;
  visibleHandlers.clear();
  hubInstalled = false;
}
