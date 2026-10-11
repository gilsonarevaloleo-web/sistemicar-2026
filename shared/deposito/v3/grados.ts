/**
 * Grado académico V3 por consistencia estadística.
 * No reemplaza el candado comercial (SKU Matrícula / Carrera / Título).
 * Un grado se otorga por ventana, no por una foto fija.
 *
 * El grado óptico (evaluateStudentTierPromotion) queda sellado: 7/10 C7+ y chasis.
 * El evaluador dual (evaluateDualTrackPromotion) es capa extra: óptica + sintaxis.
 */

import { vaciosDesdeActiveMap } from "./ojos.ts";
import type { DepotAnalysisResult, EyeCode, UserTier } from "./types.ts";

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

/** Doble canal + ventana 7/10. No sustituye el grado óptico sellado. */
export const DUAL_WINDOW_SIZE = GRADO_WINDOW_SIZE;
export const DUAL_TITULO_RATE = 0.7;
export const DUAL_TITULO_MIN_SAMPLE = 7;
export const DUAL_CARRERA_RATE = 0.5;
export const DUAL_CARRERA_MIN_SAMPLE = 5;
export const DUAL_GROUNDING_FLOOR = 0.4;
export const DUAL_OPTICA_MAX_DELTA = 4;
export const DUAL_SINTAXIS_MAX_VACIOS = 4;

export type PromotionStatus = "PROMOTED" | "MAINTAINED" | "NEEDS_GROUNDING";

export interface TierEvaluationReport {
  currentTier: UserTier;
  /** Porcentaje 0–100 de lucidez / desinfección en la ventana. */
  opticaConsistencyRate: number;
  /** Porcentaje 0–100 de cableado / vacíos contenidos. */
  sintaxisConsistencyRate: number;
  recommendedTier: UserTier;
  promotionStatus: PromotionStatus;
  message: string;
  windowSize: number;
  sampleSize: number;
  opticaValidCount: number;
  sintaxisValidCount: number;
}

export function syntacticVaciosDe(entry: DepotAnalysisResult): EyeCode[] {
  return entry.syntacticVacios ?? vaciosDesdeActiveMap(entry.activeEyeMap);
}

export function esVolcadoOpticaDual(entry: DepotAnalysisResult): boolean {
  return (
    Boolean(entry?.groundingStatus?.isFullyGrounded) &&
    entry.deltaGap <= DUAL_OPTICA_MAX_DELTA
  );
}

export function esVolcadoSintaxisDual(entry: DepotAnalysisResult): boolean {
  return (
    Boolean(entry?.syntaxDiagnostic?.isCableadoConnected) &&
    syntacticVaciosDe(entry).length <= DUAL_SINTAXIS_MAX_VACIOS
  );
}

function vacioDual(currentTier: UserTier): TierEvaluationReport {
  return {
    currentTier,
    opticaConsistencyRate: 0,
    sintaxisConsistencyRate: 0,
    recommendedTier: "FREE",
    promotionStatus: "MAINTAINED",
    message: "Sin registros suficientes para calibración.",
    windowSize: DUAL_WINDOW_SIZE,
    sampleSize: 0,
    opticaValidCount: 0,
    sintaxisValidCount: 0,
  };
}

/**
 * Promoción por doble tracción. No pisa evaluateStudentTierPromotion.
 * currentTier es el peldaño de partida (comercial o académico previo).
 */
export function evaluateDualTrackPromotion(
  recentEntries: readonly DepotAnalysisResult[] | null | undefined,
  currentTier: UserTier = "FREE",
): TierEvaluationReport {
  if (!recentEntries || recentEntries.length === 0) {
    return vacioDual(currentTier);
  }

  const sample = ventanaCronologica(recentEntries);
  const total = sample.length;
  const opticaValidCount = sample.filter(esVolcadoOpticaDual).length;
  const sintaxisValidCount = sample.filter(esVolcadoSintaxisDual).length;
  const opticaRate = opticaValidCount / total;
  const sintaxisRate = sintaxisValidCount / total;

  let recommendedTier: UserTier = "MATRICULA";
  let promotionStatus: PromotionStatus = "MAINTAINED";

  if (
    opticaRate >= DUAL_TITULO_RATE &&
    sintaxisRate >= DUAL_TITULO_RATE &&
    total >= DUAL_TITULO_MIN_SAMPLE
  ) {
    recommendedTier = "TITULO";
    promotionStatus = "PROMOTED";
  } else if (
    opticaRate >= DUAL_CARRERA_RATE &&
    sintaxisRate >= DUAL_CARRERA_RATE &&
    total >= DUAL_CARRERA_MIN_SAMPLE
  ) {
    recommendedTier = "CARRERA";
    promotionStatus = "PROMOTED";
  } else if (
    opticaRate < DUAL_GROUNDING_FLOOR ||
    sintaxisRate < DUAL_GROUNDING_FLOOR
  ) {
    promotionStatus = "NEEDS_GROUNDING";
  }

  const opticaPct = Math.round(opticaRate * 100);
  const sintaxisPct = Math.round(sintaxisRate * 100);

  return {
    currentTier,
    opticaConsistencyRate: opticaPct,
    sintaxisConsistencyRate: sintaxisPct,
    recommendedTier,
    promotionStatus,
    message:
      promotionStatus === "PROMOTED"
        ? `Promoción consolidada por doble tracción: Óptica (${opticaPct}%) / Sintaxis (${sintaxisPct}%).`
        : `Sostén tu chasis. Se requiere mínimo 70% de consistencia en ambas vías para nivel Título.`,
    windowSize: DUAL_WINDOW_SIZE,
    sampleSize: total,
    opticaValidCount,
    sintaxisValidCount,
  };
}

export function evaluateDualTrackPromotionDesdeVolcados(
  entries: readonly VolcadoConResultado[] | null | undefined,
  currentTier: UserTier = "FREE",
): TierEvaluationReport {
  if (!entries || entries.length === 0) return vacioDual(currentTier);
  return evaluateDualTrackPromotion(
    entries.map((e) => {
      const ts =
        e.createdAt instanceof Date ? e.createdAt.getTime() : e.result.timestamp;
      return { ...e.result, timestamp: ts };
    }),
    currentTier,
  );
}
