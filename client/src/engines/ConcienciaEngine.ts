import {
  getJournalDayStartMs,
  getLimaDayStartMs,
  getLimaMinutesFromMidnight,
  getLimaSecondsFromMidnight,
  getSegmentCalendarDayStartMs,
  segmentTimeToMinutes,
  segmentWindowMs,
} from "@/lib/segmentTime";
import {
  isGhostActiveVehicle,
} from "@/lib/ghostVehicleEngine";
import type { Vehicle } from "@/lib/persistence";
import { NO_VEHICLE_SINCE_KEY, listActiveCentinelas } from "@/lib/centinelaEngine";
import {
  applyMonotonicLiveEntropy,
  getEntropyMonotonicDebugState,
  resetEntropyMonotonicState,
} from "@/lib/entropyMonotonicStore";
import {
  armLiveGapClock,
  computeTimestampGapEntropyMin,
  getLiveGapClockState,
} from "@/lib/entropyGapClock";
import { clampLiveEntropyDisplay } from "@/lib/entropyLiveFreeze";
import {
  CENTINELA_GRACE_MS,
  CENTINELA_GRACE_MIN,
  resolveCoverageVehicles,
} from "@/lib/entropyTimePolicy";

export type NivelFatiga = 'Optimo' | 'Distraccion' | 'Confusion' | 'Aburrimiento' | 'Cansancio';

export interface MetricasAnillo {
  planificacionPct: number;
  conquistaPct: number;
}

export const evaluarCapaFatiga = (
  tiempoTranscurrido: number,
  tiempoEstimado: number,
  cambiosDeEstadoRecientes: number,
  horaActual: number
): NivelFatiga => {
  if (tiempoTranscurrido > 7200) return 'Cansancio';
  if (cambiosDeEstadoRecientes > 3 && tiempoTranscurrido < 300) return 'Confusion';
  if (tiempoEstimado > 0 && tiempoTranscurrido > tiempoEstimado * 1.3) return 'Distraccion';
  if (tiempoTranscurrido > 3600 && horaActual >= 14 && horaActual <= 16) return 'Aburrimiento';
  return 'Optimo';
};

function parseSegMinutes(t: string): number {
  const strict = segmentTimeToMinutes(t);
  if (strict > 0 || /^0*:0*$/.test((t || "").trim())) return strict;
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

export const calcularAnilloSoberania = (
  segmentos: any[],
  vehiculos: any[]
): MetricasAnillo => {
  const minutosPlaneados = segmentos.reduce((acc, s) => {
    const ini = parseSegMinutes(s.horaInicio);
    const fin = parseSegMinutes(s.horaFin);
    const dur = fin >= ini ? fin - ini : fin + 1440 - ini;
    return acc + Math.max(0, dur);
  }, 0);
  const planificacionPct = Math.min(100, (minutosPlaneados / 1440) * 100);

  const segmentosConActividad = new Set(vehiculos.map((v: any) => v.segmentoId));
  const conquistaPct =
    segmentos.length > 0
      ? (segmentosConActividad.size / segmentos.length) * 100
      : 0;

  return { planificacionPct, conquistaPct };
};

export interface VehiculoAnilloLite {
  autoVerdad?: boolean;
  status?: string;
  tipoFlota?: string;
  tipoReloj?: string;
  tipoDescanso?: string;
  interrupcionActiva?: boolean;
  desglosadorPausa?: unknown;
  puntoCero?: { fase?: string };
  aperturaAt?: number;
  createdAt?: number | Date;
  primerAccionAt?: number;
  cierreAt?: number;
  duracionFinal?: number;
  completedAt?: number | Date;
}

export type TimelineArcKind = "conquista" | "entropia" | "fondo";

export type AnilloPointerMode = "libre" | "conquista" | "entropia";

/** Contingencia sin segmentos: umbral a las 06:00 AM (360 min desde medianoche). */
export const UMBRAL_CONTINGENCIA_MIN = 6 * 60;

const MINUTOS_DIA = 1440;

export interface TimelineClockArc {
  startDeg: number;
  endDeg: number;
  kind: TimelineArcKind;
  lap?: 0 | 1;
}

/** Arco de segmento planificado — misma geometría 12h + lap que timeline y puntero. */
export interface SegmentClockArc {
  startDeg: number;
  endDeg: number;
  lap: 0 | 1;
  ordinal: number;
  estado: string;
  nombre?: string;
  horaInicio: string;
  horaFin: string;
  isActive?: boolean;
  isNowInside?: boolean;
}

/** Conquista / entropía recortada dentro del arco de un segmento planificado. */
export type SegmentBattleKind = "conquista" | "entropia";

export interface SegmentBattleArc {
  startDeg: number;
  endDeg: number;
  lap: 0 | 1;
  ordinal: number;
  kind: SegmentBattleKind;
}

export interface SegmentBattleInterval {
  ordinal: number;
  kind: SegmentBattleKind;
  startMs: number;
  endMs: number;
}

/** Stats por segmento para tooltip / long-press. */
export interface SegmentArcStats {
  ordinal: number;
  nombre?: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  conquistaMin: number;
  entropiaMin: number;
}

export interface TimelineDayStats {
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  centinelaMin: number;
}

export interface SegmentoAnilloLite {
  horaInicio?: string;
  horaFin?: string;
}

export interface MetricasAnilloConciencia {
  planificacionPct: number;
  conquistaMin: number;
  entropiaMin: number;
  jornadaMin: number;
  conquistaArcPct: number;
  entropiaArcPct: number;
  fillPct: number;
  horasCubiertas: number;
  /** Terreno planificado aún no conquistado (solo anillo interior en modo batalla). */
  terrenoRestanteMin?: number;
}

function roundArcPct(value: number): number {
  return Math.min(100, Math.round(value * 10) / 10);
}

/** Arcos del anillo interior: complementarios (batalla) o independientes (sin segmentos). */
function computeInnerRingMetrics(params: {
  jornadaMin: number;
  conquistaMin: number;
  entropiaMin: number;
  modoBatallaAnillo: boolean;
}): Pick<MetricasAnilloConciencia, "conquistaArcPct" | "entropiaArcPct" | "fillPct" | "terrenoRestanteMin"> {
  const { jornadaMin, conquistaMin, entropiaMin, modoBatallaAnillo } = params;
  const conquistaArcPct = jornadaMin > 0 ? roundArcPct((conquistaMin / jornadaMin) * 100) : 0;

  if (modoBatallaAnillo) {
    const terrenoRestanteMin = Math.round(Math.max(0, jornadaMin - conquistaMin) * 10) / 10;
    const entropiaArcPct =
      jornadaMin > 0 ? roundArcPct((terrenoRestanteMin / jornadaMin) * 100) : 0;
    return { conquistaArcPct, entropiaArcPct, fillPct: 100, terrenoRestanteMin };
  }

  const entropiaArcPct = jornadaMin > 0 ? roundArcPct((entropiaMin / jornadaMin) * 100) : 0;
  return {
    conquistaArcPct,
    entropiaArcPct,
    fillPct: Math.min(100, conquistaArcPct + entropiaArcPct),
    terrenoRestanteMin: undefined,
  };
}

function sumMinutosPlaneados(segmentos: SegmentoAnilloLite[]): number {
  return segmentos.reduce((acc, s) => {
    if (!s) return acc;
    const ini = parseSegMinutes(s.horaInicio || "");
    const fin = parseSegMinutes(s.horaFin || "");
    const dur = fin >= ini ? fin - ini : fin + 1440 - ini;
    return acc + Math.max(0, dur);
  }, 0);
}


function overlapMinutes(
  sessionStart: number,
  sessionEnd: number,
  winStart: number,
  winEnd: number
): number {
  const start = Math.max(sessionStart, winStart);
  const end = Math.min(sessionEnd, winEnd);
  return Math.max(0, (end - start) / 60000);
}

function completedAtMs(v: VehiculoAnilloLite): number | undefined {
  if (!v.completedAt) return undefined;
  return v.completedAt instanceof Date ? v.completedAt.getTime() : v.completedAt;
}

function timestampMs(value: number | Date | undefined): number | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value.getTime() : value;
}

