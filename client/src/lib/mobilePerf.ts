import { isCoarseConcienciaDevice } from "./concienciaClock";

/** Móvil / pantalla táctil estrecha: modo rendimiento conservador. */
export function isMobilePerfMode(): boolean {
  return isCoarseConcienciaDevice();
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
