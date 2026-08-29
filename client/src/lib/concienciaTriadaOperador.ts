/**
 * Conciencia del operador (Jornada) — triada sobre lo planificado.
 * Inconsciente · Presencia · Dirección (Norte).
 * 100% = minutos únicos del plan del día (tiempo de línea).
 * Inconsciente = huecos de cobertura + plan que aún no ocurre.
 * Interrupt cubre la línea; no multiplica. Paralelo meritorio es otro reloj.
 * No usa el pulso de cobertura ni el “vehículo abierto ahora”.
 * Persistencia local ligera; prohibido en ms0 — solo sombra / idle.
 */
import { resolveDestinoCierre, feedsProyectoHub } from "./destinoCierre";
import { safeSetItem } from "./storageHygiene";
import { getJournalDateString, segmentTimeToMinutes } from "./segmentTime";
import {
  computeTriadaLineaOccupancy,
  isTriadaAdvancingVehicle,
  skipsTriadaCoverage,
} from "./concienciaTriadaLinea";
import type { DestinoCierre } from "./destinoCierre";
import type { Vehicle } from "./persistence";

export {
  computeTriadaLineaOccupancy,
  isTriadaAdvancingVehicle,
  skipsTriadaCoverage,
  type TriadaLineaOccupancy,
} from "./concienciaTriadaLinea";

export type TriadaEstadoId = "inconsciente" | "presencia" | "direccion";

export const TRIADA_META: Record<
  TriadaEstadoId,
  { label: string; hint: string; color: string }
> = {
  inconsciente: {
    label: "Inconsciente",
    hint: "Huecos: plan ya ocurrido sin vehículo. Lo que aún no ocurre no es deuda — está no conquistado.",
    color: "#64748B",
  },
  presencia: {
    label: "Presencia",
    hint: "Plan cubierto sin Norte — estuviste, no dirigiste.",
    color: "#34D399",
  },
  direccion: {
    label: "Dirección",
    hint: "Plan cubierto con Norte: oleada + foco, no un clic de ego.",
    color: "#D4AF37",
  },
};

const LEDGER_KEY = "sistemicar_conciencia_triada_v1";
const SERIES_KEY = "sistemicar_conciencia_triada_series_v2";
const MAX_SERIES_DAYS = 45;
const VEHICLE_RING = 64;

export interface TriadaDayLedger {
  fecha: string;
  minutosPresencia: number;
  minutosDireccion: number;
  vehicleIds: string[];
  updatedAt: number;
}

export interface TriadaDaySnapshot {
  fecha: string;
  label: string;
  pctInconsciente: number;
  pctPresencia: number;
  pctDireccion: number;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosPlan: number;
  hasPlanificacion: boolean;
  updatedAt: number;
}

export interface ConcienciaTriadaModel {
  hasPlanificacion: boolean;
  fecha: string;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  /** 100% — minutos únicos asignados en el plan del día. */
  minutosPlan: number;
  pctInconsciente: number;
  pctPresencia: number;
  pctDireccion: number;
  etapaDominante: TriadaEstadoId | null;
  headline: string;
  /** Plan ya ocurrido sin vehículo (línea). */
  minutosHueco: number;
  /** Plan que todavía no ocurre — no se puede convertir aún. */
  minutosPlanFuturo: number;
  /** Hilos que avanzan de verdad (el padre en interrupt no cuenta). */
  hilosAvanzando: number;
  /** ≥2 hilos independientes avanzando. El interrupt no califica. */
  paraleloMeritorio: boolean;
  /** Enfoque cubre la línea con el padre congelado. */
  interruptCubreLinea: boolean;
  /** Extra apilado mientras el paralelo meritorio está en juego. */
  minutosParaleloEnJuego: number;
  /** Extra de hilos que ya cerraron cumplido y se solaparon de verdad. */
  minutosParaleloGanado: number;
}

export const EMPTY_TRIADA_MODEL: ConcienciaTriadaModel = {
  hasPlanificacion: false,
  fecha: "",
  minutosInconsciente: 0,
  minutosPresencia: 0,
  minutosDireccion: 0,
  minutosPlan: 0,
  pctInconsciente: 0,
  pctPresencia: 0,
  pctDireccion: 0,
  etapaDominante: null,
  headline: "Sin planificación — no hay conciencia que medir.",
  minutosHueco: 0,
  minutosPlanFuturo: 0,
  hilosAvanzando: 0,
  paraleloMeritorio: false,
  interruptCubreLinea: false,
  minutosParaleloEnJuego: 0,
  minutosParaleloGanado: 0,
};

