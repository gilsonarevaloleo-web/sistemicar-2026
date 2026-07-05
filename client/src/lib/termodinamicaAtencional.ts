import type { FocusBandEvent, FocusBandId } from "./focusBandLedger";
import type { SegmentoV5, SovereigntyPointsLog, SubTarea, SubVehiculo, Vehicle } from "./persistence";
import { computeSubCloseVerdict, suggestedSec } from "./desglosadorClock";
import { getRutaTiempoSegmento } from "./rutaSeguimiento";
import { computeRutaEnfoquePS, type RutaCruzadaSnapshot } from "./rutaEnfoque";
import type { RutaBandaId } from "./rutaEnfoque";
import { computeDisciplinaDia } from "./disciplinaEngine";
import type { DisciplinaDia } from "./disciplinaEngine";
export type { DisciplinaDia, SegmentoDisciplina } from "./disciplinaEngine";
import type { DecisionLedgerEntry } from "./decisionesLedger";
import { countDecisionesFromLedger } from "./decisionesLedger";
import { isInvisibleCentinelaVehicle } from "./centinelaEngine";
import { getLimaDayStartMs } from "./segmentTime";

/** Excluye centinelas automáticos del conteo de decisiones / combustible. */
export function isDecisionCountableVehicle(v: Vehicle): boolean {
  return !isInvisibleCentinelaVehicle(v);
}

export interface PsDesglose {
  panoramico: number;
  espectro: number;
  vehiculos: number;
  introspeccion: number;
  otros: number;
  total: number;
}

export interface EspectroBloques {
  fluido: number;
  concentrado: number;
  limite: number;
  descansosCuerpo: number;
}

export interface SegmentoSnapshotResumen {
  id: string;
  nombre: string;
  estado: SegmentoV5["estado"];
  psGanados: number;
}

/** Fase del operador según dominio fluido vs fricción (v2). */
export type FaseAtencional = "entrenamiento" | "integracion" | "dominio_fluido";

export interface ResistenciaDia {
  subsConRuta: number;
  /** Subs que objetivamente no cruzaron concentrado/límite (piloto automático). */
  bloquesDominioFluido: number;
  /** Subs que cruzaron concentrado o límite (contador / ledger). */
  friccionBloques: number;
  /** Subs que cruzaron concentrado y límite — los 3 tramos de la ruta. */
  subsEstructuraCompleta: number;
  /** Subs cerrados en segmento temporal B o C (≥50% del tiempo sugerido). */
  subsPersistenciaBC: number;
  subsConGanancia: number;
  gananciaTiempoSeg: number;
  indiceResistencia: number;
  fase: FaseAtencional;
}

export interface PlanillaDailySnapshot {
  id: string;
  fecha: string;
  timestamp: number;
  segmentos: SegmentoSnapshotResumen[];
  espectroBloques: EspectroBloques;
  profundidadMaxima: FocusBandId;
  psDesglose: PsDesglose;
  ratioConquista: number;
  segmentosCerradosManual: number;
  segmentosEntropia: number;
  segmentosTotales: number;
  bloquesCompletados: number;
  /** Desglosadores (contenedor) cerrados en la jornada — regla A: 1 bloque = 1 desglosador cerrado. */
  desglosadoresCerrados?: number;
  /** Subs cumplidos dentro de desglosadores (decisión interna; no equivalen a bloques). */
  subsDesglosadorCumplidos?: number;
  /** @deprecated Usar desglosadoresCerrados. Snapshots viejos guardaban aquí el conteo de subs. */
  bloquesDesglosador?: number;
  /** Misiones no-desglosador cerradas hoy (cumplido/archivado). */
  bloquesOtros?: number;
  /** Decisiones ejecutadas hoy (combustible de conciencia: subs + situación + misiones). */
  decisionesDelDia?: number;
  decisionesSubsTiempo?: number;
  decisionesSubsSituacion?: number;
  decisionesMisiones?: number;
  disciplina?: DisciplinaDia;
  /** 2 = termodinámica con resistencia / dominio fluido */
  schemaVersion?: 1 | 2;
  resistencia?: ResistenciaDia;
  estadoAtencional?: FaseAtencional;
}

const BANDA_RANK: Record<FocusBandId, number> = {
  fluido: 1,
  concentrado: 2,
  limite: 3,
};

const SNAPSHOT_LOCAL_KEY = "sistemicar_daily_snapshot";

export function maxBanda(a: FocusBandId, b: FocusBandId): FocusBandId {
  return BANDA_RANK[a] >= BANDA_RANK[b] ? a : b;
}

const FOCUS_BANDS: FocusBandId[] = ["fluido", "concentrado", "limite"];

/** Tramos de ruta recorridos en un sub cumplido (declarados al cierre o detectados en cruzado). */
export function bandasRecoridasSub(sub: SubVehiculo): FocusBandId[] {
  if (sub.status !== "cumplido") return [];

  const decl = sub.rutaDeclarada?.filter((b): b is FocusBandId =>
    FOCUS_BANDS.includes(b as FocusBandId)
  );
  if (decl && decl.length > 0) return [...new Set(decl)];

  const cruzado = sub.rutaEnfoque?.cruzado;
  if (sub.rutaEnfoque?.activa && cruzado) {
    const bands: FocusBandId[] = [];
    if (cruzado.fluido) bands.push("fluido");
    if (cruzado.concentrado) bands.push("concentrado");
    if (cruzado.limite) bands.push("limite");
    if (bands.length > 0) return bands;
  }

  return ["fluido"];
}

/** Profundidad máxima alcanzada en un bloque (p. ej. cierre / ledger). */
export function inferBandaBloque(sub: SubVehiculo): FocusBandId {
  const bands = bandasRecoridasSub(sub);
  if (bands.includes("limite")) return "limite";
  if (bands.includes("concentrado")) return "concentrado";
  return "fluido";
}

