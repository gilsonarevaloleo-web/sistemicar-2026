/**
 * Grado académico V3 por consistencia estadística.
 * No reemplaza el candado comercial (SKU Matrícula / Carrera / Título).
 * Un grado se otorga por ventana, no por una foto fija.
 */

import type { DepotAnalysisResult, UserTier } from "./types.ts";

export const GRADO_WINDOW_SIZE = 10;
export const GRADO_TITULO_RATE = 0.7;
export const GRADO_TITULO_MIN_SAMPLE = 5;
export const GRADO_CARRERA_RATE = 0.5;

export interface GradoConsistencia {
  recommendedTier: UserTier;
  windowSize: number;
  sampleSize: number;
  stableCount: number;
  consistencyRate: number;
}

export interface VolcadoConResultado {
  result: DepotAnalysisResult;
  createdAt?: Date;
}

function vacio(): GradoConsistencia {
  return {
    recommendedTier: "FREE",
    windowSize: GRADO_WINDOW_SIZE,
    sampleSize: 0,
    stableCount: 0,
    consistencyRate: 0,
  };
}

/** Óptica alta (C7+) y chasis sustentado. Sin bloqueo de fricción severa. */
export function esVolcadoEstableAlto(entry: DepotAnalysisResult): boolean {
  return (
    Boolean(entry?.groundingStatus?.isFullyGrounded) && entry.perceptionEye >= 7
  );
}

function ventanaCronologica(
  recentEntries: readonly DepotAnalysisResult[],
): DepotAnalysisResult[] {
  return [...recentEntries]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-GRADO_WINDOW_SIZE);
}

export function medirGradoConsistencia(
  recentEntries: readonly DepotAnalysisResult[] | null | undefined,
): GradoConsistencia {
  if (!recentEntries || recentEntries.length === 0) return vacio();

  const sample = ventanaCronologica(recentEntries);
  const total = sample.length;
  const stableCount = sample.filter(esVolcadoEstableAlto).length;
  const consistencyRate = stableCount / total;

  let recommendedTier: UserTier;
  if (consistencyRate >= GRADO_TITULO_RATE && total >= GRADO_TITULO_MIN_SAMPLE) {
    recommendedTier = "TITULO";
  } else if (consistencyRate >= GRADO_CARRERA_RATE) {
    recommendedTier = "CARRERA";
  } else {
    recommendedTier = "MATRICULA";
  }

  return {
    recommendedTier,
    windowSize: GRADO_WINDOW_SIZE,
    sampleSize: total,
    stableCount,
    consistencyRate,
  };
}

/**
 * Firma del especialista: 7 de cada 10 volcados estables → Título.
 * Acepta orden cronológico o más-nuevo-primero: la ventana usa timestamp.
 */
export function evaluateStudentTierPromotion(
  recentEntries: DepotAnalysisResult[],
): UserTier {
  return medirGradoConsistencia(recentEntries).recommendedTier;
}

export function medirGradoConsistenciaDesdeVolcados(
  entries: readonly VolcadoConResultado[] | null | undefined,
): GradoConsistencia {
  if (!entries || entries.length === 0) return vacio();
  return medirGradoConsistencia(
    entries.map((e) => {
      const ts =
        e.createdAt instanceof Date ? e.createdAt.getTime() : e.result.timestamp;
      return { ...e.result, timestamp: ts };
    }),
  );
}
