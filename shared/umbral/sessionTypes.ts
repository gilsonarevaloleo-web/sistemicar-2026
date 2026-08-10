/**
 * Umbral v2 — Tipos de sesión persistida.
 */

import type { ModoUmbral } from "./engineConfig.ts";

export type EstadoSesionUmbral = "EN_PROGRESO" | "COMPLETADO";

export interface HistorialCodigoUmbral {
  codigo: number;
  intentos: number;
  respuestaAprobada: string;
  feedbackGemini: string;
  psGanados: number;
  fechaAprobacion: string;
}

export interface SesionUmbral {
  id: string;
  userId: string;
  modo: ModoUmbral;
  estado: EstadoSesionUmbral;
  codigoActual: number;
  intentosTotales: number;
  historialCodigos: HistorialCodigoUmbral[];
  /**
   * Intentos acumulados en el código actual aún no aprobado.
   * Necesario para métricas de fricción en sesiones EN_PROGRESO.
   */
  intentosCodigoActual: number;
  createdAt: string;
  updatedAt: string;
}

export function isEstadoSesionUmbral(
  value: unknown,
): value is EstadoSesionUmbral {
  return value === "EN_PROGRESO" || value === "COMPLETADO";
}
