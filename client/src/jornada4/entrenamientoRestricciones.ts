/**
 * Restricciones opt-in de entrenamiento serio (Dual Kernel).
 * Reglas puras — sin Firebase/voz/celebración (anti-congelamiento).
 *
 * 1) Ring modo entrenamiento: distracción → fallado con mensaje;
 *    sustituir línea en foco permitido; avance bloqueado.
 * 2) Desglosador anclado al segmento: no cruza su segmento (sin exención).
 */
import type { SegmentoV5, SubTarea, Vehicle } from "@/lib/persistence";
import {
  getActiveSegment,
  getCruceGraceEndMs,
  isVehicleFromPreviousSegment,
} from "@/lib/segmentCrossEntropyEngine";
import {
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";
import { ringSessionOperable, reanudarSituacionCronometroRing } from "@/lib/ringEnfoqueReal";
import { isSituacionDesglosador } from "./filters";

/** Segundos fuera de pestaña antes de contar distracción (evita falsos positivos). */
export const ENTRENAMIENTO_DISTRACCION_GRACE_SEC = 20;

export const ENTRENAMIENTO_COPY = {
  ringToggle: "Entrenamiento de enfoque",
  ringHint:
    "Salir de la pestaña falla la fila en foco. Puedes sustituir la línea antes. Sin avance fácil.",
  ringBadge: "Entrenamiento",
  perdidaDistraccion: "Pérdida por distracción",
  sustituirFoco: "Sustituir foco",
  ancladoToggle: "Anclar al segmento",
  ancladoHint:
    "Ningún paso del desglosador pasa este segmento. Al cruzar, el sistema archiva la misión.",
  ancladoBadge: "Anclado",
  cierreAnclado: "Cierre por anclaje de segmento",
  avanceBloqueado: "En entrenamiento no hay avance — cumplido, fallado o sustituye el foco",
  planGateRing: "Disponible con Soberanía del día",
  planGateAnclado: "Disponible con Operativo",
} as const;

export function isRingModoEntrenamiento(vehicle: Pick<Vehicle, "situacionCronometro">): boolean {
  return vehicle.situacionCronometro?.modoEntrenamiento === true;
}

export function isDesglosadorAncladoSegmento(
  vehicle: Pick<Vehicle, "ancladoAlSegmento">
): boolean {
  return vehicle.ancladoAlSegmento === true;
}

export type SustituirFocoResult = {
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCupoAnchor: NonNullable<Vehicle["situacionCupoAnchor"]>;
  nuevoFocoTexto: string;
  focoAnteriorTexto: string;
};

/**
 * Sustituye la fila en foco por otra pendiente del ring (sin fallar).
 * Mueve la elegida al frente de la cola pendiente y reinicia el ancla.
 */
export function applySituacionSustituirFoco(
  vehicle: Vehicle,
  newFocusId: string,
  now = Date.now()
): SustituirFocoResult | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  if (!isRingModoEntrenamiento(vehicle)) return null;
  const subs = vehicle.subTareas;
  if (!subs?.length) return null;
  if (!ringSessionOperable(vehicle.situacionCronometro, subs)) return null;

  const pendingSlots = subs
    .map((st, i) => ({ st, i }))
    .filter(({ st }) => situacionFilaCronometroPendiente(st));
  if (pendingSlots.length < 2) return null;

  const targetSlot = pendingSlots.find(({ st }) => st.id === newFocusId);
  if (!targetSlot) return null;

  const currentFocusId =
    vehicle.situacionCupoAnchor?.subTareaId ?? pendingSlots[0]!.st.id;
  if (targetSlot.st.id === currentFocusId) return null;

  const focusSlot = pendingSlots.find(({ st }) => st.id === currentFocusId) ?? pendingSlots[0]!;
  const next = [...subs];
  const iFocus = focusSlot.i;
  const iTarget = targetSlot.i;
  [next[iFocus], next[iTarget]] = [next[iTarget]!, next[iFocus]!];

  const resolved = resolveCronometroCupoAnchor(next, vehicle.situacionCupoAnchor, {
    forceResetSameRow: true,
    now,
  });
  if (!resolved || resolved === "unchanged") {
    return {
      vehicleId: vehicle.id,
      subTareas: next,
      situacionCupoAnchor: { subTareaId: newFocusId, startedAt: now },
      nuevoFocoTexto: targetSlot.st.texto,
      focoAnteriorTexto: focusSlot.st.texto,
    };
  }

  return {
    vehicleId: vehicle.id,
    subTareas: next,
    situacionCupoAnchor: resolved,
    nuevoFocoTexto: targetSlot.st.texto,
    focoAnteriorTexto: focusSlot.st.texto,
  };
}