/** Inicio real de cobertura consciente (no antes de creación ni primera acción). */
export function resolveConsciousSessionStart(v: VehiculoAnilloLite, refMs = Date.now()): number | null {
  const apertura = v.aperturaAt;
  if (apertura == null || !Number.isFinite(apertura)) return null;
  let start = apertura;
  const created = timestampMs(v.createdAt);
  if (created != null && created > start) start = created;
  if (v.primerAccionAt != null && v.primerAccionAt > start) start = v.primerAccionAt;
  if (!v.autoVerdad && v.status === "activo") {
    const anchorMs = refMs ?? v.aperturaAt ?? timestampMs(v.createdAt) ?? Date.now();
    const journalStart = getJournalDayStartMs(anchorMs);
    if (start < journalStart) start = journalStart;
  }
  return start;
}

export function vehicleSessionRange(
  v: VehiculoAnilloLite,
  now: number
): { start: number; end: number } | null {
  const start = resolveConsciousSessionStart(v, now);
  if (start == null) return null;
  let end: number;
  if (v.status === "activo") {
    end = now;
  } else if (v.cierreAt) {
    end = v.cierreAt;
  } else if (v.duracionFinal != null && v.duracionFinal > 0) {
    end = start + v.duracionFinal * 60000;
  } else {
    const completed = completedAtMs(v);
    if (completed && completed > start) {
      end = completed;
    } else if (v.status === "cumplido" || v.status === "archivado") {
      end = start + 60000;
    } else {
      return null;
    }
  }
  return end > start ? { start, end } : null;
}

type MsInterval = { start: number; end: number };

function clipInterval(interval: MsInterval, winStart: number, winEnd: number): MsInterval | null {
  const start = Math.max(interval.start, winStart);
  const end = Math.min(interval.end, winEnd);
  return end > start ? { start, end } : null;
}

function mergeMsIntervals(intervals: MsInterval[]): MsInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: MsInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function subtractMsIntervals(base: MsInterval[], subtract: MsInterval[]): MsInterval[] {
  let result = [...base];
  for (const sub of subtract) {
    const next: MsInterval[] = [];
    for (const interval of result) {
      if (sub.end <= interval.start || sub.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (sub.start > interval.start) {
        next.push({ start: interval.start, end: sub.start });
      }
      if (sub.end < interval.end) {
        next.push({ start: sub.end, end: interval.end });
      }
    }
    result = next;
  }
  return result;
}

/** Colchón centinela (2 min): aplica en cierre de jornada y sellado retroactivo, no en el puntero en vivo. */
export { CENTINELA_GRACE_MIN, CENTINELA_GRACE_MS };

/** Recorta los primeros 2 min de cada hueco continuo; el excedente es entropía contable en cierre. */
export function applyCentinelaGraceToGaps(gaps: MsInterval[]): MsInterval[] {
  const out: MsInterval[] = [];
  for (const g of gaps) {
    const start = g.start + CENTINELA_GRACE_MS;
    if (g.end > start) out.push({ start, end: g.end });
  }
  return out;
}

function sumGapsMinutesInWindow(
  winStart: number,
  winEnd: number,
  coverSessions: MsInterval[],
  applyGrace: boolean
): number {
  if (winEnd <= winStart) return 0;
  const window: MsInterval = { start: winStart, end: winEnd };
  const coverInWindow = coverSessions
    .filter(s => s.start < winEnd && s.end > winStart)
    .map(s => clipInterval(s, winStart, winEnd))
    .filter((s): s is MsInterval => s != null);
  let gaps = mergeMsIntervals(subtractMsIntervals([window], mergeMsIntervals(coverInWindow)));
  if (applyGrace) gaps = applyCentinelaGraceToGaps(gaps);
  return gaps.reduce((acc, g) => acc + (g.end - g.start) / 60000, 0);
}

/**
 * Intervalos centinela retroactivos (post-gracia) para huecos en segmentos planificados
 * aún no cubiertos por sesiones centinela reales. Solo aplica con segmentos.
 */
export function computeRetroactiveCentinelaIntervalsMs(
  segmentos: SegmentoAnilloLite[],
  limaDayStartMs: number,
  livedStartMs: number,
  nowMs: number,
  coverSessions: MsInterval[],
  existingCentinelaSessions: MsInterval[]
): MsInterval[] {
  if (segmentos.length === 0) return [];
  const rawGaps = computePlannedEntropyGapsMs(
    segmentos,
    limaDayStartMs,
    livedStartMs,
    nowMs,
    coverSessions
  );
  const graced = applyCentinelaGraceToGaps(rawGaps);
  return subtractMsIntervals(graced, mergeMsIntervals(existingCentinelaSessions));
}

/** Huecos sellables como sesiones centinela archivadas (solo con segmentos planificados). */
export function listRetroactiveCentinelaGapsToPersist(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: VehiculoAnilloLite[];
  now?: number;
}): Array<{ aperturaAt: number; cierreAt: number }> {
  const now = params.now ?? Date.now();
  if (params.segmentos.length === 0) return [];

  const segmentDayStartMs = getSegmentCalendarDayStartMs(now);
  const umbralMin = getUmbralConcienciaMin(params.segmentos);
  const nowMin = getNowMinutesLocal(Math.min(now, getJournalDayStartMs(now) + 86400000), segmentDayStartMs);
  if (nowMin < umbralMin) return [];

  const livedStartMs = segmentDayStartMs + umbralMin * 60000;
  const nowMs = Math.min(now, getJournalDayStartMs(now) + 86400000);
  if (nowMs <= livedStartMs) return [];

  const todayVehicles = filterVehiculosCalendarioHoy(params.vehiculos, now);
  const coverSessions = collectClippedSessions(
    todayVehicles,
    now,
    isGapCoverVehicle,
    livedStartMs,
    nowMs
  );
  const centinelaSessions = collectClippedSessions(
    todayVehicles,
    now,
    isCentinelaVehicle,
    livedStartMs,
    nowMs
  );

  const intervals = computeRetroactiveCentinelaIntervalsMs(
    params.segmentos,
    segmentDayStartMs,
    livedStartMs,
    nowMs,
    coverSessions,
    centinelaSessions
  );

  return intervals
    .filter(iv => iv.end - iv.start >= 60_000)
    .map(iv => ({ aperturaAt: iv.start, cierreAt: iv.end }));
}

function plannedSegmentWindowsMs(
  segmentos: SegmentoAnilloLite[],
  limaDayStartMs: number,
  livedStartMs: number,
  nowMs: number
): MsInterval[] {
  const windows: MsInterval[] = [];
  for (const seg of segmentos) {
    const { start, end } = segmentWindowMs(
      seg.horaInicio || "00:00",
      seg.horaFin || "00:00",
      limaDayStartMs
    );
    const evalStart = Math.max(start, livedStartMs);
    const evalEnd = Math.min(end, nowMs);
    if (evalEnd > evalStart) windows.push({ start: evalStart, end: evalEnd });
  }
  return mergeMsIntervals(windows);
}

