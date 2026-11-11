/**
 * Reexporta el servicio del gimnasio (planeta 6).
 */

export {
  abrirLibroGimnasio,
  abrirLibroVendedor,
  continuarCapituloGimnasio,
  leerLibroGimnasio,
  listarLibrosGimnasio,
  registerGimnasio6Routes,
  responderGimnasio,
} from "./services/gimnasio6Engine.ts";
export type {
  Gimnasio6EngineDeps,
  Gimnasio6EngineErr,
  Gimnasio6GeminiCaller,
} from "./services/gimnasio6Engine.ts";
