/**
 * Depósito V3 — contratos del Motor Sintáctico de Firma.
 *
 * V2 (Muro: un ojo dominante) no se toca.
 * Aquí el dictamen ES la forma: firma de carácter + vacíos + cascada.
 * No se audita profundidad filosófica ni Óptica de verdad.
 *
 * El Título es C1 (Vector Cero). C10 solo abrocha si C1 existe
 * y el cierre responde a ese vector. Sin título, C10 es vacío.
 *
 * Los nombres de planeta (Claridad, Suma…) y de ley (Cimiento, Flujo…)
 * son alias del mismo EyeCode. La esencia es el número 1–10.
 */

export const DEPOSITO_V3_VERSION = "3.10.1-foco-sync" as const;

export type EyeCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const EYE_CODES: readonly EyeCode[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Escalera pedagógica: C1 → C2 → C4 → C5 → C7 → C10. */
export type CascadeCode = 1 | 2 | 4 | 5 | 7 | 10;

export const CASCADE_CODES: readonly CascadeCode[] = [1, 2, 4, 5, 7, 10];

export type EstadoAlumnoCascada =
  | "PRINCIPIANTE_SIN_ANCLA"
  | "EXPLORADOR_NARRATIVO"
  | "ENLACE_EN_TRANSMUTACION"
  | "ARQUITECTO_GROUNDED";

/** Tonos del Maestro. C6 existe como diccionario; la cascada no lo exige. */
export type MasterToneCode = 1 | 2 | 4 | 5 | 6 | 7 | 10;

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
  /** Firma sintáctica de redacción (C1 Ancla, C3 Secuencia Vectorial…). */
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
  /** Continuidad título → cierre. Es geometría C10, no juicio moral. */
  isCableadoConnected: boolean;
  syntaxCharacteristics: string;
  /**
   * Escalón de enseñanza: código pendiente de la cascada,
   * o C10 si el circuito está abrochado.
   */
  focoCode: EyeCode;
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
  /** Código dominante de la geometría de redacción (relato / storytelling). */
  characterSignedCode: EyeCode;
  /**
   * Código de enseñanza: el primer peldaño pendiente de la cascada.
   * Si el circuito está abrochado, queda en C10.
   */
  focoRevelacionCode: EyeCode;
  /** Telemetría directa para el mapa de calor de los 10 códigos de carácter. */
  activeCharacterMap: Record<EyeCode, boolean>;
  /** Códigos C1–C10 ausentes en la geometría de redacción. */
  syntacticVacios: EyeCode[];
  syntaxDiagnostic: CharacterSyntaxDiagnostic;
  groundingStatus: GroundingStatus;
  immediateAdjustment: string;
  /** Códigos encendidos por marcadores de estructura, no por juicio. */
  activeCodes?: EyeCode[];
  /** Primer código pendiente en C1 → C2 → C4 → C5 → C7 → C10. Null si cierra. */
  lowestMissingCascadeCode?: CascadeCode | null;
  /** C1 presente Y la última oración responde al vector del título. */
  titleConnectedToClose?: boolean;
  /** Tono del Maestro usado en el dictamen. */
  masterTone?: MasterToneCode;
  /** Texto breve, frío, geométrico. Mismo contenido que immediateAdjustment. */
  pedagogicalFeedback?: string;
  /** Estado del alumno según el escalón pendiente. */
  estadoAlumno?: EstadoAlumnoCascada;
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