function intersectIntervalsWithWindows(intervals: MsInterval[], windows: MsInterval[]): MsInterval[] {
  if (windows.length === 0 || intervals.length === 0) return [];
  const out: MsInterval[] = [];
  for (const interval of intervals) {
    for (const w of windows) {
      const clipped = clipInterval(interval, w.start, w.end);
      if (clipped) out.push(clipped);
    }
  }
  return mergeMsIntervals(out);
}

const MINUTOS_MEDIA_JORNADA = 12 * 60;

/** Grados en reloj 12h: 00:00/12:00 arriba, sentido horario; 360° = 720 min. */
export function clockMinutesToDeg(totalMinutes: number): number {
  const m = ((totalMinutes % MINUTOS_MEDIA_JORNADA) + MINUTOS_MEDIA_JORNADA) % MINUTOS_MEDIA_JORNADA;
  return m * 0.5;
}

export function getHalfDayLap(totalMinutes: number): 0 | 1 {
  const m = ((totalMinutes % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  return (m >= MINUTOS_MEDIA_JORNADA ? 1 : 0) as 0 | 1;
}

export function nowToHalfDayLap(nowMs: number = Date.now()): 0 | 1 {
  return limaNowToHalfDayLap(nowMs);
}

/** Puntero en tiempo local 12h + vuelta (lap) para indicar PM. */
export function nowToClockDeg(nowMs: number = Date.now()): number {
  return limaNowToClockDeg(nowMs);
}

/** Puntero del anillo anclado a hora Lima (misma base que segmentos HH:mm). */
export function limaNowToClockDeg(nowMs: number = Date.now()): number {
  const min = getLimaMinutesFromMidnight(nowMs);
  const sec = getLimaSecondsFromMidnight(nowMs) % 60;
  return clockMinutesToDeg(min) + sec * (0.5 / 60);
}

export function limaNowToHalfDayLap(nowMs: number = Date.now()): 0 | 1 {
  return getHalfDayLap(getLimaMinutesFromMidnight(nowMs));
}

/** Convierte instante absoluto a grados del reloj 12h (medianoche Lima del mismo día civil). */
export function msToClockDeg(ms: number, _dayStartMs?: number): number {
  void _dayStartMs;
  const dayStartMs = getLimaDayStartMs(ms);
  const minutesFromMidnight = (ms - dayStartMs) / 60000;
  return clockMinutesToDeg(minutesFromMidnight);
}

/** Hora de inicio del primer segmento planificado (Umbral de Conciencia). */
export function getUmbralConcienciaMin(segmentos: SegmentoAnilloLite[]): number {
  if (segmentos.length === 0) return UMBRAL_CONTINGENCIA_MIN;
  let min = MINUTOS_DIA;
  for (const s of segmentos) {
    if (!s) continue;
    const ini = parseSegMinutes(s.horaInicio || "");
    if (ini < min) min = ini;
  }
  return min;
}

function getNowMinutesLocal(nowMs: number, dayStartMs: number): number {
  return Math.max(0, Math.min(MINUTOS_DIA, Math.floor((nowMs - dayStartMs) / 60000)));
}

/** Centinela (Modo Verdad): tiempo inconsciente registrado explícitamente. */
function isCentinelaVehicle(v: VehiculoAnilloLite): boolean {
  return !!v.autoVerdad;
}

/** Ejecución consciente voluntaria (tiempo, situación, descanso — no centinela). */
function isConquistaVehicle(v: VehiculoAnilloLite): boolean {
  return !v.autoVerdad;
}

/** Punto Cero en pasiva/completada no cuenta como cobertura consciente del anillo. */
function isPuntoCeroNonCoverPhase(v: VehiculoAnilloLite): boolean {
  if (v.tipoFlota !== "descanso" || v.tipoDescanso !== "punto_cero") return false;
  const fase = v.puntoCero?.fase;
  return fase === "pasiva" || fase === "completada" || fase === "etiqueta";
}

function isVehiclePausedForAnillo(v: VehiculoAnilloLite): boolean {
  return !!(v.interrupcionActiva || v.desglosadorPausa);
}

function isGapCoverVehicle(v: VehiculoAnilloLite): boolean {
  if (!isConquistaVehicle(v)) return false;
  if (isVehiclePausedForAnillo(v)) return false;
  if (isPuntoCeroNonCoverPhase(v)) return false;
  return true;
}

/** Cobertura consciente en el instante `nowMs` (puntero y hueco actual). */
export function vehicleCoversConsciousnessAt(
  v: VehiculoAnilloLite,
  nowMs: number
): boolean {
  if (!isGapCoverVehicle(v)) return false;
  const session = vehicleSessionRange(v, nowMs);
  return session != null && session.start <= nowMs && session.end >= nowMs;
}

/** Solo cuenta trabajo dentro del día-jornada actual (05:00 → 05:00). */
function clipSessionToJournalDay(session: MsInterval, now: number): MsInterval | null {
  const journalStart = getJournalDayStartMs(now);
  const journalEnd = journalStart + 86400000;
  return clipInterval(session, journalStart, Math.min(now, journalEnd));
}

function collectClippedSessions(
  vehicles: VehiculoAnilloLite[],
  now: number,
  filter: (v: VehiculoAnilloLite) => boolean,
  clipStart: number,
  clipEnd: number
): MsInterval[] {
  return vehicles
    .filter(filter)
    .map(v => vehicleSessionRange(v, now))
    .filter((s): s is MsInterval => s != null)
    .map(s => clipSessionToJournalDay(s, now))
    .filter((s): s is MsInterval => s != null)
    .map(s => clipInterval(s, clipStart, clipEnd))
    .filter((s): s is MsInterval => s != null);
}

/** Huecos de entropía (ms) dentro de ventanas planificadas ya vividas. */
function computePlannedEntropyGapsMs(
  segmentos: SegmentoAnilloLite[],
  limaDayStartMs: number,
  livedStartMs: number,
  nowMs: number,
  gapCoverSessions: MsInterval[]
): MsInterval[] {
  const entropyRaw: MsInterval[] = [];
  for (const seg of segmentos) {
    const { start, end } = segmentWindowMs(
      seg.horaInicio || "00:00",
      seg.horaFin || "00:00",
      limaDayStartMs
    );
    const evalStart = Math.max(start, livedStartMs);
    const evalEnd = Math.min(end, nowMs);
    if (evalEnd <= evalStart) continue;

    const window: MsInterval = { start: evalStart, end: evalEnd };
    const coverInWindow = gapCoverSessions
      .filter(s => s.start < evalEnd && s.end > evalStart)
      .map(s => clipInterval(s, evalStart, evalEnd))
      .filter((s): s is MsInterval => s != null);
    entropyRaw.push(...subtractMsIntervals([window], mergeMsIntervals(coverInWindow)));
  }
  return mergeMsIntervals(entropyRaw);
}

function sumIntervalMinutes(intervals: MsInterval[]): number {
  return intervals.reduce((acc, i) => acc + (i.end - i.start) / 60000, 0);
}

/** Núcleo único del día: una sola fuente de verdad para arcos, minutos y puntero. */
interface TimelineCore {
  limaDayStartMs: number;
  nowMs: number;
  nowMin: number;
  umbralMin: number;
  livedStartMs: number;
  livedEndMs: number;
  hasSegments: boolean;
  segmentos: SegmentoAnilloLite[];
  todayVehicles: VehiculoAnilloLite[];
  /** Cobertura consciente real (pausas y punto cero pasivo excluidos). */
  coverMerged: MsInterval[];
  /** Ventanas planificadas ya vividas hasta `now`. */
  plannedLivedWindows: MsInterval[];
  /** Minutos planificados totales (incluye futuro del día). */
  totalPlannedMin: number;
  /** Minutos planificados ya vividos. */
  livedPlannedMin: number;
  /** Huecos inconscientes dentro de lo vivido (para pintar arcos rojos). */
  entropiaIntervals: MsInterval[];
  /** Huecos planificados sin cobertura consciente (componente de entropía). */
  segmentEntropyIntervals: MsInterval[];
  /** Centinela neto tras restar cobertura (componente de entropía). */
  centinelaNetIntervals: MsInterval[];
  /** Sesiones centinela recortadas al día vivido. */
  centinelaMerged: MsInterval[];
}

function buildTimelineCore(params: {
  vehiculos: VehiculoAnilloLite[];
  segmentos?: SegmentoAnilloLite[];
  now?: number;
}): TimelineCore | null {
  const now = params.now ?? Date.now();
  const segmentDayStartMs = getSegmentCalendarDayStartMs(now);
  const journalEndMs = getJournalDayStartMs(now) + 86400000;
  const nowMs = Math.min(now, journalEndMs);
  const nowMin = getNowMinutesLocal(nowMs, segmentDayStartMs);
  const segmentos = params.segmentos ?? [];
  const umbralMin = getUmbralConcienciaMin(segmentos);

  if (nowMin < umbralMin) return null;

  const livedStartMs = segmentDayStartMs + umbralMin * 60000;
  const livedEndMs = nowMs;
  if (livedEndMs <= livedStartMs) return null;

  const todayVehicles = filterVehiculosCalendarioHoy(params.vehiculos, now);
  const coverSessions = collectClippedSessions(
    todayVehicles,
    now,
    isGapCoverVehicle,
    livedStartMs,
    livedEndMs
  );
  const coverMerged = mergeMsIntervals(coverSessions);

  const centinelaSessions = collectClippedSessions(
    todayVehicles,
    now,
    isCentinelaVehicle,
    livedStartMs,
    livedEndMs
  );
  const centinelaRealMerged = mergeMsIntervals(centinelaSessions);
  const hasSegments = segmentos.length > 0;
  const retroactiveCentinela = hasSegments
    ? computeRetroactiveCentinelaIntervalsMs(
        segmentos,
        segmentDayStartMs,
        livedStartMs,
        nowMs,
        coverSessions,
        centinelaSessions
      )
    : [];
  const centinelaMerged = mergeMsIntervals([...centinelaRealMerged, ...retroactiveCentinela]);

  const plannedLivedWindows = hasSegments
    ? plannedSegmentWindowsMs(segmentos, segmentDayStartMs, livedStartMs, nowMs)
    : [{ start: livedStartMs, end: livedEndMs }];
  const livedPlannedMin = sumIntervalMinutes(plannedLivedWindows);
  const totalPlannedMin = hasSegments
    ? sumMinutosPlaneados(segmentos)
    : livedPlannedMin;

  let segmentEntropy: MsInterval[];
  if (hasSegments) {
    segmentEntropy = computePlannedEntropyGapsMs(
      segmentos,
      segmentDayStartMs,
      livedStartMs,
      nowMs,
      coverSessions
    );
  } else {
    segmentEntropy = mergeMsIntervals(
      subtractMsIntervals([{ start: livedStartMs, end: livedEndMs }], coverMerged)
    );
  }
  const centinelaNet = subtractMsIntervals(centinelaMerged, coverMerged);
  const entropiaIntervals = mergeMsIntervals([...segmentEntropy, ...centinelaNet]);

  return {
    limaDayStartMs: segmentDayStartMs,
    nowMs,
    nowMin,
    umbralMin,
    livedStartMs,
    livedEndMs,
    hasSegments,
    segmentos,
    todayVehicles,
    coverMerged,
    plannedLivedWindows,
    totalPlannedMin,
    livedPlannedMin,
    entropiaIntervals,
    segmentEntropyIntervals: segmentEntropy,
    centinelaNetIntervals: centinelaNet,
    centinelaMerged,
  };
}

export interface ConcienciaTimeline {
  metricas: MetricasAnilloConciencia;
  dayStats: TimelineDayStats;
  timelineArcs: TimelineClockArc[];
  anilloEstado: AnilloEstadoVivo;
}

/** API unificada: arcos, minutos y puntero derivados del mismo núcleo temporal. */
export function buildConcienciaTimeline(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: VehiculoAnilloLite[];
  now?: number;
}): ConcienciaTimeline {
  const now = params.now ?? Date.now();
  const core = buildTimelineCore({
    vehiculos: params.vehiculos,
    segmentos: params.segmentos,
    now,
  });

  const minutosPlaneados = sumMinutosPlaneados(params.segmentos);
  const umbralMin = getUmbralConcienciaMin(params.segmentos);
  const limaDayStartMs = getLimaDayStartMs(now);
  const nowMin = getNowMinutesLocal(Math.min(now, getJournalDayStartMs(now) + 86400000), limaDayStartMs);
  const ventanaVivaMin = Math.max(1, nowMin - umbralMin);
  const jornadaMin = minutosPlaneados > 0 ? minutosPlaneados : ventanaVivaMin;
  const planificacionPct = Math.min(100, (minutosPlaneados / MINUTOS_DIA) * 100);

  if (!core) {
    const deg = limaNowToClockDeg(now);
    const hasSegments = params.segmentos.length > 0;
    const modoBatallaAnillo = hasSegments && minutosPlaneados > 0;
    const innerRing = computeInnerRingMetrics({
      jornadaMin,
      conquistaMin: 0,
      entropiaMin: 0,
      modoBatallaAnillo,
    });
    return {
      metricas: {
        planificacionPct,
        conquistaMin: 0,
        entropiaMin: 0,
        jornadaMin,
        horasCubiertas: Math.round(minutosPlaneados / 60),
        ...innerRing,
      },
      dayStats: { conquistaMin: 0, entropiaMin: 0, vacioMin: 0, centinelaMin: 0 },
      timelineArcs: [
        { startDeg: 0, endDeg: 360, kind: "fondo", lap: 0 },
        { startDeg: 0, endDeg: 360, kind: "fondo", lap: 1 },
      ],
      anilloEstado: {
        deg,
        mode: "libre",
        umbralMin,
        sinSegmentos: !hasSegments,
      },
    };
  }

  const conquistaForStats = core.hasSegments
    ? intersectIntervalsWithWindows(core.coverMerged, core.plannedLivedWindows)
    : core.coverMerged;

  const conquistaMinRaw = sumIntervalMinutes(conquistaForStats);
  const entropiaMinRaw = sumIntervalMinutes(core.entropiaIntervals);
  const centinelaMinRaw = sumIntervalMinutes(core.centinelaMerged);
  const vacioMinRaw = Math.max(0, core.totalPlannedMin - conquistaMinRaw - entropiaMinRaw);

  const conquistaMin = Math.round(conquistaMinRaw * 10) / 10;
  const entropiaMin = Math.round(entropiaMinRaw * 10) / 10;
  const centinelaMin = Math.round(centinelaMinRaw * 10) / 10;
  const vacioMin = Math.round(vacioMinRaw * 10) / 10;

  // Anillo interior con segmentos: rojo = terreno restante (plan − conquista); morado crece desde abajo.
  const innerRing = computeInnerRingMetrics({
    jornadaMin,
    conquistaMin,
    entropiaMin,
    modoBatallaAnillo: core.hasSegments && minutosPlaneados > 0,
  });
  const { conquistaArcPct, entropiaArcPct, fillPct, terrenoRestanteMin } = innerRing;

  const arcs: TimelineClockArc[] = [
    { startDeg: 0, endDeg: 360, kind: "fondo", lap: 0 },
    { startDeg: 0, endDeg: 360, kind: "fondo", lap: 1 },
  ];

  const conquistaInSegments = core.hasSegments
    ? intersectIntervalsWithWindows(core.coverMerged, core.plannedLivedWindows)
    : core.coverMerged;
  for (const interval of conquistaInSegments) {
    arcs.push(...intervalToClockArcs(interval, core.limaDayStartMs, "conquista"));
  }

  for (const gap of core.entropiaIntervals) {
    arcs.push(...intervalToClockArcs(gap, core.limaDayStartMs, "entropia"));
  }

  const anilloEstado = computeAnilloEstadoFromCore(core);

  return {
    metricas: {
      planificacionPct,
      conquistaMin,
      entropiaMin,
      jornadaMin,
      conquistaArcPct,
      entropiaArcPct,
      fillPct,
      horasCubiertas: Math.round(minutosPlaneados / 60),
      terrenoRestanteMin,
    },
    dayStats: { conquistaMin, entropiaMin, vacioMin, centinelaMin },
    timelineArcs: arcs,
    anilloEstado,
  };
}

function computeAnilloEstadoFromCore(core: TimelineCore): AnilloEstadoVivo {
  const deg = limaNowToClockDeg(core.nowMs);

  if (core.todayVehicles.some(v => vehicleCoversConsciousnessAt(v, core.nowMs))) {
    return {
      deg,
      mode: "conquista",
      umbralMin: core.umbralMin,
      sinSegmentos: !core.hasSegments,
      centerGuide: core.todayVehicles.some(
        v => vehicleCoversConsciousnessAt(v, core.nowMs) && v.tipoFlota === "descanso"
      )
        ? "Recarga consciente activa"
        : "Sesión consciente activa",
    };
  }

  // Rojo: centinela activo o instante dentro de entropía sellada (sesión centinela, no hueco en bruto).
  const activeCentinela = core.todayVehicles.some(v => {
    if (!v.autoVerdad || v.status !== "activo") return false;
    const session = vehicleSessionRange(v, core.nowMs);
    return session != null && session.start <= core.nowMs && session.end >= core.nowMs;
  });
  const centinelaNet = subtractMsIntervals(core.centinelaMerged, core.coverMerged);
  const inSealedEntropy = centinelaNet.some(
    iv => iv.start <= core.nowMs && iv.end >= core.nowMs
  );

  if (core.hasSegments) {
    if (activeCentinela || inSealedEntropy) {
      return { deg, mode: "entropia", umbralMin: core.umbralMin, sinSegmentos: false };
    }
    return { deg, mode: "libre", umbralMin: core.umbralMin, sinSegmentos: false };
  }

  if (activeCentinela || inSealedEntropy) {
    return {
      deg,
      mode: "entropia",
      umbralMin: core.umbralMin,
      sinSegmentos: true,
      centerGuide: "Sin cobertura consciente",
    };
  }
  return { deg, mode: "libre", umbralMin: core.umbralMin, sinSegmentos: true };
}

function splitByHalfDayLap(interval: MsInterval, dayStartMs: number): Array<{ interval: MsInterval; lap: 0 | 1 }> {
  const dayEnd = dayStartMs + 86400000;
  const start = Math.max(interval.start, dayStartMs);
  const end = Math.min(interval.end, dayEnd);
  if (end <= start) return [];

  const noon = dayStartMs + MINUTOS_MEDIA_JORNADA * 60000;
  if (end <= noon) return [{ interval: { start, end }, lap: 0 }];
  if (start >= noon) return [{ interval: { start, end }, lap: 1 }];
  return [
    { interval: { start, end: noon }, lap: 0 },
    { interval: { start: noon, end }, lap: 1 },
  ];
}

function intervalToClockArcs(interval: MsInterval, dayStartMs: number, kind: TimelineArcKind): TimelineClockArc[] {
  const parts = splitByHalfDayLap(interval, dayStartMs);
  const out: TimelineClockArc[] = [];
  for (const p of parts) {
    let startDeg = msToClockDeg(p.interval.start, dayStartMs);
    let endDeg = msToClockDeg(p.interval.end, dayStartMs);
    if (endDeg <= startDeg) endDeg += 360;
    out.push({ startDeg, endDeg, kind, lap: p.lap });
  }
  return out;
}

/** Segmentos en reloj 12h × 2 vueltas (AM exterior / PM interior), anclados a medianoche Lima. */
export function computeSegmentClockArcs(
  segmentos: Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>,
  nowMs: number = Date.now()
): SegmentClockArc[] {
  const dayStartMs = getSegmentCalendarDayStartMs(nowMs);
  const out: SegmentClockArc[] = [];
  segmentos.forEach((seg, idx) => {
    if (!seg?.horaInicio || !seg.horaFin) return;
    const { start, end } = segmentWindowMs(seg.horaInicio, seg.horaFin, dayStartMs);
    const isActive = seg.estado === "activo";
    const isNowInside = nowMs >= start && nowMs <= end;
    for (const p of splitByHalfDayLap({ start, end }, dayStartMs)) {
      let startDeg = msToClockDeg(p.interval.start, dayStartMs);
      let endDeg = msToClockDeg(p.interval.end, dayStartMs);
      if (endDeg <= startDeg) endDeg += 360;
      out.push({
        startDeg,
        endDeg,
        lap: p.lap,
        ordinal: idx + 1,
        estado: seg.estado ?? "pendiente",
        nombre: seg.nombre,
        horaInicio: seg.horaInicio,
        horaFin: seg.horaFin,
        isActive,
        isNowInside: isNowInside && nowMs >= p.interval.start && nowMs <= p.interval.end,
      });
    }
  });
  return out;
}

function intervalsInSegmentWindow(
  intervals: MsInterval[],
  segStart: number,
  segEnd: number,
  livedStartMs: number,
  nowMs: number
): MsInterval[] {
  const livedStart = Math.max(segStart, livedStartMs);
  const livedEnd = Math.min(segEnd, nowMs);
  if (livedEnd <= livedStart) return [];
  return intersectIntervalsWithWindows(intervals, [{ start: livedStart, end: livedEnd }]);
}

function buildSegmentBattleIntervals(
  params: {
    segmentos: Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>;
    vehiculos: VehiculoAnilloLite[];
    now?: number;
  },
  coreIn?: ReturnType<typeof buildTimelineCore>
): SegmentBattleInterval[] {
  const now = params.now ?? Date.now();
  const core =
    coreIn ??
    buildTimelineCore({
      vehiculos: params.vehiculos,
      segmentos: params.segmentos,
      now,
    });
  if (!core?.hasSegments) return [];

  const dayStartMs = core.limaDayStartMs;
  const out: SegmentBattleInterval[] = [];

  params.segmentos.forEach((seg, idx) => {
    if (!seg?.horaInicio || !seg?.horaFin) return;
    const { start, end } = segmentWindowMs(seg.horaInicio, seg.horaFin, dayStartMs);
    const ordinal = idx + 1;

    for (const interval of intervalsInSegmentWindow(
      core.coverMerged,
      start,
      end,
      core.livedStartMs,
      core.nowMs
    )) {
      out.push({ ordinal, kind: "conquista", startMs: interval.start, endMs: interval.end });
    }
    for (const interval of intervalsInSegmentWindow(
      core.entropiaIntervals,
      start,
      end,
      core.livedStartMs,
      core.nowMs
    )) {
      out.push({ ordinal, kind: "entropia", startMs: interval.start, endMs: interval.end });
    }
  });

  return out;
}

/** Intervalos ms de batalla por segmento — usado por modo Horizonte. */
export function buildSegmentBattleIntervalsForHorizon(params: {
  segmentos: Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>;
  vehiculos: VehiculoAnilloLite[];
  now?: number;
}): SegmentBattleInterval[] {
  return buildSegmentBattleIntervals(params);
}

/** Overlays morado/rojo dentro de cada ventana de segmento (batalla en territorio). */
export function computeSegmentBattleArcs(
  params: {
    segmentos: Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>;
    vehiculos: VehiculoAnilloLite[];
    now?: number;
  },
  coreIn?: ReturnType<typeof buildTimelineCore>
): SegmentBattleArc[] {
  const now = params.now ?? Date.now();
  const core =
    coreIn ??
    buildTimelineCore({
      vehiculos: params.vehiculos,
      segmentos: params.segmentos,
      now,
    });
  if (!core?.hasSegments) return [];

  const dayStartMs = core.limaDayStartMs;
  const out: SegmentBattleArc[] = [];

  for (const battle of buildSegmentBattleIntervals(params, core)) {
    for (const arc of intervalToClockArcs(
      { start: battle.startMs, end: battle.endMs },
      dayStartMs,
      battle.kind
    )) {
      out.push({
        startDeg: arc.startDeg,
        endDeg: arc.endDeg,
        lap: arc.lap ?? 0,
        ordinal: battle.ordinal,
        kind: battle.kind,
      });
    }
  }

  return out;
}

export function computeSegmentArcStats(
  params: {
    segmentos: Array<SegmentoAnilloLite & { estado?: string; nombre?: string }>;
    vehiculos: VehiculoAnilloLite[];
    now?: number;
  },
  coreIn?: ReturnType<typeof buildTimelineCore>
): SegmentArcStats[] {
  const now = params.now ?? Date.now();
  const core =
    coreIn ??
    buildTimelineCore({
      vehiculos: params.vehiculos,
      segmentos: params.segmentos,
      now,
    });
  if (!core?.hasSegments) return [];

  const dayStartMs = core.limaDayStartMs;
  return params.segmentos.map((seg, idx) => {
    if (!seg) {
      return {
        ordinal: idx + 1,
        nombre: undefined,
        horaInicio: "",
        horaFin: "",
        estado: "pendiente",
        conquistaMin: 0,
        entropiaMin: 0,
      };
    }
    const horaInicio = seg.horaInicio ?? "";
    const horaFin = seg.horaFin ?? "";
    if (!horaInicio || !horaFin) {
      return {
        ordinal: idx + 1,
        nombre: seg.nombre,
        horaInicio,
        horaFin,
        estado: seg.estado ?? "pendiente",
        conquistaMin: 0,
        entropiaMin: 0,
      };
    }
    const { start, end } = segmentWindowMs(horaInicio, horaFin, dayStartMs);
    const conq = intervalsInSegmentWindow(
      core.coverMerged,
      start,
      end,
      core.livedStartMs,
      core.nowMs
    );
    const ent = intervalsInSegmentWindow(
      core.entropiaIntervals,
      start,
      end,
      core.livedStartMs,
      core.nowMs
    );
    return {
      ordinal: idx + 1,
      nombre: seg.nombre,
      horaInicio,
      horaFin,
      estado: seg.estado ?? "pendiente",
      conquistaMin: Math.round(sumIntervalMinutes(conq) * 10) / 10,
      entropiaMin: Math.round(sumIntervalMinutes(ent) * 10) / 10,
    };
  });
}

export function filterVehiculosCalendarioHoy(
  vehiculos: VehiculoAnilloLite[],
  now: number = Date.now()
): VehiculoAnilloLite[] {
  const dayStartMs = getJournalDayStartMs(now);
  const dayEndMs = dayStartMs + 86400000;
  return vehiculos.filter(v => {
    const session = vehicleSessionRange(v, now);
    if (!session) return false;
    const journalSession = clipSessionToJournalDay(session, now);
    if (!journalSession) return false;
    return journalSession.end > dayStartMs && journalSession.start < dayEndMs;
  });
}

export function computeTimelineClockArcs(params: {
  vehiculos: VehiculoAnilloLite[];
  segmentos?: SegmentoAnilloLite[];
  now?: number;
}): TimelineClockArc[] {
  return buildConcienciaTimeline({
    segmentos: params.segmentos ?? [],
    vehiculos: params.vehiculos,
    now: params.now,
  }).timelineArcs;
}

export interface AnilloEstadoVivo {
  deg: number;
  mode: AnilloPointerMode;
  umbralMin: number;
  sinSegmentos: boolean;
  centerGuide?: string;
}

/** Estado del puntero: libre / conquista / entropía. */
export function computeAnilloEstado(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: VehiculoAnilloLite[];
  now?: number;
}): AnilloEstadoVivo {
  return buildConcienciaTimeline({
    segmentos: params.segmentos,
    vehiculos: params.vehiculos,
    now: params.now,
  }).anilloEstado;
}

