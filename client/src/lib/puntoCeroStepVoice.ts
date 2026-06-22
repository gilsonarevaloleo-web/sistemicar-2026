/**
 * Orquestador TTS solo Punto Cero — pasos 1→4 con auto-avance.
 * Usa speechSynthesis directo (no speechQueue global).
 */
import { getIsRemountingJornada } from "./jornadaRemount";
import type { PuntoCeroEtapaKey } from "./puntoCeroGuides";
import {
  PUNTO_CERO_ETAPAS,
  PUNTO_CERO_ETAPA4_TRANSICION,
  PUNTO_CERO_INTRO_VOZ,
} from "./puntoCeroGuides";
import { pickCalmDeepSpanishVoice, primeSpanishVoices } from "./spanishTtsVoice";
import { isPuntoCeroVoiceEnabled } from "./tikSound";

export const PUNTO_CERO_GUIA_STEP_COUNT = 4;
const STEP_ADVANCE_PAUSE_MS = 800;
const PHRASE_GAP_MS = 820;

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

let speakingToken = 0;
let activePasoIndex = -1;
let phraseQueue: string[] = [];
let userCancelled = false;
let pausedByRemount = false;
let callbacksRef: PuntoCeroStepVoiceCallbacks = {};
let pasosRef: PuntoCeroPasoDef[] = [];
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

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

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
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

export function cancelPuntoCeroStepVoice(): void {
  userCancelled = true;
  speakingToken += 1;
  activePasoIndex = -1;
  phraseQueue = [];
  clearStepTimers();
  try {
    getSynth()?.cancel();
  } catch {
    /* noop */
  }
}

export function pausePuntoCeroStepVoiceForRemount(): void {
  pausedByRemount = true;
  cancelPuntoCeroStepVoice();
}

export function clearPuntoCeroStepVoiceRemountPause(): void {
  pausedByRemount = false;
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
  const synth = getSynth();
  if (!synth) {
    finishSequenceIdle();
    return;
  }

  if (phraseQueue.length === 0) {
    const idx = activePasoIndex;
    if (idx >= 0) callbacksRef.onPasoComplete?.(idx);
    scheduleAutoAdvance(token, idx);
    return;
  }

  const text = phraseQueue.shift()!;
  primeSpanishVoices();
  const utt = new SpeechSynthesisUtterance(text);
  applyStepUtterance(utt);
  utt.onend = () => {
    gapTimer = setTimeout(() => {
      gapTimer = null;
      drainPhrases(token);
    }, PHRASE_GAP_MS);
  };
  utt.onerror = () => {
    drainPhrases(token);
  };
  try {
    synth.speak(utt);
  } catch {
    drainPhrases(token);
  }
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

  userCancelled = false;
  callbacksRef = callbacks;
  pasosRef = pasos;
  clearStepTimers();
  try {
    getSynth()?.cancel();
  } catch {
    /* noop */
  }

  const token = ++speakingToken;
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
  cancelPuntoCeroStepVoice();
  callbacksRef = {};
  pasosRef = [];
}
