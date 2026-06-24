import {
  subscribeSpeechExternalCancel,
  unlockSpeechSynthesis,
  warmupSpeechSynthesis,
  voiceEngine,
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
  PUNTO_CERO_PASO5,
  PUNTO_CERO_PASOS_UI,
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

const MAX_PC_PHRASES = 48;
const PC_MEDITATIVE_KEY = "pc-meditative";

if (typeof window !== "undefined") {
  subscribeSpeechExternalCancel(() => {
    voiceEngine.stopChannel("puntocero");
  });
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

/** Recuperación de emergencia — expuesto para speechRecovery. */
export function resetPuntoCeroVoiceQueue(): void {
  voiceEngine.stopChannel("puntocero");
}

function preemptForPuntoCero(cancelOthers: boolean): void {
  voiceEngine.stopChannel("puntocero");
  if (cancelOthers) {
    voiceEngine.stopChannel("conquista");
    voiceEngine.stopChannel("situacion");
  }
}

function enqueuePuntoCeroPhrases(
  phrases: readonly string[],
  profile: PuntoCeroVoiceProfile,
  cancelPrevious: boolean
): void {
  const filtered = phrases.map(p => p.trim()).filter(Boolean).slice(0, MAX_PC_PHRASES);
  if (filtered.length === 0) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  unlockSpeechSynthesis(true);
  warmupSpeechSynthesis(true);
  primeSpanishVoices();

  if (cancelPrevious) {
    preemptForPuntoCero(true);
  }

  const pauseMs = VOICE_PROFILES[profile].pauseMs;
  for (let i = 0; i < filtered.length; i++) {
    const text = filtered[i]!;
    voiceEngine.enqueue({
      text,
      channel: "puntocero",
      key: PC_MEDITATIVE_KEY,
      pauseAfterMs: i < filtered.length - 1 ? pauseMs : 0,
      configure: u => applyCalmVoice(u, profile),
    });
  }
}

/** Encola frases con pausas — fluidez meditativa vía VoiceEngine canal puntocero. */
export function speakPuntoCeroSequence(
  phrases: readonly string[],
  profile: PuntoCeroVoiceProfile = "calm",
  cancelPrevious = true
): void {
  if (filteredEmpty(phrases) || !isPuntoCeroVoiceEnabled()) return;
  enqueuePuntoCeroPhrases(phrases, profile, cancelPrevious);
}

function filteredEmpty(phrases: readonly string[]): boolean {
  return phrases.map(p => p.trim()).filter(Boolean).length === 0;
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
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
  preemptForPuntoCero(true);
  unlockSpeechSynthesis(true);
  warmupSpeechSynthesis(true);
  voiceEngine.enqueue({
    text: text.trim(),
    channel: "puntocero",
    key: PC_MEDITATIVE_KEY,
    configure: u => {
      u.lang = "es-ES";
      u.rate = opts?.rate ?? VOICE_PROFILES.calm.rate;
      u.pitch = opts?.pitch ?? VOICE_PROFILES.calm.pitch;
      u.volume = opts?.volume ?? VOICE_PROFILES.calm.volume;
      const voice = pickPleasantSpanishVoice();
      if (voice) u.voice = voice;
    },
  });
}

export function stopPleasantVoice(): void {
  voiceEngine.stopChannel("puntocero");
}

/** TTS de Punto Cero con warmup (requerido en móvil tras gesto del usuario). */
export function speakPuntoCeroGuide(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number; profile?: PuntoCeroVoiceProfile }
): void {
  if (!text.trim() || !isPuntoCeroVoiceEnabled()) return;
  const profile = opts?.profile ?? "calm";
  if (opts?.rate != null || opts?.pitch != null || opts?.volume != null) {
    speakPleasant(text, opts);
    return;
  }
  speakPuntoCeroSequence(splitMeditativePhrases(text), profile, false);
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

/** Solo tests — frases pendientes en cola engine (canal puntocero). */
export function getPuntoCeroQueueDepthForTests(): number {
  return voiceEngine.queueLength();
}