/** True si hay un hilo consciente avanzando (único caso que exige poll lento). */
export function hasTriadaActiveVehicle(vehicles: Vehicle[]): boolean {
  for (let i = 0; i < vehicles.length; i++) {
    if (isTriadaAdvancingVehicle(vehicles[i], vehicles)) return true;
  }
  return false;
}

/**
 * Firma barata para el hook idle.
 * O(n) numérico — no concatena la flota ni suma el plan en el render.
 */
export function buildTriadaInputSig(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  vehicles: Vehicle[]
): string {
  let segPart = "";
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (i) segPart += "|";
    segPart += `${s?.horaInicio ?? ""}:${s?.horaFin ?? ""}`;
  }
  let active = 0;
  let destMix = 0;
  let aperturaMix = 0;
  let closedN = 0;
  let closedMix = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (skipsTriadaCoverage(v)) continue;
    if (v.status === "activo") {
      active += 1;
      destMix = (destMix * 33 + (v.destinoCierre === "peldano" ? 3 : 1)) | 0;
      aperturaMix ^= v.aperturaAt ?? 0;
      destMix = (destMix * 17 + (v.interrupcionActiva ? 5 : 0)) | 0;
      aperturaMix ^= v.desglosadorPausa?.pausadoAt ?? 0;
      aperturaMix ^= v.situacionNestedPause?.pausedAt ?? 0;
      destMix = (destMix * 19 + (v.vehiculoPadreDesglosadorId ? 7 : 1)) | 0;
    } else {
      closedN += 1;
      const dur = typeof v.duracionFinal === "number" ? v.duracionFinal : 0;
      closedMix = (closedMix * 33 + (dur | 0) + (v.destinoCierre === "peldano" ? 17 : 1)) | 0;
    }
  }
  return `${segPart}::${vehicles.length}:${active}:${destMix}:${aperturaMix}:${closedN}:${closedMix}`;
}

export function triadaModelEquals(a: ConcienciaTriadaModel, b: ConcienciaTriadaModel): boolean {
  return (
    a.fecha === b.fecha &&
    a.hasPlanificacion === b.hasPlanificacion &&
    a.pctInconsciente === b.pctInconsciente &&
    a.pctPresencia === b.pctPresencia &&
    a.pctDireccion === b.pctDireccion &&
    a.minutosInconsciente === b.minutosInconsciente &&
    a.minutosPresencia === b.minutosPresencia &&
    a.minutosDireccion === b.minutosDireccion &&
    a.minutosPlan === b.minutosPlan &&
    a.minutosHueco === b.minutosHueco &&
    a.minutosPlanFuturo === b.minutosPlanFuturo &&
    a.hilosAvanzando === b.hilosAvanzando &&
    a.paraleloMeritorio === b.paraleloMeritorio &&
    a.interruptCubreLinea === b.interruptCubreLinea &&
    a.minutosParaleloEnJuego === b.minutosParaleloEnJuego &&
    a.minutosParaleloGanado === b.minutosParaleloGanado
  );
}

function vehicleJournalFecha(vehicle: Vehicle): string | null {
  const cierre = vehicle.cierreAt;
  if (typeof cierre === "number" && Number.isFinite(cierre) && cierre > 0) {
    return getJournalDateString(cierre);
  }
  const completed = vehicle.completedAt;
  if (completed instanceof Date) {
    const ms = completed.getTime();
    if (Number.isFinite(ms) && ms > 0) return getJournalDateString(ms);
  } else if (typeof completed === "number" && Number.isFinite(completed) && completed > 0) {
    return getJournalDateString(completed);
  }
  const apertura = vehicle.aperturaAt;
  if (typeof apertura === "number" && Number.isFinite(apertura) && apertura > 0) {
    return getJournalDateString(apertura);
  }
  return null;
}

