/**
 * Sesión persistida de la Casa 6: Umbral.
 * El volcado es gratis y deja lectura local. El mapa pago es opcional.
 */

import type { Umbral5Lectura } from "./types.ts";

export type EstadoSesionUmbral5 = "VOLCADO_GRATIS" | "MAPA_PAGO";

export type FuenteLecturaUmbral5 = "gemini" | "local_fallback" | "local_gratis";

export interface SesionUmbral5 {
  id: string;
  userId: string;
  textoVolcado: string;
  lectura: Umbral5Lectura | null;
  source: FuenteLecturaUmbral5 | null;
  estado: EstadoSesionUmbral5;
  createdAt: string;
  updatedAt: string;
}
