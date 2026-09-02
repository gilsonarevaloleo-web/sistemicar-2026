/**
 * Ciclo de atención panorámica + entropía por cruce de segmentos.
 * Corre en segundo plano (Layout) aunque no estés en /planeacion.
 */

import { toast } from "sonner";
import type { Planilla, Vehicle } from "./persistence";
import {
  deductSovereigntyPoints,
  getDailyPointsLocalSync,
  notifyVehicleClosed,
  saveLocalVehicles,
  savePlanilla,
  updateVehicle,
  updateVehicleStatus,
} from "./persistence";
import { sealVehicleSessionClose } from "./vehicleSessionSeal";
import {
  applyDayRolloverEntropia,
  applySegmentAttentionTick,
  collectVozPuertaEvents,
  MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK,
  segmentOrdinalIndex,
  type SegmentAttentionEvent,
} from "./segmentAttentionEngine";
import {
  applyOriginSegmentCruceEntropia,
  evaluateSegmentCrossEntropy,
  getActiveSegment,
} from "./segmentCrossEntropyEngine";
import { deliverSegmentEntropiaAlert, isAppInBackground } from "./backgroundAttentionAlerts";
import { buildPuertaVozPreventionPhrase, speakEntropiaAtencionCruce, speakPuertaSegmento } from "./puertaAtencionVoice";
import { setActiveSegmento } from "./evento-universal";
import { getJournalDateString, getSegmentCalendarDayStartMs } from "./segmentTime";
import { filterNewAttentionEvents } from "./segmentAttentionToastDedup";

const PIZARRA = "#0a0a0a";
const BLOOD = "#DC2626";
const NARANJA = "#F97316";

function attentionToast(
  kind: "error" | "warning",
  title: string,
  description: string,
  duration = 6000
): void {
  if (isAppInBackground()) return;
  const style =
    kind === "error"
      ? { backgroundColor: "#1a0000", border: `2px solid ${BLOOD}`, color: BLOOD }
      : { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA };
  if (kind === "error") {
    toast.error(title, { description, style, duration });
  } else {
    toast.warning(title, { description, style, duration });
  }
}

const cruceWarnedIdsGlobal = new Set<string>();

export function getCruceWarnedIds(): Set<string> {
  return cruceWarnedIdsGlobal;
}

export function clearCruceWarnedIds(): void {
  cruceWarnedIdsGlobal.clear();
}

export type SegmentAttentionCycleState = {
  planilla: Planilla;
  vehicles: Vehicle[];
};

export type SegmentAttentionCycleResult = {
  planilla: Planilla | null;
  vehicles: Vehicle[];
  dayRolloverFecha?: string;
  changed: boolean;
};

