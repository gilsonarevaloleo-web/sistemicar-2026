/**
 * Política temporal única para entropía, centinela, cierre y atención de segmentos.
 * Ningún módulo debe duplicar estos umbrales.
 */
import type { Vehicle } from "./persistence";
import { filterVehiclesForAnilloCoverage } from "./ghostVehicleEngine";
import { isParentCoveragePaused } from "./vehiculoPausa";

export const ENTROPY_TIME_POLICY = {
  /** Contador en vivo: el hueco cuenta desde el segundo 0 (sin colchón). */
  LIVE_GAP_GRACE_MS: 0,
  /** Centinela: espera antes de materializar Modo Centinela. */
  CENTINELA_DELAY_MS: 120_000,
  /** Cierre de jornada / sellado retroactivo: minutos restados al inicio de cada hueco. */
  CLOSE_GAP_GRACE_MIN: 2,
  /** Ventana de puerta de segmento (± minutos). */
  PUERTA_MARGIN_MIN: 5,
  /** Gracia de cruce de segmento (desglosador / entropía-atención). */
  CRUCE_GRACE_MIN: 8,
} as const;

export const CLOSE_GAP_GRACE_MS =
  ENTROPY_TIME_POLICY.CLOSE_GAP_GRACE_MIN * 60_000;

/** Alias histórico del motor de conciencia. */
export const CENTINELA_GRACE_MIN = ENTROPY_TIME_POLICY.CLOSE_GAP_GRACE_MIN;
export const CENTINELA_GRACE_MS = CLOSE_GAP_GRACE_MS;

/**
 * Lista autoritativa para cobertura consciente del anillo, centinela y entropía en vivo.
 */
export function resolveCoverageVehicles(
  vehicles: Vehicle[],
  nowMs = Date.now()
): Vehicle[] {
  return filterVehiclesForAnilloCoverage(vehicles, nowMs);
}

/** Hay trabajo consciente real en curso (misma regla que bloquea centinela). */
export function hasActiveConsciousCoverage(
  vehicles: Vehicle[],
  nowMs = Date.now()
): boolean {
  return resolveCoverageVehicles(vehicles, nowMs).some(
    v => v.status === "activo" && !v.autoVerdad && !isParentCoveragePaused(v)
  );
}
