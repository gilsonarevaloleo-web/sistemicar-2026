/**
 * Orden, número y copia de libros del gimnasio.
 * El número sigue el orden de apertura (createdAt). Continuar no lo cambia.
 */

import type { LibroGimnasio } from "./types.ts";
import { ETIQUETA_CAPITULO } from "./canon.ts";
import { copiarLibro } from "./prompt.ts";

function claveCreacion(iso: string, id: string): string {
  return `${iso}\0${id}`;
}

function compararCreacionDesc(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number {
  return claveCreacion(b.createdAt, b.id).localeCompare(
    claveCreacion(a.createdAt, a.id),
  );
}

export function ordenarLibrosPorCreacion(
  libros: readonly LibroGimnasio[],
): LibroGimnasio[] {
  return [...libros].sort(compararCreacionDesc);
}

export function numerosLibro(
  libros: readonly LibroGimnasio[],
): Map<string, number> {
  const ascendentes = [...libros].sort((a, b) =>
    claveCreacion(a.createdAt, a.id).localeCompare(
      claveCreacion(b.createdAt, b.id),
    ),
  );
  const map = new Map<string, number>();
  ascendentes.forEach((l, i) => map.set(l.id, i + 1));
  return map;
}

export function numeroLibro(
  libros: readonly LibroGimnasio[],
  id: string,
): number {
  return numerosLibro(libros).get(id) ?? 0;
}

export function etiquetaLibro(libro: LibroGimnasio): string {
  if (libro.estado === "ABIERTO") {
    return `Capítulo ${libro.puntero.capitulo} · ${ETIQUETA_CAPITULO[libro.puntero.capitulo]}`;
  }
  if (libro.estado === "TOPE_DIARIO" || libro.estado === "CAPITULO_SELLADO") {
    return `${ETIQUETA_CAPITULO[libro.puntero.capitulo]} · sellado`;
  }
  return libro.estado;
}

export function esLibroContinuable(libro: LibroGimnasio): boolean {
  return libro.estado === "ABIERTO" || libro.estado === "TOPE_DIARIO";
}

export function recortarLibro(texto: string, max = 140): string {
  const t = texto.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function formatearCopiaLibroNumerado(
  libro: LibroGimnasio,
  numero: number,
): string {
  return [`GIMNASIO — Libro ${numero}`, copiarLibro(libro).trim()].join("\n\n") + "\n";
}
