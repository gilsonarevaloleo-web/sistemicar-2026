/**
 * Libro persistido del gimnasio. Se abre desde la lectura del límite.
 */

import type { LibroGimnasio, RecursosGimnasio } from "./types.ts";

export type { LibroGimnasio };

export function recursosVaciosSesion(): RecursosGimnasio {
  return { experiencia: "", miedo: "", familia: "", gustos: "" };
}
