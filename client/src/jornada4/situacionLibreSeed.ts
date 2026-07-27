/**
 * Semilla de lista libre situacional (sin ring / sin meta / sin presión).
 * Filas directas: se cumplen en cualquier orden, sin cupos ni contrato.
 */
import type { SubTarea, Vehicle } from "@/lib/persistence";

export type SituacionLibreSeed = {
  subTareas: SubTarea[];
  situacionCronometro: null;
  situacionCupoAnchor: null;
};

export function buildSituacionLibreSeed(opts: {
  filas: string[];
  now?: number;
  proyectoEnfoqueId?: string;
}): SituacionLibreSeed | null {
  const now = opts.now ?? Date.now();
  const filas = opts.filas.map(f => f.trim()).filter(Boolean);
  if (filas.length === 0) return null;
  const proyectoEnfoqueId = opts.proyectoEnfoqueId?.trim() || undefined;

  const subTareas: SubTarea[] = filas.map((texto, i) => ({
    id: `st_j4_libre_${now}_${i}`,
    texto,
    completada: false,
    creadaAt: now,
    enDesgloseCronometro: false,
    resultadoSituacion: "pendiente" as const,
    ...(proyectoEnfoqueId ? { proyectoId: proyectoEnfoqueId } : {}),
  }));

  return {
    subTareas,
    situacionCronometro: null,
    situacionCupoAnchor: null,
  };
}

export function isSituacionListaLibre(v: Vehicle): boolean {
  if (v.tipoFlota !== "situacion" || v.status !== "activo") return false;
  if (v.situacionCronometro?.activo === true) return false;
  return (v.subTareas?.length ?? 0) > 0;
}
