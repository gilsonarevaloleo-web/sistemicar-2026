/**
 * Historial liviano de huecos de cobertura.
 *
 * Regla: no hay rutina → no hay hueco. El hueco nace en la rutina del día
 * (primera hora → última hora), no en un segmento suelto ni al abrir la jornada,
 * y muere cuando termina esa rutina. Fuera de ella no se mide.
 *
 * Solo escribe en transiciones (hay / no hay vehículo consciente).
 * Sin timeline, sin anillo, sin computeLiveEntropy, sin tick 1s.
 */
import {
  clipInterval,
  computeTriadaLineaOccupancy,
  intersectIntervalsWithWindows,
  mergeMsIntervals,
  routineWindowsMs,
  subtractMsIntervals,
  unjustifiedPauseIntervals,
  type MsInterval,
} from "@/lib/concienciaTriadaLinea";
import { hasActiveConsciousCoverage } from "@/lib/entropyTimePolicy";
import { readLocalPlanillaSegmentos } from "@/lib/gastoConcienciaEngine";
import type { Vehicle } from "@/lib/persistence";
import {
  getJournalDateString,
  getLimaDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/segmentTime";

export type HuecoPlanSegmento = { horaInicio?: string; horaFin?: string };

export const COBERTURA_HUECOS_KEY = "sistemicar_j4_cobertura_huecos_v1";
export const MAX_HUECOS_EVENTS = 48;

export type CoberturaHuecoKind = "gap_open" | "gap_close";

export type CoberturaHuecoEvent = {
  t: number;
  kind: CoberturaHuecoKind;
  /** Título del vehículo que cerró el hueco (solo gap_close). */
  titulo?: string;
  dayKey: string;
};

export type CoberturaHuecoReason = "corte" | "pausa_no_justificada";

export type CoberturaHuecoInterval = {
  startMs: number;
  endMs: number | null;
  /** true si el hueco sigue abierto. */
  open: boolean;
  closedByTitulo?: string;
  /** Corte de cobertura vs pausa sin otro vehículo (misma cifra que Inconsciente). */
  reason?: CoberturaHuecoReason;
};

function dayKeyFromMs(ms: number): string {
  return String(getLimaDayStartMs(ms));
}

function intervalToMs(it: CoberturaHuecoInterval, now: number): MsInterval | null {
  const end = it.open ? now : (it.endMs ?? now);
  return end > it.startMs ? { start: it.startMs, end } : null;
}

function planElapsedWindows(plan: MsInterval[], now: number): MsInterval[] {
  const out: MsInterval[] = [];
  for (let i = 0; i < plan.length; i++) {
    const clipped = clipInterval(plan[i]!, plan[i]!.start, now);
    if (clipped) out.push(clipped);
  }
  return out;
}

export function nowInsidePlan(plan: MsInterval[], now: number): boolean {
  for (let i = 0; i < plan.length; i++) {
    const w = plan[i]!;
    if (now >= w.start && now < w.end) return true;
  }
  return false;
}

/** Ventanas del plan del día-jornada. Vacío = no hay hueco que medir. */
export function resolveHuecoPlanWindows(params: {
  segmentos?: HuecoPlanSegmento[];
  now?: number;
}): MsInterval[] {
  const now = params.now ?? Date.now();
  const fecha = getJournalDateString(now);
  const segs = params.segmentos ?? readLocalPlanillaSegmentos(fecha);
  if (segs.length === 0) return [];
  return routineWindowsMs(segs, getSegmentCalendarDayStartMs(now));
}

function closeTimeAtPlanEnd(
  openAt: number,
  plan: MsInterval[],
  now: number
): number | null {
  let closeAt: number | null = null;
  for (let i = 0; i < plan.length; i++) {
    const w = plan[i]!;
    if (w.end <= openAt) continue;
    const candidate = Math.min(w.end, now);
    if (candidate > openAt) {
      closeAt = closeAt == null ? candidate : Math.max(closeAt, candidate);
    }
  }
  return closeAt;
}

function overlayHuecoMeta(
  gap: MsInterval,
  logged: CoberturaHuecoInterval[],
  now: number,
  plan: MsInterval[]
): CoberturaHuecoInterval {
  const open = nowInsidePlan(plan, now) && gap.end >= now - 1_000;
  let closedByTitulo: string | undefined;
  let reason: CoberturaHuecoReason | undefined;
  for (let i = 0; i < logged.length; i++) {
    const it = logged[i]!;
    const ms = intervalToMs(it, now);
    if (!ms || ms.end <= gap.start || ms.start >= gap.end) continue;
    if (it.closedByTitulo && !closedByTitulo) closedByTitulo = it.closedByTitulo;
    if (it.reason && !reason) reason = it.reason;
  }
  return {
    startMs: gap.start,
    endMs: open ? null : gap.end,
    open,
    ...(closedByTitulo ? { closedByTitulo } : {}),
    reason: reason ?? "corte",
  };
}

/**
 * Recorta al plan ya ocurrido y fusiona solapes.
 * Sin esto, log + idle del desglosador sumaban 30–38 h de un mismo rato.
 */
export function clipHuecoIntervalsToPlan(
  intervals: CoberturaHuecoInterval[],
  plan: MsInterval[],
  now = Date.now()
): CoberturaHuecoInterval[] {
  if (plan.length === 0 || intervals.length === 0) return [];
  const elapsed = planElapsedWindows(plan, now);
  if (elapsed.length === 0) return [];

  const pieces: MsInterval[] = [];
  const logged: CoberturaHuecoInterval[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const it = intervals[i]!;
    const ms = intervalToMs(it, now);
    if (!ms) continue;
    const clipped = intersectIntervalsWithWindows([ms], elapsed);
    for (let p = 0; p < clipped.length; p++) {
      const c = clipped[p]!;
      pieces.push(c);
      logged.push({
        ...it,
        startMs: c.start,
        endMs: c.end,
        open: Boolean(it.open) && c.end >= now - 1_000 && nowInsidePlan(plan, now),
      });
    }
  }
  if (pieces.length === 0) return [];
  return mergeMsIntervals(pieces).map(gap => overlayHuecoMeta(gap, logged, now, plan));
}

function safeParse(raw: string | null): CoberturaHuecoEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CoberturaHuecoEvent =>
        e != null &&
        typeof e === "object" &&
        typeof (e as CoberturaHuecoEvent).t === "number" &&
        ((e as CoberturaHuecoEvent).kind === "gap_open" ||
          (e as CoberturaHuecoEvent).kind === "gap_close") &&
        typeof (e as CoberturaHuecoEvent).dayKey === "string"
    );
  } catch {
    return [];
  }
}

