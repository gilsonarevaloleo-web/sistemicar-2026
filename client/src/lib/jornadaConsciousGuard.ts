import {
  isLocalVehicleMutationLocked,
  isStructuralCloseInTransit,
} from "@/lib/localMutationLock";
import type { Vehicle } from "@/lib/persistence";

/** Proceso consciente activo: vehículo en ring, desglosador o Punto Cero en curso. */
export function hasActiveConsciousJornadaProcess(vehicles: Vehicle[]): boolean {
  if (isLocalVehicleMutationLocked() || isStructuralCloseInTransit()) return true;

  return vehicles.some(v => {
    if (v.status !== "activo" || v.autoVerdad) return false;

    if (v.tipoReloj === "desglosador") return true;

    if (v.tipoFlota === "descanso") {
      if (v.tipoDescanso === "punto_cero") {
        return v.puntoCero?.fase !== "completada";
      }
      return true;
    }

    return true;
  });
}

/** Solo montar cierre automático en Home, sin proceso consciente corriendo. */
export function shouldMountAutoCierreJornada(
  vehicles: Vehicle[],
  location: string
): boolean {
  const isHome = location === "/" || location.startsWith("/?");
  if (!isHome) return false;
  if (hasActiveConsciousJornadaProcess(vehicles)) return false;
  return true;
}
