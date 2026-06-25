/**
 * Orquestador TTS Punto Cero — pasos 1→4 con auto-avance.
 * Emite por canal `puntocero` del VoiceEngine (speechQueue unificado).
 */
import { getIsRemountingJornada } from "./jornadaRemount";
import type { PuntoCeroEtapaKey } from "./puntoCeroGuides";
import {
  PUNTO_CERO_ETAPAS,
  PUNTO_CERO_ETAPA4_TRANSICION,
  PUNTO_CERO_INTRO_VOZ,
} from "./puntoCeroGuides";
import { resetPuntoCeroVoiceQueue } from "./puntoCeroVoice";
import { pickCalmDeepSpanishVoice, primeSpanishVoices } from "./spanishTtsVoice";
import {
  isSpeechSynthesisUnlocked,
  logVoiceEvent,
  unlockSpeechSynthesis,
  voiceEngine,
} from "./speechQueue";
import { isPuntoCeroVoiceEnabled } from "./tikSound";

export const PUNTO_CERO_GUIA_STEP_COUNT = 4;
const STEP_ADVANCE_PAUSE_MS = 800;
const PHRASE_GAP_MS = 820;
const PC_STEP_VOICE_KEY = "pc-step-guia";

export type PuntoCeroPasoDef = {
  index: 0 | 1 | 2 | 3;
  etapa: PuntoCeroEtapaKey;
  titulo: string;
  frases: readonly string[];
};

export type PuntoCeroStepVoiceCallbacks = {
  onPasoStart?: (index: number) => void;
  onPasoComplete?: (index: number) => void;
  onAutoAdvance?: (nextIndex: number) => void;
  onSequenceIdle?: () => void;
};

export type PuntoCeroStepVoiceDiagnostics = {
  speakingToken: number;
  activePasoIndex: number;
  phraseQueueLen: number;
  pausedByRemount: boolean;
  hasRemountSnapshot: boolean;
  speechUnlocked: boolean;
  synthSpeaking: boolean;
  synthPending: boolean;
  engineSpeaking: boolean;
  engineQueueLen: number;
  engineChannel: string | null;
};

type RemountSnapshot = {
  activePasoIndex: number;
  phraseQueue: string[];
  token: number;
  callbacks: PuntoCeroStepVoiceCallbacks;
  pasos: PuntoCeroPasoDef[];
};

let speakingToken = 0;
let activePasoIndex = -1;
let phraseQueue: string[] = [];
let userCancelled = false;
let pausedByRemount = false;
let remountSnapshot: RemountSnapshot | null = null;
let callbacksRef: PuntoCeroStepVoiceCallbacks = {};
let pasosRef: PuntoCeroPasoDef[] = [];
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function logPcStepDiagnostics(event: string, extra?: Record<string, unknown>): void {
  logVoiceEvent(`pc-step-${event}`, {
    speakingToken,
    activePasoIndex,
    phraseQueueLen: phraseQueue.length,
    pausedByRemount,
    hasRemountSnapshot: remountSnapshot != null,
    ...extra,
  });
}

