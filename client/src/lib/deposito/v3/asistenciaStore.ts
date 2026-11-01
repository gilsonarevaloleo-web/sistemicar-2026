/**
 * Persistencia local de asistencia consciente.
 * No toca sistemicar_volcados ni volcados_v3.
 */

import {
  absorberDiasConVolcado,
  libroVacio,
  marcarSesionCumplida,
  normalizarLibro,
  registrarIntencion,
  type IntencionAsistencia,
  type LibroAsistencia,
} from "@shared/deposito/v3";

export const DEPOSITO_ASISTENCIA_STORAGE_KEY = "sistemicar_deposito_asistencia_v1";
export const DEPOSITO_ASISTENCIA_EVENT = "deposito-asistencia-updated";

const memory = new Map<string, string>();

function readBucket(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(DEPOSITO_ASISTENCIA_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  return memory.get(DEPOSITO_ASISTENCIA_STORAGE_KEY) ?? null;
}

function writeBucket(value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DEPOSITO_ASISTENCIA_STORAGE_KEY, value);
      return;
    }
  } catch {
    /* ignore */
  }
  memory.set(DEPOSITO_ASISTENCIA_STORAGE_KEY, value);
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEPOSITO_ASISTENCIA_EVENT));
  }
}

type Bucket = Record<string, LibroAsistencia>;

function parseBucket(): Bucket {
  try {
    const raw = readBucket();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Bucket;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Bucket = {};
    for (const [uid, libro] of Object.entries(parsed)) {
      if (!uid) continue;
      out[uid] = normalizarLibro(libro);
    }
    return out;
  } catch {
    return {};
  }
}

function saveBucket(bucket: Bucket): void {
  writeBucket(JSON.stringify(bucket));
  emitUpdated();
}

export function leerLibroAsistencia(userId: string): LibroAsistencia {
  return parseBucket()[userId] ?? libroVacio();
}

export function guardarLibroAsistencia(
  userId: string,
  libro: LibroAsistencia,
): LibroAsistencia {
  const bucket = parseBucket();
  bucket[userId] = libro;
  saveBucket(bucket);
  return libro;
}

export function elegirIntencionHoy(
  userId: string,
  fecha: string,
  intencion: IntencionAsistencia,
  hora?: string,
): LibroAsistencia {
  const next = registrarIntencion(leerLibroAsistencia(userId), fecha, intencion, hora);
  return guardarLibroAsistencia(userId, next);
}

export function cumplirSesionHoy(
  userId: string,
  fecha: string,
  hora?: string,
): LibroAsistencia {
  const next = marcarSesionCumplida(leerLibroAsistencia(userId), fecha, hora);
  return guardarLibroAsistencia(userId, next);
}

export function hidratarAsistenciaDesdeVolcados(
  userId: string,
  timestamps: readonly number[],
): LibroAsistencia {
  const next = absorberDiasConVolcado(leerLibroAsistencia(userId), timestamps);
  return guardarLibroAsistencia(userId, next);
}
