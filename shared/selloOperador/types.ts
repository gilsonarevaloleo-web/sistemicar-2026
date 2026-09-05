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

export const HORA_RECORDATORIO_SELLO = 21;
