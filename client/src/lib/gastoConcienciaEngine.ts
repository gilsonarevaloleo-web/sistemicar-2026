/**
 * Motor de gasto de conciencia.
 *
 * Registra la pared de cada vehículo y clasifica el día-jornada (05:00→05:00):
 * - Inconsciente = plan ya ocurrido sin actividad de vehículo (huecos).
 * - Presencia    = vehículos sin dirección (sin Norte / peldaño).
 * - Dirección    = vehículos con proyecto o centro, dentro del plan.
 * - No conquistado = horario no planificado (p.ej. 23:00–05:00).
 *
 * 100% = 24 h del día-jornada. Si el usuario planifica 24 h (incluido dormir),
 * lo no conquistado queda en cero.
 *
 * Prohibido en ms0 / tick 1s. Idle, sello, Hub.
 */
import {
  computeTriadaLineaOccupancy,
  intersectIntervalsWithWindows,
  limaMidnightFromJournalFecha,
  mergeMsIntervals,
  plannedWindowsMs,
  subtractMsIntervals,
  sumIntervalMinutes,
  type MsInterval,
  type TriadaLineaOccupancy,
} from "./concienciaTriadaLinea";
import { feedsProyectoHub, resolveDestinoCierre } from "./destinoCierre";
import { getJournalDateString, getLimaDayStartMs } from "./segmentTime";
import {
  formatDuracionTimon,
  hydratePresenciaEpisodio,
  hydrateTimonEpisodio,
  wallMinutosReales,
  type TimonEpisodio,
  type TimonVehiculoFuente,
  type TimonVehiculoStamp,
} from "./timonHoras";
import type { Vehicle } from "./persistence";

export const MINUTOS_DIA_JORNADA = 24 * 60;

export type DestinoGastoConciencia = "presencia" | "direccion";

export type GastoVehiculoRegistro = {
  vid: string;
  titulo: string;
  dest: DestinoGastoConciencia;
  minutos: number;
  a: number;
  z: number;
  pid?: string;
  oleadaPuntoId?: string;
  peldanoId?: string;
  /** Hora enumerada (presencia infinita o timón de dirección). */
  horaInicio?: number;
  horaFin?: number;
};

export type GastoConcienciaDia = {
  fecha: string;
  minutosDia: number;
  minutosPlan: number;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosNoConquistado: number;
  minutosPlanFuturo: number;
  registros: GastoVehiculoRegistro[];
  hilosAvanzando: number;
  paraleloMeritorio: boolean;
  interruptCubreLinea: boolean;
  minutosParaleloEnJuego: number;
  minutosParaleloGanado: number;
};

export const EMPTY_GASTO_DIA: GastoConcienciaDia = {
  fecha: "",
  minutosDia: MINUTOS_DIA_JORNADA,
  minutosPlan: 0,
  minutosInconsciente: 0,
  minutosPresencia: 0,
  minutosDireccion: 0,
  minutosNoConquistado: MINUTOS_DIA_JORNADA,
  minutosPlanFuturo: 0,
  registros: [],
  hilosAvanzando: 0,
  paraleloMeritorio: false,
  interruptCubreLinea: false,
  minutosParaleloEnJuego: 0,
  minutosParaleloGanado: 0,
};

function round1(n: number): number {
  return Math.round(Math.max(0, n) * 10) / 10;
}

/** 05:00 Lima del YYYY-MM-DD de jornada → 05:00 siguiente. */
export function journalWindowMs(
  fecha: string
): { start: number; end: number; midnight: number } | null {
  const midnight = limaMidnightFromJournalFecha(fecha);
  if (midnight == null) return null;
  const start = midnight + 5 * 3_600_000;
  return { start, end: start + MINUTOS_DIA_JORNADA * 60_000, midnight };
}

export function huecosLogToIntervals(
  intervals: Array<{ startMs: number; endMs: number | null; open?: boolean }>,
  now = Date.now()
): MsInterval[] {
  const out: MsInterval[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const it = intervals[i];
    if (!it) continue;
    const end = it.endMs != null && it.endMs > it.startMs ? it.endMs : now;
    if (end > it.startMs) out.push({ start: it.startMs, end });
  }
  return mergeMsIntervals(out);
}

function vehicleRegistro(
  v: Vehicle,
  now: number
): GastoVehiculoRegistro | null {
  const vid = (v.id ?? "").trim();
  if (!vid) return null;
  const a = v.aperturaAt;
  if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) return null;
  const minutos = wallMinutosReales(v, now);
  if (minutos <= 0) return null;
  let z: number;
  if (v.status === "activo") {
    z = now;
  } else if (typeof v.cierreAt === "number" && v.cierreAt > a) {
    z = v.cierreAt;
  } else {
    z = a + minutos * 60_000;
  }
  const dest: DestinoGastoConciencia = feedsProyectoHub(
    resolveDestinoCierre(v.destinoCierre)
  )
    ? "direccion"
    : "presencia";
  const pid = v.proyectoId?.trim();
  const oleadaPuntoId = v.oleadaPuntoId?.trim();
  const peldanoId = v.proyectoPeldanoId?.trim();
  return {
    vid,
    titulo: (v.titulo ?? "").trim() || "Vehículo",
    dest,
    minutos,
    a,
    z,
    ...(pid ? { pid } : {}),
    ...(oleadaPuntoId ? { oleadaPuntoId } : {}),
    ...(peldanoId ? { peldanoId } : {}),
  };
}