/** Un sub cumplido aporta profundidad al espectro (banda máxima alcanzada, no 3 conteos por tramos). */
function addSubProfundidadToEspectro(counts: EspectroBloques, sub: SubVehiculo): void {
  counts[inferBandaBloque(sub)]++;
}

/** Timestamp de cierre del sub para filtrar la jornada (no el vehículo padre activo). */
export function subCierreTimestamp(sub: SubVehiculo, vehicle: Vehicle): number {
  return sub.cierreAt ?? sub.aperturaAt ?? vehicle.cierreAt ?? vehicle.aperturaAt ?? 0;
}

/** Sub cumplido cerrado en o después del inicio de jornada. */
export function subCumplidoEnJornada(
  sub: SubVehiculo,
  vehicle: Vehicle,
  dayStartMs: number
): boolean {
  if (sub.status !== "cumplido") return false;
  if (subCierreTimestamp(sub, vehicle) >= dayStartMs) return true;
  // Sync puede perder cierreAt; si el sub abrió hoy, cuenta en la jornada.
  if ((sub.aperturaAt ?? 0) >= dayStartMs) return true;
  return false;
}

/**
 * Incluye desglosador activo aunque se abrió en jornada anterior (mientras cierres subs hoy)
 * y vehículos con actividad hoy por apertura/cierre.
 */
/** Desglosador cerrado (cumplido/archivado) en o después del inicio de jornada. */
export function desglosadorCerradoEnJornada(vehicle: Vehicle, dayStartMs: number): boolean {
  if (vehicle.tipoReloj !== "desglosador") return false;
  if (vehicle.status !== "cumplido" && vehicle.status !== "archivado") return false;

  const cierreVehiculo = vehicle.cierreAt ?? vehicle.aperturaAt ?? 0;
  if (cierreVehiculo >= dayStartMs) return true;

  const subs = vehicle.subVehiculos ?? [];
  if (subs.length === 0) return false;
  const todosCerrados = subs.every(s => s.status === "cumplido" || s.status === "fallado");
  if (!todosCerrados) return false;
  const ultimoCierre = Math.max(...subs.map(s => subCierreTimestamp(s, vehicle)));
  return ultimoCierre >= dayStartMs;
}

export function vehicleEnTermoJornada(vehicle: Vehicle, dayStartMs: number): boolean {
  if (vehicle.tipoReloj === "desglosador") {
    if (desglosadorCerradoEnJornada(vehicle, dayStartMs)) return true;
    const subs = vehicle.subVehiculos ?? [];
    if (subs.some(s => subCumplidoEnJornada(s, vehicle, dayStartMs))) return true;
    if (vehicle.status === "activo") return true;
  }
  const ts = vehicle.cierreAt ?? vehicle.aperturaAt ?? vehicle.createdAt?.getTime?.() ?? 0;
  if (vehicle.status === "activo") return true;
  return ts >= dayStartMs;
}

/** Cruces de umbral en vivo (ledger) — respaldo si el sub perdió cruzado al sincronizar. */
export function espectroFromRutaCruceEvents(
  events: FocusBandEvent[],
  dayStartMs: number
): Pick<EspectroBloques, "fluido" | "concentrado" | "limite"> {
  const seenFluido = new Set<string>();
  const seenConc = new Set<string>();
  const seenLim = new Set<string>();
  let fluido = 0;
  let concentrado = 0;
  let limite = 0;

  for (const e of events) {
    if (e.timestamp < dayStartMs || e.source !== "ruta_cruce") continue;
    const key = `${e.subVehicleId ?? e.vehicleId ?? e.id}-${e.banda}`;
    if (e.banda === "fluido" && !seenFluido.has(key)) {
      seenFluido.add(key);
      fluido++;
    }
    if (e.banda === "concentrado" && !seenConc.has(key)) {
      seenConc.add(key);
      concentrado++;
    }
    if (e.banda === "limite" && !seenLim.has(key)) {
      seenLim.add(key);
      limite++;
    }
  }

  return { fluido, concentrado, limite };
}

function mergeEspectroWithEvents(
  espectro: EspectroBloques,
  events: FocusBandEvent[],
  dayStartMs: number
): EspectroBloques {
  if (events.length === 0) return espectro;
  const fromEvents = espectroFromRutaCruceEvents(events, dayStartMs);
  return {
    ...espectro,
    fluido: Math.max(espectro.fluido, fromEvents.fluido),
    concentrado: Math.max(espectro.concentrado, fromEvents.concentrado),
    limite: Math.max(espectro.limite, fromEvents.limite),
  };
}

export function inferBandaVehiculo(v: Vehicle): FocusBandId | null {
  return (v.intensidadEnergeticaFin || v.intensidadEnergetica || null) as FocusBandId | null;
}

export function classifyPsSource(source: string): keyof Omit<PsDesglose, "total"> {
  const s = source.toLowerCase();
  if (
    s.includes("cierre consciente") ||
    s.includes("cierre fuera") ||
    s.includes("segmento") ||
    s.includes("puerta")
  ) {
    return "panoramico";
  }
  if (
    s.includes("ruta") ||
    s.includes("profundidad") ||
    s.includes("enfoque") ||
    s.includes("concentrado") ||
    s.includes("límite") ||
    s.includes("limite")
  ) {
    return "espectro";
  }
  if (s.includes("introspecci")) return "introspeccion";
  if (
    s.includes("vehículo") ||
    s.includes("vehiculo") ||
    s.includes("desglosador") ||
    s.includes("ciclo") ||
    s.includes("misión") ||
    s.includes("mision")
  ) {
    return "vehiculos";
  }
  return "otros";
}

