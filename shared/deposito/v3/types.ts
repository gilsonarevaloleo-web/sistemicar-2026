/**
 * Depósito V3 — contratos de Óptica-Sintaxis.
 *
 * V2 (Muro: un ojo dominante) no se toca.
 * Aquí el dictamen ES el orden: percepción + firma de carácter + Δ.
 *
 * Los nombres de planeta (Claridad, Suma…) y de ley (Cimiento, Flujo…)
 * son alias del mismo EyeCode. La esencia es el número 1–10.
 */

export const DEPOSITO_V3_VERSION = "3.0.0-optica-sintaxis" as const;

export type EyeCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const EYE_CODES: readonly EyeCode[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type UserTier = "FREE" | "MATRICULA" | "CARRERA" | "TITULO";

export const USER_TIERS: readonly UserTier[] = [
  "FREE",
  "MATRICULA",
  "CARRERA",
  "TITULO",
];

export type EyeDialect = "canon" | "planeta";

export interface EyeDefinition {
  id: EyeCode;
  /** Ley óptica: Cimiento, Flujo, Trabajo… */
  name: string;
  concept: string;
  description: string;
  /** Peldaño comercial “de casa” de este canal. El candado usa TIER_MAX_EYE. */
  tierRequired: UserTier;
  /** Universidad / motor V2: Claridad, Suma, Ritmo… */
  planeta: string;
  planetaOjo: string;
  /** Firma sintáctica de redacción (C1 Disperso, C3 Secuencial…). */
  syntaxLabel: string;
  syntaxCharacteristics: string;
}

export interface EyeAudit {
  eyeId: EyeCode;
  /** El usuario intentó abordar este Ojo. */
  hasIntention: boolean;
  /** Se verificaron hechos fríos sin adornos moralistas. */
  hasRealVision: boolean;
  /** Uso de un ojo para enmascarar falla de otro. */
  isBlindSpot: boolean;
}

export interface DepotEntryPayload {
  /** Campo obligatorio para todos los niveles. */
  rawFact: string;
  /** Obligatorio para CARRERA / TITULO. */
  detectedNoise?: string;
  /** Obligatorio para CARRERA / TITULO. */
  omittedShadow?: string;
  /** Ley/verdad que el alumno cree haber descubierto. Opcional en todos los tiers. */
  studentHypothesis?: string;
  userTier: UserTier;
}

export interface CharacterSyntaxDiagnostic {
  detectedSyntaxCode: EyeCode;
  syntaxCharacteristics: string;
}

export interface GroundingStatus {
  isFullyGrounded: boolean;
  /** Código inferior con fricción de chasis. */
  frictionPoint?: EyeCode;
  diagnosticMessage: string;
}

export interface SystemicAnalysis {
  /** C8: latencia / loop diferido (24–48h). */
  isLatencyEvent: boolean;
  /** C9: conflicto de carga / trampa de virtud-producción. */
  isSystemicConflict: boolean;
  realEngineeringCause: string;
}

export interface DepotAnalysisResult {
  id: string;
  timestamp: number;
  /** Ojo dominante en análisis (Óptica). */
  perceptionEye: EyeCode;
  /** Código donde se ejecutó la acción/carácter (Sintaxis). */
  characterSignedCode: EyeCode;
  activeEyeMap: Record<EyeCode, boolean>;
  eyeAudits: Record<EyeCode, EyeAudit>;
  /** | perceptionEye - characterSignedCode | */
  deltaGap: number;
  syntaxDiagnostic: CharacterSyntaxDiagnostic;
  groundingStatus: GroundingStatus;
  systemicAnalysis: SystemicAnalysis;
  immediateAdjustment: string;
}

export type DepotAnalysisLlmShape = Omit<
  DepotAnalysisResult,
  "id" | "timestamp"
>;

/** Input laxo (API, UI, persistencia V2). Se normaliza a DepotEntryPayload. */
export interface DepotEntryInput {
  rawFact?: string;
  volcadoCrudo?: string;
  textoVolcado?: string;
  texto?: string;
  detectedNoise?: string;
  friccionDetectada?: string;
  omittedShadow?: string;
  sombraOmision?: string;
  studentHypothesis?: string;
  codigoHipotesis?: unknown;
  userTier?: unknown;
  tier?: unknown;
}

export interface DepotEntitlements {
  hasMatricula?: boolean;
  hasCarrera?: boolean;
  hasTitulo?: boolean;
}

export type DepotValidationError = {
  ok: false;
  error: string;
};

export type DepotPayloadOk = {
  ok: true;
  payload: DepotEntryPayload;
};

export type DepotPayloadResult = DepotPayloadOk | DepotValidationError;

export type DepotAnalysisOk = {
  ok: true;
  result: DepotAnalysisResult;
};

export type DepotAnalysisParseResult = DepotAnalysisOk | DepotValidationError;