function stampHorasOntoRegistros(
  registros: GastoVehiculoRegistro[],
  stamps: TimonVehiculoStamp[],
  dest: DestinoGastoConciencia
): void {
  const map = new Map(stamps.map(s => [s.vehicleId, s]));
  for (const r of registros) {
    if (r.dest !== dest) continue;
    const s = map.get(r.vid);
    if (!s) continue;
    r.horaInicio = s.horaInicio;
    r.horaFin = s.horaFin;
  }
}

/**
 * Clasificación del día-jornada a partir de vehículos + plan.
 * `huecosLog` (cortes sin vehículo) agujerea la cobertura para no pintar
 * como presencia/dirección un tramo en el que no había actividad.
 */
export function computeGastoConcienciaDia(params: {
  fecha?: string;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  now?: number;
  huecosLog?: MsInterval[];
  /** Si hay oleada, enumera dirección con esas horas. */
  timonEpisodio?: TimonEpisodio | null;
  presenciaEpisodio?: TimonEpisodio | null;
  proyectoId?: string;
  oleadaId?: string;
  puntoId?: string;
  puntoTitulo?: string;
}): GastoConcienciaDia {
  const now = params.now ?? Date.now();
  const fecha = params.fecha ?? getJournalDateString(now);
  const journal =
    journalWindowMs(fecha) ??
    (() => {
      const midnight = getLimaDayStartMs(now);
      const start = midnight + 5 * 3_600_000;
      return { start, end: start + MINUTOS_DIA_JORNADA * 60_000, midnight };
    })();

  const plan = plannedWindowsMs(params.segmentos, journal.midnight);
  const minutosPlan = round1(sumIntervalMinutes(plan));
  const minutosNoConquistado = round1(
    Math.max(0, MINUTOS_DIA_JORNADA - minutosPlan)
  );

  const occ: TriadaLineaOccupancy = computeTriadaLineaOccupancy({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now,
    huecosLog: params.huecosLog,
  });

  const registros: GastoVehiculoRegistro[] = [];
  for (let i = 0; i < params.vehicles.length; i++) {
    const r = vehicleRegistro(params.vehicles[i]!, now);
    if (r) registros.push(r);
  }
  registros.sort((a, b) => a.a - b.a);

  if (params.puntoId && params.proyectoId) {
    const timon = hydrateTimonEpisodio({
      episodio: params.timonEpisodio,
      puntoId: params.puntoId,
      puntoTitulo: params.puntoTitulo || "Punto de producción",
      proyectoId: params.proyectoId,
      oleadaId: params.oleadaId,
      vehicles: params.vehicles as TimonVehiculoFuente[],
      now,
    });
    stampHorasOntoRegistros(registros, timon.vehiculos, "direccion");
  }
  const presencia = hydratePresenciaEpisodio({
    episodio: params.presenciaEpisodio,
    proyectoId: params.proyectoId,
    vehicles: params.vehicles as TimonVehiculoFuente[],
    now,
  });
  stampHorasOntoRegistros(registros, presencia.vehiculos, "presencia");

  return {
    fecha,
    minutosDia: MINUTOS_DIA_JORNADA,
    minutosPlan,
    minutosInconsciente: occ.minutosHueco,
    minutosPresencia: occ.minutosPresencia,
    minutosDireccion: occ.minutosDireccion,
    minutosNoConquistado,
    minutosPlanFuturo: occ.minutosPlanFuturo,
    registros,
    hilosAvanzando: occ.hilosAvanzando,
    paraleloMeritorio: occ.paraleloMeritorio,
    interruptCubreLinea: occ.interruptCubreLinea,
    minutosParaleloEnJuego: occ.minutosParaleloEnJuego,
    minutosParaleloGanado: occ.minutosParaleloGanado,
  };
}

export function pctOfDia(part: number, total = MINUTOS_DIA_JORNADA): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((part / total) * 100));
}

export { formatDuracionTimon };

/** Huecos de cobertura recortados al plan ya ocurrido — misma cifra de inconsciencia. */
export function punchCoverageWithHuecos(
  covered: MsInterval[],
  huecosLog: MsInterval[],
  planElapsed: MsInterval[]
): MsInterval[] {
  if (huecosLog.length === 0) return covered;
  const holes = intersectIntervalsWithWindows(huecosLog, planElapsed);
  return subtractMsIntervals(covered, holes);
}

export function clipHuecosToPlan(
  huecosLog: MsInterval[],
  plan: MsInterval[]
): MsInterval[] {
  return intersectIntervalsWithWindows(huecosLog, plan);
}

export function sumHuecosInPlanMinutes(
  huecosLog: MsInterval[],
  planElapsed: MsInterval[]
): number {
  return round1(
    sumIntervalMinutes(intersectIntervalsWithWindows(huecosLog, planElapsed))
  );
}

export function readLocalPlanillaSegmentos(
  fecha: string
): { horaInicio?: string; horaFin?: string }[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sistemicar_planilla_v5_${fecha}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { segmentos?: { horaInicio?: string; horaFin?: string }[] };
    return Array.isArray(parsed?.segmentos) ? parsed.segmentos : [];
  } catch {
    return [];
  }
}
