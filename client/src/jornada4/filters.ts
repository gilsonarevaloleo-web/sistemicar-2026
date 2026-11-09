import {
  excludeGhostActivesFromReconcile,
  isJournalStaleActiveVehicle,
  isZombieConsciousVehicle,
  lastLiveActivityMs,
} from "../lib/ghostVehicleEngine";
import type { Vehicle } from "../lib/persistence";
import { getJournalDayStartMs } from "../lib/segmentTime";
import { ringSessionOperable } from "../lib/ringEnfoqueReal";
import { isPausedPresence } from "../lib/vehiculoPausa";
import { isSituacionListaLibre } from "./situacionLibreSeed";

/** Cascarones / pausas que Dual Kernel debe mostrar para poder cerrarlos. */
const MAX_LEFTOVER_CLOSEABLE = 8;

/** Vehículos que Dual Kernel opera en v1. */
export function isJornada4Vehicle(v: Vehicle): boolean {
  if (v.status !== "activo") return false;
  if (v.autoVerdad) return false;
  if (v.tipoFlota === "situacion") return true;
  if (v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador") return true;
  // Conquista rápida independiente (unidades, sin secuencia)
  if (v.tipoFlota === "tiempo" && (v.tipoReloj === "produccion" || !v.tipoReloj)) {
    return true;
  }
  return false;
}

function vehicleAperturaMs(v: Vehicle): number {
  if (typeof v.aperturaAt === "number" && v.aperturaAt > 0) return v.aperturaAt;
  if (v.createdAt instanceof Date) return v.createdAt.getTime();
  return 0;
}

/**
 * Dual Kernel: faena viva + pausas/cascarones que el operador debe ver para cerrar.
 * La avalancha histórica y los leftovers de jornadas anteriores siguen fuera;
 * el barrido de término los archiva.
 */
export function filterJornada4Vehicles(
  vehicles: Vehicle[],
  nowMs = Date.now()
): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  const jornada = vehicles.filter(v => {
    if (!isJornada4Vehicle(v)) return false;
    // La jornada anterior ya debió cerrarlos. No pintarlos mientras el barrido archiva.
    return !isJournalStaleActiveVehicle(vehicleAperturaMs(v), nowMs, dayStart);
  });
  const visible = excludeGhostActivesFromReconcile(jornada, nowMs).filter(isJornada4Vehicle);
  const visibleIds = new Set(visible.map(v => v.id));
  const leftover = jornada
    .filter(v => !visibleIds.has(v.id) && (isPausedPresence(v) || isZombieConsciousVehicle(v)))
    .sort((a, b) => lastLiveActivityMs(b) - lastLiveActivityMs(a))
    .slice(0, MAX_LEFTOVER_CLOSEABLE);
  const combined = leftover.length === 0 ? visible : [...leftover, ...visible];
  // Pausa arriba: al lanzar Enfoque el ring nuevo se prependea y tapaba la
  // conquista congelada. El operador debe reanudar de un toque.
  const paused = combined.filter(isPausedPresence);
  if (paused.length === 0) return combined;
  const rest = combined.filter(v => !isPausedPresence(v));
  return [...paused, ...rest];
}

export function isConquistaDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador";
}

/**
 * Situacional con ring operable (activo o pausado con filas pendientes).
 * No exigir solo `activo === true`: tras resume/pausa el ring sigue siendo ring.
 */
export function isSituacionDesglosador(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion") return false;
  return ringSessionOperable(v.situacionCronometro, v.subTareas ?? []);
}

/** Ring situacional operable — excluye interrupciones express. */
export function isSituacionRing(v: Vehicle): boolean {
  if (v.vehiculoPadreDesglosadorId) return false;
  return isSituacionDesglosador(v);
}

/**
 * Interrupción / situación express (Cumplido·Incumplido, sin ring ni lista libre).
 * Incluye pausas lanzadas desde conquista (`vehiculoPadreDesglosadorId`).
 */
export function isExpressSituacion(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion") return false;
  if (isSituacionListaLibre(v)) return false;
  if (isSituacionRing(v)) return false;
  return true;
}

/** Conquista rápida: tarea única medida por unidades, sin secuencia. */
export function isConquistaRapido(v: Vehicle): boolean {
  if (v.status !== "activo" || v.autoVerdad) return false;
  if (v.tipoFlota !== "tiempo") return false;
  return v.tipoReloj === "produccion" || !v.tipoReloj;
}

/** Situacional lista libre: filas sin ring. */
export { isSituacionListaLibre };

/** @deprecated Preferir isConquistaRapido / isSituacionListaLibre. */
export function isVehiculoRapido(v: Vehicle): boolean {
  return isConquistaRapido(v) || isSituacionListaLibre(v);
}