export function readCoberturaHuecosEvents(): CoberturaHuecoEvent[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse(localStorage.getItem(COBERTURA_HUECOS_KEY));
}

function writeEvents(events: CoberturaHuecoEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      COBERTURA_HUECOS_KEY,
      JSON.stringify(events.slice(-MAX_HUECOS_EVENTS))
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearCoberturaHuecosLog(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(COBERTURA_HUECOS_KEY);
}

function lastEventToday(
  events: CoberturaHuecoEvent[],
  dayKey: string
): CoberturaHuecoEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.dayKey === dayKey) return events[i];
  }
  return undefined;
}

/**
 * Reconcilia cobertura actual vs último evento del día.
 * Barato: un boolean sobre vehículos activos. Llamar tras launch/cierre (idle/sombra ok).
 * No abre hueco si no hay plan o si ahora está fuera del horario planificado.
 */
export function reconcileCoberturaHuecos(params: {
  vehicles: Vehicle[];
  now?: number;
  /** Título del vehículo que acaba de cubrir (opcional). */
  coverTitulo?: string;
  /** Plan del día. Si falta, se lee la planilla local. */
  segmentos?: HuecoPlanSegmento[];
}): CoberturaHuecoEvent | null {
  const now = params.now ?? Date.now();
  const dayKey = dayKeyFromMs(now);
  const plan = resolveHuecoPlanWindows({
    segmentos: params.segmentos,
    now,
  });
  const events = readCoberturaHuecosEvents();
  const last = lastEventToday(events, dayKey);

  if (plan.length === 0 || !nowInsidePlan(plan, now)) {
    if (plan.length > 0 && last?.kind === "gap_open") {
      const closeT = closeTimeAtPlanEnd(last.t, plan, now);
      if (closeT != null && closeT > last.t) {
        const next: CoberturaHuecoEvent = { t: closeT, kind: "gap_close", dayKey };
        writeEvents([...events, next]);
        return next;
      }
    }
    return null;
  }

  const covered = hasActiveConsciousCoverage(params.vehicles, now);

  if (!covered) {
    if (last?.kind === "gap_open") return null;
    const next: CoberturaHuecoEvent = { t: now, kind: "gap_open", dayKey };
    writeEvents([...events, next]);
    return next;
  }

  if (last?.kind === "gap_open") {
    const next: CoberturaHuecoEvent = {
      t: now,
      kind: "gap_close",
      dayKey,
      ...(params.coverTitulo?.trim()
        ? { titulo: params.coverTitulo.trim() }
        : {}),
    };
    writeEvents([...events, next]);
    return next;
  }

  return null;
}

/** Intervalos del día-jornada (Lima) para UI de revisión. */
export function buildCoberturaHuecoIntervals(
  events: CoberturaHuecoEvent[],
  now = Date.now()
): CoberturaHuecoInterval[] {
  const dayKey = dayKeyFromMs(now);
  const today = events
    .filter(e => e.dayKey === dayKey)
    .sort((a, b) => a.t - b.t);

  const intervals: CoberturaHuecoInterval[] = [];
  let openAt: number | null = null;

  for (const e of today) {
    if (e.kind === "gap_open") {
      if (openAt == null) openAt = e.t;
    } else if (e.kind === "gap_close" && openAt != null) {
      intervals.push({
        startMs: openAt,
        endMs: e.t,
        open: false,
        closedByTitulo: e.titulo,
      });
      openAt = null;
    }
  }

  if (openAt != null) {
    intervals.push({ startMs: openAt, endMs: null, open: true });
  }

  return intervals;
}

