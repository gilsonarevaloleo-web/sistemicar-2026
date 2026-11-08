/**
 * Planeta 6 · Gimnasio.
 * Capa profunda del límite. Módulo 1: exposición social ante un producto.
 */

export {
  GIMNASIO6_FIRMA,
  GIMNASIO6_MARCA,
  GIMNASIO6_NOMBRE,
  GIMNASIO6_VERSION,
  MODULOS_GIMNASIO,
} from "./types.ts";
export type {
  CapituloId,
  EstadoCapitulo,
  EstadoLibro,
  EstadoPasoCapitulo,
  EvaluacionTurno,
  LibroGimnasio,
  ModuloGimnasio,
  PasoCapitulo,
  PreguntaCanon,
  PreguntaIndice,
  PreguntaViva,
  PunteroGimnasio,
  RecursosGimnasio,
  SubcodigoId,
  TurnoGimnasio,
} from "./types.ts";

export {
  detectarModuloGimnasio,
  etiquetaModulo,
  mensajeOferta,
} from "./oferta.ts";

export {
  CANON_GIMNASIO,
  ETIQUETA_CAPITULO,
  ETIQUETA_SUBCODIGO,
  capituloPreparable,
  capituloVisibleDe,
  etiquetaSubcodigo,
  pasosDelCapitulo,
  preguntaCanon,
  recorteEscenario,
  siguientePuntero,
} from "./canon.ts";

export {
  GIMNASIO6_AXIOMAS,
  GIMNASIO6_RITUAL_ENTRADA,
  GIMNASIO6_SYSTEM_PROMPT,
  PROMPT_GIMNASIO6,
  buildGimnasio6UserPrompt,
  copiarLibro,
  serializarPromptGimnasio6,
} from "./prompt.ts";

export {
  abrirSiguienteCapitulo,
  aplicarRespuesta,
  diaLima,
  evaluarRespuestaLocal,
  extraerEscala,
  fluidezVariante,
  parseEvaluacion,
  puedeAbrirCapitulo,
  preguntaVivaDe,
  recursosVacios,
  resolverEvaluacion,
  textoCopiaLibro,
} from "./motor.ts";
