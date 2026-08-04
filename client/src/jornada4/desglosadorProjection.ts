/**
 * Proyección pura de fin de desglosador (suma unidades × MIN/U).
 * Misma fórmula que planeacion.tsx TOTAL ESTIMADO · Fin ≈.
 *
 * Además: alcance por «1 unidad completa» (Σ seg/unidad de cada sub)
 * hasta una hora meta — cuántos productos caben al operador.
 */
import {
  formatHHMM,
  sumDesglosadorUnitCycle,
  type UnitCycleSum,
} from "@/lib/desglosadorClock";
import type { SubVehiculo } from "@/lib/persistence";
import type { DesglosadorSubFormRow } from "@/lib/executeFlotaLaunch";
import { getLocalDayStartMs, parseSegmentTime } from "@/lib/segmentTime";

export type DesglosadorProjection = {
  totalMin: number;
  finAtMs: number;
  finLabel: string;
};

export type ProductsUntilMeta = {
  /** floor(tiempoRestante / takt de 1 producto). */
  products: number;
  remainSec: number;
  unitCycleSec: number;
  deadlineMs: number;
  /** true si la suma aún es solo récord (sin cierres medidos). */
  allRef: boolean;
  hasMeasured: boolean;
  stepsCounted: number;
  stepsTotal: number;
};

export function projectDesglosadorEndFromSubs(
  subs: Array<Pick<DesglosadorSubFormRow, "cantidadObjetivo" | "tiempoRecordMinPerUnit">>,
  nowMs: number = Date.now()
): DesglosadorProjection | null {
  const totalMin = subs.reduce((acc, s) => {
    const cant = Number(s.cantidadObjetivo);
    const record = s.tiempoRecordMinPerUnit;
    if (
      record != null &&
      record > 0 &&
      Number.isFinite(cant) &&
      cant > 0
    ) {
      return acc + Math.round(cant * record);
    }
    return acc;
  }, 0);
  if (totalMin <= 0) return null;
  const finAtMs = nowMs + totalMin * 60_000;
  return {
    totalMin,
    finAtMs,
    finLabel: formatHHMM(finAtMs),
  };
}

/** Fin proyectado de una sola unidad (ahora + cant×MIN/U). */
export function projectUnitEndLabel(
  cantidadObjetivo: string | number | undefined,
  tiempoRecordMinPerUnit: number | undefined,
  nowMs: number = Date.now()
): { projMin: number; finLabel: string } | null {
  const cant = Number(cantidadObjetivo);
  if (
    !(tiempoRecordMinPerUnit != null && tiempoRecordMinPerUnit > 0) ||
    !Number.isFinite(cant) ||
    cant <= 0
  ) {
    return null;
  }
  const projMin = Math.round(cant * tiempoRecordMinPerUnit);
  return {
    projMin,
    finLabel: formatHHMM(nowMs + projMin * 60_000),
  };
}

/**
 * HH:mm (criterioDetalle / meta del ciclo) → timestamp absoluto.
 * Si la hora ya pasó hoy, ancla al día siguiente.
 */
export function resolveMetaDeadlineMs(
  metaHora: string,
  nowMs: number = Date.now()
): number | null {
  const parsed = parseSegmentTime((metaHora || "").trim());
  if (!parsed) return null;
  const dayStart = getLocalDayStartMs(nowMs);
  let deadline = dayStart + (parsed.h * 60 + parsed.m) * 60_000;
  if (deadline <= nowMs) deadline += 86_400_000;
  return deadline;
}

/**
 * Cuántos productos (1 unidad completa = Σ seg/unidad de cada sub)
 * caben desde ahora hasta la deadline.
 */
export function projectProductsUntilDeadline(params: {
  unitCycleSec: number;
  deadlineMs: number;
  nowMs?: number;
  cycle?: Pick<UnitCycleSum, "allRef" | "hasMeasured" | "stepsCounted" | "stepsTotal">;
}): ProductsUntilMeta | null {
  const nowMs = params.nowMs ?? Date.now();
  const unitCycleSec = params.unitCycleSec;
  if (!(unitCycleSec > 0) || !Number.isFinite(unitCycleSec)) return null;
  const remainSec = Math.max(0, Math.floor((params.deadlineMs - nowMs) / 1000));
  if (remainSec <= 0) return null;
  const products = Math.floor(remainSec / unitCycleSec);
  return {
    products,
    remainSec,
    unitCycleSec,
    deadlineMs: params.deadlineMs,
    allRef: params.cycle?.allRef ?? false,
    hasMeasured: params.cycle?.hasMeasured ?? false,
    stepsCounted: params.cycle?.stepsCounted ?? 0,
    stepsTotal: params.cycle?.stepsTotal ?? 0,
  };
}

/** Atajo: suma takt de subs + meta HH:mm → alcance del operador. */
export function projectProductsUntilMeta(
  subs: SubVehiculo[],
  metaHora: string,
  nowMs: number = Date.now()
): ProductsUntilMeta | null {
  const cycle = sumDesglosadorUnitCycle(subs);
  if (cycle.stepsCounted <= 0 || cycle.totalSec <= 0) return null;
  const deadlineMs = resolveMetaDeadlineMs(metaHora, nowMs);
  if (deadlineMs == null) return null;
  return projectProductsUntilDeadline({
    unitCycleSec: cycle.totalSec,
    deadlineMs,
    nowMs,
    cycle,
  });
}
