/**
 * Sesión persistida de la Casa 5: Umbral.
 * Misma forma que el Juez: texto + dictamen + estado por usuario.
 * El volcado es gratis. La lectura se cobra. El gimnasio no se abre en A–D.
 */

import type { Umbral5Lectura } from "./types.ts";

export type EstadoSesionUmbral5 = "VOLCADO_GRATIS" | "MAPA_PAGO";

export interface SesionUmbral5 {
  id: string;
  userId: string;
  textoVolcado: string;
  lectura: Umbral5Lectura | null;
  source: "gemini" | "local_fallback" | null;
  estado: EstadoSesionUmbral5;
  createdAt: string;
  updatedAt: string;
}
