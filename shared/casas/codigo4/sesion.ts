/**
 * Sesión persistida del Juez Serio.
 * Fase 2 vive en el registro; no se entrega hasta cobrar.
 */

import type { JuezSerioFase1, JuezSerioFase2 } from "./types.ts";

export type EstadoSesionJuez = "FASE1" | "FASE2_ABIERTA";

export interface SesionJuez {
  id: string;
  userId: string;
  textoVolcado: string;
  fase1: JuezSerioFase1;
  fase2: JuezSerioFase2;
  source: "gemini" | "local_fallback";
  estado: EstadoSesionJuez;
  createdAt: string;
  updatedAt: string;
}
