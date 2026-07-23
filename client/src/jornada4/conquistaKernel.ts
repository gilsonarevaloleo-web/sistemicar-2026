/**
 * Kernel puro Conquista (desglosador tiempo).
 * Sin voz, sin conciencia, sin disciplina.
 */
import {
  buildDesglosadorSubClose,
  desglosadorSubsProgressScore,
} from "@/lib/desglosadorSubClose";
import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import { isConquistaDesglosador } from "./filters";

export type ConquistaSubCloseInput = {
  vehicle: Vehicle;
  subId: string;
  status: "cumplido" | "fallado";
  cantidad?: number | string;
  now?: number;
};

export type ConquistaSubClosePatch = {
  vehicleId: string;
  subVehiculos: SubVehiculo[];
  closedSub: SubVehiculo;
  nextActiveSubId: string | null;
  cycleReady: boolean;
};

export function applyConquistaSubClose(
  input: ConquistaSubCloseInput
): ConquistaSubClosePatch | null {
  const { vehicle, subId, status } = input;
  if (!isConquistaDesglosador(vehicle) || vehicle.status !== "activo") return null;
  const subs = vehicle.subVehiculos ?? [];
  if (subs.length === 0) return null;

  const active = subs.find(s => s.status === "activo");
  if (!active || active.id !== subId) return null;
  if (!active.aperturaAt && status === "cumplido") {
    // permitir fallado sin apertura; cumplido requiere medición
  }

  const now = input.now ?? Date.now();
  const cantidad =
    input.cantidad != null
      ? String(input.cantidad)
      : active.cantidadObjetivo != null
        ? String(status === "cumplido" ? active.cantidadObjetivo : 0)
        : "0";

  const duracion =
    active.aperturaAt != null
      ? Math.max(0, Math.floor((now - active.aperturaAt) / 1000))
      : undefined;

  const result = buildDesglosadorSubClose(
    subs,
    subId,
    status,
    Number(cantidad) || 0,
    duracion,
    undefined,
    now
  );
  if (!result) return null;

  const cycleReady = result.subs.every(
    s => s.status === "cumplido" || s.status === "fallado"
  );

  return {
    vehicleId: vehicle.id,
    subVehiculos: result.subs,
    closedSub: result.closedSub,
    nextActiveSubId: result.nextActiveSubId,
    cycleReady,
  };
}

export type ConquistaCycleClosePatch = {
  vehicleId: string;
  status: "cumplido" | "archivado";
  cierreAt: number;
  subVehiculos: SubVehiculo[];
};

/** Cierra el vehículo cuando todos los subs están terminados. */
export function applyConquistaCycleClose(
  vehicle: Vehicle,
  now = Date.now()
): ConquistaCycleClosePatch | null {
  if (!isConquistaDesglosador(vehicle) || vehicle.status !== "activo") return null;
  const subs = vehicle.subVehiculos ?? [];
  if (subs.length === 0) return null;
  const allDone = subs.every(s => s.status === "cumplido" || s.status === "fallado");
  if (!allDone) return null;
  const anyCumplido = subs.some(s => s.status === "cumplido");
  return {
    vehicleId: vehicle.id,
    status: anyCumplido ? "cumplido" : "archivado",
    cierreAt: now,
    subVehiculos: subs,
  };
}

export function conquistaActiveSub(vehicle: Vehicle): SubVehiculo | undefined {
  return (vehicle.subVehiculos ?? []).find(s => s.status === "activo");
}

export function conquistaProgressLabel(vehicle: Vehicle): string {
  const subs = vehicle.subVehiculos ?? [];
  const done = subs.filter(s => s.status === "cumplido" || s.status === "fallado").length;
  return `${done}/${subs.length}`;
}

export { desglosadorSubsProgressScore };
