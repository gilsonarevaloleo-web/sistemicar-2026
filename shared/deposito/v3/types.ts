/**
 * Depósito V3 — contratos del Motor Sintáctico de Firma.
 *
 * V2 (Muro: un ojo dominante) no se toca.
 * Aquí el dictamen ES la forma: firma de carácter + vacíos + cableado.
 * No se audita profundidad filosófica ni Óptica de verdad.
 *
 * Los nombres de planeta (Claridad, Suma…) y de ley (Cimiento, Flujo…)
 * son alias del mismo EyeCode. La esencia es el número 1–10.
 */

export const DEPOSITO_V3_VERSION = "3.3.0-sintaxis-firma" as const;

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
  /** Continuidad título → cuerpo → cierre. No es juicio moral. */
  isCableadoConnected: boolean;
  syntaxCharacteristics: string;
}

export interface GroundingStatus {
  isFullyGrounded: boolean;
  /** Evaluación estructural de la escritura. No juzga verdad filosófica. */
  diagnosticMessage: string;
  /** @deprecated legado óptica-chasis. El motor sintáctico no lo emite. */
  frictionPoint?: EyeCode;
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
  /** Código dominante de la geometría de redacción. */
  characterSignedCode: EyeCode;
  /** Telemetría directa para el mapa de calor de los 10 códigos de carácter. */
  activeCharacterMap: Record<EyeCode, boolean>;
  /** Códigos C1–C10 ausentes en la geometría de redacción. */
  syntacticVacios: EyeCode[];
  syntaxDiagnostic: CharacterSyntaxDiagnostic;
  groundingStatus: GroundingStatus;
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
