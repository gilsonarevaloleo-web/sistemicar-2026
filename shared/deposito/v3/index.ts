/**
 * Depósito V3 — contratos públicos.
 * No reexporta el motor V2. No registra rutas. No pinta UI.
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
