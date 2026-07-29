/**
 * Historial liviano de huecos de cobertura.
 * Solo escribe en transiciones (hay / no hay vehículo consciente).
 * Sin timeline, sin anillo, sin computeLiveEntropy, sin tick 1s.
 */
import { hasActiveConsciousCoverage } from "@/lib/entropyTimePolicy";
import type { Vehicle } from "@/lib/persistence";
import { getLimaDayStartMs } from "@/lib/segmentTime";

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

export type CoberturaHuecoInterval = {
  startMs: number;
  endMs: number | null;
  /** true si el hueco sigue abierto. */
  open: boolean;
  closedByTitulo?: string;
};

function dayKeyFromMs(ms: number): string {
  return String(getLimaDayStartMs(ms));
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
 */
export function reconcileCoberturaHuecos(params: {
  vehicles: Vehicle[];
  now?: number;
  /** Título del vehículo que acaba de cubrir (opcional). */
  coverTitulo?: string;
}): CoberturaHuecoEvent | null {
  const now = params.now ?? Date.now();
  const dayKey = dayKeyFromMs(now);
  const covered = hasActiveConsciousCoverage(params.vehicles, now);
  const events = readCoberturaHuecosEvents();
  const last = lastEventToday(events, dayKey);

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
  const min = Math.max(0, Math.round((endMs - startMs) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
