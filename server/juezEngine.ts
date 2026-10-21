/**
 * Reexporta el servicio del Juez Serio.
 * Fuente: `server/services/juezEngine.ts`.
 */

export {
  CREDITO_FASE1_LECTURA,
  CREDITO_FASE2_SOLUCION,
  ejecutarFase1,
  ejecutarFase2,
  ejecutarJuezEngine,
  evaluarJuezEngine,
  normalizarInputJuez,
  registerJuezRoutes,
} from "./services/juezEngine.ts";
export type {
  EyeCode,
  Fase1Ok,
  Fase1Result,
  Fase2Ok,
  Fase2Result,
  JuezEngineDeps,
  JuezEngineErr,
  JuezEngineOk,
  JuezEngineResult,
  JuezGeminiCaller,
  JuezSerioInput,
  JuezSerioResult,
} from "./services/juezEngine.ts";
