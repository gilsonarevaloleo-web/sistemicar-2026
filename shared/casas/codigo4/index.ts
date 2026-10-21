/**
 * La Casa del Código 4: El Juez Serio.
 * Planeta independiente. Prompt + motor de perímetro.
 */

export {
  CASA_CODIGO4_AXIOMAS,
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_MARCA,
  CASA_CODIGO4_NOMBRE,
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_SYSTEM_PROMPT,
  CASA_CODIGO4_VERSION,
  PRINCIPIOS_MATRIZ,
  PROMPT_JUEZ_SERIO,
  buildCodigo4SystemPrompt,
  buildCodigo4UserPrompt,
  buildJuezSerioPrompt,
  diccionarioPrincipios,
  etiquetaPrincipio,
  jsonSchemaJuezSerio,
  principioDe,
  recursosDelPerimetro,
  serializarPromptJuezSerio,
} from "./prompt.ts";

export type {
  EyeCode,
  JuezSerioFase1,
  JuezSerioFase2,
  JuezSerioInput,
  JuezSerioParseErr,
  JuezSerioParseOk,
  JuezSerioParseResult,
  JuezSerioResult,
  PrincipioMatriz,
} from "./types.ts";
export { EYE_CODES } from "./types.ts";

export {
  acotarAlPerimetro,
  detectarCodigoProblema,
  diagnosticarJuezSerioLocal,
  directivaDelPerimetro,
  directivaFiltraPerimetro,
  evaluarJuezSerio,
  fugaInconscienteDe,
  inferirPerimetroConquistado,
  isEyeCode,
  lecturaPerimetroDe,
  parseEyeCode,
  parseJuezSerioResult,
} from "./motor.ts";