export function computeTimelineDayStats(params: {
  vehiculos: VehiculoAnilloLite[];
  segmentos?: SegmentoAnilloLite[];
  now?: number;
}): TimelineDayStats {
  return buildConcienciaTimeline({
    segmentos: params.segmentos ?? [],
    vehiculos: params.vehiculos,
    now: params.now,
  }).dayStats;
}

function sessionMinutesInWindow(
  session: { start: number; end: number },
  winStart: number,
  winEnd: number
): number {
  return overlapMinutes(session.start, session.end, winStart, winEnd);
}

/** Minutos de sesión dentro del día-jornada (desde 05:00 Lima). */
export function sessionMinutesInJournalDay(
  v: VehiculoAnilloLite,
  now: number = Date.now()
): number {
  const session = vehicleSessionRange(v, now);
  if (!session) return 0;
  const journalStart = getJournalDayStartMs(now);
  return sessionMinutesInWindow(session, journalStart, now);
}

/** Vehículos con sesión que intersecta el día-jornada actual. */
export function filterVehiculosJornadaActual(
  vehiculos: VehiculoAnilloLite[],
  now: number = Date.now()
): VehiculoAnilloLite[] {
  const journalStart = getJournalDayStartMs(now);
  return vehiculos.filter(v => {
    const session = vehicleSessionRange(v, now);
    if (!session) return false;
    return session.end >= journalStart && session.start <= now;
  });
}

