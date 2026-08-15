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
  type CallCallbackParams,
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

export type SolicitarLlamadaResult =
  | {
      ok: true;
      call: VendedorCallRecord;
      twilioReady: boolean;
      voiceOk: boolean;
      whatsappOk: boolean;
      detail: string;
    }
  | { ok: false; error: string; status?: number };

export async function solicitarLlamadaVendedor(
  input: SolicitarLlamadaInput,
): Promise<SolicitarLlamadaResult> {
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

  const whatsappRaw =
    (input.whatsapp?.trim()
      ? normalizePhoneE164(input.whatsapp)
      : telefono) || telefono;
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

  // CRÍTICO en Netlify: await antes de responder. Si se dispara en void,
  // el runtime mata el trabajo y no hay llamada ni WhatsApp.
  const outcome = await attemptVoiceThenMaybeWhatsapp(id);

  const finalCall = getVendedorCall(id) ?? outcome ?? record;
  const voiceOk = Boolean(finalCall.twilioCallSid);
  const whatsappOk = Boolean(finalCall.twilioMessageSid);

  let detail = "Solicitud registrada.";
  if (voiceOk && !whatsappOk) {
    detail =
      "Llamada iniciada. Si no contestas, te escribimos por WhatsApp.";
  } else if (!voiceOk && whatsappOk) {
    detail = "No se pudo llamar; se envió WhatsApp con tu puerta de entrada.";
  } else if (voiceOk && whatsappOk) {
    detail = "Llamada iniciada y WhatsApp de respaldo enviado.";
  } else if (!twilioReady) {
    detail =
      "Registrado en admin, pero Twilio no está configurado en el servidor.";
  } else {
    detail =
      finalCall.error ||
      "Twilio no inició llamada ni WhatsApp. Revisa números y logs.";
  }

  return {
    ok: true,
    call: finalCall,
    twilioReady,
    voiceOk,
    whatsappOk,
    detail,
  };
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

  const callback: CallCallbackParams = {
    callId,
    telefono: call.telefono,
    whatsapp: call.whatsapp || call.telefono,
    codigo: call.codigo,
    planeta: call.planeta,
    sellerRef: call.sellerRef,
  };

  const voice = await placeVoiceCall({ to: call.telefono, callback });
  if (voice.ok && voice.sid) {
    return updateVendedorCall(callId, {
      twilioCallSid: voice.sid,
      status: "calling",
      error: null,
    });
  }

  // Fallo inmediato al crear la llamada → WhatsApp ahora (misma invocación).
  return fallbackWhatsapp(callId, voice.error || "voice_failed");
}

export async function handleTwilioVoiceStatus(params: {
  callId: string;
  callStatus: string;
  /** Params en query por si la instancia no tiene el registro en memoria. */
  telefono?: string;
  whatsapp?: string;
  codigo?: number;
  planeta?: string;
  sellerRef?: string | null;
}): Promise<VendedorCallRecord | null> {
  const status = params.callStatus.toLowerCase();

  let call = getVendedorCall(params.callId);

  if (status === "completed" || status === "answered" || status === "in-progress") {
    if (call && (status === "completed" || status === "answered")) {
      return updateVendedorCall(params.callId, {
        status: "completed",
        canalUsado: "telefono",
        error: null,
      });
    }
    return call;
  }

  const noAnswer =
    status === "no-answer" ||
    status === "busy" ||
    status === "failed" ||
    status === "canceled";

  if (!noAnswer) return call;

  if (call) {
    updateVendedorCall(params.callId, {
      status: "no_answer",
      error: `voice:${status}`,
    });
    return fallbackWhatsapp(params.callId, status);
  }

  // Instancia fría: reconstruir desde query y mandar WhatsApp igual.
  if (
    params.telefono &&
    params.codigo &&
    params.planeta &&
    isPlanetaId(params.planeta) &&
    CODIGOS.has(params.codigo)
  ) {
    const guion = construirGuionLlamada(
      params.codigo as CodigoNumero,
      params.planeta,
      params.sellerRef,
    );
    const to = params.whatsapp || params.telefono;
    const msg = await sendWhatsappMessage({ to, body: guion.whatsapp });
    const now = new Date().toISOString();
    const synthetic: VendedorCallRecord = {
      id: params.callId,
      telefono: params.telefono,
      whatsapp: to,
      codigo: params.codigo as CodigoNumero,
      planeta: params.planeta,
      sellerRef: params.sellerRef ?? null,
      consentimiento: "llamame",
      status: msg.ok ? "whatsapp_sent" : "failed",
      canalUsado: msg.ok ? "whatsapp" : null,
      intentos: 1,
      twilioCallSid: null,
      twilioMessageSid: msg.sid ?? null,
      error: msg.ok ? `fallback_after:${status}` : msg.error || status,
      guionResumen: guion.voz.slice(0, 160),
      createdAt: now,
      updatedAt: now,
    };
    insertVendedorCall(synthetic);
    return synthetic;
  }

  return null;
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

/** Guion para TwiML — desde registro o desde query (serverless). */
export function resolveGuionForTwiml(params: {
  callId?: string;
  codigo?: number;
  planeta?: string;
  sellerRef?: string | null;
}): string {
  if (params.callId) {
    const call = getVendedorCall(params.callId);
    if (call) {
      return construirGuionLlamada(call.codigo, call.planeta, call.sellerRef).voz;
    }
  }
  if (
    params.codigo &&
    params.planeta &&
    isPlanetaId(params.planeta) &&
    CODIGOS.has(params.codigo)
  ) {
    return construirGuionLlamada(
      params.codigo as CodigoNumero,
      params.planeta,
      params.sellerRef,
    ).voz;
  }
  return "Hola. Soy el vendedor de Sistemicar. Entra en sistemicar punto app para continuar.";
}
