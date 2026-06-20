/** Selección de voz TTS en español — compartido por cola general y Punto Cero. */

let voicesCache: SpeechSynthesisVoice[] | null = null;

export type TtsVoiceChannel = "conquista" | "situacion" | "puntocero";

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (voicesCache?.length) return voicesCache;
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

function scoreSpanishVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  const blob = `${v.name} ${v.voiceURI} ${v.lang}`.toLowerCase();
  if (/^es-es/i.test(v.lang)) score += 50;
  else if (/^es-/i.test(v.lang)) score += 28;
  if (/google.*espa(?!.*estados)/i.test(v.name)) score += 38;
  if (/microsoft.*(laura|elena|sabina|helena)/i.test(blob)) score += 42;
  if (/natural|neural|premium|online/i.test(blob)) score += 24;
  if (/female|mujer|helena|laura|sabina|elena|monica|paulina|soledad|paloma/i.test(blob)) score += 20;
  if (/male|hombre|diego|jorge|pablo|enrique|carlos|daniel|antonio|david/i.test(blob)) score -= 18;
  if (/estados unidos|latino|méxico|mexico|mexican/i.test(blob)) score -= 8;
  if (/english|en-us|en-gb/i.test(v.lang)) score -= 40;
  return score;
}

function scoreFirmSpanishVoice(v: SpeechSynthesisVoice): number {
  let score = scoreSpanishVoice(v);
  const blob = `${v.name} ${v.voiceURI} ${v.lang}`.toLowerCase();
  if (/male|hombre|diego|jorge|pablo|enrique|carlos|daniel|antonio|david/i.test(blob)) score += 22;
  if (/female|mujer|helena|laura|sabina|elena|monica|paulina|soledad|paloma/i.test(blob)) score -= 12;
  return score;
}

function scoreDeepSpanishVoice(v: SpeechSynthesisVoice): number {
  let score = scoreSpanishVoice(v);
  const blob = `${v.name} ${v.voiceURI} ${v.lang}`.toLowerCase();
  if (/male|hombre|diego|jorge|pablo|enrique|carlos|daniel|antonio|david/i.test(blob)) score += 18;
  return score;
}

function pickBestVoice(scorer: (v: SpeechSynthesisVoice) => number): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices.length) return null;
  const es = voices.filter(v => /^es/i.test(v.lang));
  const pool = es.length ? es : voices;
  const ranked = [...pool].sort((a, b) => scorer(b) - scorer(a));
  return ranked[0] ?? voices[0] ?? null;
}

export function primeSpanishVoices(): void {
  loadVoices();
}

/** Voz en español clara — prioriza es-ES, neurales y timbre femenino del sistema. */
export function pickCalmDeepSpanishVoice(): SpeechSynthesisVoice | null {
  return pickBestVoice(scoreSpanishVoice);
}

/** Alias histórico — misma selección calmada es-ES. */
export const pickPleasantSpanishVoice = pickCalmDeepSpanishVoice;

function pickFirmSpanishVoice(): SpeechSynthesisVoice | null {
  return pickBestVoice(scoreFirmSpanishVoice);
}

function pickNeutralSpanishVoice(): SpeechSynthesisVoice | null {
  return pickBestVoice(scoreSpanishVoice);
}

function pickGraveSpanishVoice(): SpeechSynthesisVoice | null {
  return pickBestVoice(scoreDeepSpanishVoice);
}

/** Alertas operativas (puerta, situación) — ritmo natural, neutro. */
export function applySituacionSpanishUtterance(u: SpeechSynthesisUtterance): void {
  const voice = pickNeutralSpanishVoice();
  if (voice) u.voice = voice;
  u.lang = "es-ES";
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 0.94;
}

/** Desglosador conquista — ritmo firme, timbre más decidido. */
export function applyConquistaSpanishUtterance(u: SpeechSynthesisUtterance): void {
  const voice = pickFirmSpanishVoice();
  if (voice) u.voice = voice;
  u.lang = "es-ES";
  u.rate = 1.05;
  u.pitch = 1.1;
  u.volume = 0.94;
}

/** Fallback Punto Cero cuando no hay configure externo. */
export function applyPuntoCeroDefaultUtterance(u: SpeechSynthesisUtterance): void {
  const voice = pickGraveSpanishVoice();
  if (voice) u.voice = voice;
  u.lang = "es-ES";
  u.rate = 0.9;
  u.pitch = 0.8;
  u.volume = 0.52;
}

/** Personalidad por canal — conquista / situación / puntocero. */
export function applyCalmSpanishUtterance(u: SpeechSynthesisUtterance, channel?: TtsVoiceChannel): void {
  if (channel === "conquista") {
    applyConquistaSpanishUtterance(u);
    return;
  }
  if (channel === "puntocero") {
    applyPuntoCeroDefaultUtterance(u);
    return;
  }
  applySituacionSpanishUtterance(u);
}

/** Alias histórico — alertas de ubicación (situación). */
export function applyAlertSpanishUtterance(u: SpeechSynthesisUtterance): void {
  applySituacionSpanishUtterance(u);
}