export function computePsDesglose(logs: SovereigntyPointsLog[]): PsDesglose {
  const desglose: PsDesglose = {
    panoramico: 0,
    espectro: 0,
    vehiculos: 0,
    introspeccion: 0,
    otros: 0,
    total: 0,
  };

  for (const log of logs) {
    const key = classifyPsSource(log.source);
    if (key === "introspeccion") continue;
    desglose[key] += log.amount;
    desglose.total += log.amount;
  }

  return desglose;
}

export function computeEspectroBloques(
  vehicles: Vehicle[],
  dayStartMs: number
): EspectroBloques {
  const counts: EspectroBloques = {
    fluido: 0,
    concentrado: 0,
    limite: 0,
    descansosCuerpo: 0,
  };

  for (const v of vehicles) {
    if (!isDecisionCountableVehicle(v) || !vehicleEnTermoJornada(v, dayStartMs)) continue;

    if (v.tipoFlota === "descanso" && (v.status === "cumplido" || v.status === "archivado")) {
      counts.descansosCuerpo++;
      continue;
    }

    if (v.tipoReloj === "desglosador") {
      for (const sub of v.subVehiculos || []) {
        if (!subCumplidoEnJornada(sub, v, dayStartMs)) continue;
        addSubProfundidadToEspectro(counts, sub);
      }
      continue;
    }

    if (v.status === "cumplido" || v.status === "archivado") {
      const banda = inferBandaVehiculo(v) || "fluido";
      counts[banda]++;
    }
  }

  return counts;
}

/** Subs cumplidos hoy dentro de desglosadores (métrica aparte del bloque contenedor). */
export function countSubsDesglosadorCumplidosHoy(vehicles: Vehicle[], dayStartMs: number): number {
  let total = 0;
  for (const v of vehicles) {
    if (!isDecisionCountableVehicle(v) || v.tipoReloj !== "desglosador" || !vehicleEnTermoJornada(v, dayStartMs)) {
      continue;
    }
    let fromSubs = 0;
    for (const sub of v.subVehiculos ?? []) {
      if (subCumplidoEnJornada(sub, v, dayStartMs)) fromSubs++;
    }
    const snap = v.termoDecisionSnapshot;
    const snapSubs =
      snap && snap.journalDayStartMs === dayStartMs ? snap.subsDesglosadorCumplidos : 0;
    total += Math.max(fromSubs, snapSubs);
  }
  return total;
}

/** @deprecated Usar countSubsDesglosadorCumplidosHoy */
export const countBloquesDesglosadorSubsHoy = countSubsDesglosadorCumplidosHoy;

/** Desglosadores cerrados hoy (regla A: 1 bloque = 1 desglosador cerrado). */
export function countDesglosadoresCerradosHoy(vehicles: Vehicle[], dayStartMs: number): number {
  let total = 0;
  for (const v of vehicles) {
    if (v.tipoReloj !== "desglosador") continue;
    if (desglosadorCerradoEnJornada(v, dayStartMs)) total++;
  }
  return total;
}

/** Misiones no-desglosador cerradas hoy (excluye descanso). */
export function countBloquesOtrosHoy(vehicles: Vehicle[], dayStartMs: number): number {
  let total = 0;
  for (const v of vehicles) {
    if (!isDecisionCountableVehicle(v) || v.tipoReloj === "desglosador" || v.tipoFlota === "descanso") {
      continue;
    }
    if (!vehicleEnTermoJornada(v, dayStartMs)) continue;
    if (v.status === "cumplido" || v.status === "archivado") total++;
  }
  return total;
}

/** Bloques cerrados hoy: desglosadores cerrados + otras misiones cerradas. */
export function countBloquesCompletados(vehicles: Vehicle[], dayStartMs: number): number {
  return countDesglosadoresCerradosHoy(vehicles, dayStartMs) + countBloquesOtrosHoy(vehicles, dayStartMs);
}

/** Lee subs del snapshot nuevo o de snapshots legacy (bloquesDesglosador = subs). */
export function subsDesglosadorCumplidosFromSnapshot(snap: PlanillaDailySnapshot): number {
  if (snap.subsDesglosadorCumplidos != null) return snap.subsDesglosadorCumplidos;
  if (snap.desglosadoresCerrados == null && snap.bloquesDesglosador != null) {
    return snap.bloquesDesglosador;
  }
  return 0;
}

export interface CombustibleDia {
  bloques: number;
  desglosadoresCerrados: number;
  bloquesOtros: number;
  decisiones: number;
  subsTiempo: number;
  subsSituacion: number;
  misionesDirectas: number;
}

/** Sub-tarea situacional cerrada como decisión en la jornada (1 tarea = 1, sin mangas). */
export function subTareaDecisionEnJornada(
  st: SubTarea,
  vehicle: Vehicle,
  dayStartMs: number
): boolean {
  if (st.enDesgloseCronometro) {
    if (st.resultadoSituacion !== "cumplido") return false;
    const ts = st.cerradaAt ?? st.creadaAt ?? 0;
    if (ts >= dayStartMs) return true;
    if ((st.creadaAt ?? 0) >= dayStartMs) return true;
    return false;
  }

  if (!st.completada) return false;
  const ts = st.cerradaAt ?? st.creadaAt ?? 0;
  return ts >= dayStartMs;
}

export function countSubsSituacionCumplidosHoy(vehicles: Vehicle[], dayStartMs: number): number {
  let total = 0;
  for (const v of vehicles) {
    if (!isDecisionCountableVehicle(v) || v.tipoFlota !== "situacion") continue;
    if (!vehicleEnTermoJornada(v, dayStartMs)) continue;
    let fromSubs = 0;
    for (const st of v.subTareas ?? []) {
      if (subTareaDecisionEnJornada(st, v, dayStartMs)) fromSubs++;
    }
    const snap = v.termoDecisionSnapshot;
    const snapSubs =
      snap && snap.journalDayStartMs === dayStartMs ? snap.subsSituacionCumplidos : 0;
    total += Math.max(fromSubs, snapSubs);
  }
  return total;
}

