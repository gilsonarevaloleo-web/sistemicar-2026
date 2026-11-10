/**
 * Caché local de libros del gimnasio.
 * El servidor (Postgres) es la fuente. Esto sobrevive recarga y serverless sin memoria.
 */

import {
  ordenarLibrosPorCreacion,
  type LibroGimnasio,
} from "@shared/casas/gimnasio6";

export const GIMNASIO6_LIBROS_KEY = "sistemicar_gimnasio6_libros";

const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readBucket(): string | null {
  try {
    return storage()?.getItem(GIMNASIO6_LIBROS_KEY) ?? memory.get(GIMNASIO6_LIBROS_KEY) ?? null;
  } catch {
    return memory.get(GIMNASIO6_LIBROS_KEY) ?? null;
  }
}

function writeBucket(value: string): void {
  try {
    const s = storage();
    if (s) {
      s.setItem(GIMNASIO6_LIBROS_KEY, value);
      return;
    }
  } catch {
    /* cuota / privado */
  }
  memory.set(GIMNASIO6_LIBROS_KEY, value);
}

function parseAll(): LibroGimnasio[] {
  try {
    const raw = readBucket();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibroGimnasio[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.id === "string" && typeof l.userId === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(libros: LibroGimnasio[]): void {
  writeBucket(JSON.stringify(libros.slice(0, 40)));
}

export function listarLibrosGimnasioLocal(userId: string): LibroGimnasio[] {
  const uid = userId.trim();
  if (!uid) return [];
  return ordenarLibrosPorCreacion(parseAll().filter((l) => l.userId === uid));
}

export function guardarLibroGimnasioLocal(libro: LibroGimnasio): void {
  const all = parseAll().filter((l) => l.id !== libro.id);
  all.push(libro);
  writeAll(all);
}

export function fusionarLibrosGimnasioLocal(
  userId: string,
  remotos: LibroGimnasio[],
): LibroGimnasio[] {
  const uid = userId.trim();
  const byId = new Map<string, LibroGimnasio>();
  for (const l of parseAll()) {
    if (l.userId === uid) byId.set(l.id, l);
  }
  for (const l of remotos) {
    if (l.userId !== uid) continue;
    const prev = byId.get(l.id);
    if (!prev || String(l.updatedAt) >= String(prev.updatedAt)) {
      byId.set(l.id, l);
    }
  }
  const merged = ordenarLibrosPorCreacion(Array.from(byId.values()));
  const others = parseAll().filter((l) => l.userId !== uid);
  writeAll([...others, ...merged]);
  return merged;
}

export function libroAbiertoLocal(userId: string): LibroGimnasio | null {
  return (
    listarLibrosGimnasioLocal(userId).find(
      (l) => l.estado === "ABIERTO" || l.estado === "TOPE_DIARIO",
    ) ?? null
  );
}
