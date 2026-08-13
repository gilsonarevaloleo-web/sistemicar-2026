/**
 * Twilio — Voice (1º) + WhatsApp (2º) para el Vendedor Algorítmico.
 * Sin SDK: REST con fetch. Si faltan credenciales, deja la cola en pending/failed.
 */

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromVoice: string;
  fromWhatsapp: string;
  statusCallbackUrl: string;
  twimlUrl: string;
};

export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromVoice = process.env.TWILIO_VOICE_FROM?.trim();
  const fromWhatsapp =
    process.env.TWILIO_WHATSAPP_FROM?.trim() ||
    process.env.TWILIO_VOICE_FROM?.trim();
  if (!accountSid || !authToken || !fromVoice) return null;

  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://sistemicar.app";

  return {
    accountSid,
    authToken,
    fromVoice,
    fromWhatsapp: fromWhatsapp!.startsWith("whatsapp:")
      ? fromWhatsapp!
      : `whatsapp:${fromWhatsapp}`,
    statusCallbackUrl: `${base}/api/vendedor/twilio/status`,
    twimlUrl: `${base}/api/vendedor/twilio/twiml`,
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
  // Perú por defecto si 9 dígitos
  if (digits.length === 9) return `+51${digits}`;
  return `+${digits}`;
}

export async function placeVoiceCall(params: {
  to: string;
  callId: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "Twilio no configurado (TWILIO_ACCOUNT_SID / AUTH_TOKEN / VOICE_FROM)",
    };
  }
  const twiml = `${cfg.twimlUrl}?callId=${encodeURIComponent(params.callId)}`;
  return twilioForm(cfg, "/Calls.json", {
    To: params.to,
    From: cfg.fromVoice,
    Url: twiml,
    Method: "GET",
    StatusCallback: `${cfg.statusCallbackUrl}?callId=${encodeURIComponent(params.callId)}`,
    StatusCallbackMethod: "POST",
    StatusCallbackEvent: "completed answered no-answer busy failed canceled",
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
