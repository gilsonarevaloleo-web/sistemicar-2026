/**
 * Planeta 6 · Gimnasio.
 * Capa profunda del límite. No es puerta de entrada.
 * Módulo 1: exposición social ante un producto.
 */

export const GIMNASIO6_VERSION = "1.0.0-gimnasio-casa6" as const;
export const GIMNASIO6_NOMBRE = "Gimnasio";
export const GIMNASIO6_MARCA = "Umbral";
export const GIMNASIO6_FIRMA =
  "Sabe qué hacer. El cuerpo niega. Los límites se mantienen porque no hay gimnasio.";

export type ModuloGimnasio = "social_producto";

export const MODULOS_GIMNASIO: readonly ModuloGimnasio[] = ["social_producto"];

export type CapituloId = 1 | 2 | 3 | 4;
export type SubcodigoId = 1 | 2 | 3 | 4;
export type PreguntaIndice = 1 | 2 | 3;

export type EstadoCapitulo = "BLOQUEADO" | "ABIERTO" | "SELLADO" | "NO_PREPARADO";

export interface PreguntaCanon {
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  indice: PreguntaIndice;
  escenario: string;
  pregunta: string;
  criterioMotor: string;
}

export interface RecursosGimnasio {
  experiencia: string;
  miedo: string;
  familia: string;
  gustos: string;
}

export interface TurnoGimnasio {
  id: string;
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  indice: PreguntaIndice;
  variante: number;
  escenario: string;
  pregunta: string;
  respuesta: string | null;
  pasa: boolean | null;
  creadoAt: string;
}

export interface PunteroGimnasio {
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  indice: PreguntaIndice;
  variante: number;
}

export type EstadoLibro =
  | "ABIERTO"
  | "CAPITULO_SELLADO"
  | "TOPE_DIARIO"
  | "LIBRO_CERRADO";

export interface LibroGimnasio {
  id: string;
  userId: string;
  sesionUmbral5Id: string;
  modulo: ModuloGimnasio;
  limiteOrigen: string;
  recursos: RecursosGimnasio;
  puntero: PunteroGimnasio;
  estado: EstadoLibro;
  capituloSelladoDia: string | null;
  capitulosSellados: CapituloId[];
  turnos: TurnoGimnasio[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluacionTurno {
  pasa: boolean;
  motivo: string;
}

export interface PreguntaViva {
  escenario: string;
  pregunta: string;
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  indice: PreguntaIndice;
  variante: number;
  etiquetaCapitulo: string;
}

export type EstadoPasoCapitulo = "hecho" | "actual" | "pendiente";

export interface PasoCapitulo {
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  indice: PreguntaIndice;
  etiquetaSubcodigo: string;
  etiquetaCapitulo: string;
  estado: EstadoPasoCapitulo;
  recorteEscenario: string | null;
}
