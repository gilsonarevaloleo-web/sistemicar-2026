/**
 * Semilla de lista libre situacional (sin ring / sin meta / sin presión).
 * Filas directas: se cumplen en cualquier orden, sin cupos ni contrato.
 */
import type { SubTarea, Vehicle } from "../lib/persistence";
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
  now?: number;
  proyectoEnfoqueId?: string;
}): SituacionLibreSeed | null {
  const now = opts.now ?? Date.now();
  const filas = opts.filas.map(f => f.trim()).filter(Boolean);
  if (filas.length === 0) return null;
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;
  const ids = opts.filasProyectoIds ?? [];

  const subTareas: SubTarea[] = filas.map((texto, i) => {
    const filaId = ids[i]?.trim() || undefined;
    const proyectoId = filaId || proyectoEnfoqueId;
    return {
      id: `st_j4_libre_${now}_${i}`,
      texto,
      completada: false,
      creadaAt: now,
      enDesgloseCronometro: false,
      resultadoSituacion: "pendiente" as const,
      ...(proyectoId ? { proyectoId } : {}),
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
