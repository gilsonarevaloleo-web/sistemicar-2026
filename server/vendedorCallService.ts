import { construirGuionLlamada } from "../shared/vendedor/callScripts";
import type { CodigoNumero } from "../shared/umbral/engineConfig";
import { isPlanetaId, type PlanetaId } from "../shared/vendedor/planetasConfig";
import {
  canAcceptNewCall,
  insertVendedorCall,
  updateVendedorCall,
  getVendedorCall,
  type VendedorCallRecord,
} from "./vendedorCallsStore";
import {
  normalizePhoneE164,
  placeVoiceCall,
  sendWhatsappMessage,
  getTwilioConfig,
} from "./twilioVendedor";

const CODIGOS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export type SolicitarLlamadaInput = {
  telefono: string;
  whatsapp?: string | null;
  codigo: number;
  planeta: string;
  sellerRef?: string | null;
  consentimiento: string;
};

export async function solicitarLlamadaVendedor(
  input: SolicitarLlamadaInput,
): Promise<
  | { ok: true; call: VendedorCallRecord; twilioReady: boolean }
  | { ok: false; error: string; status?: number }
> {
  const phrase = (input.consentimiento || "").trim().toLowerCase();
  if (phrase !== "llamame" && phrase !== "llámame") {
    return {
      ok: false,
      error: 'Consentimiento requerido: el lead debe decir «Llámame».',
      status: 400,
    };
  }

  if (!CODIGOS.has(input.codigo) || !isPlanetaId(input.planeta)) {
    return { ok: false, error: "Código o planeta inválido.", status: 400 };
  }

  const telefono = normalizePhoneE164(input.telefono);
  if (!telefono) {
    return {
      ok: false,
      error: "Teléfono inválido. Usa formato internacional o 9 dígitos Perú.",
      status: 400,
    };
  }

  const whatsappRaw = input.whatsapp?.trim()
    ? normalizePhoneE164(input.whatsapp)
    : telefono;
  const sellerRef = input.sellerRef?.trim().toUpperCase() || null;
  const codigo = input.codigo as CodigoNumero;
  const planeta = input.planeta as PlanetaId;
  const guion = construirGuionLlamada(codigo, planeta, sellerRef);

  const cupo = canAcceptNewCall();
  const now = new Date().toISOString();
  const id = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (!cupo.ok) {
    const blocked: VendedorCallRecord = {
      id,
      telefono,
      whatsapp: whatsappRaw,
      codigo,
      planeta,
      sellerRef,
      consentimiento: "llamame",
      status: "limit_blocked",
      canalUsado: null,
      intentos: 0,
      twilioCallSid: null,
      twilioMessageSid: null,
      error: `Límite diario alcanzado (${cupo.used}/${cupo.limit})`,
      guionResumen: guion.voz.slice(0, 160),
      createdAt: now,
      updatedAt: now,
    };
    insertVendedorCall(blocked);
    return {
      ok: false,
      error: `Límite de ${cupo.limit} llamadas/día alcanzado. Intenta mañana.`,
      status: 429,
    };
  }

  const record: VendedorCallRecord = {
    id,
    telefono,
    whatsapp: whatsappRaw,
    codigo,
    planeta,
    sellerRef,
    consentimiento: "llamame",
    status: "queued",
    canalUsado: null,
    intentos: 0,
    twilioCallSid: null,
    twilioMessageSid: null,
    error: null,
    guionResumen: guion.voz.slice(0, 160),
    createdAt: now,
    updatedAt: now,
  };
  insertVendedorCall(record);

  const twilioReady = !!getTwilioConfig();
  // Disparo async de voz (no bloquea respuesta HTTP más de lo necesario)
  void attemptVoiceThenMaybeWhatsapp(id);

  return { ok: true, call: record, twilioReady };
}

export async function attemptVoiceThenMaybeWhatsapp(
  callId: string,
): Promise<VendedorCallRecord | null> {
  const call = getVendedorCall(callId);
  if (!call) return null;

  updateVendedorCall(callId, {
    status: "calling",
    canalUsado: "telefono",
    intentos: call.intentos + 1,
  });

  const voice = await placeVoiceCall({ to: call.telefono, callId });
  if (voice.ok && voice.sid) {
    return updateVendedorCall(callId, {
      twilioCallSid: voice.sid,
      status: "calling",
      error: null,
    });
  }

  // Sin Twilio o fallo inmediato → WhatsApp fallback
  return fallbackWhatsapp(callId, voice.error || "voice_failed");
}

export async function handleTwilioVoiceStatus(params: {
  callId: string;
  callStatus: string;
}): Promise<VendedorCallRecord | null> {
  const call = getVendedorCall(params.callId);
  if (!call) return null;

  const status = params.callStatus.toLowerCase();
  if (status === "completed" || status === "answered" || status === "in-progress") {
    if (status === "completed" || status === "answered") {
      return updateVendedorCall(params.callId, {
        status: "completed",
        canalUsado: "telefono",
        error: null,
      });
    }
    return call;
  }

  if (
    status === "no-answer" ||
    status === "busy" ||
    status === "failed" ||
    status === "canceled"
  ) {
    updateVendedorCall(params.callId, {
      status: "no_answer",
      error: `voice:${status}`,
    });
    return fallbackWhatsapp(params.callId, status);
  }

  return call;
}

async function fallbackWhatsapp(
  callId: string,
  reason: string,
): Promise<VendedorCallRecord | null> {
  const call = getVendedorCall(callId);
  if (!call) return null;

  const guion = construirGuionLlamada(
    call.codigo,
    call.planeta,
    call.sellerRef,
  );
  const to = call.whatsapp || call.telefono;
  const msg = await sendWhatsappMessage({ to, body: guion.whatsapp });

  if (msg.ok && msg.sid) {
    return updateVendedorCall(callId, {
      status: "whatsapp_sent",
      canalUsado: "whatsapp",
      twilioMessageSid: msg.sid,
      error: `fallback_after:${reason}`,
      intentos: call.intentos + 1,
    });
  }

  return updateVendedorCall(callId, {
    status: "failed",
    error: msg.error || reason,
    intentos: call.intentos + 1,
  });
}

export function getGuionForCall(callId: string): string | null {
  const call = getVendedorCall(callId);
  if (!call) return null;
  return construirGuionLlamada(call.codigo, call.planeta, call.sellerRef).voz;
}
