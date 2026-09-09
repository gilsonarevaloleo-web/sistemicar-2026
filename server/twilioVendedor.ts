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
 *
 * Error 63007: el From no es un Channel WhatsApp. NUNCA reutilizar
 * TWILIO_VOICE_FROM como remitente WA (un número Voice PSTN no es canal).
 * Sender válido: whatsapp:+E164 (sandbox +14155238886 o WA Business ONLINE)
 * o Messaging Service (MG…) con el sender en el pool.
 */

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromVoice: string;
  /** Sender WhatsApp `whatsapp:+E164`. Null si no hay TWILIO_WHATSAPP_FROM. */
  fromWhatsapp: string | null;
  /** Plantilla WhatsApp aprobada (HX…). Obligatorio fuera de sandbox libre. */
  whatsappContentSid: string | null;
  smsFrom: string | null;
  messagingServiceSid: string | null;
  /** Messaging Service con sender WhatsApp en el pool (MG…). */
  whatsappMessagingServiceSid: string | null;
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

export function isMessagingServiceSid(raw: string | null | undefined): boolean {
  const s = String(raw || "")
    .trim()
    .replace(/^whatsapp:/i, "")
    .trim();
  return /^MG[0-9a-fA-F]{32}$/i.test(s);
}

export function extractMessagingServiceSid(
  raw: string | null | undefined,
): string | null {
  const s = String(raw || "")
    .trim()
    .replace(/^whatsapp:/i, "")
    .trim();
  return /^MG[0-9a-fA-F]{32}$/i.test(s) ? s : null;
}

/**
 * Normaliza un From de WhatsApp a `whatsapp:+E164`.
 * Un Messaging Service SID (MG…) no es From — devuelve null.
 */
export function normalizeWhatsappFromAddress(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  if (/^whatsapp:/i.test(s)) s = s.slice(s.indexOf(":") + 1).trim();
  if (isMessagingServiceSid(s)) return null;
  const e164 = s.startsWith("+")
    ? normalizePhoneE164(s)
    : normalizePhoneE164(`+${s.replace(/\D/g, "")}`);
  return e164 ? `whatsapp:${e164}` : null;
}

export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromVoice = process.env.TWILIO_VOICE_FROM?.trim();
  if (!accountSid || !authToken || !fromVoice) return null;

  const whatsappFromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim() || null;
  const whatsappContentSid =
    process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() || null;
  const smsFrom = process.env.TWILIO_SMS_FROM?.trim() || null;
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;
  const whatsappMessagingServiceSid =
    extractMessagingServiceSid(
      process.env.TWILIO_WHATSAPP_MESSAGING_SERVICE_SID,
    ) ||
    extractMessagingServiceSid(whatsappFromRaw) ||
    extractMessagingServiceSid(messagingServiceSid);

  return {
    accountSid,
    authToken,
    fromVoice,
    fromWhatsapp: normalizeWhatsappFromAddress(whatsappFromRaw),
    whatsappContentSid,
    smsFrom,
    messagingServiceSid,
    whatsappMessagingServiceSid,
    publicBaseUrl: resolvePublicBaseUrl(),
  };
}

function basicAuth(sid: string, token: string): string {
  return Buffer.from(`${sid}:${token}`).toString("base64");
}

