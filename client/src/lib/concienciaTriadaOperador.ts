/**
 * Conciencia del operador (Jornada) — triada sobre lo planificado.
 * Inconsciente (huecos) · Presencia · Dirección (Norte).
 * 100% = suma de los tres dentro del plan del día.
 * Sin segmentos → no hay medida (no hay inconciencia que inventar).
 * Persistencia local ligera; prohibido en ms0 — solo sombra / idle.
 */
import { resolveDestinoCierre, feedsProyectoHub } from "./destinoCierre";
import { safeSetItem } from "./storageHygiene";
import { getJournalDateString } from "./segmentTime";
import type { DestinoCierre } from "./destinoCierre";
import type { Vehicle } from "./persistence";

export type TriadaEstadoId = "inconsciente" | "presencia" | "direccion";

export const TRIADA_META: Record<
  TriadaEstadoId,
  { label: string; hint: string; color: string }
> = {
  inconsciente: {
    label: "Inconsciente",
    hint: "Hueco dentro del plan — sin vehículo consciente.",
    color: "#64748B",
  },
  presencia: {
    label: "Presencia",
    hint: "Cobertura consciente sin dirección de proyecto.",
    color: "#34D399",
  },
  direccion: {
    label: "Dirección",
    hint: "Cobertura con Norte — alimenta el Hub.",
    color: "#D4AF37",
  },
};

const LEDGER_KEY = "sistemicar_conciencia_triada_v1";
const SERIES_KEY = "sistemicar_conciencia_triada_series_v1";
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
  hasPlanificacion: boolean;
  updatedAt: number;
}

export interface ConcienciaTriadaModel {
  hasPlanificacion: boolean;
  fecha: string;
  minutosInconsciente: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosPlanMedible: number;
  pctInconsciente: number;
  pctPresencia: number;
  pctDireccion: number;
  etapaDominante: TriadaEstadoId | null;
  headline: string;
}

export const EMPTY_TRIADA_MODEL: ConcienciaTriadaModel = {
  hasPlanificacion: false,
  fecha: "",
  minutosInconsciente: 0,
  minutosPresencia: 0,
  minutosDireccion: 0,
  minutosPlanMedible: 0,
  pctInconsciente: 0,
  pctPresencia: 0,
  pctDireccion: 0,
  etapaDominante: null,
  headline: "Sin planificación — no hay conciencia que medir.",
};

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

/** Minutos activos aún abiertos (no centinela), clasificados por destino. */
export function accumulateActiveTriadaMinutos(
  vehicles: Vehicle[],
  now = Date.now()
): { minutosPresencia: number; minutosDireccion: number } {
  let minutosPresencia = 0;
  let minutosDireccion = 0;
  for (const v of vehicles) {
    if (!v || v.status !== "activo" || v.autoVerdad) continue;
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
 * Modelo vivo: ledger + activos + entropía del pulso (huecos del plan).
 * Llamar solo en idle / sombra.
 */
export function buildConcienciaTriadaModel(params: {
  fecha?: string;
  hasPlanificacion: boolean;
  /** Huecos dentro del plan (entropía capada). */
  minutosInconsciente: number;
  minutosPresenciaCerrados: number;
  minutosDireccionCerrados: number;
  minutosPresenciaActivos?: number;
  minutosDireccionActivos?: number;
}): ConcienciaTriadaModel {
  const fecha = params.fecha ?? getJournalDateString();
  if (!params.hasPlanificacion) {
    return { ...EMPTY_TRIADA_MODEL, fecha };
  }

  const minutosPresencia =
    Math.max(0, params.minutosPresenciaCerrados) +
    Math.max(0, params.minutosPresenciaActivos ?? 0);
  const minutosDireccion =
    Math.max(0, params.minutosDireccionCerrados) +
    Math.max(0, params.minutosDireccionActivos ?? 0);
  const minutosInconsciente = Math.max(0, params.minutosInconsciente);
  const minutosPlanMedible = minutosPresencia + minutosDireccion + minutosInconsciente;
  const { pctInconsciente, pctPresencia, pctDireccion } = roundPctTriplet(
    minutosInconsciente,
    minutosPresencia,
    minutosDireccion
  );
  const etapaDominante = dominante(minutosInconsciente, minutosPresencia, minutosDireccion);

  let headline: string;
  if (minutosPlanMedible <= 0) {
    headline = "Plan listo — aún sin tramo vivido que medir.";
  } else if (etapaDominante === "direccion") {
    headline = `Dominante Dirección · ${pctDireccion}% del plan medible.`;
  } else if (etapaDominante === "presencia") {
    headline = `Dominante Presencia · ${pctPresencia}% — cobertura sin Norte.`;
  } else {
    headline = `Dominante Inconsciente · ${pctInconsciente}% — huecos en el plan.`;
  }

  return {
    hasPlanificacion: true,
    fecha,
    minutosInconsciente: Math.round(minutosInconsciente * 10) / 10,
    minutosPresencia: Math.round(minutosPresencia * 10) / 10,
    minutosDireccion: Math.round(minutosDireccion * 10) / 10,
    minutosPlanMedible: Math.round(minutosPlanMedible * 10) / 10,
    pctInconsciente,
    pctPresencia,
    pctDireccion,
    etapaDominante,
    headline,
  };
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

/** Upsert snapshot del día (idle). Serie ≤ 45 días. */
export function upsertTriadaDaySnapshot(userId: string, model: ConcienciaTriadaModel): TriadaDaySnapshot[] {
  if (!userId || !model.fecha) return readTriadaSeriesLocal(userId);
  if (!model.hasPlanificacion && model.minutosPlanMedible <= 0) {
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