function clearStepTimers(): void {
  if (gapTimer) {
    clearTimeout(gapTimer);
    gapTimer = null;
  }
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function haltPuntoCeroStepChannel(): void {
  voiceEngine.haltSpeechOnChannels(["puntocero"]);
}

export function buildPuntoCeroPasos(includeIntro: boolean): PuntoCeroPasoDef[] {
  const keys: PuntoCeroEtapaKey[] = ["etapa1", "etapa2", "etapa3", "etapa4"];
  return keys.map((key, index) => {
    const guide = PUNTO_CERO_ETAPAS[key];
    let frases: readonly string[] = guide.voz;
    if (index === 0 && includeIntro) {
      frases = [...PUNTO_CERO_INTRO_VOZ, ...guide.voz];
    }
    if (index === 2) {
      frases = [...guide.voz, ...PUNTO_CERO_ETAPA4_TRANSICION];
    }
    return {
      index: index as 0 | 1 | 2 | 3,
      etapa: key,
      titulo: guide.label,
      frases,
    };
  });
}

export function getPuntoCeroStepVoicePaso(): number {
  return activePasoIndex;
}

export function isPuntoCeroStepVoiceActive(): boolean {
  return activePasoIndex >= 0;
}

export function isPuntoCeroStepVoicePausedByRemount(): boolean {
  return pausedByRemount;
}

export function getPuntoCeroStepVoiceDiagnostics(): PuntoCeroStepVoiceDiagnostics {
  const synth = getSynth();
  return {
    speakingToken,
    activePasoIndex,
    phraseQueueLen: phraseQueue.length,
    pausedByRemount,
    hasRemountSnapshot: remountSnapshot != null,
    speechUnlocked: isSpeechSynthesisUnlocked(),
    synthSpeaking: synth?.speaking ?? false,
    synthPending: synth?.pending ?? false,
    engineSpeaking: voiceEngine.isSpeaking(),
    engineQueueLen: voiceEngine.queueLength(),
    engineChannel: voiceEngine.currentChannel(),
  };
}

export function cancelPuntoCeroStepVoice(): void {
  userCancelled = true;
  speakingToken += 1;
  activePasoIndex = -1;
  phraseQueue = [];
  remountSnapshot = null;
  clearStepTimers();
  voiceEngine.stopChannel("puntocero");
  logPcStepDiagnostics("cancel");
}

/** Libera TTS y colas al desmontar Punto Cero — evita canal mudo al día siguiente. */
export function teardownPuntoCeroStepVoice(): void {
  cancelPuntoCeroStepVoice();
  clearPuntoCeroStepVoiceRemountPause();
  callbacksRef = {};
  pasosRef = [];
  const synth = getSynth();
  if (synth) {
    try {
      synth.cancel();
    } catch {
      /* noop */
    }
  }
  resetPuntoCeroVoiceQueue();
  logPcStepDiagnostics("teardown");
}

/** Pausa con snapshot para reanudar tras remontaje Jornada (no incrementa token). */
export function pausePuntoCeroStepVoiceForRemount(): void {
  if (activePasoIndex >= 0 || phraseQueue.length > 0) {
    remountSnapshot = {
      activePasoIndex,
      phraseQueue: [...phraseQueue],
      token: speakingToken,
      callbacks: { ...callbacksRef },
      pasos: [...pasosRef],
    };
  }
  pausedByRemount = true;
  clearStepTimers();
  haltPuntoCeroStepChannel();
  logPcStepDiagnostics("pause-remount");
}

/** Reanuda guía pasos tras foreground si había snapshot de remount. */
export function resumeStepVoiceAfterRemount(): void {
  if (!pausedByRemount) return;

  const snap = remountSnapshot;
  pausedByRemount = false;
  remountSnapshot = null;

  if (!snap || !isPuntoCeroVoiceEnabled()) {
    logPcStepDiagnostics("resume-remount-skip", { hadSnapshot: !!snap });
    return;
  }

  if (getIsRemountingJornada()) {
    remountSnapshot = snap;
    pausedByRemount = true;
    return;
  }

  callbacksRef = snap.callbacks;
  pasosRef = snap.pasos;
  activePasoIndex = snap.activePasoIndex;
  phraseQueue = [...snap.phraseQueue];
  userCancelled = false;
  speakingToken = snap.token;

  unlockSpeechSynthesis(true);
  primeSpanishVoices();

  logPcStepDiagnostics("resume-remount", {
    token: speakingToken,
    queueLen: phraseQueue.length,
  });

  if (phraseQueue.length > 0) {
    drainPhrases(speakingToken);
  } else if (activePasoIndex >= 0) {
    scheduleAutoAdvance(speakingToken, activePasoIndex);
  }
}

export function clearPuntoCeroStepVoiceRemountPause(): void {
  pausedByRemount = false;
  remountSnapshot = null;
}

function applyStepUtterance(u: SpeechSynthesisUtterance): void {
  u.lang = "es-ES";
  u.rate = 0.95;
  u.pitch = 0.92;
  u.volume = 0.52;
  const voice = pickCalmDeepSpanishVoice();
  if (voice) u.voice = voice;
}

function finishSequenceIdle(): void {
  activePasoIndex = -1;
  phraseQueue = [];
  clearStepTimers();
  callbacksRef.onSequenceIdle?.();
  logPcStepDiagnostics("sequence-idle");
}

function scheduleAutoAdvance(token: number, completedIndex: number): void {
  if (completedIndex >= PUNTO_CERO_GUIA_STEP_COUNT - 1) {
    finishSequenceIdle();
    return;
  }
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    if (token !== speakingToken || userCancelled || pausedByRemount || getIsRemountingJornada()) {
      finishSequenceIdle();
      return;
    }
    const next = (completedIndex + 1) as 0 | 1 | 2 | 3;
    callbacksRef.onAutoAdvance?.(next);
    startPasoInternal(next, token);
  }, STEP_ADVANCE_PAUSE_MS);
}

