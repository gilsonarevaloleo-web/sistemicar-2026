import {
  interruptAllSpeechSynth,
  speakUtterance,
  subscribeSpeechExternalCancel,
  unlockSpeechSynthesis,
  warmupSpeechSynthesis,
  isSpeechSynthesisUnlocked,
} from "./speechQueue";
import { isPuntoCeroVoiceEnabled } from "./tikSound";
import {
  pickCalmDeepSpanishVoice,
  pickPleasantSpanishVoice,
  primeSpanishVoices,
} from "./spanishTtsVoice";

export { pickCalmDeepSpanishVoice, pickCalmDeepSpanishVoice as pickPleasantSpanishVoice } from "./spanishTtsVoice";
import {
  colorInmersionVoz,
  MENSAJE_PASIVA_DIA,
  MENSAJE_PASIVA_NOCHE,
  MENSAJE_REACTIVACION_DIA,
  PUNTO_CERO_ETAPA4_TRANSICION,
  PUNTO_CERO_ETAPAS,
  PUNTO_CERO_INTRO_VOZ,
} from "./puntoCeroGuides";

export type { PuntoCeroEtapaKey } from "./puntoCeroGuides";
export {
  colorInmersionVoz,
  MENSAJE_PASIVA_DIA,
  MENSAJE_PASIVA_NOCHE,
  mensajePasivaDia,
  mensajePasivaNoche,
  mensajeReactivacionDia,
  PUNTO_CERO_ETAPAS,
  PUNTO_CERO_ETAPAS_LIST,
} from "./puntoCeroGuides";
import type { PuntoCeroEtapaKey } from "./puntoCeroGuides";

/** Susurros de guía nocturna — uno cada 60s en fase pasiva. */
export const SUSURROS_NOCHE: readonly string[] = [
  "Soltá la mandíbula… nadie te apura.",
  "Dejá que el cuerpo se hunda… en la cama o en la silla.",
  "La respiración va sola… solo observala.",
  "Si aparece un pensamiento… dejalo pasar como una nube.",
  "Aflojá los hombros… no tenés que sostener nada ahora.",
  "El silencio te sostiene… confiá en el punto neutro.",
  "Cada exhalación… es una rendición amable.",
  "No hay tarea pendiente… solo descanso.",
  "Tu sistema nervioso… puede apagarse a su ritmo.",
  "Mañana retomás… ahora, solo esto.",
];

export type PuntoCeroVoiceProfile = "calm" | "night" | "day" | "reactivation";

const VOICE_PROFILES: Record<
  PuntoCeroVoiceProfile,
  { rate: number; pitch: number; volume: number; pauseMs: number }
> = {
  calm: { rate: 0.78, pitch: 0.92, volume: 0.52, pauseMs: 820 },
  night: { rate: 0.72, pitch: 0.9, volume: 0.45, pauseMs: 980 },
  day: { rate: 0.8, pitch: 0.94, volume: 0.52, pauseMs: 760 },
  reactivation: { rate: 0.86, pitch: 0.96, volume: 0.56, pauseMs: 520 },
};

let pcQueue: string[] = [];
let pcSpeaking = false;
let pcPauseTimer: ReturnType<typeof setTimeout> | null = null;
let pcProfile: PuntoCeroVoiceProfile = "calm";
let pcVoicesLoadBypass = false;

const PC_VOICES_LOAD_WAIT_MS = 450;

if (typeof window !== "undefined") {
  subscribeSpeechExternalCancel(() => {
    clearPuntoCeroPauseTimer();
    pcQueue = [];
    pcSpeaking = false;
  });
}

function clearPuntoCeroPauseTimer(): void {
  if (pcPauseTimer) {
    clearTimeout(pcPauseTimer);
    pcPauseTimer = null;
  }
}

function applyCalmVoice(u: SpeechSynthesisUtterance, profile: PuntoCeroVoiceProfile): void {
  const p = VOICE_PROFILES[profile];
  u.lang = "es-ES";
  u.rate = p.rate;
  u.pitch = p.pitch;
  u.volume = p.volume;
  const voice = pickCalmDeepSpanishVoice();
  if (voice) u.voice = voice;
}

function resetPuntoCeroQueueLocal(): void {
  clearPuntoCeroPauseTimer();
  pcQueue = [];
  pcSpeaking = false;
  pcVoicesLoadBypass = false;
}

/** Recuperación de emergencia — expuesto para speechRecovery. */
export function resetPuntoCeroVoiceQueue(): void {
  resetPuntoCeroQueueLocal();
}