/** Conquista vs entropía comparten el mismo presupuesto de jornada (arcos complementarios). */
export function calcularMetricasAnilloConciencia(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: VehiculoAnilloLite[];
  now?: number;
}): MetricasAnilloConciencia {
  return buildConcienciaTimeline({
    segmentos: params.segmentos,
    vehiculos: params.vehiculos,
    now: params.now,
  }).metricas;
}

export interface SegmentoConquistaBalance {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  duracionMin: number;
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  estado?: string;
}

export interface BalanceConquistaJornada {
  jornadaMin: number;
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  conquistaPct: number;
  entropiaPct: number;
  vacioPct: number;
  segmentos: SegmentoConquistaBalance[];
}

function segmentDurationMin(horaInicio: string, horaFin: string): number {
  const { durationMin } = segmentWindowMs(horaInicio, horaFin, getLimaDayStartMs());
  return durationMin;
}

/** Balance del día: tiempo conquistado vs entropía vs vacío, desglosado por segmento. */
export function calcularBalanceConquistaJornada(params: {
  segmentos: Array<SegmentoAnilloLite & { nombre?: string; estado?: string }>;
  vehiculos: VehiculoAnilloLite[];
  now?: number;
  dayStartMs?: number;
}): BalanceConquistaJornada {
  const now = params.now ?? Date.now();
  const segmentDayStartMs = getLimaDayStartMs(now);

  const jornadaVehiculos = filterVehiculosJornadaActual(params.vehiculos, now);
  const metricas = calcularMetricasAnilloConciencia({
    segmentos: params.segmentos,
    vehiculos: jornadaVehiculos,
    now,
  });

  const consciousToday = jornadaVehiculos.filter(isGapCoverVehicle);
  const consciousSessions = consciousToday
    .map(v => vehicleSessionRange(v, now))
    .filter((s): s is MsInterval => s != null);
  const hasSegments = params.segmentos.length > 0;

  const segmentosBalance: SegmentoConquistaBalance[] = params.segmentos.map(seg => {
    const duracionMin = Math.max(0, segmentDurationMin(seg.horaInicio || "", seg.horaFin || ""));
    const { start: winStart, end: winEnd } = segmentWindowMs(
      seg.horaInicio || "0:0",
      seg.horaFin || "0:0",
      segmentDayStartMs
    );
    const evalEnd = Math.min(winEnd, now);

    let conquistaMin = 0;
    for (const session of consciousSessions) {
      conquistaMin += overlapMinutes(session.start, session.end, winStart, winEnd);
    }

    let entropiaMin = 0;
    if (hasSegments) {
      // Cierre: entropía = huecos planificados menos cobertura, con colchón de 2 min (≠ puntero en vivo).
      entropiaMin = sumGapsMinutesInWindow(winStart, evalEnd, consciousSessions, true);
    } else {
      const centinelas = jornadaVehiculos.filter(v => v.autoVerdad);
      for (const v of centinelas) {
        const session = vehicleSessionRange(v, now);
        if (!session) continue;
        let mins = overlapMinutes(session.start, session.end, winStart, winEnd);
        for (const qs of consciousSessions) {
          mins -= overlapMinutes(session.start, session.end, qs.start, qs.end);
        }
        entropiaMin += Math.max(0, mins);
      }
    }

    const vacioMin = Math.max(0, duracionMin - conquistaMin - entropiaMin);

    return {
      nombre: seg.nombre || "Segmento",
      horaInicio: seg.horaInicio || "",
      horaFin: seg.horaFin || "",
      duracionMin,
      conquistaMin: Math.round(conquistaMin * 10) / 10,
      entropiaMin: Math.round(entropiaMin * 10) / 10,
      vacioMin: Math.round(vacioMin * 10) / 10,
      estado: seg.estado,
    };
  });

  const jornadaMin = metricas.jornadaMin;
  let conquistaMin: number;
  let entropiaMin: number;
  let vacioMin: number;
  if (hasSegments) {
    conquistaMin = Math.round(segmentosBalance.reduce((a, s) => a + s.conquistaMin, 0) * 10) / 10;
    entropiaMin = Math.round(segmentosBalance.reduce((a, s) => a + s.entropiaMin, 0) * 10) / 10;
    vacioMin = Math.round(Math.max(0, jornadaMin - conquistaMin - entropiaMin) * 10) / 10;
  } else {
    conquistaMin = Math.round(metricas.conquistaMin * 10) / 10;
    entropiaMin = Math.round(metricas.entropiaMin * 10) / 10;
    vacioMin = Math.round(Math.max(0, jornadaMin - conquistaMin - entropiaMin) * 10) / 10;
  }

  return {
    jornadaMin,
    conquistaMin,
    entropiaMin,
    vacioMin,
    conquistaPct: jornadaMin > 0 ? Math.round((conquistaMin / jornadaMin) * 100) : 0,
    entropiaPct: jornadaMin > 0 ? Math.round((entropiaMin / jornadaMin) * 100) : 0,
    vacioPct: jornadaMin > 0 ? Math.round((vacioMin / jornadaMin) * 100) : 0,
    segmentos: segmentosBalance,
  };
}

