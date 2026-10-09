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
  buildActiveEyeMap,
  computeDeltaGap,
  emptyActiveEyeMap,
  emptyEyeAudits,
  etiquetaCodigoOjo,
  etiquetaOjo,
  isEyeCode,
  obtenerOjoV3,
  parseEyeCode,
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
  isDepotAnalysisResult,
  normalizarPayload,
  parseDepotAnalysisResult,
  scaffoldAnalysisResult,
  validarPayload,
} from "./validar.ts";

export {
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
