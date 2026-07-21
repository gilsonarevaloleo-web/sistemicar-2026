/**
 * Enfoque nuevo (jul 2026): la voz por temporizador/umbrales quedó fuera de control
 * en móvil (cola TTS + retries + cancelPrevious compitiendo con persist/Firebase).
 *
 * Mientras el presupuesto de hilo principal no esté cerrado, SOLO se permite voz
 * atada a gesto del operador (abrir ring, Cumplido/Fallado, intro post-tap).
 * Alertas por reloj (bandas, 2 min, cupo, sobra, fila auto) → chime/vibración/notify,
 * sin speechSynthesis.
 *
 * Reactivar: set TIMER_DRIVEN_VOICE_ENABLED = true o localStorage
 * `sistemicar_timer_voice=1` + hard refresh.
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