function drainPhrases(token: number): void {
  if (token !== speakingToken || userCancelled || pausedByRemount || getIsRemountingJornada()) {
    finishSequenceIdle();
    return;
  }
  if (!getSynth()) {
    finishSequenceIdle();
    return;
  }
  if (!isSpeechSynthesisUnlocked()) {
    unlockSpeechSynthesis(true);
    if (!isSpeechSynthesisUnlocked()) {
      logPcStepDiagnostics("speak-blocked-unlock");
      finishSequenceIdle();
      return;
    }
  }

  if (phraseQueue.length === 0) {
    const idx = activePasoIndex;
    if (idx >= 0) callbacksRef.onPasoComplete?.(idx);
    scheduleAutoAdvance(token, idx);
    return;
  }

  const text = phraseQueue[0]!;
  const isLastInStep = phraseQueue.length === 1;
  primeSpanishVoices();

  logPcStepDiagnostics("enqueue-phrase", { textLen: text.length, isLastInStep });

  voiceEngine.enqueue({
    text,
    channel: "puntocero",
    key: PC_STEP_VOICE_KEY,
    pauseAfterMs: isLastInStep ? 0 : PHRASE_GAP_MS,
    configure: applyStepUtterance,
    onItemEnd: () => {
      if (token !== speakingToken || userCancelled || pausedByRemount || getIsRemountingJornada()) {
        finishSequenceIdle();
        return;
      }
      phraseQueue.shift();
      if (phraseQueue.length === 0) {
        const idx = activePasoIndex;
        if (idx >= 0) callbacksRef.onPasoComplete?.(idx);
        scheduleAutoAdvance(token, idx);
      } else {
        drainPhrases(token);
      }
    },
  });
}

function startPasoInternal(index: 0 | 1 | 2 | 3, token: number): void {
  const paso = pasosRef[index];
  if (!paso) {
    finishSequenceIdle();
    return;
  }
  activePasoIndex = index;
  phraseQueue = [...paso.frases];
  callbacksRef.onPasoStart?.(index);
  logPcStepDiagnostics("paso-start", { index });
  drainPhrases(token);
}

/** Lee un paso (0= paso 1 UI). Auto-avanza al siguiente salvo paso 4. */
export function speakPuntoCeroPaso(
  index: 0 | 1 | 2 | 3,
  pasos: PuntoCeroPasoDef[],
  callbacks: PuntoCeroStepVoiceCallbacks
): void {
  if (!isPuntoCeroVoiceEnabled()) return;
  if (getIsRemountingJornada() || pausedByRemount) return;

  unlockSpeechSynthesis(true);
  userCancelled = false;
  callbacksRef = callbacks;
  pasosRef = pasos;
  clearStepTimers();
  resetPuntoCeroVoiceQueue();

  const token = ++speakingToken;
  logPcStepDiagnostics("speak-paso", { index, token });
  startPasoInternal(index, token);
}

/** Inicia cadena desde un paso (usuario tocó Iniciar o un paso). */
export function startPuntoCeroGuiaPasos(
  startIndex: 0 | 1 | 2 | 3,
  pasos: PuntoCeroPasoDef[],
  callbacks: PuntoCeroStepVoiceCallbacks
): void {
  clearPuntoCeroStepVoiceRemountPause();
  userCancelled = false;
  speakPuntoCeroPaso(startIndex, pasos, callbacks);
}

/** Solo tests — reinicia estado interno. */
export function resetPuntoCeroStepVoiceForTests(): void {
  pausedByRemount = false;
  remountSnapshot = null;
  cancelPuntoCeroStepVoice();
  callbacksRef = {};
  pasosRef = [];
}
