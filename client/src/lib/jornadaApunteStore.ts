import {
  cerrarApunte,
  crearApunte,
  type JornadaApunte,
} from "@shared/jornadaApunte";
import { getJournalDateString } from "@/lib/segmentTime";

const KEY = "sistemicar_jornada_apunte_v1";
const MAX_DAYS = 21;
export const JORNADA_APUNTE_EVENT = "sistemicar-jornada-apunte";

function readAll(): Record<string, JornadaApunte> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, JornadaApunte>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function prune(map: Record<string, JornadaApunte>, keepFecha: string): Record<string, JornadaApunte> {
  const entries = Object.entries(map).sort((a, b) => (b[1].apuntadoAt || 0) - (a[1].apuntadoAt || 0));
  const next: Record<string, JornadaApunte> = {};
  for (const [fecha, apunte] of entries) {
    if (fecha === keepFecha || Object.keys(next).length < MAX_DAYS) {
      next[fecha] = apunte;
    }
  }
  return next;
}

function writeAll(map: Record<string, JornadaApunte>, keepFecha: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prune(map, keepFecha)));
  } catch (e) {
    console.error("[jornadaApunte] persist", e);
  }
  try {
    window.dispatchEvent(new CustomEvent(JORNADA_APUNTE_EVENT, { detail: { fecha: keepFecha } }));
  } catch {
    /* noop */
  }
}

export function readApunteDelDia(fecha?: string, nowMs: number = Date.now()): JornadaApunte | null {
  const day = fecha ?? getJournalDateString(nowMs);
  return readAll()[day] ?? null;
}

export function apuntarJornada(blanco: string, nowMs: number = Date.now()): JornadaApunte {
  const fecha = getJournalDateString(nowMs);
  const prev = readApunteDelDia(fecha, nowMs);
  const created = crearApunte(fecha, blanco, nowMs);
  const next: JornadaApunte = prev
    ? {
        ...prev,
        blanco: created.blanco,
        apuntadoAt: prev.apuntadoAt || nowMs,
        ocurrio: undefined,
        noOcurrio: undefined,
        cerradoAt: undefined,
      }
    : created;
  const map = readAll();
  map[fecha] = next;
  writeAll(map, fecha);
  return next;
}

export function cerrarApunteJornada(
  ocurrio: string,
  noOcurrio: string,
  nowMs: number = Date.now(),
): JornadaApunte {
  const fecha = getJournalDateString(nowMs);
  const prev = readApunteDelDia(fecha, nowMs);
  if (!prev) {
    throw new Error("No se cierra un día que no se apuntó.");
  }
  const cerrado = cerrarApunte(prev, ocurrio, noOcurrio, nowMs);
  const map = readAll();
  map[fecha] = cerrado;
  writeAll(map, fecha);
  return cerrado;
}
