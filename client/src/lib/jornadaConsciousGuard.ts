import type { Vehicle } from "@/lib/persistence";
import { ringSessionOperable } from "@/lib/ringEnfoqueReal";

/**
 * Proceso consciente activo (ring, desglosador, Punto Cero).
 * Solo para escudo del modal automático de Cierre de Jornada — no bloquea taps del usuario.
 */
export function hasActiveConsciousJornadaProcess(vehicles: Vehicle[]): boolean {
  return vehicles.some(v => {
    if (v.status !== "activo" || v.autoVerdad) return false;

    if (v.tipoReloj === "desglosador") return true;

    if (v.tipoFlota === "descanso") {
      if (v.tipoDescanso === "punto_cero") {
        return v.puntoCero?.fase !== "completada";
      }
      return true;
    }

    if (v.tipoFlota === "situacion") {
      if (v.situacionCronometro?.activo === true) return true;
      return ringSessionOperable(v.situacionCronometro, v.subTareas ?? []);
    }

    return false;
  });
}

/** Recordatorio de sello en Home o Centro de Comando. No sella. */
export function shouldMountAutoCierreJornada(
  vehicles: Vehicle[],
  location: string
): boolean {
  const path = (location || "/").split("?")[0] || "/";
  const isRemindPath =
    path === "/" || path === "/menu" || location.startsWith("/?");
  if (!isRemindPath) return false;
  if (hasActiveConsciousJornadaProcess(vehicles)) return false;
  return true;
}
