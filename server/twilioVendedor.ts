/**
 * Twilio — Voice (1º) + WhatsApp (2º) para el Vendedor Algorítmico.
 * Sin SDK: REST con fetch.
 *
 * Importante (Netlify): TwiML y status callback deben llevar codigo/planeta/tel
 * en la query — la memoria de la función no se comparte entre invocaciones.
 *
 * WhatsApp Business (Twilio): fuera de sandbox / ventana 24h exige Content Template
 * (ContentSid HX…). Sin TWILIO_WHATSAPP_CONTENT_SID el fallback falla con
 * "ContentSid Required" — y eso es lo que ve el lead si la voz también falló.
 */

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromVoice: string;
  fromWhatsapp: string;
  /** Plantilla WhatsApp aprobada (HX…). Obligatorio fuera de sandbox libre. */
  whatsappContentSid: string | null;
  smsFrom: string | null;
  messagingServiceSid: string | null;
  publicBaseUrl: string;
};

/** Evita 301 sistemicar.app → www que rompe POST de Twilio. */
export function resolvePublicBaseUrl(): string {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    "https://www.sistemicar.app";
  return raw
    .replace(/\/$/, "")
    .replace("://sistemicar.app", "://www.sistemicar.app");
}

export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromVoice = process.env.TWILIO_VOICE_FROM?.trim();
  const fromWhatsappRaw =
    process.env.TWILIO_WHATSAPP_FROM?.trim() ||
    process.env.TWILIO_VOICE_FROM?.trim();
  if (!accountSid || !authToken || !fromVoice) return null;

  const whatsappContentSid =
    process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() || null;
  const smsFrom = process.env.TWILIO_SMS_FROM?.trim() || null;
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;

  return {
    accountSid,
    authToken,
    fromVoice,
    fromWhatsapp: fromWhatsappRaw!.startsWith("whatsapp:")
      ? fromWhatsappRaw!
      : `whatsapp:${fromWhatsappRaw}`,
    whatsappContentSid,
    smsFrom,
    messagingServiceSid,
    publicBaseUrl: resolvePublicBaseUrl(),
  };
}

function basicAuth(sid: string, token: string): string {
  return Buffer.from(`${sid}:${token}`).toString("base64");
}

