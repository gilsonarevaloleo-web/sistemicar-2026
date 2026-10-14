/**
 * Depósito V3 — contratos + motor de auditoría.
 * No reexporta el motor V2. No pinta UI.
 */

export { DEPOSITO_V3_VERSION } from "./types.ts";
export type {
  CampoCapturaV3,
} from "./tiers.ts";
export type {
  CharacterSyntaxDiagnostic,
  DepotAnalysisLlmShape,
  DepotAnalysisOk,
  DepotAnalysisParseResult,
  DepotAnalysisResult,
  DepotEntitlements,
  DepotEntryInput,
  DepotEntryPayload,
  DepotPayloadOk,
  DepotPayloadResult,
  DepotValidationError,
  EyeAudit,
  EyeCode,
  EyeDefinition,
  EyeDialect,
  GroundingStatus,
  SystemicAnalysis,
  UserTier,
} from "./types.ts";
export { EYE_CODES, USER_TIERS } from "./types.ts";

export {
  CANON_TEN_EYES,
  buildActiveCharacterMap,
  buildActiveEyeMap,
  characterMapDe,
  computeDeltaGap,
  emptyActiveCharacterMap,
  emptyActiveEyeMap,
  emptyEyeAudits,
  etiquetaCodigoOjo,
  etiquetaOjo,
  isEyeCode,
  normalizarVaciosSintacticos,
  obtenerOjoV3,
  parseEyeCode,
  vaciosDesdeActiveMap,
} from "./ojos.ts";

export {
  ADVANCED_TIERS,
  TIER_MAX_EYE,
  camposObligatoriosPorTier,
  camposVisiblesPorTier,
  isAdvancedTier,
  isEyeLocked,
  isUserTier,
  maxUnlockedEye,
  normalizarUserTier,
  userTierFromEntitlements,
} from "./tiers.ts";

export {
  hidratarResultadoV3,
  isDepotAnalysisResult,
  normalizarPayload,
  parseDepotAnalysisResult,
  scaffoldAnalysisResult,
  validarPayload,
} from "./validar.ts";

export {
  DEPOT_V3_SYNTAX_ONLY_PROMPT,
  DEPOSITO_V3_RITUAL,
  buildDepositoV3SystemPrompt,
  buildDepositoV3UserPrompt,
  serializarPromptAuditoria,
} from "./prompt.ts";

export {
  diagnosticarAuditoriaLocal,
  procesarAuditoriaV3,
} from "./motor.ts";
export type { GeminiAuditCaller, ResultadoAuditoriaV3 } from "./motor.ts";

export { evaluarDepositoV3 } from "./evaluar.ts";
export type {
  EvaluarDepositoV3Err,
  EvaluarDepositoV3Input,
  EvaluarDepositoV3Ok,
  EvaluarDepositoV3Result,
} from "./evaluar.ts";

export {
  DUAL_CARRERA_MIN_SAMPLE,
  DUAL_CARRERA_RATE,
  DUAL_GROUNDING_FLOOR,
  DUAL_OPTICA_MAX_DELTA,
  DUAL_SINTAXIS_MAX_VACIOS,
  DUAL_TITULO_MIN_SAMPLE,
  DUAL_TITULO_RATE,
  DUAL_WINDOW_SIZE,
  GRADO_CARRERA_RATE,
  GRADO_TITULO_MIN_SAMPLE,
  GRADO_TITULO_RATE,
  GRADO_WINDOW_SIZE,
  esVolcadoEstableAlto,
  esVolcadoOpticaDual,
  esVolcadoSintaxisDual,
  evaluateDualTrackPromotion,
  evaluateDualTrackPromotionDesdeVolcados,
  evaluateStudentTierPromotion,
  medirGradoConsistencia,
  medirGradoConsistenciaDesdeVolcados,
  syntacticVaciosDe,
} from "./grados.ts";
export type {
  GradoConsistencia,
  PromotionStatus,
  TierEvaluationReport,
  VolcadoConResultado,
} from "./grados.ts";
