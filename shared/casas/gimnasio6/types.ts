/**
 * Planeta 6 · Gimnasio.
 * Capa profunda del límite. No es puerta de entrada.
 * Dos productos, lado a lado: Puerta A (límite) y Puerta B (vendedor).
 */

export const GIMNASIO6_VERSION = "1.1.0-gimnasio-fichas-vivas" as const;
export const GIMNASIO6_NOMBRE = "Gimnasio";
export const GIMNASIO6_MARCA = "Umbral";
export const GIMNASIO6_FIRMA =
  "Sabe qué hacer. El cuerpo niega. Los límites se mantienen porque no hay gimnasio.";

/** Puerta A = fichas del Umbral. Puerta B = Carácter-Código del Oficio. */
export type PuertaGimnasio = "limite" | "vendedor";
export type ModuloGimnasio = PuertaGimnasio;

export const MODULOS_GIMNASIO: readonly ModuloGimnasio[] = ["limite", "vendedor"];
export const SESION_PUERTA_VENDEDOR = "puerta:vendedor";

/** Alias de persistencia. Un código del 1 al 10. */
export type CapituloId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type CodigoGimnasio = CapituloId;
/** Siempre 1 en libros nuevos. Se conserva para hidratar libros viejos. */
export type SubcodigoId = 1 | 2 | 3 | 4;
/** Tiempo: 1 plantar, 2 rozar, 3 sostener. */
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
  /** Código activo (C1–C10). */
  capitulo: CapituloId;
  subcodigo: SubcodigoId;
  /** Tiempo: 1 plantar, 2 rozar, 3 sostener. */
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
  etiquetaTiempo: string;
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

export function puertaDeModulo(modulo: string | null | undefined): PuertaGimnasio {
  if (modulo === "vendedor") return "vendedor";
  return "limite";
}

export function esModuloGimnasio(raw: unknown): raw is ModuloGimnasio {
  return raw === "limite" || raw === "vendedor";
}
