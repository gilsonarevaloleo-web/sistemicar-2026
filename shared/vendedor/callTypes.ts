import type { CodigoNumero } from "../umbral/engineConfig.ts";
import type { PlanetaId } from "./planetasConfig.ts";

export const VENDEDOR_CALLS_DAILY_LIMIT = 20;

export type VendedorCallCanal = "telefono" | "whatsapp";

export type VendedorCallStatus =
  | "queued"
  | "calling"
  | "no_answer"
  | "completed"
  | "whatsapp_sent"
  | "failed"
  | "limit_blocked";

export interface VendedorCallRecord {
  id: string;
  telefono: string;
  whatsapp: string | null;
  codigo: CodigoNumero;
  planeta: PlanetaId;
  sellerRef: string | null;
  consentimiento: "llamame";
  status: VendedorCallStatus;
  canalUsado: VendedorCallCanal | null;
  intentos: number;
  twilioCallSid: string | null;
  twilioMessageSid: string | null;
  error: string | null;
  guionResumen: string;
  createdAt: string;
  updatedAt: string;
}
