/**
 * Twilio — Voice (1º) + WhatsApp (2º) para el Vendedor Algorítmico.
 * Sin SDK: REST con fetch.
 *
 * Importante (Netlify): TwiML y status callback deben llevar codigo/planeta/tel
 * en la query — la memoria de la función no se comparte entre invocaciones.
 */

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromVoice: string;
  fromWhatsapp: string;
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
  const fromWhatsapp =
    process.env.TWILIO_WHATSAPP_FROM?.trim() ||
    process.env.TWILIO_VOICE_FROM?.trim();
  if (!accountSid || !authToken || !fromVoice) return null;

  return {
    accountSid,
    authToken,
    fromVoice,
    fromWhatsapp: fromWhatsapp!.startsWith("whatsapp:")
      ? fromWhatsapp!
      : `whatsapp:${fromWhatsapp}`,
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
  const qs = buildTwilioCallbackQuery(params.callback);
  const twiml = `${cfg.publicBaseUrl}/api/vendedor/twilio/twiml?${qs}`;
  const statusCb = `${cfg.publicBaseUrl}/api/vendedor/twilio/status?${qs}`;
  return twilioForm(cfg, "/Calls.json", {
    To: params.to,
    From: cfg.fromVoice,
    Url: twiml,
    Method: "GET",
    StatusCallback: statusCb,
    StatusCallbackMethod: "POST",
    // Twilio espera eventos separados por espacio en StatusCallbackEvent
    "StatusCallbackEvent": "initiated ringing answered completed",
    Timeout: "25",
  });
}

export async function sendWhatsappMessage(params: {
  to: string;
  body: string;
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
  return twilioForm(cfg, "/Messages.json", {
    To: to,
    From: cfg.fromWhatsapp,
    Body: params.body.slice(0, 1500),
  });
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
