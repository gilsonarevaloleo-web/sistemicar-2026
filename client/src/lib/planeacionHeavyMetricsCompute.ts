/**
 * Fase 2 perf: compute pesado de métricas Jornada (fuera del render de Planeacion).
 * Misma lógica que antes en useMemo síncronos — solo cambia dónde/cuándo se ejecuta.
 */
import {
  calcularBalanceConquistaJornada,
  type TimelineDayStats,
  type MetricasAnilloConciencia,
} from "@/engines/ConcienciaEngine";
import { getSharedAnilloLiveModel } from "@/lib/anilloLiveModelCache";
import {
  computeAtencionCompare,
  computeAtencionPanoramicaDia,
  type AtencionPanoramicaDia,
} from "@/lib/atencionPanoramicaEngine";
import {
  buildDisciplinaSerie,
  computeDisciplinaCompare,
  computeDisciplinaDia,
  type DisciplinaDia,
  type DisciplinaSeriePoint,
} from "@/lib/disciplinaEngine";
import { getDecisionLedger } from "@/lib/decisionesLedger";
import { filterVehiclesForAnilloCoverage } from "@/lib/ghostVehicleEngine";
import {
  buildEscaleraConciencia,
  type EscaleraConcienciaModel,
} from "@/lib/escaleraConcienciaEngine";
import type { FocusBandEvent } from "@/lib/focusBandLedger";
import type { PlanillaDailySnapshot, Vehicle } from "@/lib/persistence";
import type { SegmentoV5 } from "@/lib/persistence";
import {
  buildDailySnapshot,
  computeCombustibleDia,
  computeTermodinamicaCompareV2,
  vehicleEnTermoJornada,
  type CombustibleDia,
  type TermodinamicaCompareV2,
} from "@/lib/termodinamicaAtencional";
import { getJournalDateString, getJournalDayStartMs, getLimaDayStartMs } from "@/lib/segmentTime";
import type { SegmentoAtencion } from "@/lib/atencionPanoramicaEngine";
import type { SegmentoDisciplina } from "@/lib/disciplinaEngine";

export type AnilloSnapshotForEscalera = {
  dayStats: TimelineDayStats;
  metricas: MetricasAnilloConciencia;
};

export type PlaneacionHeavyMetrics = {
  anilloSnapshotForEscalera: AnilloSnapshotForEscalera;
  todayTermoLive: PlanillaDailySnapshot;
  termoCompare: TermodinamicaCompareV2;
  combustibleLive: CombustibleDia;
  disciplinaLive: DisciplinaDia;
  atencionLive: AtencionPanoramicaDia;
  atencionCompare: ReturnType<typeof computeAtencionCompare>;
  atencionBySegmentId: Map<string, SegmentoAtencion>;
  disciplinaCompare: ReturnType<typeof computeDisciplinaCompare>;
  disciplinaBySegmentId: Map<string, SegmentoDisciplina>;
  disciplinaSerie: DisciplinaSeriePoint[];
  escaleraConciencia: EscaleraConcienciaModel;
};

export type PlaneacionHeavyMetricsInput = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  focusEventsToday: FocusBandEvent[];
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null;
  disciplinaSnapshots: PlanillaDailySnapshot[];
  nowMs?: number;
};

const EMPTY_ATENCION: AtencionPanoramicaDia = {
  segmentos: [],
  puertasAbiertas: 0,
  puertasPerdidas: 0,
  cierresConscientes: 0,
  ratioAntesVoz: null,
  indiceAtencion: 0,
};

const EMPTY_DISCIPLINA: DisciplinaDia = {
  segmentos: [],
  indiceDisciplina: 0,
  faseJornada: "pre_jornada",
  cobertura: { base: 0, conEntrada: 0, pct: null },
  puntualidad: { pct: null, deltaMedioMin: null },
  primeraPuertaHora: null,
  entradasTotales: 0,
  sinEntrada: 0,
  deltaMedioDesdeInicioMin: null,
  deltaMedioDesdePuertaMin: null,
  estudioTipos: [],
  montajes: 0,
};

const EMPTY_COMBUSTIBLE: CombustibleDia = {
  bloques: 0,
  desglosadoresCerrados: 0,
  bloquesOtros: 0,
  decisiones: 0,
  subsTiempo: 0,
  subsSituacion: 0,
  misionesDirectas: 0,
};

function emptyTermoSnapshot(): PlanillaDailySnapshot {
  return buildDailySnapshot({
    fecha: getJournalDateString(),
    segmentos: [],
    vehicles: [],
    dayStartMs: getJournalDayStartMs(),
    logs: [],
    events: [],
    ledgerEntries: [],
    conquistaMin: 0,
    entropiaMin: 0,
    vacioMin: 0,
  });
}

function emptyAnilloSnapshot(): AnilloSnapshotForEscalera {
  return {
    dayStats: { conquistaMin: 0, entropiaMin: 0, vacioMin: 0, centinelaMin: 0 },
    metricas: {
      planificacionPct: 0,
      conquistaMin: 0,
      entropiaMin: 0,
      jornadaMin: 0,
      conquistaArcPct: 0,
      entropiaArcPct: 0,
      fillPct: 0,
      horasCubiertas: 0,
    },
  };
}

