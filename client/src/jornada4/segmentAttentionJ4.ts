/**
 * Atención de puertas Dual Kernel — sin voz / conciencia / cruce de flota.
 * Reutiliza applySegmentAttentionTick del motor clásico y añade panorama + copy.
 */
import type { Planilla, SegmentoV5 } from "@/lib/persistence";
import {
  applyDayRolloverEntropia,
  applySegmentAttentionTick,
  MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK,
  type SegmentAttentionEvent,
} from "@/lib/segmentAttentionEngine";
import { getJournalDateString, getSegmentCalendarDayStartMs } from "@/lib/segmentTime";

export const J4_PUERTA_MANTRA = "Controlando tu día";

export type PuertaPanorama = {
  total: number;
  pendientes: number;
  activasConscientes: number;
  activasSistema: number;
  cerradasConscientes: number;
  entropia: number;
  /** Puertas donde el usuario abrió o cerró con intención. */
  conscientes: number;
  /** Suma de psGanados en segmentos (aprox. saldo del día por puertas). */
  saldoPs: number;
  headline: string;
  subline: string;
  mantra: string;
};

export type J4AttentionCycleResult = {
  planilla: Planilla;
  events: SegmentAttentionEvent[];
  changed: boolean;
  catchUpPending: boolean;
  dayRollover: boolean;
};

/** Copy corto para toasts Dual Kernel. */
export function formatJ4AttentionToast(ev: SegmentAttentionEvent): {
  title: string;
  description: string;
  kind: "error" | "warning";
} {
  if (ev.type === "auto_apertura") {
    return {
      kind: "error",
      title: `Abierto por el sistema · ${ev.nombre}`,
      description: `−2 · entropía / desatención. Cierra la puerta para recuperar +2. ${J4_PUERTA_MANTRA}.`,
    };
  }
  if (ev.type === "entropia") {
    const why =
      ev.reason === "past_end"
        ? "No cerraste a tiempo."
        : ev.reason === "missed_window"
          ? "Ventana perdida sin puerta consciente."
          : "Cruce sin cierre consciente.";
    return {
      kind: "error",
      title: `Entropía · ${ev.nombre}`,
      description: `${why} ${J4_PUERTA_MANTRA}.`,
    };
  }
  if (ev.type === "day_rollover_entropia") {
    return {
      kind: "error",
      title: `Jornada cerrada · ${ev.nombre}`,
      description: `Segmento activo pasó a entropía al cambiar el día. ${J4_PUERTA_MANTRA}.`,
    };
  }
  return {
    kind: "warning",
    title: ev.nombre,
    description: J4_PUERTA_MANTRA,
  };
}

/** Espejo panorámico del día para El Crisol / métricas. */
export function computePuertaPanorama(segmentos: SegmentoV5[]): PuertaPanorama {
  const total = segmentos.length;
  let pendientes = 0;
  let activasConscientes = 0;
  let activasSistema = 0;
  let cerradasConscientes = 0;
  let entropia = 0;
  let saldoPs = 0;

  for (const seg of segmentos) {
    saldoPs += seg.psGanados || 0;
    if (seg.estado === "pendiente") {
      pendientes += 1;
      continue;
    }
    if (seg.estado === "activo") {
      if (seg.puertaSistema) activasSistema += 1;
      else activasConscientes += 1;
      continue;
    }
    if (seg.estado === "cerrado_manual") {
      cerradasConscientes += 1;
      continue;
    }
    if (seg.estado === "entropia") {
      entropia += 1;
    }
  }

  const conscientes = activasConscientes + cerradasConscientes;
  const saldoLabel = saldoPs === 0 ? "0" : saldoPs > 0 ? `+${saldoPs}` : `${saldoPs}`;
  const headline =
    total === 0 ? "Sin puertas hoy" : `${conscientes}/${total} puertas conscientes`;
  const parts: string[] = [];
  if (activasSistema > 0) parts.push(`${activasSistema} sistema`);
  if (entropia > 0) parts.push(`${entropia} entropía`);
  if (pendientes > 0) parts.push(`${pendientes} pendientes`);
  const subline =
    total === 0
      ? "Programa segmentos para dibujar el día"
      : `Saldo puertas ${saldoLabel} PS${parts.length ? ` · ${parts.join(" · ")}` : ""}`;

  return {
    total,
    pendientes,
    activasConscientes,
    activasSistema,
    cerradasConscientes,
    entropia,
    conscientes,
    saldoPs,
    headline,
    subline,
    mantra: J4_PUERTA_MANTRA,
  };
}

/**
 * Aplica rollover + tick de puertas sobre la planilla.
 * No persiste, no habla, no toca vehículos.
 */
export function applyJornada4AttentionCycle(
  planilla: Planilla,
  nowMs = Date.now(),
  options?: { maxTransitions?: number }
): J4AttentionCycleResult {
  const fechaHoy = getJournalDateString(nowMs);
  const maxTransitions =
    options?.maxTransitions ?? MAX_SEGMENT_ATTENTION_TRANSITIONS_PER_TICK;

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
      catchUpPending: false,
      dayRollover: true,
    };
  }

  const dayStart = getSegmentCalendarDayStartMs(nowMs);
  const { segmentos, events, changed, catchUpPending } = applySegmentAttentionTick(
    planilla.segmentos,
    nowMs,
    dayStart,
    { maxTransitions }
  );

  return {
    planilla: changed
      ? { ...planilla, segmentos, updatedAt: new Date(nowMs).toISOString() }
      : planilla,
    events,
    changed,
    catchUpPending,
    dayRollover: false,
  };
}

/** True si el cierre consciente está permitido (ventana de fin o recuperación sistema). */
export function canCerrarPuertaJ4(
  seg: SegmentoV5,
  nowMs: number,
  withinFinWindow: boolean
): boolean {
  if (seg.estado !== "activo") return false;
  if (withinFinWindow) return true;
  // Recuperar agencia: puerta abierta por el sistema aún se puede cerrar (+2).
  return seg.puertaSistema === true;
}