function processPuntoCeroQueue(opts?: { force?: boolean }): void {
  if (pcSpeaking || pcQueue.length === 0) return;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    pcQueue = [];
    return;
  }
  if (!opts?.force && !isSpeechSynthesisUnlocked()) return;

  primeSpanishVoices();
  const voiceCount = window.speechSynthesis.getVoices().length;
  if (voiceCount === 0) {
    if (!pcVoicesLoadBypass) {
      pcVoicesLoadBypass = true;
      const retry = () => processPuntoCeroQueue(opts);
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          pcVoicesLoadBypass = false;
          retry();
        },
        { once: true }
      );
      window.setTimeout(retry, PC_VOICES_LOAD_WAIT_MS);
      return;
    }
  } else {
    pcVoicesLoadBypass = false;
  }

  if (voiceCount === 0 && pcVoicesLoadBypass) {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[puntoCeroVoice] sin voces TTS — fallback lang es-ES");
    }
  }

  const text = pcQueue.shift()!;
  pcSpeaking = true;
  const profile = pcProfile;
  const pauseMs = VOICE_PROFILES[profile].pauseMs;

  const ok = speakUtterance(text, {
    onend: () => {
      pcSpeaking = false;
      if (pcQueue.length > 0) {
        pcPauseTimer = setTimeout(() => processPuntoCeroQueue(opts), pauseMs);
      }
    },
    onerror: () => {
      pcSpeaking = false;
      processPuntoCeroQueue(opts);
    },
  }, u => applyCalmVoice(u, profile));

  if (!ok) {
    pcSpeaking = false;
    processPuntoCeroQueue(opts);
  }
}

/** Encola frases con pausas — fluidez meditativa, sin cortes bruscos. */
export function speakPuntoCeroSequence(
  phrases: readonly string[],
  profile: PuntoCeroVoiceProfile = "calm",
  cancelPrevious = true
): void {
  const filtered = phrases.map(p => p.trim()).filter(Boolean);
  if (filtered.length === 0 || !isPuntoCeroVoiceEnabled()) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  unlockSpeechSynthesis(true);
  warmupSpeechSynthesis(true);
  pcProfile = profile;

  if (cancelPrevious) {
    interruptAllSpeechSynth(true);
    resetPuntoCeroQueueLocal();
  }

  const MAX_PC_PHRASES = 12;
  pcQueue.push(...filtered.slice(0, MAX_PC_PHRASES));
  processPuntoCeroQueue({ force: true });
}

/** Desbloqueo TTS en el mismo gesto del usuario (pointerdown en etapa/color). */
export function unlockPuntoCeroSpeechFromGesture(): void {
  unlockSpeechSynthesis(true);
  warmupSpeechSynthesis(true);
}

export function susurroNocheTexto(sessionStartAt: number, now: number): string {
  const idx = Math.floor((now - sessionStartAt) / 60_000) % SUSURROS_NOCHE.length;
  return SUSURROS_NOCHE[idx]!;
}

export function speakPleasant(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  interruptAllSpeechSynth(false);
  resetPuntoCeroQueueLocal();
  speakUtterance(text, {}, u => {
    u.lang = "es-ES";
    u.rate = opts?.rate ?? VOICE_PROFILES.calm.rate;
    u.pitch = opts?.pitch ?? VOICE_PROFILES.calm.pitch;
    u.volume = opts?.volume ?? VOICE_PROFILES.calm.volume;
    const voice = pickPleasantSpanishVoice();
    if (voice) u.voice = voice;
  });
}

export function stopPleasantVoice(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  interruptAllSpeechSynth(false);
  resetPuntoCeroQueueLocal();
}

/** TTS de Punto Cero con warmup (requerido en móvil tras gesto del usuario). */
export function speakPuntoCeroGuide(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number; profile?: PuntoCeroVoiceProfile }
): void {
  if (!text.trim() || !isPuntoCeroVoiceEnabled()) return;
  const profile = opts?.profile ?? "calm";
  if (opts?.rate != null || opts?.pitch != null || opts?.volume != null) {
    unlockSpeechSynthesis(true);
    warmupSpeechSynthesis(true);
    speakPleasant(text, opts);
    return;
  }
  speakPuntoCeroSequence(splitMeditativePhrases(text), profile);
}

function splitMeditativePhrases(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|(?<=[;—])\s+/)
    .map(p => p.trim())
    .filter(Boolean);
}

export function speakEtapaPuntoCero(
  etapa: PuntoCeroEtapaKey,
  opts?: { intro?: boolean; transicionEtapa4?: boolean }
): void {
  const guide = PUNTO_CERO_ETAPAS[etapa];
  if (!guide.voz.length || !isPuntoCeroVoiceEnabled()) return;

  const sequence: string[] = opts?.intro ? [...PUNTO_CERO_INTRO_VOZ, ...guide.voz] : [...guide.voz];
  if (opts?.transicionEtapa4 && etapa === "etapa3") {
    sequence.push(...PUNTO_CERO_ETAPA4_TRANSICION);
  }
  speakPuntoCeroSequence(sequence, "calm");
}

export function speakEtapa4Intro(): void {
  speakPuntoCeroSequence(PUNTO_CERO_ETAPAS.etapa4.voz, "calm");
}

export function speakColorInmersion(zona: string, indice = 0, opts?: { incluirIntroEtapa4?: boolean }): void {
  const phrases: string[] = [];
  if (opts?.incluirIntroEtapa4) {
    phrases.push(...PUNTO_CERO_ETAPAS.etapa4.voz);
  }
  phrases.push(...colorInmersionVoz(zona, indice));
  speakPuntoCeroSequence(phrases, "calm");
}

export function speakReactivacionDia(): void {
  speakPuntoCeroSequence(MENSAJE_REACTIVACION_DIA, "reactivation");
}