/** Minutos únicos del plan (ventanas fusionadas por solape). Ese total es el 100%. */
export function sumMinutosPlanDelDia(
  segmentos: { horaInicio?: string; horaFin?: string }[]
): number {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return 0;
  const windows: { start: number; end: number }[] = [];
  for (const s of segmentos) {
    if (!s) continue;
    const ini = segmentTimeToMinutes(s.horaInicio || "");
    const fin = segmentTimeToMinutes(s.horaFin || "");
    if (!Number.isFinite(ini) || !Number.isFinite(fin)) continue;
    const end = fin >= ini ? fin : fin + 1440;
    if (end > ini) windows.push({ start: ini, end });
  }
  if (windows.length === 0) return 0;
  windows.sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = windows[0].start;
  let curEnd = windows[0].end;
  for (let i = 1; i < windows.length; i++) {
    const w = windows[i];
    if (w.start <= curEnd) {
      curEnd = Math.max(curEnd, w.end);
    } else {
      total += curEnd - curStart;
      curStart = w.start;
      curEnd = w.end;
    }
  }
  total += curEnd - curStart;
  return total;
}

/** Duración de cierre en minutos (vehículo). */
export function resolveDuracionMinCierre(
  vehicle: {
    duracionFinal?: number;
    aperturaAt?: number;
    cierreAt?: number;
  },
  optsDuracionMin?: number
): number {
  if (typeof optsDuracionMin === "number" && Number.isFinite(optsDuracionMin) && optsDuracionMin > 0) {
    return Math.max(1, Math.round(optsDuracionMin));
  }
  if (typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
    return Math.max(1, Math.round(vehicle.duracionFinal));
  }
  const apertura = vehicle.aperturaAt;
  const cierre = vehicle.cierreAt;
  if (typeof apertura === "number" && typeof cierre === "number" && cierre > apertura) {
    return Math.max(1, Math.round((cierre - apertura) / 60_000));
  }
  return 0;
}

function pushVehicleId(prev: string[] | undefined, vehicleId: string): { next: string[]; isNew: boolean } {
  const id = vehicleId.trim();
  if (!id) return { next: prev ?? [], isNew: false };
  const cur = prev ?? [];
  if (cur.includes(id)) return { next: cur, isNew: false };
  const next = [...cur, id];
  if (next.length > VEHICLE_RING) {
    return { next: next.slice(next.length - VEHICLE_RING), isNew: true };
  }
  return { next, isNew: true };
}

function ledgerStorageKey(userId: string): string {
  return `${LEDGER_KEY}_${userId}`;
}

function seriesStorageKey(userId: string): string {
  return `${SERIES_KEY}_${userId}`;
}

