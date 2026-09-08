/**
 * Ubicación de la conciencia — veredicto vivo del día.
 *
 * No es un tanque de bioenergía. Cruza puertas, puntualidad, presencia y
 * dirección para nombrar dónde está la atención:
 * - suelo: umbral habitado
 * - vuelo: hay trabajo, las puertas no (conciencia fuera del umbral)
 * - voluntad: presencia extraída, sin Norte
 * - orden: dirección viva (el rumbo tira)
 * - vacio: la energía no fue convocada
 *
 * Prohibido en ms0 / tick 1s. Idle, Métricas, Plan.
 */
import { computeAtencionPanoramicaDia } from "./atencionPanoramicaEngine";
import {
  computeTriadaLineaOccupancy,
  skipsTriadaCoverage,
} from "./concienciaTriadaLinea";
import { vehicleCuentaComoDireccion } from "./destinoCierre";
import type { SegmentoV5, Vehicle } from "./persistence";
import {
  computePuntualidadDia,
  isCumplimientoVehicle,
} from "./puntualidadEngine";
import { safeSetItem } from "./storageHygiene";
import {
  getJournalDateString,
  getJournalDayStartMs,
  getSegmentCalendarDayStartMs,
} from "./segmentTime";

export type UbicacionConcienciaId =
  | "suelo"
  | "vuelo"
  | "voluntad"
  | "orden"
  | "vacio";

export const UBICACION_META: Record<
  UbicacionConcienciaId,
  { label: string; color: string }
> = {
  suelo: { label: "Suelo", color: "#34D399" },
  vuelo: { label: "Vuelo", color: "#F59E0B" },
  voluntad: { label: "Voluntad", color: "#00FFC3" },
  orden: { label: "Orden", color: "#D4AF37" },
  vacio: { label: "Vacío", color: "#64748B" },
};

export const PRESENCIA_NOMBRAR_DIAS = 21;

const TITULO_GENERICO =
  /^(veh[ií]culo|sin t[ií]tulo|tarea|nuevo|untitled|n\/a|-)$/i;

export type UbicacionConcienciaDia = {
  ubicacion: UbicacionConcienciaId;
  headline: string;
  hechos: string[];
  mandato: string;
  puertasAbiertas: number;
  puertasPerdidas: number;
  indiceAtencion: number;
  evaluablesPuerta: number;
  vehiculosEjecucion: number;
  vehiculosPresencia: number;
  vehiculosDireccion: number;
  vehiculosPresenciaNombrada: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosPresenciaExtraida: number;
  puntualidadPct: number | null;
  rachaNombrar: number;
};

export const EMPTY_UBICACION: UbicacionConcienciaDia = {
  ubicacion: "vacio",
  headline: "Sin plan — la energía no fue convocada.",
  hechos: [],
  mandato: "Planta el anillo (mínimo 3 segmentos) o abre la primera puerta.",
  puertasAbiertas: 0,
  puertasPerdidas: 0,
  indiceAtencion: 0,
  evaluablesPuerta: 0,
  vehiculosEjecucion: 0,
  vehiculosPresencia: 0,
  vehiculosDireccion: 0,
  vehiculosPresenciaNombrada: 0,
  minutosPresencia: 0,
  minutosDireccion: 0,
  minutosPresenciaExtraida: 0,
  puntualidadPct: null,
  rachaNombrar: 0,
};

export function isTituloPresenciaNombrada(titulo: string | undefined | null): boolean {
  const t = (titulo ?? "").trim();
  if (t.length < 3) return false;
  return !TITULO_GENERICO.test(t);
}

export function vehicleEsPresenciaNombrada(v: Vehicle): boolean {
  if (skipsTriadaCoverage(v)) return false;
  if (vehicleCuentaComoDireccion(v)) return false;
  return isTituloPresenciaNombrada(v.titulo);
}

export function shiftJournalFecha(fecha: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return fecha;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + deltaDays);
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * Racha de días con presencia nombrada.
 * El día en curso no rompe: si hoy aún no hay nombre, se cuenta desde ayer.
 */
export function computeRachaNombrar(
  fechas: Iterable<string>,
  hoy: string
): number {
  const set = new Set<string>();
  for (const f of fechas) {
    if (f) set.add(f);
  }
  let cursor = set.has(hoy) ? hoy : shiftJournalFecha(hoy, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shiftJournalFecha(cursor, -1);
  }
  return n;
}

function formatMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

function mandatoVoluntad(racha: number, nombradasHoy: number): string {
  if (nombradasHoy <= 0) {
    return "Nombra el próximo vehículo de presencia. Ese nombre es el piloto (21 días).";
  }
  if (racha >= PRESENCIA_NOMBRAR_DIAS) {
    return "El piloto ya tiene pista. El rumbo pesa menos.";
  }
  const dia = Math.max(1, racha);
  return `Día ${dia} de ${PRESENCIA_NOMBRAR_DIAS}: al nombrar presencia, la conciencia aprende a pilotar destino.`;
}

export function computeUbicacionConcienciaDia(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  nowMs?: number;
  rachaNombrar?: number;
  fechasNombrar?: Iterable<string>;
}): UbicacionConcienciaDia {
  const nowMs = params.nowMs ?? Date.now();
  const fecha = getJournalDateString(nowMs);
  const dayStartMs = getSegmentCalendarDayStartMs(nowMs);
  const journalDayStartMs = getJournalDayStartMs(nowMs);
  const segmentos = params.segmentos ?? [];
  const vehicles = params.vehicles ?? [];

  const rachaNombrar =
    params.rachaNombrar ??
    computeRachaNombrar(params.fechasNombrar ?? [], fecha);

  if (segmentos.length === 0) {
    return { ...EMPTY_UBICACION, rachaNombrar };
  }

  const atencion = computeAtencionPanoramicaDia({
    segmentos,
    nowMs,
    dayStartMs,
  });
  const puntualidad = computePuntualidadDia({
    segmentos,
    vehicles,
    dayStartMs: journalDayStartMs,
    nowMs,
  });
  const occ = computeTriadaLineaOccupancy({
    fecha,
    segmentos,
    vehicles,
    now: nowMs,
  });

  let vehiculosEjecucion = 0;
  let vehiculosPresencia = 0;
  let vehiculosDireccion = 0;
  let vehiculosPresenciaNombrada = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v || skipsTriadaCoverage(v)) continue;
    if (isCumplimientoVehicle(v) && v.aperturaAt != null) vehiculosEjecucion += 1;
    if (vehicleCuentaComoDireccion(v)) {
      vehiculosDireccion += 1;
    } else {
      vehiculosPresencia += 1;
      if (isTituloPresenciaNombrada(v.titulo)) vehiculosPresenciaNombrada += 1;
    }
  }

  const evaluablesPuerta = atencion.segmentos.filter(
    s => s.evaluable || s.puertaPerdida
  ).length;
  const puertasAbiertasManual = atencion.segmentos.filter(
    s => s.puertaAbierta && !s.puertaPerdida
  ).length;

  const hechos: string[] = [];
  hechos.push(
    `${puertasAbiertasManual} puertas abiertas · ${atencion.puertasPerdidas} perdidas · índice ${atencion.indiceAtencion}`
  );
  if (puntualidad.evaluables > 0 && puntualidad.puntualidadPct != null) {
    hechos.push(`Puntualidad ${puntualidad.puntualidadPct}% · ${puntualidad.puntuales} de ${puntualidad.evaluables} segmentos`);
  }
  hechos.push(
    `${vehiculosEjecucion} vehículo${vehiculosEjecucion === 1 ? "" : "s"} de trabajo`
  );
  hechos.push(
    `Presencia ${formatMin(occ.minutosPresencia)} (voluntad) · Dirección ${formatMin(occ.minutosDireccion)} (orden)`
  );
  if (occ.minutosPresenciaExtraida > 0) {
    hechos.push(
      `${formatMin(occ.minutosPresenciaExtraida)} extraídos de Dirección — el solape no mancha rumbo`
    );
  }
  if (vehiculosPresenciaNombrada > 0) {
    hechos.push(
      `${vehiculosPresenciaNombrada} presencia${vehiculosPresenciaNombrada === 1 ? "" : "s"} nombrada${vehiculosPresenciaNombrada === 1 ? "" : "s"}`
    );
  }
  if (rachaNombrar > 0) {
    hechos.push(
      rachaNombrar >= PRESENCIA_NOMBRAR_DIAS
        ? `Racha de nombrar: ${rachaNombrar} días — el piloto tiene pista`
        : `Racha de nombrar: día ${rachaNombrar} de ${PRESENCIA_NOMBRAR_DIAS}`
    );
  }

  const vuelo =
    vehiculosEjecucion >= 1 &&
    evaluablesPuerta >= 1 &&
    (atencion.indiceAtencion <= 40 ||
      (atencion.puertasPerdidas > puertasAbiertasManual &&
        atencion.puertasPerdidas >= 1));

  let ubicacion: UbicacionConcienciaId;
  let headline: string;
  let mandato: string;

  if (vuelo) {
    ubicacion = "vuelo";
    headline =
      "Estás trabajando. La conciencia no está en la puerta: está volando.";
    mandato =
      "Abre la próxima puerta a mano. El trabajo no sustituye el umbral.";
  } else if (
    occ.minutosDireccion > occ.minutosPresencia &&
    vehiculosDireccion >= 1
  ) {
    ubicacion = "orden";
    headline =
      "Hoy operas con energía de orden. El rumbo tira; no hace falta voluntad.";
    mandato =
      "El Norte ya carga el día. Presencia solo si quieres surco de piloto.";
  } else if (vehiculosPresencia >= 1 && occ.minutosPresencia >= occ.minutosDireccion) {
    ubicacion = "voluntad";
    headline =
      "Presencia sin Norte. Estás empujando con voluntad y disciplina.";
    mandato = mandatoVoluntad(rachaNombrar, vehiculosPresenciaNombrada);
  } else if (
    evaluablesPuerta >= 1 &&
    (atencion.indiceAtencion >= 60 ||
      (puertasAbiertasManual >= 1 && atencion.puertasPerdidas === 0))
  ) {
    ubicacion = "suelo";
    headline = "Conciencia en el suelo. El umbral está habitado.";
    mandato = "Sostén la próxima puerta. El suelo es el voltaje de atención.";
  } else if (vehiculosEjecucion === 0 && puertasAbiertasManual === 0) {
    ubicacion = "vacio";
    headline =
      segmentos.length < 3
        ? "La energía no fue convocada. El anillo aún no es ley."
        : "El día aún no declara ubicación. Nadie abrió ni lanzó.";
    mandato =
      segmentos.length < 3
        ? "Planta el anillo (mínimo 3 segmentos) antes del primer vehículo."
        : "Abre la próxima puerta a mano. Ahí se ancla la conciencia.";
  } else {
    ubicacion = "suelo";
    headline = "El día está en curso. Aún no hay veredicto dominante.";
    mandato = "Abre la puerta que toca. El umbral declara el resto.";
  }

  return {
    ubicacion,
    headline,
    hechos: hechos.slice(0, 5),
    mandato,
    puertasAbiertas: puertasAbiertasManual,
    puertasPerdidas: atencion.puertasPerdidas,
    indiceAtencion: atencion.indiceAtencion,
    evaluablesPuerta,
    vehiculosEjecucion,
    vehiculosPresencia,
    vehiculosDireccion,
    vehiculosPresenciaNombrada,
    minutosPresencia: occ.minutosPresencia,
    minutosDireccion: occ.minutosDireccion,
    minutosPresenciaExtraida: occ.minutosPresenciaExtraida,
    puntualidadPct: puntualidad.puntualidadPct,
    rachaNombrar,
  };
}

const NOMBRAR_KEY = (userId: string) => `sistemicar_presencia_nombrar_v1_${userId}`;
const MAX_NOMBRAR_FECHAS = 60;

export function readPresenciaNombrarFechas(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(NOMBRAR_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x));
  } catch {
    return [];
  }
}

/** Idle: si hoy hubo presencia nombrada, sella la fecha. No borra. */
export function upsertPresenciaNombrarFecha(
  userId: string,
  fecha: string,
  nombradaHoy: boolean
): string[] {
  const prev = readPresenciaNombrarFechas(userId);
  if (!userId || !fecha || !nombradaHoy) return prev;
  if (prev.includes(fecha)) return prev;
  const next = [...prev, fecha].sort();
  const trimmed =
    next.length > MAX_NOMBRAR_FECHAS ? next.slice(next.length - MAX_NOMBRAR_FECHAS) : next;
  safeSetItem(NOMBRAR_KEY(userId), JSON.stringify(trimmed));
  return trimmed;
}
