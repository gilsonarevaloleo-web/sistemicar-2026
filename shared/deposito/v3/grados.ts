/**
 * Grado académico V3 por consistencia sintáctica.
 * No reemplaza el candado comercial (SKU Matrícula / Carrera / Título).
 * Un grado se otorga por ventana, no por una foto fija.
 *
 * Una sola vía: firma de carácter + cableado + vacíos contenidos.
 * No se mide profundidad filosófica ni Óptica de verdad.
 */

import { characterMapDe, vaciosDesdeActiveMap } from "./ojos.ts";
import type { DepotAnalysisResult, EyeCode, UserTier } from "./types.ts";

export const GRADO_WINDOW_SIZE = 10;
export const GRADO_TITULO_RATE = 0.7;
export const GRADO_TITULO_MIN_SAMPLE = 5;
export const GRADO_CARRERA_RATE = 0.5;

/** Ventana 7/10 sobre la única vía: sintaxis. */
export const DUAL_WINDOW_SIZE = GRADO_WINDOW_SIZE;
export const DUAL_TITULO_RATE = 0.7;
export const DUAL_TITULO_MIN_SAMPLE = 7;
export const DUAL_CARRERA_RATE = 0.5;
export const DUAL_CARRERA_MIN_SAMPLE = 5;
export const DUAL_GROUNDING_FLOOR = 0.4;
/** @deprecated la vía óptica se retiró. Se conserva el número por compat de tests. */
export const DUAL_OPTICA_MAX_DELTA = 4;
export const DUAL_SINTAXIS_MAX_VACIOS = 4;

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

export function syntacticVaciosDe(entry: DepotAnalysisResult): EyeCode[] {
  return entry.syntacticVacios ?? vaciosDesdeActiveMap(characterMapDe(entry));
}

/** Firma estable: cableado + vacíos contenidos. No mira Óptica. */
export function esVolcadoSintaxisDual(entry: DepotAnalysisResult): boolean {
  return (
    Boolean(entry?.syntaxDiagnostic?.isCableadoConnected) &&
    syntacticVaciosDe(entry).length <= DUAL_SINTAXIS_MAX_VACIOS
  );
}

/** Alias de la vía única: un volcado «alto» es un volcado de firma estable. */
export function esVolcadoEstableAlto(entry: DepotAnalysisResult): boolean {
  return esVolcadoSintaxisDual(entry);
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
 * Firma del especialista: 7 de cada 10 volcados de firma estable → Título.
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

export type PromotionStatus = "PROMOTED" | "MAINTAINED" | "NEEDS_GROUNDING";

export interface TierEvaluationReport {
  currentTier: UserTier;
  /** @deprecated misma tasa que sintaxisConsistencyRate. La vía óptica se retiró. */
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

/** @deprecated la vía óptica se retiró: delega a la firma sintáctica. */
export function esVolcadoOpticaDual(entry: DepotAnalysisResult): boolean {
  return esVolcadoSintaxisDual(entry);
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
 * Promoción por firma sintáctica. Conserva el nombre dual por compat de API.
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
  const sintaxisValidCount = sample.filter(esVolcadoSintaxisDual).length;
  const sintaxisRate = sintaxisValidCount / total;

  let recommendedTier: UserTier = "MATRICULA";
  let promotionStatus: PromotionStatus = "MAINTAINED";

  if (sintaxisRate >= DUAL_TITULO_RATE && total >= DUAL_TITULO_MIN_SAMPLE) {
    recommendedTier = "TITULO";
    promotionStatus = "PROMOTED";
  } else if (
    sintaxisRate >= DUAL_CARRERA_RATE &&
    total >= DUAL_CARRERA_MIN_SAMPLE
  ) {
    recommendedTier = "CARRERA";
    promotionStatus = "PROMOTED";
  } else if (sintaxisRate < DUAL_GROUNDING_FLOOR) {
    promotionStatus = "NEEDS_GROUNDING";
  }

  const sintaxisPct = Math.round(sintaxisRate * 100);

  return {
    currentTier,
    opticaConsistencyRate: sintaxisPct,
    sintaxisConsistencyRate: sintaxisPct,
    recommendedTier,
    promotionStatus,
    message:
      promotionStatus === "PROMOTED"
        ? `Promoción consolidada por firma sintáctica (${sintaxisPct}%).`
        : `Sostén el cableado. Se requiere mínimo 70% de firma estable para nivel Título.`,
    windowSize: DUAL_WINDOW_SIZE,
    sampleSize: total,
    opticaValidCount: sintaxisValidCount,
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
