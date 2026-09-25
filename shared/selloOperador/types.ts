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
  /** Presencia única sobre el plan (mismo reloj que Cobertura del día). */
  minutosPresencia?: number;
  /** Dirección única sobre el plan. */
  minutosDireccion?: number;
  /** Horario no planificado del día-jornada (24 h − plan). */
  minutosNoConquistado?: number;
  /** 100 − % no conquistado. Misma cifra que la barra de cobertura. */
  coberturaPct?: number;
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
  minutosPresencia?: number;
  minutosDireccion?: number;
  minutosNoConquistado?: number;
  coberturaPct?: number;
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