/** Misiones cerradas sin desglose interno (tiempo, producción, etc.). */
export function countMisionesDirectasCerradasHoy(vehicles: Vehicle[], dayStartMs: number): number {
  let total = 0;
  for (const v of vehicles) {
    if (
      !isDecisionCountableVehicle(v) ||
      v.tipoReloj === "desglosador" ||
      v.tipoFlota === "descanso" ||
      v.tipoFlota === "situacion"
    ) {
      continue;
    }
    if (!vehicleEnTermoJornada(v, dayStartMs)) continue;
    if (v.status === "cumplido" || v.status === "archivado") total++;
  }
  return total;
}

/** Combustible de conciencia: decisiones ejecutadas hoy (universal, sin unidades personales). */
export function computeCombustibleDia(
  vehicles: Vehicle[],
  dayStartMs: number,
  ledgerEntries?: DecisionLedgerEntry[]
): CombustibleDia {
  const subsTiempo = countSubsDesglosadorCumplidosHoy(vehicles, dayStartMs);
  const subsSituacion = countSubsSituacionCumplidosHoy(vehicles, dayStartMs);
  const misionesDirectas = countMisionesDirectasCerradasHoy(vehicles, dayStartMs);
  const desglosadoresCerrados = countDesglosadoresCerradosHoy(vehicles, dayStartMs);
  const bloquesOtros = countBloquesOtrosHoy(vehicles, dayStartMs);

  const live: CombustibleDia = {
    bloques: countBloquesCompletados(vehicles, dayStartMs),
    desglosadoresCerrados,
    bloquesOtros,
    subsTiempo,
    subsSituacion,
    misionesDirectas,
    decisiones: subsTiempo + subsSituacion + misionesDirectas,
  };

  if (!ledgerEntries?.length) return live;
  return mergeCombustibleWithLedger(live, ledgerEntries);
}

/** Toma el máximo entre conteo en vivo y ledger local (nunca resta decisiones ya registradas). */
export function mergeCombustibleWithLedger(
  live: CombustibleDia,
  ledgerEntries: DecisionLedgerEntry[]
): CombustibleDia {
  const ledger = countDecisionesFromLedger(ledgerEntries);
  const subsTiempo = Math.max(live.subsTiempo, ledger.subsTiempo);
  const subsSituacion = Math.max(live.subsSituacion, ledger.subsSituacion);
  const misionesDirectas = Math.max(live.misionesDirectas, ledger.misionesDirectas);
  return {
    ...live,
    subsTiempo,
    subsSituacion,
    misionesDirectas,
    decisiones: subsTiempo + subsSituacion + misionesDirectas,
  };
}

/** Snapshot al cerrar vehículo — respaldo si Firebase pierde subs al sincronizar. */
export function buildTermoDecisionSnapshot(
  vehicle: Vehicle,
  dayStartMs: number
): NonNullable<Vehicle["termoDecisionSnapshot"]> {
  let subsDesglosadorCumplidos = 0;
  if (vehicle.tipoReloj === "desglosador") {
    subsDesglosadorCumplidos = (vehicle.subVehiculos ?? []).filter(s =>
      subCumplidoEnJornada(s, vehicle, dayStartMs)
    ).length;
  }
  let subsSituacionCumplidos = 0;
  if (vehicle.tipoFlota === "situacion") {
    subsSituacionCumplidos = (vehicle.subTareas ?? []).filter(st =>
      subTareaDecisionEnJornada(st, vehicle, dayStartMs)
    ).length;
  }
  const misionDirecta =
    vehicle.tipoReloj !== "desglosador" &&
    vehicle.tipoFlota !== "descanso" &&
    vehicle.tipoFlota !== "situacion" &&
    (vehicle.status === "cumplido" || vehicle.status === "archivado")
      ? 1
      : 0;
  return {
    journalDayStartMs: dayStartMs,
    subsDesglosadorCumplidos,
    subsSituacionCumplidos,
    misionesDirectas: misionDirecta,
    recordedAt: Date.now(),
  };
}

export function decisionesFromSnapshot(snap: PlanillaDailySnapshot): number {
  if (snap.decisionesDelDia != null) return snap.decisionesDelDia;
  if (snap.subsDesglosadorCumplidos != null) return snap.subsDesglosadorCumplidos;
  if (snap.desglosadoresCerrados == null && snap.bloquesDesglosador != null) {
    return snap.bloquesDesglosador;
  }
  return 0;
}

export function profundidadFromEspectro(espectro: EspectroBloques): FocusBandId {
  if (espectro.limite > 0) return "limite";
  if (espectro.concentrado > 0) return "concentrado";
  return "fluido";
}

export function profundidadFromEvents(events: FocusBandEvent[]): FocusBandId {
  let max: FocusBandId = "fluido";
  for (const e of events) {
    if (e.source === "descanso_cuerpo") continue;
    max = maxBanda(max, e.banda);
  }
  return max;
}

function subEnJornada(sub: SubVehiculo, vehicle: Vehicle, dayStartMs: number): boolean {
  return subCumplidoEnJornada(sub, vehicle, dayStartMs);
}

/** Cruce de bandas medido por contador y ledger — no usa declaración del usuario (espejo). */
export function subCruceObjetivo(
  sub: SubVehiculo,
  events: FocusBandEvent[],
  dayStartMs: number
): RutaCruzadaSnapshot {
  const base = sub.rutaEnfoque?.cruzado ?? { fluido: false, concentrado: false, limite: false };
  let fluido = base.fluido || !!sub.rutaEnfoque?.activa;
  let concentrado = base.concentrado;
  let limite = base.limite;
  for (const e of events) {
    if (e.timestamp < dayStartMs || e.source !== "ruta_cruce") continue;
    if (e.subVehicleId !== sub.id) continue;
    if (e.banda === "fluido") fluido = true;
    if (e.banda === "concentrado") concentrado = true;
    if (e.banda === "limite") limite = true;
  }
  return { fluido, concentrado, limite };
}

