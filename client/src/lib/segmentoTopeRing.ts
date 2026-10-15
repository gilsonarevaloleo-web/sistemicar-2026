/**
 * Tope del ring de enfoque = recinto del segmento (horaInicio–horaFin).
 * El sistema no monta el segmento. Si el usuario quiere más tiempo,
 * abre otro vehículo y edita su límite ahí.
 */
import type { Vehicle } from "./persistence";
import {
  formatLimaTimeHM,
  getSegmentCalendarDayStartMs,
  segmentClockMs,
  segmentWindowMs,
} from "./segmentTime";
import { situacionContratoFinMs, situacionObjetivoHoraToContratoMs } from "./situacionGanancia";
import {
  redistribuirMinutosSituacionCronometro,
  sumMinutosCronometroPendientes,
} from "./situacionCupoDistrib";

export const CUPO_EXCEDE_TOPE_SEGMENTO_TITLE = "No te sobran minutos";
export const CUPO_EXCEDE_TOPE_SEGMENTO_DESC =
  "Abre otro vehículo y edita tu tiempo.";

export type SegmentoTopeLike = {
  id?: string;
  horaInicio?: string;
  horaFin?: string;
} | null | undefined;

export function resolveSegmentoTope(
  vehicle: Pick<Vehicle, "segmentoId"> | null | undefined,
  segmentoActivo: SegmentoTopeLike,
  segmentos: readonly SegmentoTopeLike[] = []
): SegmentoTopeLike {
  const id = vehicle?.segmentoId?.trim();
  if (id) {
    const found = segmentos.find(s => s?.id === id);
    if (found?.horaFin) return found;
  }
  if (segmentoActivo?.horaFin) return segmentoActivo;
  return null;
}

export function segmentoTopeFinMs(
  seg: SegmentoTopeLike,
  nowMs: number = Date.now()
): number | null {
  if (!seg?.horaFin) return null;
  const dayStart = getSegmentCalendarDayStartMs(nowMs);
  if (seg.horaInicio) {
    const { end } = segmentWindowMs(seg.horaInicio, seg.horaFin, dayStart);
    return end;
  }
  // Sin horaInicio no enrollar a mañana: el recinto es de este día-jornada.
  return segmentClockMs(seg.horaFin, dayStart);
}

export function resolveVehicleSegmentoTopeFinMs(
  vehicle: Pick<Vehicle, "segmentoId"> | null | undefined,
  segmentoActivo: SegmentoTopeLike,
  segmentos: readonly SegmentoTopeLike[] = [],
  nowMs: number = Date.now()
): number | null {
  return segmentoTopeFinMs(resolveSegmentoTope(vehicle, segmentoActivo, segmentos), nowMs);
}

/** Minutos de pared hasta el recinto (y, si hay, hasta el contrato más cercano). */
export function remainingTopeBudgetMin(
  sc: Vehicle["situacionCronometro"],
  topeFinMs: number | null,
  nowMs: number = Date.now()
): number | null {
  const walls: number[] = [];
  if (topeFinMs != null) {
    walls.push(Math.max(0, Math.round((topeFinMs - nowMs) / 60000)));
  }
  const contratoMs = situacionContratoFinMs(sc);
  if (contratoMs != null) {
    walls.push(Math.max(0, Math.round((contratoMs - nowMs) / 60000)));
  }
  if (walls.length === 0) return null;
  return Math.min(...walls);
}

export function cupoManualExcedeTopeSegmento(
  minutos: number | undefined,
  topeMin: number
): boolean {
  if (minutos == null || minutos <= 0 || !Number.isFinite(minutos)) return false;
  return Math.round(minutos) > Math.max(0, Math.round(topeMin));
}

/** Nunca deja el contrato más allá del fin del segmento. */
export function anclarContratoAlTopeSegmento(
  sc: NonNullable<Vehicle["situacionCronometro"]>,
  topeMs: number | null
): NonNullable<Vehicle["situacionCronometro"]> {
  if (topeMs == null) return sc;
  const contrato = sc.horaFinContratoMs ?? sc.horaFinMs;
  const horaFin = sc.horaFinMs;
  const contratoOk = contrato == null || contrato <= topeMs;
  const horaFinOk = horaFin == null || horaFin <= topeMs;
  if (contratoOk && horaFinOk) return sc;
  return {
    ...sc,
    horaFinMs: topeMs,
    horaFinContratoMs: topeMs,
  };
}

export function capContratoMsAlTope(
  contratoMs: number | null,
  topeMs: number | null
): number | null {
  if (topeMs == null) return contratoMs;
  if (contratoMs == null) return topeMs;
  return Math.min(contratoMs, topeMs);
}

export function capMinutosAlTopeSegmento(
  minutos: number,
  topeMs: number | null,
  nowMs: number
): number {
  const asked = Math.max(1, Math.round(minutos));
  if (topeMs == null) return asked;
  const remain = Math.round((topeMs - nowMs) / 60000);
  if (remain <= 0) return 1;
  return Math.max(1, Math.min(asked, remain));
}

export function capObjetivoHoraAlTopeSegmento(
  hhmm: string,
  seg: SegmentoTopeLike,
  nowMs: number = Date.now()
): string {
  const topeMs = segmentoTopeFinMs(seg, nowMs);
  const contrato = situacionObjetivoHoraToContratoMs(hhmm, nowMs);
  if (topeMs == null || contrato == null || contrato <= topeMs) return hhmm;
  return formatLimaTimeHM(topeMs);
}

/**
 * Si el ring se fue del recinto (meta lejana, cupos que montan),
 * ancla el contrato y recorta cupos al tope. Null = nada que corregir.
 */
export function clampVehicleRingAlTopeSegmento(
  vehicle: Vehicle,
  segmentoActivo: SegmentoTopeLike,
  segmentos: readonly SegmentoTopeLike[] = [],
  nowMs: number = Date.now()
): Partial<Pick<Vehicle, "situacionCronometro" | "subTareas">> | null {
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return null;
  const sc = vehicle.situacionCronometro;
  if (sc?.activo !== true) return null;
  const topeMs = resolveVehicleSegmentoTopeFinMs(vehicle, segmentoActivo, segmentos, nowMs);
  if (topeMs == null) return null;

  const nextSc = anclarContratoAlTopeSegmento(sc, topeMs);
  const wall = remainingTopeBudgetMin(nextSc, topeMs, nowMs) ?? 0;
  const pending = sumMinutosCronometroPendientes(vehicle.subTareas);
  const contratoMoved =
    (nextSc.horaFinContratoMs ?? nextSc.horaFinMs) !== (sc.horaFinContratoMs ?? sc.horaFinMs);
  const cuposMontan = pending > wall;
  if (!contratoMoved && !cuposMontan) return null;

  return {
    situacionCronometro: nextSc,
    subTareas: cuposMontan
      ? redistribuirMinutosSituacionCronometro(vehicle.subTareas ?? [], Math.max(0, wall))
      : vehicle.subTareas,
  };
}
