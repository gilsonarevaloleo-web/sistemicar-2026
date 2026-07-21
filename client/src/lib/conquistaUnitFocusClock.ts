/**
 * Cronómetro de unidad (conquista) — herramienta de concentración.
 * Display-only: no escribe a récord, PS, historial ni Firebase.
 */

export type UnitFocusLap = {
  /** Índice 1-based (vuelta 1, 2, …). */
  n: number;
  /** Tiempo absoluto desde el arranque del cronómetro (ms). */
  absoluteMs: number;
  /** Duración de esta vuelta respecto a la anterior (ms). */
  splitMs: number;
};

/** Formato mm:ss; si pasa de 1h → h:mm:ss */
export function formatUnitFocusElapsed(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function unitFocusElapsedMs(startedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - startedAtMs);
}

/**
 * Registra una vuelta sin detener el cronómetro.
 * `previousAbsoluteMs` = absoluteMs de la última vuelta (0 si es la primera).
 */
export function buildUnitFocusLap(
  n: number,
  absoluteMs: number,
  previousAbsoluteMs: number
): UnitFocusLap {
  const abs = Math.max(0, absoluteMs);
  const prev = Math.max(0, previousAbsoluteMs);
  return {
    n,
    absoluteMs: abs,
    splitMs: Math.max(0, abs - prev),
  };
}