/** Calibración objetiva: cruzó concentrado o límite en el contador. */
export function subTuvoFriccion(
  sub: SubVehiculo,
  events: FocusBandEvent[],
  dayStartMs: number
): boolean {
  const c = subCruceObjetivo(sub, events, dayStartMs);
  return c.concentrado || c.limite;
}

/** Solo fluido objetivo — no cruzó calibración (piloto automático). */
export function subEnDominioFluido(
  sub: SubVehiculo,
  events: FocusBandEvent[],
  dayStartMs: number
): boolean {
  if (!sub.rutaEnfoque?.activa || sub.status !== "cumplido") return false;
  return !subTuvoFriccion(sub, events, dayStartMs);
}

/** Recorrió fluido → concentrado → límite según el contador. */
export function subEstructuraCompletaObjetiva(
  sub: SubVehiculo,
  events: FocusBandEvent[],
  dayStartMs: number
): boolean {
  const c = subCruceObjetivo(sub, events, dayStartMs);
  return c.concentrado && c.limite;
}

/** Sostuvo al menos la mitad del tiempo sugerido antes de cerrar (segmentos B o C). */
export function subPersistenciaSegmentoBC(sub: SubVehiculo): boolean {
  const refSec = suggestedSec(sub);
  const realSec = sub.duracionFinal ?? null;
  if (refSec == null || realSec == null || sub.status !== "cumplido") return false;
  const seg = getRutaTiempoSegmento(realSec, refSec);
  return seg === "B" || seg === "C";
}

export function inferFaseAtencional(r: ResistenciaDia): FaseAtencional {
  if (r.subsConRuta === 0) return "entrenamiento";
  const estructuraPct = (100 * r.subsEstructuraCompleta) / r.subsConRuta;
  const calibracionPct = (100 * r.friccionBloques) / r.subsConRuta;
  const persistenciaPct = (100 * r.subsPersistenciaBC) / r.subsConRuta;
  if (estructuraPct >= 50 && calibracionPct >= 40) return "dominio_fluido";
  if (
    calibracionPct >= 30 ||
    estructuraPct >= 25 ||
    persistenciaPct >= 40 ||
    r.indiceResistencia >= 50
  ) {
    return "integracion";
  }
  return "entrenamiento";
}

export const FASE_ATENCIONAL_LABEL: Record<FaseAtencional, string> = {
  entrenamiento: "Entrenamiento",
  integracion: "Integración",
  dominio_fluido: "Dominio fluido",
};

export const FASE_ATENCIONAL_COLOR: Record<FaseAtencional, string> = {
  entrenamiento: "#94a3b8",
  integracion: "#A855F7",
  dominio_fluido: "#38BDF8",
};

