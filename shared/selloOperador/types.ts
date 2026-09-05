/**
 * Sello diario del operador. Los números se clavan antes de cualquier prosa.
 * Gemini no emite este sello.
 */

export type SelladoPor = "operador";

export interface EvidenciaSelloInput {
  fecha: string;
  nowMs: number;
  userId: string;
  totalPS: number;
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  jornadaPlanMin: number;
  segmentosTotales: number;
  segmentosCerradosManual: number;
  segmentosEntropia: number;
  vehiculosCerradosManual: number;
  vehiculosCerradosSistema: number;
  vehiculosActivos: number;
  recintosCerrados: number;
  recintosHeredados: number;
  recintosAbiertos: number;
}

export interface SelloOperadorDraft {
  fecha: string;
  userId: string;
  timestamp: number;
  selloEmitido: true;
  selladoPor: SelladoPor;
  totalPS: number;
  conquistaMin: number;
  entropiaMin: number;
  vacioMin: number;
  jornadaPlanMin: number;
  segmentosTotales: number;
  segmentosCerradosManual: number;
  tension: string;
  evidenciaHechos: string[];
  mandato: string;
  recintosCerrados: number;
  recintosHeredados: number;
  recintosAbiertos: number;
  vehiculosCerradosManual: number;
  vehiculosCerradosSistema: number;
  vehiculosActivos: number;
}

/** Capas de cierre. Un sello de jornada no cierra un trabajo ni un proyecto. */
export const CAPAS_CIERRE = {
  bloque: "Cierre de bloque — un vehículo (costura, estudio, un imprevisto).",
  puerta: "Cierre de puerta — una franja del anillo. Puede haber varias al día.",
  jornada: "Sello de jornada — uno. Nace cuando termina el plan (última puerta).",
  proyecto: "Cierre de proyecto — otra escala. Vive en el Hub, no en el reloj del día.",
} as const;
