/**
 * Atención de segmentos para Dual Kernel — sin voz ni SegmentAttentionBackground.
 * Aplica auto-apertura (puerta perdida) y entropía (cierre omitido / día).
 */
import type { Planilla, SegmentoV5 } from "@/lib/persistence";
import {
  applyDayRolloverEntropia,
  applySegmentAttentionTick,
  MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK,
  type SegmentAttentionEvent,
} from "@/lib/segmentAttentionEngine";
import { getJournalDateString, getSegmentCalendarDayStartMs } from "@/lib/segmentTime";

export type Jornada4SegmentAttentionResult = {
  planilla: Planilla;
  events: SegmentAttentionEvent[];
  changed: boolean;
  dayRollover: boolean;
};

/**
 * Tick puro: rollover de día + transiciones de puerta/entropía.
 * No habla, no toasts, no Firebase.
 */
export function applyJornada4SegmentAttention(
  planilla: Planilla,
  nowMs = Date.now()
): Jornada4SegmentAttentionResult {
  const fechaHoy = getJournalDateString(nowMs);

  if (planilla.fecha !== fechaHoy) {
    const { segmentos, events, changed } = applyDayRolloverEntropia(
      planilla.segmentos,
      nowMs
    );
    return {
      planilla: changed
        ? { ...planilla, segmentos, updatedAt: new Date(nowMs).toISOString() }
        : planilla,
      events,
      changed,
      dayRollover: true,
    };
  }

  const dayStart = getSegmentCalendarDayStartMs(nowMs);
  const { segmentos, events, changed } = applySegmentAttentionTick(
    planilla.segmentos,
    nowMs,
    dayStart,
    { maxTransitions: MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK }
  );

  return {
    planilla: changed
      ? { ...planilla, segmentos, updatedAt: new Date(nowMs).toISOString() }
      : planilla,
    events,
    changed,
    dayRollover: false,
  };
}

/** Ids de segmentos que el sistema abrió por puerta perdida (requieren −2 PS). */
export function collectAutoAperturaSegIds(
  events: SegmentAttentionEvent[]
): string[] {
  return events.filter(e => e.type === "auto_apertura").map(e => e.segId);
}

export function findSegmentNombre(
  segmentos: SegmentoV5[],
  segId: string
): string {
  return segmentos.find(s => s.id === segId)?.nombre ?? segId;
}