function clampIndex(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Métricas v2: resistencia objetiva (contador + tiempo). La declaración del usuario no entra aquí. */
export function computeResistenciaDia(
  vehicles: Vehicle[],
  dayStartMs: number,
  events: FocusBandEvent[] = []
): ResistenciaDia {
  let subsConRuta = 0;
  let bloquesDominioFluido = 0;
  let friccionBloques = 0;
  let subsEstructuraCompleta = 0;
  let subsPersistenciaBC = 0;
  let subsConGanancia = 0;
  let gananciaTiempoSeg = 0;

  for (const v of vehicles) {
    if (v.tipoReloj !== "desglosador") continue;
    for (const sub of v.subVehiculos || []) {
      if (!sub.rutaEnfoque?.activa || !subEnJornada(sub, v, dayStartMs)) continue;
      subsConRuta++;
      const friccion = subTuvoFriccion(sub, events, dayStartMs);
      if (friccion) friccionBloques++;
      else bloquesDominioFluido++;
      if (subEstructuraCompletaObjetiva(sub, events, dayStartMs)) subsEstructuraCompleta++;
      if (subPersistenciaSegmentoBC(sub)) subsPersistenciaBC++;

      const verdict = computeSubCloseVerdict(sub);
      if (verdict.verdict === "gain") {
        subsConGanancia++;
        if (verdict.refSec != null && verdict.realSec != null) {
          gananciaTiempoSeg += Math.max(0, verdict.refSec - verdict.realSec);
        }
      }
    }
  }

  if (subsConRuta === 0) {
    return {
      subsConRuta: 0,
      bloquesDominioFluido: 0,
      friccionBloques: 0,
      subsEstructuraCompleta: 0,
      subsPersistenciaBC: 0,
      subsConGanancia: 0,
      gananciaTiempoSeg: 0,
      indiceResistencia: 0,
      fase: "entrenamiento",
    };
  }

  const estructuraPct = (100 * subsEstructuraCompleta) / subsConRuta;
  const calibracionPct = (100 * friccionBloques) / subsConRuta;
  const persistenciaPct = (100 * subsPersistenciaBC) / subsConRuta;
  const indiceResistencia = clampIndex(
    0.45 * estructuraPct + 0.35 * calibracionPct + 0.2 * persistenciaPct
  );
  const base: ResistenciaDia = {
    subsConRuta,
    bloquesDominioFluido,
    friccionBloques,
    subsEstructuraCompleta,
    subsPersistenciaBC,
    subsConGanancia,
    gananciaTiempoSeg,
    indiceResistencia,
    fase: "entrenamiento",
  };
  return { ...base, fase: inferFaseAtencional({ ...base, indiceResistencia }) };
}

export function buildDailySnapshot(params: {
  fecha: string;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  dayStartMs: number;
  logs: SovereigntyPointsLog[];
  events?: FocusBandEvent[];
  ledgerEntries?: DecisionLedgerEntry[];
  conquistaMin?: number;
  entropiaMin?: number;
  vacioMin?: number;
}): PlanillaDailySnapshot {
  const {
    fecha,
    segmentos,
    vehicles,
    dayStartMs,
    logs,
    events = [],
    ledgerEntries,
    conquistaMin = 0,
    entropiaMin = 0,
    vacioMin = 0,
  } = params;

  const espectroBloques = mergeEspectroWithEvents(
    computeEspectroBloques(vehicles, dayStartMs),
    events,
    dayStartMs
  );
  const profundidadMaxima = maxBanda(
    profundidadFromEvents(events),
    profundidadFromEspectro(espectroBloques)
  );

  const cerradosManual = segmentos.filter(s => s.estado === "cerrado_manual").length;
  const entropiaSeg = segmentos.filter(s => s.estado === "entropia" || s.puertaSistema).length;
  const totalSeg = segmentos.length;

  const jornadaMin = conquistaMin + entropiaMin + vacioMin;
  const ratioConquista =
    jornadaMin > 0 ? conquistaMin / jornadaMin : cerradosManual / Math.max(totalSeg, 1);

  const combustible = computeCombustibleDia(vehicles, dayStartMs, ledgerEntries);
  const {
    bloques: bloquesCompletados,
    desglosadoresCerrados,
    bloquesOtros,
    subsTiempo: subsDesglosadorCumplidos,
    decisiones: decisionesDelDia,
    subsSituacion: decisionesSubsSituacion,
    misionesDirectas: decisionesMisiones,
  } = combustible;

  const disciplina = computeDisciplinaDia({
    segmentos,
    vehicles,
    dayStartMs: getLimaDayStartMs(),
  });

  const resistencia = computeResistenciaDia(vehicles, dayStartMs, events);
  const estadoAtencional = resistencia.fase;

  return {
    id: `snap_${fecha}_${Date.now()}`,
    fecha,
    timestamp: Date.now(),
    schemaVersion: 2,
    segmentos: segmentos.map(s => ({
      id: s.id,
      nombre: s.nombre,
      estado: s.estado,
      psGanados: s.psGanados || 0,
    })),
    espectroBloques,
    profundidadMaxima,
    resistencia,
    estadoAtencional,
    psDesglose: computePsDesglose(logs),
    ratioConquista: Math.round(ratioConquista * 100) / 100,
    segmentosCerradosManual: cerradosManual,
    segmentosEntropia: entropiaSeg,
    segmentosTotales: totalSeg,
    bloquesCompletados,
    desglosadoresCerrados,
    subsDesglosadorCumplidos,
    bloquesDesglosador: desglosadoresCerrados,
    bloquesOtros,
    decisionesDelDia,
    decisionesSubsTiempo: subsDesglosadorCumplidos,
    decisionesSubsSituacion,
    decisionesMisiones,
    disciplina,
  };
}

export type TermodinamicaCompareRow = {
  key: string;
  label: string;
  today: number;
  yesterday: number;
  delta: number;
  betterWhenHigher: boolean;
};

export type TermodinamicaCompareModel = {
  hasYesterday: boolean;
  rows: TermodinamicaCompareRow[];
  profundidadHoy: FocusBandId;
  profundidadAyer: FocusBandId | null;
  headline: string;
  motivacion: string;
};

const PROFUNDIDAD_LABEL: Record<FocusBandId, string> = {
  fluido: "Fluido",
  concentrado: "Concentrado",
  limite: "Al límite",
};

function compareRow(
  key: string,
  label: string,
  today: number,
  yesterday: number,
  betterWhenHigher = true
): TermodinamicaCompareRow {
  return { key, label, today, yesterday, delta: today - yesterday, betterWhenHigher };
}

/** Comparativa en vivo: hoy (parcial) vs snapshot de ayer sellado. */
export function computeTermodinamicaCompare(
  yesterday: PlanillaDailySnapshot | null,
  today: PlanillaDailySnapshot
): TermodinamicaCompareModel {
  const yEsp = yesterday?.espectroBloques;
  const tEsp = today.espectroBloques;

  const subsHoy = decisionesFromSnapshot(today);
  const subsAyer = yesterday ? decisionesFromSnapshot(yesterday) : 0;

  const rows: TermodinamicaCompareRow[] = [
    compareRow("limite", "Subs al límite", tEsp.limite, yEsp?.limite ?? 0),
    compareRow("concentrado", "Subs concentrados", tEsp.concentrado, yEsp?.concentrado ?? 0),
    compareRow("bloques", "Bloques completados", today.bloquesCompletados, yesterday?.bloquesCompletados ?? 0),
    compareRow("decisiones", "Decisiones ejecutadas", subsHoy, subsAyer),
    compareRow(
      "segmentos",
      "Segmentos cierre manual",
      today.segmentosCerradosManual,
      yesterday?.segmentosCerradosManual ?? 0
    ),
    compareRow(
      "descansos",
      "Descansos cuerpo",
      tEsp.descansosCuerpo,
      yEsp?.descansosCuerpo ?? 0,
      false
    ),
  ];

  const profundidadHoy = today.profundidadMaxima;
  const profundidadAyer = yesterday?.profundidadMaxima ?? null;
  const rankHoy = BANDA_RANK[profundidadHoy];
  const rankAyer = profundidadAyer ? BANDA_RANK[profundidadAyer] : 0;

  const wins = rows.filter(r => r.betterWhenHigher && r.delta > 0).length;
  const hasYesterday = yesterday != null;

  let headline: string;
  if (!hasYesterday) {
    const bloqueLabel = `${today.bloquesCompletados} bloque${today.bloquesCompletados !== 1 ? "s" : ""}`;
    const subsLabel =
      subsHoy > 0 ? ` · ${subsHoy} decisión${subsHoy !== 1 ? "es" : ""}` : "";
    headline = `Hoy: ${PROFUNDIDAD_LABEL[profundidadHoy]} · ${bloqueLabel}${subsLabel}`;
  } else if (rankHoy > rankAyer) {
    headline = `Profundidad superior a ayer (${PROFUNDIDAD_LABEL[profundidadHoy]})`;
  } else if (wins >= 2) {
    headline = `Vas por encima de ayer en ${wins} medidas clave`;
  } else if (wins === 1) {
    const win = rows.find(r => r.betterWhenHigher && r.delta > 0);
    headline = win ? `+${win.delta} ${win.label.toLowerCase()} vs ayer` : "En carrera con ayer";
  } else if (today.bloquesCompletados === yesterday!.bloquesCompletados && rankHoy === rankAyer) {
    headline = "Mismo ritmo estructural que ayer";
  } else {
    headline = "Ayer fue más intenso — el cuerpo también cuenta";
  }

  let motivacion: string;
  if (!hasYesterday) {
    motivacion = "Sella la jornada hoy para que mañana tengas referencia.";
  } else if (rankHoy >= rankAyer && today.segmentosCerradosManual >= (yesterday?.segmentosCerradosManual ?? 0)) {
    motivacion = "Tu cartografía panorámica y tu espectro van al compás.";
  } else if (tEsp.descansosCuerpo > (yEsp?.descansosCuerpo ?? 0)) {
    motivacion = "Escuchaste al cuerpo — eso también es soberanía.";
  } else if (wins > 0) {
    motivacion = "Compites contigo de ayer, bloque a bloque. Sigue.";
  } else {
    motivacion = "Un día más ligero no borra el progreso. Mañana otra puerta.";
  }

  return {
    hasYesterday,
    rows,
    profundidadHoy,
    profundidadAyer,
    headline,
    motivacion,
  };
}

function resistenciaFromSnapshot(snap: PlanillaDailySnapshot): ResistenciaDia | null {
  if (snap.resistencia && snap.schemaVersion === 2) return snap.resistencia;
  return null;
}

export type TermodinamicaCompareV2Model = TermodinamicaCompareModel & {
  estadoHoy: FaseAtencional;
  estadoAyer: FaseAtencional | null;
  indiceHoy: number;
  indiceAyer: number | null;
};

/** Alias usado por planeacionHeavyMetricsCompute y consumidores de métricas. */
export type TermodinamicaCompareV2 = TermodinamicaCompareV2Model;

/** Comparativa v2: resistencia objetiva (estructura + calibración + persistencia). */
export function computeTermodinamicaCompareV2(
  yesterday: PlanillaDailySnapshot | null,
  today: PlanillaDailySnapshot
): TermodinamicaCompareV2Model {
  const rHoy = today.resistencia ?? resistenciaFromSnapshot(today);
  const rAyer = yesterday ? (yesterday.resistencia ?? resistenciaFromSnapshot(yesterday)) : null;

  const indiceHoy = rHoy?.indiceResistencia ?? 0;
  const indiceAyer = rAyer?.indiceResistencia ?? null;
  const estadoHoy = today.estadoAtencional ?? rHoy?.fase ?? "entrenamiento";
  const estadoAyer = yesterday?.estadoAtencional ?? rAyer?.fase ?? null;

  const rows: TermodinamicaCompareRow[] = [
    compareRow(
      "estructura_completa",
      "Estructura completa (3 tramos)",
      rHoy?.subsEstructuraCompleta ?? 0,
      rAyer?.subsEstructuraCompleta ?? 0
    ),
    compareRow(
      "friccion",
      "Calibración (conc/límite)",
      rHoy?.friccionBloques ?? 0,
      rAyer?.friccionBloques ?? 0
    ),
    compareRow(
      "persistencia",
      "Persistencia (seg. B/C)",
      rHoy?.subsPersistenciaBC ?? 0,
      rAyer?.subsPersistenciaBC ?? 0
    ),
    compareRow(
      "bloques",
      "Bloques completados",
      today.bloquesCompletados,
      yesterday?.bloquesCompletados ?? 0
    ),
    compareRow(
      "decisiones",
      "Decisiones ejecutadas",
      decisionesFromSnapshot(today),
      yesterday ? decisionesFromSnapshot(yesterday) : 0
    ),
    compareRow(
      "solo_fluido",
      "Solo fluido (piloto automático)",
      rHoy?.bloquesDominioFluido ?? 0,
      rAyer?.bloquesDominioFluido ?? 0,
      false
    ),
    compareRow(
      "ganancia",
      "Subs con ganancia de tiempo",
      rHoy?.subsConGanancia ?? 0,
      rAyer?.subsConGanancia ?? 0
    ),
    compareRow(
      "espectro_fluido",
      "Subs en fluido",
      today.espectroBloques?.fluido ?? 0,
      yesterday?.espectroBloques?.fluido ?? 0
    ),
    compareRow(
      "espectro_concentrado",
      "Subs en concentrado",
      today.espectroBloques?.concentrado ?? 0,
      yesterday?.espectroBloques?.concentrado ?? 0
    ),
    compareRow(
      "espectro_limite",
      "Subs en límite",
      today.espectroBloques?.limite ?? 0,
      yesterday?.espectroBloques?.limite ?? 0
    ),
  ];

  const hasYesterday = yesterday != null;
  let headline: string;
  let motivacion: string;

  if (!hasYesterday) {
    headline = `${FASE_ATENCIONAL_LABEL[estadoHoy]} · índice ${indiceHoy}`;
    motivacion = "Sella la jornada hoy para comparar resistencia mañana.";
  } else if (indiceAyer != null && indiceHoy - indiceAyer >= 12) {
    headline = `+${indiceHoy - indiceAyer} puntos de resistencia vs ayer`;
    motivacion =
      estadoHoy === "dominio_fluido"
        ? "Sostienes más tiempo los 3 tramos — la estructura se vuelve hábito."
        : "Más calibración objetiva; la declaración consciente sigue en el espejo de cada sub.";
  } else {
    const estRow = rows.find(r => r.key === "estructura_completa");
    const frRow = rows.find(r => r.key === "friccion");
    if (estRow && estRow.delta > 0 && frRow && frRow.delta >= 0) {
      headline = "Más estructura completa y calibración que ayer";
      motivacion = FASE_ATENCIONAL_LABEL[estadoHoy];
    } else if (indiceHoy < (indiceAyer ?? 0)) {
      headline = "Día de menos resistencia estructural — normal en la curva";
      motivacion = "La resistencia mide tramos sostenidos, no velocidad en piloto automático.";
    } else {
      headline = `Estado: ${FASE_ATENCIONAL_LABEL[estadoHoy]}`;
      motivacion = "Índice calculado por el contador; tu declaración al cerrar subs alimenta el espejo.";
    }
  }

  const legacy = computeTermodinamicaCompare(yesterday, today);

  return {
    ...legacy,
    rows,
    headline,
    motivacion,
    profundidadHoy: estadoHoy as unknown as FocusBandId,
    profundidadAyer: estadoAyer as unknown as FocusBandId | null,
    estadoHoy,
    estadoAyer,
    indiceHoy,
    indiceAyer,
  };
}

export interface CartografiaDia {
  fecha: string;
  label: string;
  ratioConquista: number;
  cerradosManual: number;
  entropia: number;
  psPanoramico: number;
}

export interface EspectroDia {
  fecha: string;
  label: string;
  fluido: number;
  concentrado: number;
  limite: number;
  descansos: number;
  profundidadMaxima: FocusBandId;
}

export function aggregateCartografiaSemanal(
  snapshots: PlanillaDailySnapshot[]
): CartografiaDia[] {
  return snapshots.map(s => ({
    fecha: s.fecha,
    label: s.fecha.slice(5),
    ratioConquista: Math.round(s.ratioConquista * 100),
    cerradosManual: s.segmentosCerradosManual,
    entropia: s.segmentosEntropia,
    psPanoramico: s.psDesglose.panoramico,
  }));
}

export function aggregateEspectroSemanal(snapshots: PlanillaDailySnapshot[]): EspectroDia[] {
  return snapshots.map(s => ({
    fecha: s.fecha,
    label: s.fecha.slice(5),
    fluido: s.espectroBloques.fluido,
    concentrado: s.espectroBloques.concentrado,
    limite: s.espectroBloques.limite,
    descansos: s.espectroBloques.descansosCuerpo,
    profundidadMaxima: s.profundidadMaxima,
  }));
}

export function psEspectroBloque(sub: SubVehiculo): number {
  if (!sub.rutaEnfoque?.activa || !sub.rutaDeclarada?.length) return 0;
  return computeRutaEnfoquePS(sub.rutaDeclarada as RutaBandaId[], sub.rutaEnfoque.cruzado);
}

function getLocalSnapshots(userId: string): PlanillaDailySnapshot[] {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_LOCAL_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as PlanillaDailySnapshot[];
  } catch {
    return [];
  }
}