export function formatMinutosJornada(min: number): string {
  if (min <= 0) return "0 min";
  if (min < 1) return "<1 min";
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

export interface EntropyDebugCoverVehicle {
  id?: string;
  titulo?: string;
  ghost?: boolean;
  status?: string;
  autoVerdad?: boolean;
  tipoFlota?: string;
  tipoReloj?: string;
  coversNow: boolean;
  inFilteredList: boolean;
}

export interface EntropyDebugSnapshot {
  ts: number;
  nowIso: string;
  corePresent: boolean;
  entropiaMinRaw: number;
  entropiaMinRounded: number;
  entropiaMinDisplay: string;
  segmentEntropyMin: number;
  centinelaNetMin: number;
  centinelaMergedMin: number;
  coverMergedMin: number;
  conquistaMinRaw: number;
  pointerMode: AnilloPointerMode;
  centinelaActiveCount: number;
  consciousCoverNow: boolean;
  coverVehicles: EntropyDebugCoverVehicle[];
  filteredVehicleCount: number;
  rawVehicleCount: number;
  noVehicleSinceMs: number | null;
  noVehicleSinceAgeSec: number | null;
  clockIntervalHint: string;
  monotonicFloorMin: number | null;
}

/** Desglose interno para panel ?debug=entropia (no usar en producción). */
export function buildEntropyDebugSnapshot(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: Vehicle[];
  now?: number;
}): EntropyDebugSnapshot {
  const nowMs = params.now ?? Date.now();
  const dayStart = getJournalDayStartMs(nowMs);
  const filtered = resolveCoverageVehicles(params.vehiculos, nowMs);
  const filteredIds = new Set(filtered.map(v => v.id));
  const timeline = buildConcienciaTimeline({
    segmentos: params.segmentos,
    vehiculos: filtered,
    now: nowMs,
  });
  const core = buildTimelineCore({
    segmentos: params.segmentos,
    vehiculos: filtered,
    now: nowMs,
  });

  let noVehicleSinceMs: number | null = null;
  if (typeof localStorage !== "undefined") {
    const raw = parseInt(localStorage.getItem(NO_VEHICLE_SINCE_KEY) || "0", 10);
    noVehicleSinceMs = raw > 0 ? raw : null;
  }

  const coverVehicles: EntropyDebugCoverVehicle[] = params.vehiculos
    .filter(v => v.status === "activo" || v.autoVerdad)
    .map(v => ({
      id: v.id,
      titulo: v.titulo,
      ghost: isGhostActiveVehicle(v, nowMs, dayStart, new Map(params.vehiculos.map(x => [x.id, x]))),
      status: v.status,
      autoVerdad: v.autoVerdad,
      tipoFlota: v.tipoFlota,
      tipoReloj: v.tipoReloj,
      coversNow: vehicleCoversConsciousnessAt(v, nowMs),
      inFilteredList: filteredIds.has(v.id),
    }));

  const consciousCoverNow = filtered.some(v => vehicleCoversConsciousnessAt(v, nowMs));
  const centinelaActiveCount = listActiveCentinelas(params.vehiculos).length;

  let segmentEntropyMin = 0;
  let centinelaNetMin = 0;
  let centinelaMergedMin = 0;
  let coverMergedMin = 0;
  let entropiaMinRaw = 0;
  let conquistaMinRaw = 0;

  if (core) {
    segmentEntropyMin = sumIntervalMinutes(core.segmentEntropyIntervals);
    centinelaNetMin = sumIntervalMinutes(core.centinelaNetIntervals);
    centinelaMergedMin = sumIntervalMinutes(core.centinelaMerged);
    coverMergedMin = sumIntervalMinutes(core.coverMerged);
    entropiaMinRaw = sumIntervalMinutes(core.entropiaIntervals);
    const conquistaForStats = core.hasSegments
      ? intersectIntervalsWithWindows(core.coverMerged, core.plannedLivedWindows)
      : core.coverMerged;
    conquistaMinRaw = sumIntervalMinutes(conquistaForStats);
  }

  const clockIntervalHint =
    typeof document !== "undefined" && document.visibilityState === "hidden"
      ? "5s (background)"
      : "1s (visible)";

  return {
    ts: nowMs,
    nowIso: new Date(nowMs).toISOString(),
    corePresent: core != null,
    entropiaMinRaw,
    entropiaMinRounded: timeline.dayStats.entropiaMin,
    entropiaMinDisplay: formatMinutosJornada(timeline.dayStats.entropiaMin),
    segmentEntropyMin,
    centinelaNetMin,
    centinelaMergedMin,
    coverMergedMin,
    conquistaMinRaw,
    pointerMode: timeline.anilloEstado.mode,
    centinelaActiveCount,
    consciousCoverNow,
    coverVehicles,
    filteredVehicleCount: filtered.length,
    rawVehicleCount: params.vehiculos.length,
    noVehicleSinceMs,
    noVehicleSinceAgeSec:
      noVehicleSinceMs != null ? Math.round((nowMs - noVehicleSinceMs) / 1000) : null,
    clockIntervalHint,
    monotonicFloorMin: getEntropyMonotonicDebugState(nowMs)?.floorMin ?? null,
  };
}