function readAllLedgers(userId: string): Record<string, TriadaDayLedger> {
  try {
    const raw = localStorage.getItem(ledgerStorageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TriadaDayLedger>;
  } catch {
    return {};
  }
}

function writeAllLedgers(userId: string, map: Record<string, TriadaDayLedger>): void {
  safeSetItem(ledgerStorageKey(userId), JSON.stringify(map));
}

export function getTriadaDayLedger(userId: string, fecha?: string): TriadaDayLedger | null {
  const day = fecha ?? getJournalDateString();
  return readAllLedgers(userId)[day] ?? null;
}

/**
 * Acumula minutos de un cierre consciente en el ledger del operador.
 * Idempotente por vehicleId. No escribe Hub.
 */
export function registrarCierreConcienciaTriada(
  userId: string,
  act: {
    vehicleId: string;
    minutos: number;
    destino?: DestinoCierre | null;
    fecha?: string;
    at?: number;
  }
): TriadaDayLedger | null {
  if (!userId) return null;
  const fecha = act.fecha ?? getJournalDateString();
  const minutos = Math.max(0, Math.round(act.minutos));
  if (minutos <= 0 && !act.vehicleId) return getTriadaDayLedger(userId, fecha);

  const map = readAllLedgers(userId);
  const prev = map[fecha] ?? {
    fecha,
    minutosPresencia: 0,
    minutosDireccion: 0,
    vehicleIds: [],
    updatedAt: 0,
  };
  const { next, isNew } = pushVehicleId(prev.vehicleIds, act.vehicleId);
  if (!isNew) return prev;

  const destino = resolveDestinoCierre(act.destino);
  const isDir = feedsProyectoHub(destino);
  const updated: TriadaDayLedger = {
    fecha,
    minutosPresencia: prev.minutosPresencia + (isDir ? 0 : minutos),
    minutosDireccion: prev.minutosDireccion + (isDir ? minutos : 0),
    vehicleIds: next,
    updatedAt: act.at ?? Date.now(),
  };
  map[fecha] = updated;
  // Podar días viejos del ledger (mantener ~60).
  const fechas = Object.keys(map).sort();
  if (fechas.length > 60) {
    for (const f of fechas.slice(0, fechas.length - 60)) delete map[f];
  }
  writeAllLedgers(userId, map);
  return updated;
}

/** Minutos de hilos que avanzan de verdad (padre en interrupt no suma hasta now). */
export function accumulateActiveTriadaMinutos(
  vehicles: Vehicle[],
  now = Date.now()
): { minutosPresencia: number; minutosDireccion: number } {
  let minutosPresencia = 0;
  let minutosDireccion = 0;
  for (const v of vehicles) {
    if (!isTriadaAdvancingVehicle(v, vehicles)) continue;
    const apertura = v.aperturaAt ?? now;
    const elapsed = Math.max(0, (now - apertura) / 60_000);
    if (elapsed < 0.05) continue;
    const destino = resolveDestinoCierre(v.destinoCierre);
    if (feedsProyectoHub(destino)) minutosDireccion += elapsed;
    else minutosPresencia += elapsed;
  }
  return {
    minutosPresencia: Math.round(minutosPresencia * 10) / 10,
    minutosDireccion: Math.round(minutosDireccion * 10) / 10,
  };
}

export type TriadaClosedItem = {
  vehicleId: string;
  minutos: number;
  isDir: boolean;
};

/** Cierres conscientes del día (vehículos cumplidos/archivados de esa fecha). */
export function accumulateClosedTriadaMinutos(
  vehicles: Vehicle[],
  fecha: string
): { minutosPresencia: number; minutosDireccion: number; items: TriadaClosedItem[] } {
  const items: TriadaClosedItem[] = [];
  let minutosPresencia = 0;
  let minutosDireccion = 0;
  for (const v of vehicles) {
    if (skipsTriadaCoverage(v) || v.status === "activo") continue;
    if (!v.cierreAt && !v.duracionFinal && !v.aperturaAt) continue;
    const id = (v.id ?? "").trim();
    if (!id) continue;
    if (vehicleJournalFecha(v) !== fecha) continue;
    const minutos = resolveDuracionMinCierre(v);
    if (minutos <= 0) continue;
    const isDir = feedsProyectoHub(resolveDestinoCierre(v.destinoCierre));
    items.push({ vehicleId: id, minutos, isDir });
    if (isDir) minutosDireccion += minutos;
    else minutosPresencia += minutos;
  }
  return {
    minutosPresencia: Math.round(minutosPresencia * 10) / 10,
    minutosDireccion: Math.round(minutosDireccion * 10) / 10,
    items,
  };
}

/**
 * Ledger (cierres ya registrados) + vehículos del día que el ledger aún no vio.
 * No cuenta activos — esos van aparte.
 */
export function resolveTriadaClosedMinutos(
  ledger: TriadaDayLedger | null,
  vehicles: Vehicle[],
  fecha: string
): { minutosPresencia: number; minutosDireccion: number } {
  const closed = accumulateClosedTriadaMinutos(vehicles, fecha);
  const known = new Set(ledger?.vehicleIds ?? []);
  let minutosPresencia = ledger?.minutosPresencia ?? 0;
  let minutosDireccion = ledger?.minutosDireccion ?? 0;
  for (const item of closed.items) {
    if (known.has(item.vehicleId)) continue;
    if (item.isDir) minutosDireccion += item.minutos;
    else minutosPresencia += item.minutos;
  }
  return {
    minutosPresencia: Math.round(Math.max(0, minutosPresencia) * 10) / 10,
    minutosDireccion: Math.round(Math.max(0, minutosDireccion) * 10) / 10,
  };
}

/**
 * Reparte el 100% del plan. Si presencia+dirección superan el plan,
 * se conserva Dirección (el estado que se quiere crecer) y se recorta Presencia.
 */
export function allocateTriadaAgainstPlan(params: {
  minutosPlan: number;
  minutosPresencia: number;
  minutosDireccion: number;
}): {
  minutosPlan: number;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
} {
  const minutosPlan = Math.max(0, params.minutosPlan);
  let minutosDireccion = Math.max(0, params.minutosDireccion);
  let minutosPresencia = Math.max(0, params.minutosPresencia);
  if (minutosPlan <= 0) {
    return { minutosPlan: 0, minutosInconsciente: 0, minutosPresencia: 0, minutosDireccion: 0 };
  }
  if (minutosDireccion >= minutosPlan) {
    minutosDireccion = minutosPlan;
    minutosPresencia = 0;
  } else if (minutosDireccion + minutosPresencia > minutosPlan) {
    minutosPresencia = minutosPlan - minutosDireccion;
  }
  const minutosInconsciente = Math.max(0, minutosPlan - minutosPresencia - minutosDireccion);
  return {
    minutosPlan,
    minutosInconsciente: Math.round(minutosInconsciente * 10) / 10,
    minutosPresencia: Math.round(minutosPresencia * 10) / 10,
    minutosDireccion: Math.round(minutosDireccion * 10) / 10,
  };
}

function roundPctTriplet(
  a: number,
  b: number,
  c: number
): { pctInconsciente: number; pctPresencia: number; pctDireccion: number } {
  const total = a + b + c;
  if (total <= 0) {
    return { pctInconsciente: 0, pctPresencia: 0, pctDireccion: 0 };
  }
  let pctInconsciente = Math.round((a / total) * 100);
  let pctPresencia = Math.round((b / total) * 100);
  let pctDireccion = Math.round((c / total) * 100);
  const drift = 100 - (pctInconsciente + pctPresencia + pctDireccion);
  if (drift !== 0) {
    // Ajuste al mayor.
    if (a >= b && a >= c) pctInconsciente += drift;
    else if (b >= c) pctPresencia += drift;
    else pctDireccion += drift;
  }
  return { pctInconsciente, pctPresencia, pctDireccion };
}

function dominante(
  i: number,
  p: number,
  d: number
): TriadaEstadoId | null {
  if (i + p + d <= 0) return null;
  if (d >= p && d >= i) return "direccion";
  if (p >= i) return "presencia";
  return "inconsciente";
}

/**
 * Modelo vivo: 100% = plan del día (línea). Presencia/dirección = minutos únicos ocupados.
 * Inconsciente = huecos + futuro. Llamar solo en idle / sombra.
 */
export function buildConcienciaTriadaModel(params: {
  fecha?: string;
  minutosPlan: number;
  minutosPresenciaCerrados: number;
  minutosDireccionCerrados: number;
  minutosPresenciaActivos?: number;
  minutosDireccionActivos?: number;
  minutosHueco?: number;
  minutosPlanFuturo?: number;
  hilosAvanzando?: number;
  paraleloMeritorio?: boolean;
  interruptCubreLinea?: boolean;
  minutosParaleloEnJuego?: number;
  minutosParaleloGanado?: number;
}): ConcienciaTriadaModel {
  const fecha = params.fecha ?? getJournalDateString();
  const minutosPlan = Math.max(0, params.minutosPlan);
  if (minutosPlan <= 0) {
    return { ...EMPTY_TRIADA_MODEL, fecha };
  }

  const allocated = allocateTriadaAgainstPlan({
    minutosPlan,
    minutosPresencia:
      Math.max(0, params.minutosPresenciaCerrados) +
      Math.max(0, params.minutosPresenciaActivos ?? 0),
    minutosDireccion:
      Math.max(0, params.minutosDireccionCerrados) +
      Math.max(0, params.minutosDireccionActivos ?? 0),
  });
  let { minutosInconsciente, minutosPresencia, minutosDireccion } = allocated;
  const minutosHueco = Math.max(0, params.minutosHueco ?? 0);
  const minutosPlanFuturo = Math.max(0, params.minutosPlanFuturo ?? 0);
  if (params.minutosHueco != null || params.minutosPlanFuturo != null) {
    minutosInconsciente = Math.round((minutosHueco + minutosPlanFuturo) * 10) / 10;
  }
  const { pctInconsciente, pctPresencia, pctDireccion } = roundPctTriplet(
    minutosInconsciente,
    minutosPresencia,
    minutosDireccion
  );
  const etapaDominante = dominante(minutosInconsciente, minutosPresencia, minutosDireccion);
  const hilosAvanzando = Math.max(0, params.hilosAvanzando ?? 0);
  const paraleloMeritorio = params.paraleloMeritorio === true;
  const interruptCubreLinea = params.interruptCubreLinea === true;
  const minutosParaleloEnJuego = Math.max(0, params.minutosParaleloEnJuego ?? 0);
  const minutosParaleloGanado = Math.max(0, params.minutosParaleloGanado ?? 0);

  let headline: string;
  if (etapaDominante === "direccion") {
    headline = `Dominante Dirección · ${pctDireccion}% del plan.`;
  } else if (etapaDominante === "presencia") {
    headline = `Dominante Presencia · ${pctPresencia}% del plan — cubre, no dirige.`;
  } else if (minutosPlanFuturo > 0 && minutosHueco > 0) {
    headline = `Huecos e inconsciencia: ${pctInconsciente}% del plan. Lo que aún no ocurre no es deuda — está no conquistado.`;
  } else if (minutosPlanFuturo > 0) {
    headline = `${pctInconsciente}% del plan aún no ocurre — no conquistado, no es deuda.`;
  } else {
    headline = `Dominante Inconsciente · ${pctInconsciente}% del plan — horas asignadas sin convertir.`;
  }
  if (paraleloMeritorio) {
    headline += " Paralelo en juego.";
  } else if (interruptCubreLinea) {
    headline += " Interrupt cubre la línea; no multiplica.";
  }

  return {
    hasPlanificacion: true,
    fecha,
    minutosInconsciente,
    minutosPresencia,
    minutosDireccion,
    minutosPlan: Math.round(minutosPlan * 10) / 10,
    pctInconsciente,
    pctPresencia,
    pctDireccion,
    etapaDominante,
    headline,
    minutosHueco,
    minutosPlanFuturo,
    hilosAvanzando,
    paraleloMeritorio,
    interruptCubreLinea,
    minutosParaleloEnJuego,
    minutosParaleloGanado,
  };
}

/** Idle: ocupación de línea desde vehículos + plan. No suma ledger apilado. */
export function buildConcienciaTriadaFromVehicles(params: {
  fecha?: string;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  now?: number;
}): ConcienciaTriadaModel {
  const fecha = params.fecha ?? getJournalDateString(params.now);
  const occ = computeTriadaLineaOccupancy({
    fecha,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    now: params.now,
  });
  return buildConcienciaTriadaModel({
    fecha,
    minutosPlan: occ.minutosPlan,
    minutosPresenciaCerrados: occ.minutosPresencia,
    minutosDireccionCerrados: occ.minutosDireccion,
    minutosHueco: occ.minutosHueco,
    minutosPlanFuturo: occ.minutosPlanFuturo,
    hilosAvanzando: occ.hilosAvanzando,
    paraleloMeritorio: occ.paraleloMeritorio,
    interruptCubreLinea: occ.interruptCubreLinea,
    minutosParaleloEnJuego: occ.minutosParaleloEnJuego,
    minutosParaleloGanado: occ.minutosParaleloGanado,
  });
}

function labelFromFecha(fecha: string): string {
  try {
    const [y, m, d] = fecha.split("-").map(Number);
    if (!y || !m || !d) return fecha.slice(5);
    return new Date(y, m - 1, d).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return fecha.slice(5);
  }
}

export function readTriadaSeriesLocal(userId: string): TriadaDaySnapshot[] {
  try {
    const raw = localStorage.getItem(seriesStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TriadaDaySnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Upsert snapshot del día (idle). Serie ≤ 45 días. Porcentajes sobre el plan. */
export function upsertTriadaDaySnapshot(userId: string, model: ConcienciaTriadaModel): TriadaDaySnapshot[] {
  if (!userId || !model.fecha) return readTriadaSeriesLocal(userId);
  if (!model.hasPlanificacion || model.minutosPlan <= 0) {
    return readTriadaSeriesLocal(userId);
  }
  const snap: TriadaDaySnapshot = {
    fecha: model.fecha,
    label: labelFromFecha(model.fecha),
    pctInconsciente: model.pctInconsciente,
    pctPresencia: model.pctPresencia,
    pctDireccion: model.pctDireccion,
    minutosInconsciente: model.minutosInconsciente,
    minutosPresencia: model.minutosPresencia,
    minutosDireccion: model.minutosDireccion,
    minutosPlan: model.minutosPlan,
    hasPlanificacion: model.hasPlanificacion,
    updatedAt: Date.now(),
  };
  const prev = readTriadaSeriesLocal(userId).filter(s => s.fecha !== snap.fecha);
  prev.push(snap);
  prev.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const next = prev.length > MAX_SERIES_DAYS ? prev.slice(prev.length - MAX_SERIES_DAYS) : prev;
  safeSetItem(seriesStorageKey(userId), JSON.stringify(next));
  return next;
}