function saveLocalSnapshots(userId: string, snapshots: PlanillaDailySnapshot[]): boolean {
  try {
    localStorage.setItem(`${SNAPSHOT_LOCAL_KEY}_${userId}`, JSON.stringify(snapshots.slice(-60)));
    return true;
  } catch (error) {
    console.error("[saveLocalSnapshots] Error localStorage:", error);
    return false;
  }
}

export async function savePlanillaDailySnapshot(
  userId: string,
  snapshot: PlanillaDailySnapshot
): Promise<{ localSaved: boolean }> {
  const locals = getLocalSnapshots(userId).filter(s => s.fecha !== snapshot.fecha);
  locals.push(snapshot);
  locals.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const localSaved = saveLocalSnapshots(userId, locals);

  void import("./firebase").then(async ({ db, getPrivatePath, isFirebaseConfigured }) => {
    if (!isFirebaseConfigured() || !db) return;
    try {
      const { addDoc, collection, getDocs, query, where, deleteDoc } = await import("firebase/firestore");
      const path = getPrivatePath(userId, "dailySnapshots");
      const q = query(collection(db, path), where("fecha", "==", snapshot.fecha));
      const existing = await getDocs(q);
      for (const docSnap of existing.docs) {
        await deleteDoc(docSnap.ref);
      }
      await addDoc(collection(db, path), snapshot);
    } catch (error) {
      console.error("[savePlanillaDailySnapshot] Error Firebase:", error);
    }
  });

  return { localSaved };
}