/** Reinicia acumulador monótono (tests y cambio de jornada manual). */
export function resetLiveEntropyMonotonic(): void {
  resetEntropyMonotonicState();
}

function readNoVehicleSinceMs(): number | null {
  if (typeof localStorage === "undefined") return null;
  const raw = parseInt(localStorage.getItem(NO_VEHICLE_SINCE_KEY) || "0", 10);
  return raw > 0 ? raw : null;
}

function patchTimelineEntropy(timeline: ConcienciaTimeline, entropiaMin: number): ConcienciaTimeline {
  const { jornadaMin, conquistaMin } = timeline.metricas;
  const modoBatallaAnillo = timeline.metricas.terrenoRestanteMin !== undefined;
  const innerRing = computeInnerRingMetrics({
    jornadaMin,
    conquistaMin,
    entropiaMin,
    modoBatallaAnillo,
  });
  return {
    ...timeline,
    dayStats: { ...timeline.dayStats, entropiaMin },
    metricas: {
      ...timeline.metricas,
      entropiaMin,
      ...innerRing,
    },
  };
}

/** Congela baseline al cerrar cobertura consciente (desglosador, flota, etc.). */
export function armEntropyGapOnConsciousClose(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculosAfterClose: Vehicle[];
  cierreAt: number;
}): void {
  const run = () => {
    const filtered = resolveCoverageVehicles(params.vehiculosAfterClose, params.cierreAt);
    const timeline = buildConcienciaTimeline({
      segmentos: params.segmentos,
      vehiculos: filtered,
      now: params.cierreAt,
    });
    armLiveGapClock({
      gapAnchorMs: params.cierreAt,
      baselineEntropyMin: Math.max(
        timeline.dayStats.entropiaMin,
        getEntropyMonotonicDebugState(params.cierreAt)?.floorMin ?? 0
      ),
      nowMs: params.cierreAt,
    });
  };
  // Piso 300 ms fuera del frame de cierre; luego idle si está disponible.
  globalThis.setTimeout(() => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(run, { timeout: 800 });
    } else {
      run();
    }
  }, 300);
}

