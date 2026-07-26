import type { Vehicle } from "@/lib/persistence";
import { ringSessionOperable } from "@/lib/ringEnfoqueReal";

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

/** Ring situacional con cronómetro / filas en desglose. */
export function isSituacionRing(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion") return false;
  if (v.vehiculoPadreDesglosadorId) return false;
  const subs = v.subTareas ?? [];
  if (subs.some(s => s.enDesgloseCronometro)) return true;
  return ringSessionOperable(v.situacionCronometro, subs);
}

/** Interrupción / situación express (Cumplido·Incumplido, sin ring). */
export function isExpressSituacion(v: Vehicle): boolean {
  return v.tipoFlota === "situacion" && !isSituacionRing(v);
}

/** @deprecated Preferir isSituacionRing — incluye express/interrupciones. */
export function isSituacionDesglosador(v: Vehicle): boolean {
  return v.tipoFlota === "situacion";
}
