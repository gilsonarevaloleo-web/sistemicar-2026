import type { SubVehiculo } from "./persistence";
import { computeRutaPrivilegioPS } from "./rutaSeguimiento";

/** Umbral v2 PS (intento / pase / módulo): ver `@shared/umbral/pointsConfig`. */

/** PS base al cerrar un vehículo consciente cumplido (antes 10). */
export const VEHICLE_CUMPLIDO_BASE_PS = 2;

/** PS al archivar sin cumplir (antes 5 en misión estándar). */
export const VEHICLE_ARCHIVADO_BASE_PS = 1;

/** PS por subvehículo cumplido en desglosador. */
export const DESGLOSADOR_SUB_CUMPLIDO_PS = 2;

/** PS de cierre de ciclo desglosador (solo base; subs y ruta se otorgan al cerrar cada sub). */
export const DESGLOSADOR_CYCLE_CLOSE_BASE_PS = VEHICLE_CUMPLIDO_BASE_PS;

export const TERMINO_EXPRESS_PS: Record<string, { cumple: number; arch: number }> = {
  hora: { cumple: VEHICLE_CUMPLIDO_BASE_PS, arch: VEHICLE_ARCHIVADO_BASE_PS },
  situacion: { cumple: 5, arch: 2 },
  omitido: { cumple: 1, arch: 0 },
};

export function vehicleMissionClosePS(
  status: "cumplido" | "archivado",
  tipoTerminoRapido?: string | null
): number {
  if (tipoTerminoRapido) {
    const t = TERMINO_EXPRESS_PS[tipoTerminoRapido];
    if (t) return status === "cumplido" ? t.cumple : t.arch;
  }
  return status === "cumplido" ? VEHICLE_CUMPLIDO_BASE_PS : VEHICLE_ARCHIVADO_BASE_PS;
}

/** PS al cerrar un sub del desglosador (2 base + privilegio de fluidez si aplica). */
export function computeDesglosadorSubAwardPS(sub: SubVehiculo): number {
  if (sub.status !== "cumplido") return 0;
  return DESGLOSADOR_SUB_CUMPLIDO_PS + computeRutaPrivilegioPS(sub);
}
