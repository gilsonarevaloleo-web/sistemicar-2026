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
  sendSmsMessage,
  getTwilioConfig,
  buildWhatsAppContentVariables,
  type CallCallbackParams,
} from "./twilioVendedor";

const CODIGOS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

function deepLinkFor(planeta: PlanetaId, sellerRef?: string | null): string {
  const base =
    planeta === "ESPEJO"
      ? "https://www.sistemicar.app/pagos?plan=espejo_inicio"
      : planeta === "JORNADA"
        ? "https://www.sistemicar.app/pagos?plan=planificacion_base"
        : "https://www.sistemicar.app/umbral/entrada";
  if (!sellerRef) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}ref=${encodeURIComponent(sellerRef)}`;
}

async function sendWhatsappWithTemplate(opts: {
  to: string;
  body: string;
  codigo: CodigoNumero;
  planeta: PlanetaId;
  sellerRef?: string | null;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  return sendWhatsappMessage({
    to: opts.to,
    body: opts.body,
    contentVariables: buildWhatsAppContentVariables({
      planeta: opts.planeta,
      codigo: opts.codigo,
      deepLink: deepLinkFor(opts.planeta, opts.sellerRef),
    }),
  });
}

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
      voiceError: string | null;
      whatsappError: string | null;
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
  const contentSidReady = Boolean(getTwilioConfig()?.whatsappContentSid);

  // CRÍTICO en Netlify: await antes de responder. Si se dispara en void,
  // el runtime mata el trabajo y no hay llamada ni WhatsApp.
  const outcome = await attemptVoiceThenMaybeWhatsapp(id);

  const finalCall = getVendedorCall(id) ?? outcome ?? record;
  const voiceOk = Boolean(finalCall.twilioCallSid);
  const whatsappOk = Boolean(finalCall.twilioMessageSid);

  // Separar causas: "voz:… | wa:…" (no mezclar con el mensaje amable).
  let voiceError: string | null = null;
  let whatsappError: string | null = null;
  if (finalCall.error) {
    const vozMatch = finalCall.error.match(/voz:([^|]+)/i);
    const waMatch = finalCall.error.match(/wa:([^|]+)/i);
    if (vozMatch) voiceError = vozMatch[1].trim();
    if (waMatch) whatsappError = waMatch[1].trim();
    if (!voiceOk && !voiceError && !whatsappOk) {
      // Error crudo sin prefijos (legacy)
      voiceError = finalCall.error;
    }
  }

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
  } else if (voiceError && /21219|verificad/i.test(voiceError)) {
    detail = voiceError;
  } else if (!contentSidReady && /ContentSid|plantilla/i.test(finalCall.error || "")) {
    detail =
      (voiceError ? `Voz: ${voiceError}. ` : "") +
      (whatsappError ||
        "Falta TWILIO_WHATSAPP_CONTENT_SID (plantilla HX…).");
  } else {
    detail =
      [voiceError && `Voz: ${voiceError}`, whatsappError && `WA: ${whatsappError}`]
        .filter(Boolean)
        .join(" · ") ||
      finalCall.error ||
      "Twilio no inició llamada ni WhatsApp. Revisa trial (número verificado), Voice From y ContentSid.";
  }

  return {
    ok: true,
    call: finalCall,
    twilioReady,
    voiceOk,
    whatsappOk,
    voiceError,
    whatsappError,
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
    const msg = await sendWhatsappWithTemplate({
      to,
      body: guion.whatsapp,
      codigo: params.codigo as CodigoNumero,
      planeta: params.planeta,
      sellerRef: params.sellerRef,
    });
    const now = new Date().toISOString();
    let statusFinal: VendedorCallRecord["status"] = msg.ok
      ? "whatsapp_sent"
      : "failed";
    let canal: VendedorCallRecord["canalUsado"] = msg.ok ? "whatsapp" : null;
    let messageSid = msg.sid ?? null;
    let error: string | null = msg.ok
      ? `fallback_after:${status}`
      : `voz:${status} | wa:${msg.error || "failed"}`;

    if (!msg.ok) {
      const sms = await sendSmsMessage({ to, body: guion.whatsapp });
      if (sms.ok && sms.sid) {
        statusFinal = "whatsapp_sent";
        canal = "whatsapp";
        messageSid = sms.sid;
        error = `fallback_sms_after:voz:${status}|wa:${msg.error}`;
      }
    }

    const synthetic: VendedorCallRecord = {
      id: params.callId,
      telefono: params.telefono,
      whatsapp: to,
      codigo: params.codigo as CodigoNumero,
      planeta: params.planeta,
      sellerRef: params.sellerRef ?? null,
      consentimiento: "llamame",
      status: statusFinal,
      canalUsado: canal,
      intentos: 1,
      twilioCallSid: null,
      twilioMessageSid: messageSid,
      error,
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
  const msg = await sendWhatsappWithTemplate({
    to,
    body: guion.whatsapp,
    codigo: call.codigo,
    planeta: call.planeta,
    sellerRef: call.sellerRef,
  });

  if (msg.ok && msg.sid) {
    return updateVendedorCall(callId, {
      status: "whatsapp_sent",
      canalUsado: "whatsapp",
      twilioMessageSid: msg.sid,
      error: `fallback_after:${reason}`,
      intentos: call.intentos + 1,
    });
  }

  const sms = await sendSmsMessage({ to, body: guion.whatsapp });
  if (sms.ok && sms.sid) {
    return updateVendedorCall(callId, {
      status: "whatsapp_sent",
      canalUsado: "whatsapp",
      twilioMessageSid: sms.sid,
      error: `fallback_sms_after:voz:${reason}|wa:${msg.error || "failed"}`,
      intentos: call.intentos + 1,
    });
  }

  // Conservar error de voz + WA (+ SMS) — no tapar la causa de la llamada.
  const parts = [`voz:${reason}`, `wa:${msg.error || "failed"}`];
  if (sms.error && !/no configurado/i.test(sms.error)) {
    parts.push(`sms:${sms.error}`);
  }

  return updateVendedorCall(callId, {
    status: "failed",
    error: parts.join(" | "),
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
