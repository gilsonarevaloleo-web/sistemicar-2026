import type { Vehicle } from "@/lib/persistence";

/** Vehículos que Dual Kernel opera en v1. */
export function isJornada4Vehicle(v: Vehicle): boolean {
  if (v.status !== "activo") return false;
  if (v.autoVerdad) return false;
  if (v.tipoFlota === "situacion") return true;
  if (v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador") return true;
  // Conquista rápida (sin desglose): Express-like
  if (v.tipoFlota === "tiempo" && !v.tipoReloj) return true;
  return false;
}

export function filterJornada4Vehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(isJornada4Vehicle);
}

export function isConquistaDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador";
}

/** Situacional con ring activo (desglose). */
export function isSituacionDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "situacion" && v.situacionCronometro?.activo === true;
}

/** Vehículo rápido: sin desglose (conquista sin reloj desglosador, o situacional sin ring). */
export function isVehiculoRapido(v: Vehicle): boolean {
  if (v.status !== "activo" || v.autoVerdad) return false;
  if (v.tipoFlota === "tiempo" && !v.tipoReloj) return true;
  if (v.tipoFlota === "situacion" && v.situacionCronometro?.activo !== true) return true;
  return false;
}