export async function runSegmentAttentionCycle(
  userId: string,
  state: SegmentAttentionCycleState
): Promise<SegmentAttentionCycleResult> {
  const nowMs = Date.now();
  const fechaHoy = getJournalDateString();
  let { planilla, vehicles } = state;
  const cruceWarnedIds = cruceWarnedIdsGlobal;
  let changed = false;

  if (planilla.fecha !== fechaHoy) {
    const { segmentos: rolled, events, changed: rolledChanged } = applyDayRolloverEntropia(
      planilla.segmentos,
      nowMs
    );
    if (rolledChanged) {
      const finalized: Planilla = { ...planilla, segmentos: rolled };
      await savePlanilla(userId, finalized);
      planilla = finalized;
      changed = true;
      attentionToast("error", "Jornada cerrada", "Segmentos activos pasaron a entropía al cambiar el día (máx. 24 h por segmento).", 6000);
      for (const ev of events) {
        if (ev.type === "day_rollover_entropia") {
          attentionToast("error", `ENTROPÍA: ${ev.nombre}`, "0 PS. No cerraste a tiempo. El sistema no perdona la omisión.");
          deliverSegmentEntropiaAlert({
            nombre: ev.nombre,
            reason: "past_end",
            voicePhrase: `Entropía en ${ev.nombre}. Jornada cerrada sin cierre consciente.`,
          });
        }
      }
    }
    return { planilla, vehicles, dayRolloverFecha: fechaHoy, changed };
  }

  const dayStart = getSegmentCalendarDayStartMs(nowMs);
  const {
    segmentos: nextSegmentos,
    events,
    changed: segChanged,
    catchUpPending,
  } = applySegmentAttentionTick(
    planilla.segmentos,
    nowMs,
    dayStart,
    { maxTransitions: MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK }
  );

  const freshEvents = filterNewAttentionEvents(fechaHoy, events);
  const entropyLike = freshEvents.filter(e => e.type === "entropia" || e.type === "auto_apertura");
  const batchEntropy = entropyLike.length > 1 || catchUpPending;

  let segmentosAfterVoz = nextSegmentos;
  let vozChanged = false;
  const vozEvents = collectVozPuertaEvents(nextSegmentos, nowMs, dayStart);
  if (vozEvents.length > 0) {
    segmentosAfterVoz = nextSegmentos.map(seg => {
      const ve = vozEvents.find(v => v.segId === seg.id);
      if (!ve) return seg;
      vozChanged = true;
      speakPuertaSegmento({ nombre: ve.nombre, ordinal: ve.ordinal, total: ve.total });
      return { ...seg, vozDisparadaAt: nowMs };
    });
    if (vozChanged) changed = true;
  }

  for (const ev of freshEvents as SegmentAttentionEvent[]) {
    if (batchEntropy && (ev.type === "entropia" || ev.type === "auto_apertura")) {
      continue;
    }
    if (ev.type === "auto_apertura") {
      attentionToast(
        "error",
        `ENTROPÍA: ${ev.nombre}`,
        "Puerta abierta por el sistema. −2 PS. Cierra la puerta para recuperar +2 PS."
      );
      const segsForOrdinal = segChanged ? segmentosAfterVoz : planilla.segmentos;
      const ordinal = segmentOrdinalIndex(segsForOrdinal, ev.segId);
      const total = segsForOrdinal.length;
      deliverSegmentEntropiaAlert({
        nombre: ev.nombre,
        reason: "missed_puerta",
        voicePhrase: buildPuertaVozPreventionPhrase({
          nombre: ev.nombre,
          ordinal,
          total,
          kind: "puerta_perdida_sistema",
        }),
      });
      setActiveSegmento(userId, ev.segId);
      void deductSovereigntyPoints(userId, 2, "Puerta sistema (entropía): " + ev.nombre).catch(e =>
        console.error("[auto_apertura] deductPS", e)
      );
    } else if (ev.type === "entropia") {
      const desc =
        ev.reason === "past_end"
          ? "No cerraste a tiempo. El sistema no perdona la omisión."
          : ev.reason === "cruce_sin_cierre"
            ? "Vehículo del segmento anterior sin cierre consciente. Abre otro vehículo por zona."
            : "Ventana de segmento perdida sin puerta consciente.";
      attentionToast("error", `ENTROPÍA: ${ev.nombre}`, desc);
      deliverSegmentEntropiaAlert({ nombre: ev.nombre, reason: ev.reason });
    }
  }

  if (batchEntropy) {
    const n = entropyLike.length;
    const suffix = catchUpPending ? " (sincronizando en segundo plano…)" : "";
    attentionToast(
      "error",
      "Entropía acumulada",
      `${n > 0 ? n : "Varios"} segmento(s) requirieron cierre automático al sincronizar el horario${suffix}. Revisa la lista del día.`,
      7000
    );
    for (const ev of freshEvents) {
      if (ev.type !== "auto_apertura") continue;
      setActiveSegmento(userId, ev.segId);
    }
    const autoCount = freshEvents.filter(e => e.type === "auto_apertura").length;
    if (autoCount > 0) {
      void deductSovereigntyPoints(
        userId,
        autoCount * 2,
        `Puerta sistema (entropía): ${autoCount} segmento(s)`
      ).catch(e => console.error("[auto_apertura] deductPS", e));
    }
  }

  let planillaForCruce =
    segChanged || vozChanged
      ? { ...planilla, segmentos: segmentosAfterVoz }
      : planilla;
  if (segChanged || vozChanged) changed = true;

  const { events: cruceEvents, vehicleVozPatches } = evaluateSegmentCrossEntropy({
    vehicles,
    segmentos: planillaForCruce.segmentos,
    nowMs,
    dayStartMs: dayStart,
    warnedVehicleIds: cruceWarnedIds,
  });

  for (const patch of vehicleVozPatches) {
    const v = vehicles.find(x => x.id === patch.vehicleId);
    if (!v) continue;
    v.cruceEntropiaVozAt = patch.cruceEntropiaVozAt;
    void updateVehicle(userId, patch.vehicleId, { cruceEntropiaVozAt: patch.cruceEntropiaVozAt }).catch(() => {});
  }
  if (vehicleVozPatches.length > 0) {
    saveLocalVehicles(vehicles);
    changed = true;
  }

  for (const ev of cruceEvents) {
    if (ev.type === "warning") {
      attentionToast(
        "warning",
        `Cierra y abre otro vehículo: ${ev.titulo}`,
        `Sesión de «${ev.originNombre}» en «${ev.activeSegNombre}». Cierre automático en ~${ev.minutesLeft} min.`,
        6000
      );
      deliverSegmentEntropiaAlert({
        nombre: ev.activeSegNombre,
        reason: "cruce_sin_cierre",
        voicePhrase: `Quedan ${ev.minutesLeft} minutos para cerrar ${ev.titulo} y abrir otro vehículo en este segmento.`,
      });
    } else if (ev.type === "voz") {
      speakEntropiaAtencionCruce(getActiveSegment(planillaForCruce.segmentos)?.id);
    } else if (ev.type === "segment_entropia") {
      const { segmentos: rolled, event, changed: cruceChanged } = applyOriginSegmentCruceEntropia(
        planillaForCruce.segmentos,
        ev.segId,
        nowMs
      );
      if (cruceChanged && event) {
        planillaForCruce = { ...planillaForCruce, segmentos: rolled };
        attentionToast(
          "error",
          `ENTROPÍA: ${event.nombre}`,
          "Cruce sin cierre consciente. 0 PS. Abre otro vehículo en cada segmento."
        );
        deliverSegmentEntropiaAlert({ nombre: event.nombre, reason: "cruce_sin_cierre" });
        changed = true;
      }
    }
  }

  const autoCloseIds = cruceEvents.filter(e => e.type === "auto_close").map(e => e.vehicleId);
  for (const vehicleId of autoCloseIds) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status !== "activo") continue;
    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
    const cierreAt = Date.now();
    sealVehicleSessionClose(vehicleId, {
      cierreAt,
      status: "archivado",
      clientRequestId: vehicle.clientRequestId,
    });
    const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || cierreAt;
    const duracionFinal = Math.max(1, Math.round((cierreAt - aperturaAt) / 60000));
    const patch = {
      status: "archivado" as const,
      cierreAt,
      duracionFinal,
      cierreManual: false,
      interrupcionActiva: false,
      desglosadorPausa: undefined,
      situacionCronometro: null,
      situacionCupoAnchor: null,
    };
    vehicles = vehicles.map(v => (v.id === vehicleId ? { ...v, ...patch } : v));
    saveLocalVehicles(vehicles);
    try {
      await updateVehicle(userId, vehicleId, patch);
      await updateVehicleStatus(userId, vehicleId, "archivado");
    } catch (e) {
      console.warn("[cruceEntropiaClose]", vehicleId, e);
    }
    attentionToast(
      "error",
      `Cierre por entropía-atención: ${vehicle.titulo}`,
      "Vehículo del segmento anterior archivado. Abre otro vehículo para esta zona."
    );
    deliverSegmentEntropiaAlert({
      nombre: vehicle.titulo,
      reason: "cruce_sin_cierre",
      voicePhrase: `Cierre por entropía-atención. ${vehicle.titulo} archivado. Abre otro vehículo en este segmento.`,
    });
    changed = true;
  }

  if (planillaForCruce !== planilla || segChanged || vozChanged) {
    await savePlanilla(userId, planillaForCruce);
    planilla = planillaForCruce;
    changed = true;
  }

  return { planilla, vehicles, changed };
}

export const SEGMENT_ATTENTION_TICK_EVENT = "sistemicar-segment-attention-tick";
export const SEGMENT_DAY_ROLLOVER_EVENT = "sistemicar-segment-day-rollover";

export function dispatchSegmentAttentionTick(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SEGMENT_ATTENTION_TICK_EVENT));
}

export function dispatchSegmentDayRollover(fecha: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SEGMENT_DAY_ROLLOVER_EVENT, { detail: { fecha } }));
}

let forceTickImpl: (() => void) | null = null;

export function registerSegmentAttentionForceTick(fn: () => void): () => void {
  forceTickImpl = fn;
  return () => {
    if (forceTickImpl === fn) forceTickImpl = null;
  };
}

export function runSegmentAttentionTickNow(): void {
  forceTickImpl?.();
}
