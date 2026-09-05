/**
 * Término de jornada = horaFin de la última franja del plan.
 * No es las 21:00. No es el cierre de un trabajo. No es el cierre de un proyecto.
 */
import {
  getJournalDateString,
  segmentEndMs,
} from "../reporteSemanal/ventana.ts";

export type SegmentoTermino = { horaInicio?: string; horaFin?: string };

/** Epoch ms del final de la última puerta. Null = no hay anillo, no hay término. */
export function resolveTerminoPlanMs(
  segmentos: SegmentoTermino[],
  nowMs: number,
): number | null {
  const fecha = getJournalDateString(nowMs);
  let last: number | null = null;
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (!s?.horaInicio || !s.horaFin) continue;
    const end = segmentEndMs(fecha, s.horaInicio, s.horaFin);
    if (!Number.isFinite(end)) continue;
    if (last == null || end > last) last = end;
  }
  return last;
}

export function formatTerminoLabel(endMs: number): string {
  const lima = new Date(endMs - 5 * 60 * 60 * 1000);
  const h = lima.getUTCHours();
  const m = lima.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function planYaTermino(
  segmentos: SegmentoTermino[],
  nowMs: number,
): boolean {
  const end = resolveTerminoPlanMs(segmentos, nowMs);
  return end != null && nowMs >= end;
}

/**
 * El aviso nace cuando el PLAN termina.
 * Sin anillo no hay término que recordar (el operador igual puede sellar evidencia).
 */
export function debeRecordarSello(
  nowMs: number,
  yaSellado: boolean,
  planEndMs: number | null,
): boolean {
  if (yaSellado) return false;
  if (planEndMs == null || !Number.isFinite(planEndMs)) return false;
  return nowMs >= planEndMs;
}