export async function getPlanillaDailySnapshots(
  userId: string,
  days: number
): Promise<PlanillaDailySnapshot[]> {
  const { getLimaDateString } = await import("./persistence");
  const end = getLimaDateString();
  const startMs = Date.now() - (days - 1) * 24 * 60 * 60 * 1000;
  const start = getLimaDateString(startMs);
  const inRange = (f: string) => f >= start && f <= end;

  const byFecha = new Map<string, PlanillaDailySnapshot>();
  for (const s of getLocalSnapshots(userId)) {
    if (inRange(s.fecha)) byFecha.set(s.fecha, s);
  }

  const { db, getPrivatePath, isFirebaseConfigured } = await import("./firebase");
  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const path = getPrivatePath(userId, "dailySnapshots");
      const q = query(
        collection(db, path),
        where("fecha", ">=", start),
        where("fecha", "<=", end)
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const s = docSnap.data() as PlanillaDailySnapshot;
        if (!byFecha.has(s.fecha)) byFecha.set(s.fecha, { ...s, id: s.id || docSnap.id });
      }
    } catch {
      // local only
    }
  }

  return Array.from(byFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function getPlanillaDailySnapshotForDate(
  userId: string,
  fecha: string
): Promise<PlanillaDailySnapshot | null> {
  const snaps = await getPlanillaDailySnapshots(userId, 21);
  return snaps.find(s => s.fecha === fecha) ?? null;
}