export type DistraccionFailResult = {
  vehicleId: string;
  subTareas: SubTarea[];
  situacionCupoAnchor: Vehicle["situacionCupoAnchor"];
  situacionCronometro: NonNullable<Vehicle["situacionCronometro"]>;
  minutosPerdidos: number;
  bloqueListo: boolean;
  closedSubTexto: string;
  closedSubId: string;
};

/** Falla la fila en foco por distracción (mensaje de sistema). */
export function applySituacionDistraccionFail(
  vehicle: Vehicle,
  now = Date.now()
): DistraccionFailResult | null {
  if (!isSituacionDesglosador(vehicle) || vehicle.status !== "activo") return null;
  if (!isRingModoEntrenamiento(vehicle)) return null;
  if (!vehicle.subTareas) return null;
  if (!ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return null;

  let sc = vehicle.situacionCronometro!;
  if (!sc.horaFinContratoMs && sc.horaFinMs) {
    sc = { ...sc, horaFinContratoMs: sc.horaFinMs };
  }

  const pending = vehicle.subTareas.filter(situacionFilaCronometroPendiente);
  if (pending.length === 0) return null;

  const focusId =
    vehicle.situacionCupoAnchor?.subTareaId &&
    pending.some(p => p.id === vehicle.situacionCupoAnchor!.subTareaId)
      ? vehicle.situacionCupoAnchor.subTareaId
      : pending[0]!.id;

  const target = vehicle.subTareas.find(st => st.id === focusId);
  if (!target) return null;

  const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
  const failed = registrarCierreFalladoCronometro(
    vehicle.subTareas,
    focusId,
    vehicle.situacionCupoAnchor,
    now,
    bloqueInicio
  );

  const subTareas = failed.subTareas.map(st =>
    st.id === focusId
      ? { ...st, motivoCierre: "distraccion" as const }
      : st
  );

  const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
  const resolvedAnchor = bloqueListo
    ? null
    : resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
        forceResetSameRow: true,
        now,
      });
  const situacionCupoAnchor =
    resolvedAnchor === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolvedAnchor;

  const situacionCronometro =
    !bloqueListo && sc.activo !== true ? reanudarSituacionCronometroRing(sc) : sc;

  return {
    vehicleId: vehicle.id,
    subTareas,
    situacionCupoAnchor,
    situacionCronometro,
    minutosPerdidos: failed.minutosPerdidos,
    bloqueListo,
    closedSubTexto: target.texto,
    closedSubId: focusId,
  };
}

export type AncladoCruceEvent =
  | {
      type: "warning";
      vehicleId: string;
      titulo: string;
      minutesLeft: number;
      originNombre: string;
    }
  | {
      type: "auto_close";
      vehicleId: string;
      titulo: string;
      originNombre: string;
    };

/** Solo desglosadores con contrato ancladoAlSegmento. */
export function evaluateAncladoSegmentoCruce(params: {
  vehicles: Vehicle[];
  segmentos: SegmentoV5[];
  nowMs: number;
  dayStartMs: number;
  warnedVehicleIds: Set<string>;
}): AncladoCruceEvent[] {
  const { vehicles, segmentos, nowMs, dayStartMs, warnedVehicleIds } = params;
  const activeSegment = getActiveSegment(segmentos, nowMs, dayStartMs);
  if (!activeSegment) return [];

  const graceEndMs = getCruceGraceEndMs(activeSegment.horaInicio, dayStartMs);
  const events: AncladoCruceEvent[] = [];

  for (const vehicle of vehicles) {
    if (!isDesglosadorAncladoSegmento(vehicle)) continue;
    if (vehicle.status !== "activo") continue;
    if (!isVehicleFromPreviousSegment(vehicle, activeSegment, dayStartMs, segmentos)) {
      continue;
    }

    const originNombre = vehicle.segmentoOrigen ?? "segmento anterior";
    if (nowMs >= graceEndMs) {
      events.push({
        type: "auto_close",
        vehicleId: vehicle.id,
        titulo: vehicle.titulo,
        originNombre,
      });
      continue;
    }

    if (!warnedVehicleIds.has(vehicle.id)) {
      const minutesLeft = Math.max(1, Math.ceil((graceEndMs - nowMs) / 60000));
      events.push({
        type: "warning",
        vehicleId: vehicle.id,
        titulo: vehicle.titulo,
        minutesLeft,
        originNombre,
      });
    }
  }

  return events;
}

export function findActiveEntrenamientoRing(vehicles: Vehicle[]): Vehicle | null {
  return (
    vehicles.find(
      v =>
        v.status === "activo" &&
        isRingModoEntrenamiento(v) &&
        ringSessionOperable(v.situacionCronometro, v.subTareas ?? []) &&
        (v.subTareas ?? []).some(situacionFilaCronometroPendiente)
    ) ?? null
  );
}
