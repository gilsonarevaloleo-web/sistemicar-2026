import { isCoarseConcienciaDevice } from "./concienciaClock";

const JORNADA_FULL_MODE_KEY = "sistemicar_jornada_full_mode";

/** Móvil / pantalla táctil estrecha: modo rendimiento conservador. */
export function isMobilePerfMode(): boolean {
  return isCoarseConcienciaDevice();
}

/** Modo completo (anillo live, voz, entropía catch-up) activado por el operador en móvil. */
export function isJornadaFullModeEnabled(): boolean {
  try {
    return localStorage.getItem(JORNADA_FULL_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setJornadaFullModeEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(JORNADA_FULL_MODE_KEY, "1");
    else localStorage.removeItem(JORNADA_FULL_MODE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Modo supervivencia móvil: anillo live pesado y catch-up de entropía diferidos.
 * Activo por defecto en dispositivos coarse hasta que el operador active modo completo.
 * No silencia pilares de voz (tronco A.2) — eso lo deciden los toggles por canal.
 */
export function shouldRunMobileSurvival(): boolean {
  if (!isMobilePerfMode()) return false;
  return !isJornadaFullModeEnabled();
}

/**
 * Voz TTS permitida a nivel de presupuesto móvil.
 * Supervivencia NO la apaga: los canales (situación / desglosador / puerta) siguen
 * en `tikSound.ts`. Apagar voz aquí dejaba el celular mudo tras meses de freeze.
 */
export function shouldAllowJornadaVoice(): boolean {
  return true;
}

/** En móvil omitimos drop-shadow en SVG (costoso en GPU). */
export function svgDropShadowFilter(filter: string | undefined): string | undefined {
  if (isMobilePerfMode() || !filter || filter === "none") return undefined;
  return filter;
}

export const MOBILE_PERF = {
  ATTENTION_INITIAL_DEFER_MS: 18_000,
  ATTENTION_TICK_MS: 25_000,
  ATTENTION_MIN_GAP_MS: 10_000,
  ANILLO_DEFER_MS: 6_000,
  ANILLO_CACHE_BUCKET_MS: 6_000,
  /** Reloj global del anillo en foreground (móvil) — 1 s para segunderos nativos. */
  CLOCK_MS_FOREGROUND: 1_000,
  SKIP_RETRO_CENTINELA: true,
} as const;
