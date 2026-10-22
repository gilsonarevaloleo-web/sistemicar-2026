/**
 * La Casa 5: Umbral.
 * El límite ya está nombrado. C8–C10 son dominio nuestro.
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
  CodigoUsuario,
  PisoIntento,
  TipoLimite,
  Umbral5Input,
  Umbral5Lectura,
  Umbral5ParseErr,
  Umbral5ParseOk,
  Umbral5ParseResult,
} from "./types.ts";
export { CODIGOS_USUARIO, TIPOS_LIMITE } from "./types.ts";

export { CREDITO_LECTURA_MAPA, mensajeSaldoInsuficiente } from "./creditos.ts";
export type { EstadoSesionUmbral5, SesionUmbral5 } from "./sesion.ts";

export {
  detectarPisoIntento,
  detectarTipoLimite,
  diagnosticarUmbral5Local,
  esQuejaEspejo,
  evaluarUmbral5,
  isCodigoUsuario,
  parseCodigoUsuario,
  parseUmbral5Lectura,
  sellarLectura,
} from "./motor.ts";
