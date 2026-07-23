import type { Vehicle } from "@/lib/persistence";

/** Vehículos que Dual Kernel opera en v1. */
export function isJornada4Vehicle(v: Vehicle): boolean {
  if (v.status !== "activo") return false;
  if (v.autoVerdad) return false;
  if (v.tipoFlota === "situacion") return true;
  if (v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador") return true;
  return false;
}

export function filterJornada4Vehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(isJornada4Vehicle);
}

export function isConquistaDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador";
}

export function isSituacionDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "situacion";
}
