/**
 * La Casa del Código 4: El Juez Serio.
 * Planeta independiente. Prompt + motor de fuerzas.
 */

export {
  CASA_CODIGO4_AXIOMAS,
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_MARCA,
  CASA_CODIGO4_NOMBRE,
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_SYSTEM_PROMPT,
  CASA_CODIGO4_VERSION,
  FUERZAS_CODIGO,
  PRINCIPIOS_MATRIZ,
  PROMPT_JUEZ_SERIO,
  buildCodigo4SystemPrompt,
  buildCodigo4UserPrompt,
  buildJuezSerioPrompt,
  diccionarioFuerzas,
  diccionarioPrincipios,
  etiquetaFuerza,
  etiquetaPrincipio,
  fuerzaDe,
  jsonSchemaJuezSerio,
  principioDe,
  recursosDelPerimetro,
  serializarPromptJuezSerio,
} from "./prompt.ts";

export type {
  EyeCode,
  FuerzaCodigo,
  JuezSerioFase1,
  JuezSerioFase2,
  JuezSerioInput,
  JuezSerioParseErr,
  JuezSerioParseOk,
  JuezSerioParseResult,
  JuezSerioResult,
  ParticipacionFuerza,
  PrincipioMatriz,
} from "./types.ts";
export { CASCADA_ENSENANZA, EYE_CODES } from "./types.ts";

export {
  CREDITO_FASE1_LECTURA,
  CREDITO_FASE2_SOLUCION,
  creditosDeFase,
  mensajeSaldoInsuficiente,
} from "./creditos.ts";
export type { FaseJuez } from "./creditos.ts";
export type { EstadoSesionJuez, SesionJuez } from "./sesion.ts";
export {
  HISTORIAL_JUEZ_LIMITE,
  formatearAuditoriaJuez,
  formatearFechaAuditoria,
  publicHistorialItem,
} from "./historial.ts";
export type { HistorialJuezItem } from "./historial.ts";

export {
  acotarAlPerimetro,
  cascadaCumpleDe,
  codigoQueCerroDelVolcado,
  confrontacionDeFuerza,
  detectarCodigoProblema,
  diagnosticarJuezSerioLocal,
  directivaDelPerimetro,
  directivaFiltraPerimetro,
  evaluarJuezSerio,
  fase2De,
  fugaInconscienteDe,
  fuerzaDebidaDe,
  fuerzaUsadaDelCierre,
  hidratarFase1,
  inferirPerimetroConquistado,
  isEyeCode,
  lecturaPerimetroDe,
  parseEyeCode,
  parseJuezSerioResult,
  participacionesDelVolcado,
} from "./motor.ts";

export { VOLCADO_PUBLICISTA } from "./volcadoPublicista.ts";
