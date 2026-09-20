/**
 * Apunte de jornada: nombrar el día al empezar y contrastarlo al cerrar.
 * El sistema no inventa estas frases. Solo el operador las escribe.
 */

export const APUNTE_MAX_LEN = 160;

export interface JornadaApunte {
  fecha: string;
  /** "Hoy apunto a esto" */
  blanco: string;
  apuntadoAt: number;
  /** "Esto ocurrió" */
  ocurrio?: string;
  /** "Esto no" */
  noOcurrio?: string;
  cerradoAt?: number;
}

export interface JornadaApunteCierre {
  blanco: string;
  ocurrio: string;
  noOcurrio: string;
}
