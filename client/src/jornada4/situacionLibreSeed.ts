/**
 * Semilla de lista libre situacional (sin ring / sin meta / sin presión).
 * Filas directas: se cumplen en cualquier orden, sin cupos ni contrato.
 */
import type { SubTarea, Vehicle } from "../lib/persistence";
import { normalizeSeccionTitulo } from "../lib/desglosadorSecciones";
import { ringSessionOperable } from "../lib/ringEnfoqueReal";

export type SituacionLibreSeed = {
  subTareas: SubTarea[];
  situacionCronometro: null;
  situacionCupoAnchor: null;
};

export function buildSituacionLibreSeed(opts: {
  filas: string[];
  /** Dirección por fila (vacío = hereda default). */
  filasProyectoIds?: Array<string | undefined>;
  /** Familia / título propio por fila (vacío = sin familia). */
  filasSeccionTitulos?: Array<string | undefined>;
  now?: number;
  proyectoEnfoqueId?: string;
}): SituacionLibreSeed | null {
  const now = opts.now ?? Date.now();
  const ids = opts.filasProyectoIds ?? [];
  const secciones = opts.filasSeccionTitulos ?? [];
  const filas = opts.filas
    .map((f, i) => ({
      texto: f.trim(),
      proyectoId: ids[i]?.trim() || undefined,
      seccionTitulo: normalizeSeccionTitulo(secciones[i]) ?? undefined,
    }))
    .filter(f => f.texto.length > 0);
  if (filas.length === 0) return null;
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;

  const subTareas: SubTarea[] = filas.map((fila, i) => {
    const proyectoId = fila.proyectoId || proyectoEnfoqueId;
    return {
      id: `st_j4_libre_${now}_${i}`,
      texto: fila.texto,
      completada: false,
      creadaAt: now,
      enDesgloseCronometro: false,
      resultadoSituacion: "pendiente" as const,
      ...(proyectoId ? { proyectoId } : {}),
      ...(fila.seccionTitulo ? { seccionTitulo: fila.seccionTitulo } : {}),
    };
  });

  return {
    subTareas,
    situacionCronometro: null,
    situacionCupoAnchor: null,
  };
}

export function isSituacionListaLibre(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion" || v.status !== "activo") return false;
  // Ring pausado/operable no es lista libre (evita “pérdida” visual del ring al volver).
  if (ringSessionOperable(v.situacionCronometro, v.subTareas ?? [])) return false;
  return (v.subTareas?.length ?? 0) > 0;
}