export function createEmptyPlaneacionHeavyMetrics(
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null = null
): PlaneacionHeavyMetrics {
  const todayTermoLive = emptyTermoSnapshot();
  const disciplinaLive = EMPTY_DISCIPLINA;
  const combustibleLive = EMPTY_COMBUSTIBLE;
  const anilloSnapshotForEscalera = emptyAnilloSnapshot();
  const atencionLive = EMPTY_ATENCION;
  return {
    anilloSnapshotForEscalera,
    todayTermoLive,
    termoCompare: computeTermodinamicaCompareV2(yesterdayTermoSnapshot, todayTermoLive),
    combustibleLive,
    disciplinaLive,
    atencionLive,
    atencionCompare: computeAtencionCompare(null, atencionLive),
    atencionBySegmentId: new Map(),
    disciplinaCompare: computeDisciplinaCompare(yesterdayTermoSnapshot?.disciplina, disciplinaLive),
    disciplinaBySegmentId: new Map(),
    disciplinaSerie: [],
    escaleraConciencia: buildEscaleraConciencia({
      dayStats: anilloSnapshotForEscalera.dayStats,
      conquistaArcPct: 0,
      disciplina: disciplinaLive,
      combustible: combustibleLive,
      ledger: [],
      dayStartMs: getJournalDayStartMs(),
    }),
  };
}

/** Firma estable para invalidar cache / reprogramar compute async. */
export function planeacionHeavyMetricsInputSig(input: PlaneacionHeavyMetricsInput): string {
  const segs = input.segmentos
    .map(s => `${s.id}:${s.estado}:${s.horaInicio}:${s.horaFin}`)
    .join("|");
  let active = 0;
  for (const v of input.vehicles) {
    if (v.status === "activo") active += 1;
  }
  return [
    input.userId ?? "",
    segs,
    `${input.vehicles.length}:${active}`,
    input.focusEventsToday.length,
    input.yesterdayTermoSnapshot?.fecha ?? "",
    input.disciplinaSnapshots.length,
  ].join(";");
}

export function computePlaneacionHeavyMetrics(
  input: PlaneacionHeavyMetricsInput
): PlaneacionHeavyMetrics {
  const nowMs = input.nowMs ?? Date.now();
  const segmentos = input.segmentos;
  const vehicles = input.vehicles;
  const dayStartMs = getJournalDayStartMs(nowMs);

  const model = getSharedAnilloLiveModel(segmentos, vehicles, nowMs);
  const anilloSnapshotForEscalera: AnilloSnapshotForEscalera = {
    dayStats: model.dayStats,
    metricas: model.metricas,
  };

  const jornadaVehicles = vehicles.filter(v => vehicleEnTermoJornada(v, dayStartMs));
  const ledger = input.userId ? getDecisionLedger(input.userId, dayStartMs) : [];

  const balance = calcularBalanceConquistaJornada({
    segmentos,
    vehiculos: filterVehiclesForAnilloCoverage(jornadaVehicles, nowMs),
    now: nowMs,
    dayStartMs,
  });

  const todayTermoLive = buildDailySnapshot({
    fecha: getJournalDateString(),
    segmentos,
    vehicles: jornadaVehicles,
    dayStartMs,
    logs: [],
    events: input.focusEventsToday,
    ledgerEntries: ledger,
    conquistaMin: balance.conquistaMin,
    entropiaMin: balance.entropiaMin,
    vacioMin: balance.vacioMin,
  });

  const termoCompare = computeTermodinamicaCompareV2(input.yesterdayTermoSnapshot, todayTermoLive);

  const combustibleLive = computeCombustibleDia(jornadaVehicles, dayStartMs, ledger);

  const jornadaStart = getJournalDayStartMs();
  const disciplinaVehicles = vehicles.filter(v => {
    const ts = v.cierreAt || v.aperturaAt || v.createdAt?.getTime?.() || 0;
    return ts >= jornadaStart;
  });
  const disciplinaLive = computeDisciplinaDia({
    segmentos,
    vehicles: disciplinaVehicles,
    dayStartMs: getLimaDayStartMs(),
  });

  const atencionLive = computeAtencionPanoramicaDia({
    segmentos,
    nowMs,
    dayStartMs: getLimaDayStartMs(),
  });

  const atencionCompare = computeAtencionCompare(null, atencionLive);
  const atencionBySegmentId = new Map(atencionLive.segmentos.map(s => [s.segmentoId, s]));
  const disciplinaCompare = computeDisciplinaCompare(
    input.yesterdayTermoSnapshot?.disciplina,
    disciplinaLive
  );
  const disciplinaBySegmentId = new Map(disciplinaLive.segmentos.map(s => [s.segmentoId, s]));
  const disciplinaSerie = buildDisciplinaSerie(
    input.disciplinaSnapshots,
    disciplinaLive,
    getJournalDateString()
  );

  const escaleraConciencia = buildEscaleraConciencia({
    dayStats: anilloSnapshotForEscalera.dayStats,
    conquistaArcPct: anilloSnapshotForEscalera.metricas.conquistaArcPct,
    disciplina: disciplinaLive,
    combustible: combustibleLive,
    ledger,
    dayStartMs,
    nowMs,
    snapshots: input.disciplinaSnapshots,
    todayFecha: getJournalDateString(),
  });

  return {
    anilloSnapshotForEscalera,
    todayTermoLive,
    termoCompare,
    combustibleLive,
    disciplinaLive,
    atencionLive,
    atencionCompare,
    atencionBySegmentId,
    disciplinaCompare,
    disciplinaBySegmentId,
    disciplinaSerie,
    escaleraConciencia,
  };
}
