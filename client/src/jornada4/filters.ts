import type { Vehicle } from "@/lib/persistence";
import { isSituacionListaLibre } from "./situacionLibreSeed";

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

export function filterJornada4Vehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(isJornada4Vehicle);
}

export function isConquistaDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador";
}

/** Situacional con ring activo (presión + meta). */
export function isSituacionDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "situacion" && v.situacionCronometro?.activo === true;
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