/**
 * Entrada unificada para UI en vivo: filtra fantasmas, aplica política temporal
 * y persiste acumulado monótono (localStorage) para evitar resets por sync.
 */
export function computeLiveEntropy(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: Vehicle[];
  now?: number;
  /** Desactivar clamp monótono (solo tests). */
  applyMonotonic?: boolean;
}): ConcienciaTimeline {
  const now = params.now ?? Date.now();
  const filtered = resolveCoverageVehicles(params.vehiculos, now);
  const consciousNow = filtered.some(v => vehicleCoversConsciousnessAt(v, now));

  const timeline = buildConcienciaTimeline({
    segmentos: params.segmentos,
    vehiculos: filtered,
    now,
  });

  let raw = timeline.dayStats.entropiaMin;

  if (!consciousNow && params.applyMonotonic !== false) {
    let gapState = getLiveGapClockState(now);
    if (!gapState) {
      const mono = getEntropyMonotonicDebugState(now);
      const noVehicleSince = readNoVehicleSinceMs();
      const gapAnchorMs = mono?.gapAnchorMs ?? noVehicleSince ?? now;
      const floor = mono?.floorMin ?? 0;
      const baselineEntropyMin = Math.max(
        floor,
        gapAnchorMs < now - 1000 ? floor : raw,
        raw
      );
      gapState = armLiveGapClock({
        gapAnchorMs,
        baselineEntropyMin,
        nowMs: now,
      });
    }
    raw = computeTimestampGapEntropyMin({
      segmentos: params.segmentos,
      nowMs: now,
      gapState,
    });
  }

  if (params.applyMonotonic === false) {
    if (Math.abs(raw - timeline.dayStats.entropiaMin) < 0.05) return timeline;
    return patchTimelineEntropy(timeline, raw);
  }

  const entropiaMin = clampLiveEntropyDisplay(
    applyMonotonicLiveEntropy({
      rawMin: raw,
      nowMs: now,
      consciousNow,
      persist: typeof localStorage !== "undefined",
    }),
    now,
    consciousNow
  );

  if (Math.abs(entropiaMin - timeline.dayStats.entropiaMin) < 0.05) return timeline;

  return patchTimelineEntropy(timeline, entropiaMin);
}

/** Modelo unificado del anillo: un solo buildTimelineCore para arcos de batalla y stats. */
export function computeAnilloRingModelBundle(params: {
  segmentos: SegmentoAnilloLite[];
  vehiculos: Vehicle[];
  now?: number;
}) {
  const now = params.now ?? Date.now();
  const segs = params.segmentos;
  const vehiculos = Array.isArray(params.vehiculos) ? params.vehiculos : [];
  const filtered = resolveCoverageVehicles(vehiculos, now);
  const core = buildTimelineCore({ vehiculos: filtered, segmentos: segs, now });
  const timeline = computeLiveEntropy({ segmentos: segs, vehiculos, now });
  const battleParams = { segmentos: segs, vehiculos: filtered, now };
  return {
    timeline,
    segmentClockArcs: computeSegmentClockArcs(segs, now),
    segmentBattleArcs: computeSegmentBattleArcs(battleParams, core),
    segmentArcStats: computeSegmentArcStats(battleParams, core),
  };
}

export const debeEstarAbierto = (horaInicio: number): boolean => {
  const horaActual = new Date().getHours();
  return horaActual === horaInicio;
};

export interface SugerenciaConciencia {
  tiempoRecord: number;
  esDesafio: boolean;
  mensaje: string;
}

export const generarSugerencia = (
  nombreTarea: string,
  historial: any[]
): SugerenciaConciencia | null => {
  const record = historial
    .filter(h => h.nombre.toLowerCase() === nombreTarea.toLowerCase())
    .sort((a, b) => a.tiempo - b.tiempo)[0];
  if (!record) return null;
  return {
    tiempoRecord: record.tiempo,
    esDesafio: true,
    mensaje: `Tu victoria pasada fue de ${record.tiempo} min. ¿Lograrás superarlo o ajustarás por energía?`
  };
};
