import type { SegmentoV5, Vehicle } from "./persistence";
import type { SegmentAttentionEvent } from "./segmentAttentionEngine";
import { segmentClockMs, getLimaDayStartMs } from "./segmentTime";
import {
  EARLY_VEHICLE_MARGIN_MIN,
  resolveVehicleSegmentContext,
} from "./segmentVehicleAssign";
import { isLiveWorkCrossSegmentExempt } from "./vehicleOperationalSlots";

import { ENTROPY_TIME_POLICY } from "./entropyTimePolicy";

export const CRUCE_GRACE_MIN = ENTROPY_TIME_POLICY.CRUCE_GRACE_MIN;
export const CRUCE_WARNING_MIN = 6;

export type SegmentCrossEntropyEvent =
  | {
      type: "warning";
      vehicleId: string;
      titulo: string;
      originSegId: string;
      originNombre: string;
      activeSegNombre: string;
      minutesLeft: number;
    }
  | {
      type: "voz";
      vehicleId: string;
      titulo: string;
      originSegId: string;
      originNombre: string;
    }
  | {
      type: "auto_close";
      vehicleId: string;
      titulo: string;
      originSegId: string;
      originNombre: string;
    }
  | {
      type: "segment_entropia";
      segId: string;
      nombre: string;
      reason: "cruce_sin_cierre";
    };

export type CruceGraciaPhase = "none" | "grace" | "expired";

export function isExcludedFromCrossEntropy(vehicle: Vehicle): boolean {
  if (vehicle.autoVerdad) return true;
  if (vehicle.tipoFlota === "descanso") return true;
  if (vehicle.status !== "activo") return true;
  if (isLiveWorkCrossSegmentExempt(vehicle)) return true;
  return false;
}

/** Segmento activo por estado; si hay varios, el bloque cuya hora de inicio ya pasó y es la más reciente. */
export function getActiveSegment(
  segmentos: SegmentoV5[],
  nowMs: number = Date.now(),
  dayStartMs?: number
): SegmentoV5 | null {
  const activos = segmentos.filter(s => s.estado === "activo");
  if (activos.length === 0) return null;
  if (activos.length === 1) return activos[0];

  const dayStart = dayStartMs ?? getLimaDayStartMs(nowMs);
  let best: SegmentoV5 | null = null;
  let bestStart = -Infinity;
  for (const seg of activos) {
    const start = segmentClockMs(seg.horaInicio, dayStart);
    if (start <= nowMs && start > bestStart) {
      bestStart = start;
      best = seg;
    }
  }
  return best ?? activos[activos.length - 1];
}

export function getCruceGraceEndMs(horaInicio: string, dayStartMs: number): number {
  const segmentStartMs = segmentClockMs(horaInicio, dayStartMs);
  return segmentStartMs + CRUCE_GRACE_MIN * 60000;
}

/** Vehículo abierto en un segmento distinto al activo (no puede continuar: debe abrir otro). */
export function isVehicleFromPreviousSegment(
  vehicle: Vehicle,
  activeSegment: SegmentoV5,
  dayStartMs: number,
  segmentos?: SegmentoV5[]
): boolean {
  if (isExcludedFromCrossEntropy(vehicle)) return false;
  const segmentStartMs = segmentClockMs(activeSegment.horaInicio, dayStartMs);
  const earlyStartMs = segmentStartMs - EARLY_VEHICLE_MARGIN_MIN * 60000;

  const effectiveId = segmentos
    ? resolveVehicleSegmentContext(vehicle, segmentos, dayStartMs).id
    : vehicle.segmentoId;

  if (effectiveId) {
    return effectiveId !== activeSegment.id;
  }

  const aperturaAt = vehicle.aperturaAt ?? vehicle.createdAt?.getTime();
  if (!aperturaAt) return false;
  return aperturaAt < earlyStartMs;
}

export function getCruceGraciaState(
  vehicle: Vehicle,
  activeSegment: SegmentoV5 | null,
  nowMs: number,
  dayStartMs: number,
  segmentos?: SegmentoV5[]
): { phase: CruceGraciaPhase; minutesLeft: number; originNombre?: string } {
  if (!activeSegment || isExcludedFromCrossEntropy(vehicle)) {
    return { phase: "none", minutesLeft: 0 };
  }
  if (!isVehicleFromPreviousSegment(vehicle, activeSegment, dayStartMs, segmentos)) {
    return { phase: "none", minutesLeft: 0 };
  }
  const graceEndMs = getCruceGraceEndMs(activeSegment.horaInicio, dayStartMs);
  const msLeft = graceEndMs - nowMs;
  const originNombre = vehicle.segmentoOrigen ?? "segmento anterior";
  if (msLeft <= 0) {
    return { phase: "expired", minutesLeft: 0, originNombre };
  }
  return {
    phase: "grace",
    minutesLeft: Math.ceil(msLeft / 60000),
    originNombre,
  };
}

