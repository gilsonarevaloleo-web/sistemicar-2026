/**
 * Proyección pura de fin de desglosador (suma unidades × MIN/U).
 * Misma fórmula que planeacion.tsx TOTAL ESTIMADO · Fin ≈.
 */
import { formatHHMM } from "@/lib/desglosadorClock";
import type { DesglosadorSubFormRow } from "@/lib/executeFlotaLaunch";

export type DesglosadorProjection = {
  totalMin: number;
  finAtMs: number;
  finLabel: string;
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
