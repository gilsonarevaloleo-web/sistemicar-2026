/**
 * Tiers comerciales de Depósito V3.
 * Mismos SKUs que V2 (Matrícula / Carrera / Título).
 * El candado abre canales; no cambia la esencia del EyeCode.
 */

import type { DepotEntitlements, EyeCode, UserTier } from "./types.ts";

/** Techo de ojo desbloqueado por tier (FREE prueba C1). */
export const TIER_MAX_EYE: Record<UserTier, EyeCode> = {
  FREE: 1,
  MATRICULA: 4,
  CARRERA: 8,
  TITULO: 10,
};

export const ADVANCED_TIERS: readonly UserTier[] = ["CARRERA", "TITULO"];

export function isUserTier(value: unknown): value is UserTier {
  return (
    value === "FREE" ||
    value === "MATRICULA" ||
    value === "CARRERA" ||
    value === "TITULO"
  );
}

export function normalizarUserTier(value: unknown): UserTier {
  if (isUserTier(value)) return value;
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (isUserTier(upper)) return upper;
    if (upper === "MATRÍCULA" || upper === "MATRICULA") return "MATRICULA";
    if (upper === "TÍTULO" || upper === "TITULO") return "TITULO";
  }
  return "FREE";
}

export function isAdvancedTier(tier: UserTier): boolean {
  return tier === "CARRERA" || tier === "TITULO";
}

export function maxUnlockedEye(tier: UserTier): EyeCode {
  return TIER_MAX_EYE[tier];
}

export function isEyeLocked(eye: EyeCode, tier: UserTier): boolean {
  return eye > TIER_MAX_EYE[tier];
}

/**
 * Título > Carrera > Matrícula > FREE.
 * Un título implica los canales de los peldaños anteriores.
 */
export function userTierFromEntitlements(
  access: DepotEntitlements = {},
): UserTier {
  if (access.hasTitulo) return "TITULO";
  if (access.hasCarrera) return "CARRERA";
  if (access.hasMatricula) return "MATRICULA";
  return "FREE";
}

export type CampoCapturaV3 =
  | "rawFact"
  | "studentHypothesis"
  | "detectedNoise"
  | "omittedShadow";

/** Campos que la UI muestra. rawFact + hipótesis siempre; flor/sombra en avanzado. */
export function camposVisiblesPorTier(
  tier: UserTier,
): readonly CampoCapturaV3[] {
  if (isAdvancedTier(tier)) {
    return ["rawFact", "studentHypothesis", "detectedNoise", "omittedShadow"];
  }
  return ["rawFact", "studentHypothesis"];
}

export function camposObligatoriosPorTier(
  tier: UserTier,
): readonly CampoCapturaV3[] {
  if (isAdvancedTier(tier)) {
    return ["rawFact", "detectedNoise", "omittedShadow"];
  }
  return ["rawFact"];
}