export function applyOriginSegmentCruceEntropia(
  segmentos: SegmentoV5[],
  originSegId: string,
  nowMs: number
): { segmentos: SegmentoV5[]; event: SegmentAttentionEvent | null; changed: boolean } {
  let changed = false;
  let event: SegmentAttentionEvent | null = null;
  const next = segmentos.map(seg => {
    if (seg.id !== originSegId || seg.estado !== "activo") return seg;
    changed = true;
    event = {
      type: "entropia",
      segId: seg.id,
      nombre: seg.nombre,
      reason: "cruce_sin_cierre",
    };
    return { ...seg, estado: "entropia" as const, cerradoAt: nowMs, psGanados: 0 };
  });
  return { segmentos: next, event, changed };
}

export function getCrossingVehiclesState(
  segmentos: SegmentoV5[],
  vehicles: Vehicle[],
  dayStartMs: number,
  nowMs: number = Date.now()
): { activeSegment: SegmentoV5; crossing: Vehicle[] } | null {
  const activeSegment = getActiveSegment(segmentos, nowMs, dayStartMs);
  if (!activeSegment) return null;
  const crossing = vehicles.filter(v =>
    isVehicleFromPreviousSegment(v, activeSegment, dayStartMs, segmentos)
  );
  if (crossing.length === 0) return null;
  return { activeSegment, crossing };
}

export function evaluateSegmentCrossEntropy(params: {
  vehicles: Vehicle[];
  segmentos: SegmentoV5[];
  nowMs: number;
  dayStartMs: number;
  warnedVehicleIds: Set<string>;
}): { events: SegmentCrossEntropyEvent[]; vehicleVozPatches: Array<{ vehicleId: string; cruceEntropiaVozAt: number }> } {
  const { vehicles, segmentos, nowMs, dayStartMs, warnedVehicleIds } = params;
  const activeSegment = getActiveSegment(segmentos, nowMs, dayStartMs);
  if (!activeSegment) return { events: [], vehicleVozPatches: [] };

  const graceEndMs = getCruceGraceEndMs(activeSegment.horaInicio, dayStartMs);
  const warningStartMs =
    segmentClockMs(activeSegment.horaInicio, dayStartMs) + CRUCE_WARNING_MIN * 60000;
  const events: SegmentCrossEntropyEvent[] = [];
  const vehicleVozPatches: Array<{ vehicleId: string; cruceEntropiaVozAt: number }> = [];
  const originSegIdsForEntropia = new Set<string>();

  for (const vehicle of vehicles) {
    if (!isVehicleFromPreviousSegment(vehicle, activeSegment, dayStartMs, segmentos)) continue;

    const originSegId = vehicle.segmentoId ?? "";
    const originNombre = vehicle.segmentoOrigen ?? "segmento anterior";

    if (nowMs >= graceEndMs) {
      if (!vehicle.cruceEntropiaVozAt) {
        events.push({
          type: "voz",
          vehicleId: vehicle.id,
          titulo: vehicle.titulo,
          originSegId,
          originNombre,
        });
        vehicleVozPatches.push({ vehicleId: vehicle.id, cruceEntropiaVozAt: nowMs });
      }
      events.push({
        type: "auto_close",
        vehicleId: vehicle.id,
        titulo: vehicle.titulo,
        originSegId,
        originNombre,
      });
      if (originSegId) originSegIdsForEntropia.add(originSegId);
      continue;
    }

    if (nowMs >= warningStartMs && !warnedVehicleIds.has(vehicle.id)) {
      const minutesLeft = Math.ceil((graceEndMs - nowMs) / 60000);
      events.push({
        type: "warning",
        vehicleId: vehicle.id,
        titulo: vehicle.titulo,
        originSegId,
        originNombre,
        activeSegNombre: activeSegment.nombre,
        minutesLeft,
      });
      warnedVehicleIds.add(vehicle.id);
    }
  }

  for (const originSegId of Array.from(originSegIdsForEntropia)) {
    const originSeg = segmentos.find(s => s.id === originSegId);
    if (!originSeg || originSeg.estado !== "activo") continue;
    events.push({
      type: "segment_entropia",
      segId: originSegId,
      nombre: originSeg.nombre,
      reason: "cruce_sin_cierre",
    });
  }

  return { events, vehicleVozPatches };
}
