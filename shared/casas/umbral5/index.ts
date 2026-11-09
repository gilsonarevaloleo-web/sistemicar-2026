/**
 * La Casa 6: Umbral.
 * El límite ya está nombrado. El código es el canal. C8–C10 se nombran.
 */

export {
  CASA_UMBRAL5_AXIOMAS,
  CASA_UMBRAL5_FIRMA,
  CASA_UMBRAL5_MARCA,
  CASA_UMBRAL5_NOMBRE,
  CASA_UMBRAL5_RITUAL,
  CASA_UMBRAL5_SYSTEM_PROMPT,
  CASA_UMBRAL5_VERSION,
  ETIQUETA_TIPO,
  PROMPT_UMBRAL5,
  buildUmbral5Prompt,
  buildUmbral5SystemPrompt,
  buildUmbral5UserPrompt,
  etiquetaTipo,
  jsonSchemaUmbral5,
  serializarPromptUmbral5,
} from "./prompt.ts";

export type {
  CodigoLimite,
  CodigoUsuario,
  ModuloGimnasioOferta,
  PisoIntento,
  PoloLimite,
  TipoLimite,
  Umbral5Input,
  Umbral5Lectura,
  Umbral5ParseErr,
  Umbral5ParseOk,
  Umbral5ParseResult,
} from "./types.ts";
export { CODIGOS_USUARIO, TIPOS_LIMITE } from "./types.ts";

export {
  CODIGOS_LIMITE,
  DICCIONARIO_LIMITES,
  asientoDeCanal,
  entradaLimite,
  etiquetaPolo,
} from "./diccionarioLimites.ts";
export type { EntradaDiccionarioLimite } from "./diccionarioLimites.ts";

export {
  MIN_REPETICIONES_PESO,
  MIN_VOLCADOS_PESO,
  hayPesoParaGimnasio,
  pesoDeVolcados,
} from "./peso.ts";
export type { PesoLimite } from "./peso.ts";

export { CREDITO_LECTURA_MAPA, mensajeSaldoInsuficiente } from "./creditos.ts";
export type {
  EstadoSesionUmbral5,
  FuenteLecturaUmbral5,
  SesionUmbral5,
} from "./sesion.ts";

export {
  adjuntarModuloGimnasio,
  detectarCanal,
  detectarPisoIntento,
  detectarTipoLimite,
  diagnosticarUmbral5Local,
  esQuejaEspejo,
  evaluarUmbral5,
  isCodigoLimite,
  isCodigoUsuario,
  parseCodigoLimite,
  parseCodigoUsuario,
  parseUmbral5Lectura,
  sellarLectura,
} from "./motor.ts";
