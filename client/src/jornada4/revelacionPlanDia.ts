/**
 * Revelación del plan — reporte GLOBAL sellado al término.
 *
 * 100% = 24 h del día-jornada (05:00→05:00).
 * Inconsciente = plan ya ocurrido sin vehículo (huecos).
 * Presencia = vehículos sin dirección.
 * Dirección = vehículos con proyecto o centro, dentro del plan.
 * No conquistado = horario no planificado. Si planificas 24 h, queda en cero.
 *
 * Prohibido en ms0 / tick 1s. Idle / sombra.
 */
import {
  computeGastoConcienciaDia,
  huecosLogToIntervals,
  MINUTOS_DIA_JORNADA,
} from "@/lib/gastoConcienciaEngine";
import { safeSetItem } from "@/lib/storageHygiene";
import {
  getJournalDateString,
  getLimaDayStartMs,
  getLimaMinutesFromMidnight,
  segmentWindowMs,
} from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";
import type { CoberturaHuecoInterval } from "./coberturaHuecosLog";

export type RevelacionPlanDia = {
  fecha: string;
  sealedAt: number;
  planEndMs: number;
  planEndLabel: string;
  minutosPlan: number;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  /** Horario no planificado (24 h − plan). Ya no es el futuro del plan. */
  minutosPorConquistar: number;
  minutosDia?: number;
  headline: string;
};

const STORAGE_KEY = "sistemicar_revelacion_plan_v1";
const MAX_DAYS = 45;

function storageKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`;
}

export function formatMinutosHoras(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

export function formatPlanEndLabel(endMs: number): string {
  const mins = getLimaMinutesFromMidnight(endMs);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Última franja del plan (la de horaFin más tarde). Ahí se prueba el carácter. */
export function resolveLastSegmentWindowMs(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  now = Date.now()
): { startMs: number; endMs: number } | null {
  const dayStartMs = getLimaDayStartMs(now);
  let last: { startMs: number; endMs: number } | null = null;
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (!s?.horaInicio || !s.horaFin) continue;
    const w = segmentWindowMs(s.horaInicio, s.horaFin, dayStartMs);
    if (w.end <= w.start) continue;
    if (!last || w.end > last.endMs) last = { startMs: w.start, endMs: w.end };
  }
  return last;
}

export function resolvePlanWindowMs(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  now = Date.now()
): { startMs: number; endMs: number; dayStartMs: number } | null {
  const dayStartMs = getLimaDayStartMs(now);
  let startMs = Infinity;
  let endMs = -Infinity;
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (!s?.horaInicio || !s.horaFin) continue;
    const w = segmentWindowMs(s.horaInicio, s.horaFin, dayStartMs);
    if (w.end <= w.start) continue;
    if (w.start < startMs) startMs = w.start;
    if (w.end > endMs) endMs = w.end;
  }
  if (!Number.isFinite(startMs) || endMs <= startMs) return null;
  return { startMs, endMs, dayStartMs };
}

export function isPlanTerminado(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  now = Date.now()
): boolean {
  const w = resolvePlanWindowMs(segmentos, now);
  return Boolean(w && now >= w.endMs);
}

function buildHeadline(r: Omit<RevelacionPlanDia, "headline">): string {
  const total = r.minutosDia || MINUTOS_DIA_JORNADA;
  if (r.minutosPlan <= 0) return "Sin plan — no hay revelación que sellar.";
  const i = r.minutosInconsciente;
  const p = r.minutosPresencia;
  const d = r.minutosDireccion;
  const nc = r.minutosPorConquistar;
  if (d >= p && d >= i && d > 0) {
    return `El día revela Dirección: ${formatMinutosHoras(d)} de rumbo.`;
  }
  if (p >= i && p > 0) {
    return `El día revela Presencia: ${formatMinutosHoras(p)} sin reclamar Norte.`;
  }
  if (i > 0) {
    return `El día revela inconsciencia: ${formatMinutosHoras(i)} sin vehículo.`;
  }
  if (nc > 0 && nc >= total / 2) {
    return `El día revela lo no conquistado: ${formatMinutosHoras(nc)} fuera del plan.`;
  }
  return "El plan terminó. Así se gastó el tiempo.";
}

export function buildRevelacionPlanDia(params: {
  fecha?: string;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  now?: number;
  huecos?: CoberturaHuecoInterval[];
}): RevelacionPlanDia | null {
  const now = params.now ?? Date.now();
  const win = resolvePlanWindowMs(params.segmentos, now);
  if (!win) return null;
  const fecha = params.fecha ?? getJournalDateString(now);
  const huecosLog = params.huecos
    ? huecosLogToIntervals(params.huecos, now)
    : undefined;
  const dia = computeGastoConcienciaDia({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now,
    huecosLog,
  });
  if (dia.minutosPlan <= 0) return null;

  const body: Omit<RevelacionPlanDia, "headline"> = {
    fecha,
    sealedAt: now,
    planEndMs: win.endMs,
    planEndLabel: formatPlanEndLabel(win.endMs),
    minutosPlan: dia.minutosPlan,
    minutosInconsciente: dia.minutosInconsciente,
    minutosPresencia: dia.minutosPresencia,
    minutosDireccion: dia.minutosDireccion,
    minutosPorConquistar: dia.minutosNoConquistado,
    minutosDia: dia.minutosDia,
  };
  return { ...body, headline: buildHeadline(body) };
}

function readMap(userId: string): Record<string, RevelacionPlanDia> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RevelacionPlanDia>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(userId: string, map: Record<string, RevelacionPlanDia>): void {
  const fechas = Object.keys(map).sort();
  if (fechas.length > MAX_DAYS) {
    for (const f of fechas.slice(0, fechas.length - MAX_DAYS)) delete map[f];
  }
  safeSetItem(storageKey(userId), JSON.stringify(map));
}

export function readRevelacionPlanDia(
  userId: string,
  fecha?: string
): RevelacionPlanDia | null {
  if (!userId) return null;
  const day = fecha ?? getJournalDateString();
  return readMap(userId)[day] ?? null;
}

/**
 * Sella (o actualiza) el reporte del día con la historia real de vehículos.
 * La verdad de los registros gana a un sello viejo.
 */
export function sealRevelacionPlanDia(
  userId: string,
  params: {
    segmentos: { horaInicio?: string; horaFin?: string }[];
    vehicles: Vehicle[];
    now?: number;
    fecha?: string;
    huecos?: CoberturaHuecoInterval[];
  }
): RevelacionPlanDia | null {
  if (!userId) return null;
  const now = params.now ?? Date.now();
  const fecha = params.fecha ?? getJournalDateString(now);
  if (!isPlanTerminado(params.segmentos, now)) {
    return readRevelacionPlanDia(userId, fecha);
  }
  const next = buildRevelacionPlanDia({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now,
    huecos: params.huecos,
  });
  if (!next) return readRevelacionPlanDia(userId, fecha);
  const map = readMap(userId);
  map[fecha] = next;
  writeMap(userId, map);
  return next;
}
