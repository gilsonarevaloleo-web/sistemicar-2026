/**
 * Persistencia mínima local de volcados de Oficio.
 * La entrada es pública: sobrevive recarga sin login.
 */

import type { SesionOficio } from "@shared/umbral/oficioMotor";

export const OFICIO_SESIONES_KEY = "sistemicar_oficio_sesiones";
export const OFICIO_DRAFT_KEY = "sistemicar_oficio_draft";
export const OFICIO_GUEST_KEY = "sistemicar_oficio_guest_id";

const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readBucket(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeBucket(key: string, value: string): void {
  try {
    const s = storage();
    if (s) {
      s.setItem(key, value);
      return;
    }
  } catch {
    /* cuota / privado */
  }
  memory.set(key, value);
}

export function guestIdOficio(): string {
  const existing = readBucket(OFICIO_GUEST_KEY);
  if (existing) return existing;
  const id = `oficio-guest-${Math.random().toString(36).slice(2, 10)}`;
  writeBucket(OFICIO_GUEST_KEY, id);
  return id;
}

export function guardarBorradorOficio(texto: string): void {
  writeBucket(OFICIO_DRAFT_KEY, texto);
}

export function leerBorradorOficio(): string {
  return readBucket(OFICIO_DRAFT_KEY) ?? "";
}

function parseAll(): SesionOficio[] {
  try {
    const raw = readBucket(OFICIO_SESIONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SesionOficio[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.id === "string" && s.lectura && typeof s.lectura.codigo === "number",
    );
  } catch {
    return [];
  }
}

export function listarSesionesOficioLocal(userId?: string): SesionOficio[] {
  const all = parseAll();
  if (!userId) return all.slice(0, 20);
  return all.filter((s) => s.userId === userId).slice(0, 20);
}

export function guardarSesionOficioLocal(sesion: SesionOficio): void {
  const rest = parseAll().filter((s) => s.id !== sesion.id);
  writeBucket(OFICIO_SESIONES_KEY, JSON.stringify([sesion, ...rest].slice(0, 20)));
}
