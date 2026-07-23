/**
 * Enfoque jul 2026 + GPS (jul 2026):
 * - speechSynthesis por temporizador OFF (congelaba móvil).
 * - Coaching estable = clips Web Audio (`gpsVoice.ts` + `/public/voice/*.mp3`),
 *   mismo patrón que un GPS: desbloquear AudioContext una vez y hablar sin
 *   pelear con el hilo principal.
 * - TTS del navegador queda como fallback de gesto si falta el pack.
 *
 * Reactivar TTS por reloj (legado): localStorage `sistemicar_timer_voice=1`.
 */

const TIMER_VOICE_LS_KEY = "sistemicar_timer_voice";

/** Off por defecto — nuevo enfoque anti-congelamiento. */
export const TIMER_DRIVEN_VOICE_DEFAULT = false;

export function isTimerDrivenVoiceEnabled(): boolean {
  if (typeof window === "undefined") return TIMER_DRIVEN_VOICE_DEFAULT;
  try {
    const raw = localStorage.getItem(TIMER_VOICE_LS_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* noop */
  }
  return TIMER_DRIVEN_VOICE_DEFAULT;
}

/** Solo tests / consola operador. */
export function setTimerDrivenVoiceEnabled(on: boolean): void {
  try {
    localStorage.setItem(TIMER_VOICE_LS_KEY, on ? "1" : "0");
  } catch {
    /* noop */
  }
}