async function twilioForm(
  cfg: TwilioConfig,
  path: string,
  params: Record<string, string>,
): Promise<{ ok: boolean; sid?: string; status?: string; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}${path}`;
  const body = new URLSearchParams(params);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(cfg.accountSid, cfg.authToken)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as {
      sid?: string;
      status?: string;
      message?: string;
      error_message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error_message || `Twilio HTTP ${res.status}`,
      };
    }
    return { ok: true, sid: data.sid, status: data.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Twilio network error",
    };
  }
}

/** Mensajes de voz que el usuario / admin entiende (trial, geo, canal). */
export function humanizeTwilioVoiceError(raw: string): string {
  const s = String(raw || "");
  const lower = s.toLowerCase();
  if (/whatsapp/i.test(s) && /from|caller|voice|call|pstn/i.test(s)) {
    return "TWILIO_VOICE_FROM no puede ser WhatsApp. Usa un número de voz E.164 (+…).";
  }
  if (
    /unverified|not.?verified|trial|only.?verified/i.test(s) ||
    lower.includes("permission to call")
  ) {
    return "Twilio trial: solo llama a números verificados (Console → Verified Caller IDs) o pasa a cuenta de pago.";
  }
  if (/geo.?permission|geographic|not enabled for|destination.*not.*enabled/i.test(s)) {
    return "Twilio no tiene habilitadas llamadas a ese país. Console → Voice → Geo Permissions.";
  }
  if (/invalid.?from|from.*not.*valid|caller.?id/i.test(s)) {
    return "TWILIO_VOICE_FROM inválido o no pertenece a esta cuenta. Debe ser número Voice E.164.";
  }
  return s;
}

export function humanizeTwilioWhatsAppError(raw: string): string {
  const s = String(raw || "");
  if (/contentsid\s*required/i.test(s) || (/content.?sid/i.test(s) && /required/i.test(s))) {
    return "WhatsApp exige plantilla (ContentSid). Crea un Content Template en Twilio y define TWILIO_WHATSAPP_CONTENT_SID=HX…";
  }
  if (/not.?a.?valid.?whatsapp/i.test(s) || /sandbox/i.test(s)) {
    return "WhatsApp no habilitado / sandbox: el destinatario debe unirse al sandbox o el sender debe ser WA Business aprobado.";
  }
  return s;
}

/** Normaliza a E.164 aproximado (+dígitos). */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 9) return `+51${digits}`;
  return `+${digits}`;
}

export type CallCallbackParams = {
  callId: string;
  telefono: string;
  whatsapp: string;
  codigo: number;
  planeta: string;
  sellerRef?: string | null;
};

export function buildTwilioCallbackQuery(p: CallCallbackParams): string {
  const q = new URLSearchParams({
    callId: p.callId,
    telefono: p.telefono,
    whatsapp: p.whatsapp || p.telefono,
    codigo: String(p.codigo),
    planeta: p.planeta,
  });
  if (p.sellerRef) q.set("ref", p.sellerRef);
  return q.toString();
}

/**
 * Variables para Content Template Twilio.
 * En la plantilla: {{1}} planeta, {{2}} código, {{3}} enlace (ajusta en Console).
 */
export function buildWhatsAppContentVariables(opts: {
  planeta: string;
  codigo: number | string;
  deepLink: string;
}): Record<string, string> {
  return {
    "1": String(opts.planeta),
    "2": String(opts.codigo),
    "3": opts.deepLink.slice(0, 200),
  };
}

export async function placeVoiceCall(params: {
  to: string;
  callback: CallCallbackParams;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "Twilio no configurado (TWILIO_ACCOUNT_SID / AUTH_TOKEN / VOICE_FROM)",
    };
  }

  if (/^whatsapp:/i.test(cfg.fromVoice)) {
    return {
      ok: false,
      error: humanizeTwilioVoiceError(
        "TWILIO_VOICE_FROM is a whatsapp: address; Voice needs PSTN/E.164 From",
      ),
    };
  }

  const qs = buildTwilioCallbackQuery(params.callback);
  const twiml = `${cfg.publicBaseUrl}/api/vendedor/twilio/twiml?${qs}`;
  const statusCb = `${cfg.publicBaseUrl}/api/vendedor/twilio/status?${qs}`;
  const result = await twilioForm(cfg, "/Calls.json", {
    To: params.to,
    From: cfg.fromVoice,
    Url: twiml,
    Method: "GET",
    StatusCallback: statusCb,
    StatusCallbackMethod: "POST",
    // Twilio espera eventos separados por espacio en StatusCallbackEvent
    StatusCallbackEvent: "initiated ringing answered completed",
    Timeout: "25",
  });
  if (!result.ok && result.error) {
    return { ok: false, error: humanizeTwilioVoiceError(result.error) };
  }
  return result;
}

export async function sendWhatsappMessage(params: {
  to: string;
  body: string;
  /** Si se omite, usa TWILIO_WHATSAPP_CONTENT_SID del env. */
  contentSid?: string | null;
  contentVariables?: Record<string, string>;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "Twilio no configurado para WhatsApp",
    };
  }
  const to = params.to.startsWith("whatsapp:")
    ? params.to
    : `whatsapp:${params.to}`;

  const contentSid = (params.contentSid ?? cfg.whatsappContentSid)?.trim() || "";
  const form: Record<string, string> = {
    To: to,
    From: cfg.fromWhatsapp,
  };

  if (contentSid) {
    form.ContentSid = contentSid;
    if (params.contentVariables && Object.keys(params.contentVariables).length > 0) {
      form.ContentVariables = JSON.stringify(params.contentVariables);
    }
  } else {
    // Sin template: Twilio WA Business suele responder "ContentSid Required"
    form.Body = params.body.slice(0, 1500);
  }

  const result = await twilioForm(cfg, "/Messages.json", form);
  if (!result.ok && result.error) {
    return { ok: false, error: humanizeTwilioWhatsAppError(result.error) };
  }
  return result;
}

/** SMS último recurso si voz y WA fallan (opcional). */
export async function sendSmsMessage(params: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const cfg = getTwilioConfig();
  if (!cfg || (!cfg.smsFrom && !cfg.messagingServiceSid)) {
    return {
      ok: false,
      error: "SMS no configurado (TWILIO_SMS_FROM o TWILIO_MESSAGING_SERVICE_SID)",
    };
  }
  const form: Record<string, string> = {
    To: params.to,
    Body: params.body.slice(0, 1500),
  };
  if (cfg.messagingServiceSid) {
    form.MessagingServiceSid = cfg.messagingServiceSid;
  } else if (cfg.smsFrom) {
    form.From = cfg.smsFrom;
  }
  return twilioForm(cfg, "/Messages.json", form);
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTwimlSay(voiceScript: string): string {
  const safe = escapeXml(voiceScript);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="Polly.Mia">${safe}</Say>
  <Pause length="1"/>
  <Say language="es-MX" voice="Polly.Mia">Hasta luego.</Say>
</Response>`;
}
