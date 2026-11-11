/**
 * Planeta 6 · Gimnasio.
 * Dos puertas: A límite, B vendedor. Tres tiempos por código.
 */

export {
  GIMNASIO6_FIRMA,
  GIMNASIO6_MARCA,
  GIMNASIO6_NOMBRE,
  GIMNASIO6_VERSION,
  MODULOS_GIMNASIO,
  SESION_PUERTA_VENDEDOR,
  esModuloGimnasio,
  puertaDeModulo,
} from "./types.ts";
export type {
  CapituloId,
  CodigoGimnasio,
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
  PuertaGimnasio,
  RecursosGimnasio,
  SubcodigoId,
  TurnoGimnasio,
} from "./types.ts";

export {
  detectarModuloGimnasio,
  etiquetaModulo,
  mensajeOferta,
  mensajeOfertaVendedor,
} from "./oferta.ts";

export {
  CANON_GIMNASIO,
  ETIQUETA_CAPITULO,
  ETIQUETA_SUBCODIGO,
  ETIQUETA_TIEMPO,
  capituloPreparable,
  capituloVisibleDe,
  etiquetaCapituloDe,
  etiquetaSubcodigo,
  pasosDelCapitulo,
  preguntaCanon,
  recorteEscenario,
  siguienteCodigo,
  siguientePuntero,
} from "./canon.ts";

export {
  ETIQUETA_TIEMPO as ETIQUETA_TIEMPO_FICHA,
  FICHAS_LIMITE,
  FICHAS_VENDEDOR,
  conEscena,
  esCodigoGimnasio,
  esTiempoId,
  fichaDe,
  fichaLimiteDe,
  fichaVendedorDe,
  packDe,
  tiempoDe,
  tiempoLimiteDe,
  tiempoVendedorDe,
} from "./fichas.ts";
export type {
  FichaVivaLimite,
  NombreTiempo,
  TiempoFicha,
  TiempoId,
} from "./fichas.ts";

export {
  GIMNASIO6_AXIOMAS,
  GIMNASIO6_RITUAL_ENTRADA,
  GIMNASIO6_SYSTEM_PROMPT,
  GIMNASIO6_SYSTEM_PROMPT_VENDEDOR,
  PROMPT_GIMNASIO6,
  buildGimnasio6UserPrompt,
  copiarLibro,
  serializarPromptGimnasio6,
} from "./prompt.ts";

export {
  esLibroContinuable,
  etiquetaLibro,
  formatearCopiaLibroNumerado,
  numeroLibro,
  numerosLibro,
  ordenarLibrosPorCreacion,
  recortarLibro,
} from "./historial.ts";

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
