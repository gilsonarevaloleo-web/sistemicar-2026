/**
 * Revelación del plan — reporte GLOBAL sellado al término.
 *
 * No vive en un proyecto (allá solo llega Dirección).
 * 100% = minutos únicos del plan. Tras horaFin del último segmento
 * se sella: inconsciente (huecos) · presencia · dirección · por conquistar.
 * Lo no planificado no es deuda.
 *
 * Prohibido en ms0 / tick 1s. Idle / sombra.
 */
import { computeTriadaLineaOccupancy } from "@/lib/concienciaTriadaLinea";
import { safeSetItem } from "@/lib/storageHygiene";
import {
  getJournalDateString,
  getLimaDayStartMs,
  getLimaMinutesFromMidnight,
  segmentWindowMs,
} from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";

export type RevelacionPlanDia = {
  fecha: string;
  sealedAt: number;
  planEndMs: number;
  planEndLabel: string;
  minutosPlan: number;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosPorConquistar: number;
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
  const total = r.minutosPlan;
  if (total <= 0) return "Sin plan — no hay revelación que sellar.";
  const i = r.minutosInconsciente;
  const p = r.minutosPresencia;
  const d = r.minutosDireccion;
  if (d >= p && d >= i && d > 0) {
    return `El plan revela Dirección: ${formatMinutosHoras(d)} de rumbo.`;
  }
  if (p >= i && p > 0) {
    return `El plan revela Presencia: ${formatMinutosHoras(p)} sin reclamar Norte.`;
  }
  if (i > 0) {
    return `El plan revela inconsciencia: ${formatMinutosHoras(i)} sin vehículo.`;
  }
  return "El plan terminó. Así se gastó el tiempo.";
}

export function buildRevelacionPlanDia(params: {
  fecha?: string;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  now?: number;
}): RevelacionPlanDia | null {
  const now = params.now ?? Date.now();
  const win = resolvePlanWindowMs(params.segmentos, now);
  if (!win) return null;
  const fecha = params.fecha ?? getJournalDateString(now);
  const occ = computeTriadaLineaOccupancy({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now,
  });
  if (occ.minutosPlan <= 0) return null;

  const body: Omit<RevelacionPlanDia, "headline"> = {
    fecha,
    sealedAt: now,
    planEndMs: win.endMs,
    planEndLabel: formatPlanEndLabel(win.endMs),
    minutosPlan: occ.minutosPlan,
    minutosInconsciente: occ.minutosHueco,
    minutosPresencia: occ.minutosPresencia,
    minutosDireccion: occ.minutosDireccion,
    minutosPorConquistar: occ.minutosPlanFuturo,
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
 * Sella una sola vez por fecha. Si ya hay sello, lo devuelve.
 * Llamar solo cuando el plan ya terminó.
 */
export function sealRevelacionPlanDia(
  userId: string,
  params: {
    segmentos: { horaInicio?: string; horaFin?: string }[];
    vehicles: Vehicle[];
    now?: number;
    fecha?: string;
  }
): RevelacionPlanDia | null {
  if (!userId) return null;
  const now = params.now ?? Date.now();
  const fecha = params.fecha ?? getJournalDateString(now);
  const existing = readRevelacionPlanDia(userId, fecha);
  if (existing) return existing;
  if (!isPlanTerminado(params.segmentos, now)) return null;
  const next = buildRevelacionPlanDia({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now,
  });
  if (!next) return null;
  const map = readMap(userId);
  map[fecha] = next;
  writeMap(userId, map);
  return next;
}