async function twilioForm(
  cfg: TwilioConfig,
  path: string,
  params: Record<string, string | string[]>,
): Promise<{
  ok: boolean;
  sid?: string;
  status?: string;
  error?: string;
  code?: number;
}> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}${path}`;
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) body.append(key, v);
    } else {
      body.append(key, value);
    }
  }
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
      code?: number;
      more_info?: string;
    };
    if (!res.ok) {
      const msg =
        data.message || data.error_message || `Twilio HTTP ${res.status}`;
      const code = typeof data.code === "number" ? data.code : undefined;
      return {
        ok: false,
        code,
        error: code ? `[${code}] ${msg}` : msg,
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

  // Códigos Twilio frecuentes (trial / from / geo)
  if (/\b21219\b/.test(s) || /to.?phone.?number.?not.?verified/i.test(s)) {
    return "[21219] Cuenta trial: el número DESTINO (+51…) no está verificado. Console → Phone Numbers → Verified Caller IDs → Add a new Caller ID (código por SMS/llamada). O actualiza la cuenta a paga.";
  }
  if (/\b21210\b/.test(s) || /from.?phone.?number.?not.?verified/i.test(s)) {
    return "[21210] TWILIO_VOICE_FROM no es un Caller ID válido de esta cuenta. Usa un número Voice comprado en Twilio (E.164), no un móvil personal sin verificar.";
  }
  if (/\b21215\b/.test(s) || /\b21408\b/.test(s)) {
    return `[${/\b21408\b/.test(s) ? "21408" : "21215"}] Geo Permissions: habilita el país del destino (p. ej. Perú) en Console → Voice → Settings → Geo Permissions.`;
  }
  if (/whatsapp/i.test(s) && /from|caller|voice|call|pstn/i.test(s)) {
    return "TWILIO_VOICE_FROM no puede ser WhatsApp. Usa un número de voz E.164 (+…).";
  }
  if (
    /unverified|not.?verified|trial|only.?verified/i.test(s) ||
    lower.includes("permission to call")
  ) {
    return "Twilio trial: solo llama a números verificados (Console → Phone Numbers → Verified Caller IDs). Verifica el +51 del lead o pasa a cuenta de pago.";
  }
  if (/geo.?permission|geographic|not enabled for|destination.*not.*enabled/i.test(s)) {
    return "Twilio no tiene habilitadas llamadas a ese país. Console → Voice → Geo Permissions.";
  }
  if (/invalid.?from|from.*not.*valid|caller.?id/i.test(s)) {
    return "TWILIO_VOICE_FROM inválido o no pertenece a esta cuenta. Debe ser número Voice E.164.";
  }
  return s;
}

export function isWhatsappChannelMissingError(raw: string): boolean {
  const s = String(raw || "");
  return (
    /\b63007\b/.test(s) ||
    /could not find a Channel with the specified From/i.test(s)
  );
}

export function humanizeTwilioWhatsAppError(raw: string): string {
  const s = String(raw || "");
  if (/contentsid\s*required/i.test(s) || (/content.?sid/i.test(s) && /required/i.test(s))) {
    return "WhatsApp exige plantilla (ContentSid). Crea un Content Template en Twilio y define TWILIO_WHATSAPP_CONTENT_SID=HX…";
  }
  if (isWhatsappChannelMissingError(s)) {
    return "[63007] El remitente de WhatsApp no existe en esta cuenta Twilio. TWILIO_WHATSAPP_FROM debe ser un sender WhatsApp (sandbox whatsapp:+14155238886 o número WA Business ONLINE), no el número de voz. Si el sender está en un Messaging Service, define TWILIO_WHATSAPP_MESSAGING_SERVICE_SID=MG…";
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
    // Twilio exige el parámetro repetido (no un solo string con espacios).
    StatusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    Timeout: "45",
  });
  if (!result.ok && result.error) {
    console.error("[twilio-vendedor] voice failed", {
      to: params.to.slice(0, 6) + "…",
      from: cfg.fromVoice.slice(0, 6) + "…",
      code: result.code,
      error: result.error,
    });
    return { ok: false, error: humanizeTwilioVoiceError(result.error) };
  }
  return result;
}

export function normalizeWhatsappTo(to: string): string {
  return to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
}

export type WhatsappSendAttempt = Record<string, string>;

/**
 * Intentos de envío WA: primero From dedicado; si no hay (o 63007), Messaging Service.
 * Nunca usa TWILIO_VOICE_FROM como Channel WhatsApp.
 */
export function buildWhatsappSendAttempts(
  cfg: Pick<
    TwilioConfig,
    "fromWhatsapp" | "whatsappMessagingServiceSid" | "whatsappContentSid"
  >,
  params: {
    to: string;
    body: string;
    contentSid?: string | null;
    contentVariables?: Record<string, string>;
  },
): WhatsappSendAttempt[] {
  const to = normalizeWhatsappTo(params.to);
  const contentSid = (params.contentSid ?? cfg.whatsappContentSid)?.trim() || "";
  const base: Record<string, string> = { To: to };
  if (contentSid) {
    base.ContentSid = contentSid;
    if (params.contentVariables && Object.keys(params.contentVariables).length > 0) {
      base.ContentVariables = JSON.stringify(params.contentVariables);
    }
  } else {
    base.Body = params.body.slice(0, 1500);
  }

  const attempts: WhatsappSendAttempt[] = [];
  if (cfg.fromWhatsapp) {
    attempts.push({ ...base, From: cfg.fromWhatsapp });
  }
  if (cfg.whatsappMessagingServiceSid) {
    attempts.push({
      ...base,
      MessagingServiceSid: cfg.whatsappMessagingServiceSid,
    });
  }
  return attempts;
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

  const attempts = buildWhatsappSendAttempts(cfg, params);
  if (attempts.length === 0) {
    return {
      ok: false,
      error:
        "WhatsApp no configurado: define TWILIO_WHATSAPP_FROM=whatsapp:+E164 (no el número de voz) o TWILIO_WHATSAPP_MESSAGING_SERVICE_SID=MG…",
    };
  }

  let lastError: string | undefined;
  for (let i = 0; i < attempts.length; i++) {
    const form = attempts[i];
    const result = await twilioForm(cfg, "/Messages.json", form);
    if (result.ok) return result;
    lastError = result.error;
    const canRetryWithService =
      i === 0 &&
      attempts.length > 1 &&
      isWhatsappChannelMissingError(result.error || "") &&
      Boolean(form.From) &&
      Boolean(attempts[i + 1]?.MessagingServiceSid);
    if (!canRetryWithService) break;
    console.error("[twilio-vendedor] whatsapp 63007, reintento con Messaging Service", {
      to: params.to.slice(0, 6) + "…",
      from: form.From?.slice(0, 18),
      code: result.code,
    });
  }

  const error = humanizeTwilioWhatsAppError(
    lastError || "WhatsApp no enviado",
  );
  console.error("[twilio-vendedor] whatsapp failed", {
    to: params.to.slice(0, 6) + "…",
    from: cfg.fromWhatsapp?.slice(0, 18),
    messagingService: cfg.whatsappMessagingServiceSid ? "yes" : "no",
    error,
  });
  return { ok: false, error };
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

const SAY_VOICE = 'language="es-MX" voice="Polly.Mia"';

/** Varias frases con pausa — se oye menos a robot. */
export function buildTwimlSayParts(parts: string | string[]): string {
  const beats = (Array.isArray(parts) ? parts : [parts]).filter((p) =>
    p.trim(),
  );
  if (beats.length === 0) return "";
  return beats
    .map((t, i) => {
      const say = `<Say ${SAY_VOICE}>${escapeXml(t)}</Say>`;
      return i < beats.length - 1 ? `${say}\n  <Pause length="1"/>` : say;
    })
    .join("\n  ");
}

export function buildTwimlSay(voiceScript: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${buildTwimlSayParts(voiceScript)}
  <Pause length="1"/>
  <Say ${SAY_VOICE}>Hasta luego.</Say>
</Response>`;
}

/** Cierre simple (sin Gather). Acepta una frase o varias con pausa. */
export function buildTwimlHangupSay(text: string | string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${buildTwimlSayParts(text)}
  <Hangup/>
</Response>`;
}

/**
 * Pregunta + <Gather> DTMF o voz corta (sí / no).
 * actionUrl debe ser absoluto (PUBLIC_APP_URL) e incluir query de contexto.
 */
export function buildTwimlGatherPrompt(opts: {
  prompt: string | string[];
  actionUrl: string;
  timeoutSay: string | string[];
  timeoutSeconds?: number;
}): string {
  const action = escapeXml(opts.actionUrl);
  const timeout = opts.timeoutSeconds ?? 10;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" language="es-MX" speechTimeout="auto" hints="sí,si,no,uno,dos" numDigits="1" timeout="${timeout}" action="${action}" method="POST">
    ${buildTwimlSayParts(opts.prompt)}
  </Gather>
  ${buildTwimlSayParts(opts.timeoutSay)}
  <Hangup/>
</Response>`;
}
