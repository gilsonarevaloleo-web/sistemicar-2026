import {
  excludeGhostActivesFromReconcile,
  isZombieConsciousVehicle,
  lastLiveActivityMs,
} from "../lib/ghostVehicleEngine";
import type { Vehicle } from "../lib/persistence";
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

/**
 * Dual Kernel: faena viva + pausas/cascarones que el operador debe ver para cerrar.
 * La avalancha histórica (decenas de `activo` resucitados) sigue fuera.
 */
export function filterJornada4Vehicles(
  vehicles: Vehicle[],
  nowMs = Date.now()
): Vehicle[] {
  const jornada = vehicles.filter(isJornada4Vehicle);
  const visible = excludeGhostActivesFromReconcile(jornada, nowMs).filter(isJornada4Vehicle);
  const visibleIds = new Set(visible.map(v => v.id));
  const leftover = jornada
    .filter(v => !visibleIds.has(v.id) && (isPausedPresence(v) || isZombieConsciousVehicle(v)))
    .sort((a, b) => lastLiveActivityMs(b) - lastLiveActivityMs(a))
    .slice(0, MAX_LEFTOVER_CLOSEABLE);
  return leftover.length === 0 ? visible : [...leftover, ...visible];
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