export function formatHuecoClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatHuecoDuration(startMs: number, endMs: number): string {
  const min = huecoDurationMin(startMs, endMs);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Minutos enteros de un corte (misma regla que el rótulo de cada fila). */
export function huecoDurationMin(startMs: number, endMs: number): number {
  return Math.max(0, Math.round((endMs - startMs) / 60_000));
}

/**
 * Suma de cortes sin vehículo hoy, en minutos únicos (sin solapes).
 * Misma cifra que debe mostrar el Pulso como inconsciente.
 * Nunca suma el mismo rato dos veces (log + idle) ni sale del plan.
 */
export function sumCoberturaHuecosMinutes(
  intervals: CoberturaHuecoInterval[],
  now = Date.now()
): number {
  const raw: MsInterval[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const ms = intervalToMs(intervals[i]!, now);
    if (ms) raw.push(ms);
  }
  const merged = mergeMsIntervals(raw);
  let total = 0;
  for (let i = 0; i < merged.length; i++) {
    total += huecoDurationMin(merged[i]!.start, merged[i]!.end);
  }
  return total;
}

/**
 * Pausa sin vehículo que la cubra, o idle del desglosador (pared − unidades):
 * hueco, igual que Inconsciente. No duplica un corte ya registrado en el log.
 */
export function appendUnjustifiedPausasToHuecos(
  intervals: CoberturaHuecoInterval[],
  vehicles: Vehicle[],
  now = Date.now()
): CoberturaHuecoInterval[] {
  const pauses = unjustifiedPauseIntervals(vehicles, now);
  if (pauses.length === 0) return intervals;

  const logged: MsInterval[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const ms = intervalToMs(intervals[i]!, now);
    if (ms) logged.push(ms);
  }
  const extra = logged.length > 0 ? subtractMsIntervals(pauses, logged) : pauses;
  if (extra.length === 0) return intervals;

  const next = intervals.map(it => ({ ...it, reason: it.reason ?? ("corte" as const) }));
  for (let i = 0; i < extra.length; i++) {
    const p = extra[i]!;
    const open = p.end >= now - 1_000;
    next.push({
      startMs: p.start,
      endMs: open ? null : p.end,
      open,
      reason: "pausa_no_justificada",
    });
  }
  next.sort((a, b) => a.startMs - b.startMs);
  return next;
}

/**
 * Huecos de la rutina ya ocurrida (ocupación − trabajo).
 * El log solo nombra cortes; no tapa un vehículo que sí avanzó.
 */
export function buildMetricaHuecoIntervals(params: {
  vehicles: Vehicle[];
  now?: number;
  events?: CoberturaHuecoEvent[];
  /** Rutina del día. Si falta, se lee la planilla local. Sin rutina no hay hueco. */
  segmentos?: HuecoPlanSegmento[];
}): CoberturaHuecoInterval[] {
  const now = params.now ?? Date.now();
  const plan = resolveHuecoPlanWindows({
    segmentos: params.segmentos,
    now,
  });
  if (plan.length === 0) return [];

  const fecha = getJournalDateString(now);
  const segs = params.segmentos ?? readLocalPlanillaSegmentos(fecha);
  const occ = computeTriadaLineaOccupancy({
    fecha,
    segmentos: segs,
    vehicles: params.vehicles,
    now,
  });
  if (occ.huecosIntervals.length === 0) return [];

  const events = params.events ?? readCoberturaHuecosEvents();
  const logged = clipHuecoIntervalsToPlan(
    appendUnjustifiedPausasToHuecos(
      buildCoberturaHuecoIntervals(events, now),
      params.vehicles,
      now
    ),
    plan,
    now
  );
  return occ.huecosIntervals.map(g => overlayHuecoMeta(g, logged, now, plan));
}

export function formatCoberturaHuecosSummary(
  intervals: CoberturaHuecoInterval[],
  now = Date.now()
): string {
  const openCount = intervals.filter(i => i.open).length;
  const closedCount = intervals.length - openCount;
  if (intervals.length === 0) return "Sin cortes de cobertura hoy";
  const total = sumCoberturaHuecosMinutes(intervals, now);
  const totalPart =
    total > 0 ? ` · ${formatHuecoDuration(0, total * 60_000)}` : "";
  if (openCount > 0) {
    return `${intervals.length} corte${intervals.length === 1 ? "" : "s"} sin vehículo · 1 abierto${totalPart}`;
  }
  return `${closedCount} corte${closedCount === 1 ? "" : "s"} sin vehículo${totalPart}`;
}
