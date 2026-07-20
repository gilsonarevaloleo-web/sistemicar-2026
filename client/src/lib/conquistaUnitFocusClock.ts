/**
 * Cronómetro de unidad (conquista) — herramienta de concentración.
 * Display-only: no escribe a récord, PS, historial ni Firebase.
 */

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
