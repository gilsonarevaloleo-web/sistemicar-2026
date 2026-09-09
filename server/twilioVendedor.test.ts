import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePhoneE164,
  escapeXml,
  buildTwimlSay,
  buildTwimlGatherPrompt,
  buildTwimlHangupSay,
  resolvePublicBaseUrl,
  buildTwilioCallbackQuery,
  humanizeTwilioWhatsAppError,
  humanizeTwilioVoiceError,
  buildWhatsAppContentVariables,
  normalizeWhatsappFromAddress,
  extractMessagingServiceSid,
  getTwilioConfig,
  buildWhatsappSendAttempts,
  isWhatsappChannelMissingError,
} from "./twilioVendedor.ts";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("Twilio vendedor helpers", () => {
  it("normaliza 9 dígitos Perú a +51", () => {
    assert.equal(normalizePhoneE164("918260514"), "+51918260514");
  });

  it("respeta + internacional", () => {
    assert.equal(normalizePhoneE164("+5215512345678"), "+5215512345678");
  });

  it("rechaza números cortos", () => {
    assert.equal(normalizePhoneE164("12345"), null);
  });

  it("TwiML escapa XML", () => {
    assert.equal(escapeXml(`a <b> & "c"`), "a &lt;b&gt; &amp; &quot;c&quot;");
    const xml = buildTwimlSay("Hola <test>");
    assert.match(xml, /<Say /);
    assert.match(xml, /Hola &lt;test&gt;/);
    assert.doesNotMatch(xml, /<test>/);
  });

  it("public base fuerza www para evitar 301", () => {
    const prev = process.env.PUBLIC_APP_URL;
    process.env.PUBLIC_APP_URL = "https://sistemicar.app";
    assert.equal(resolvePublicBaseUrl(), "https://www.sistemicar.app");
    process.env.PUBLIC_APP_URL = prev;
  });

  it("callback query incluye codigo y telefono", () => {
    const qs = buildTwilioCallbackQuery({
      callId: "vc_1",
      telefono: "+51918260514",
      whatsapp: "+51918260514",
      codigo: 2,
      planeta: "JORNADA",
      sellerRef: "ANA",
    });
    assert.match(qs, /callId=vc_1/);
    assert.match(qs, /codigo=2/);
    assert.match(qs, /planeta=JORNADA/);
    assert.match(qs, /ref=ANA/);
  });

  it("humaniza ContentSid Required", () => {
    assert.match(
      humanizeTwilioWhatsAppError("ContentSid Required"),
      /TWILIO_WHATSAPP_CONTENT_SID/,
    );
  });

  it("humaniza 63007 Channel From inválido", () => {
    const msg = humanizeTwilioWhatsAppError(
      "[63007] Twilio could not find a Channel with the specified From address",
    );
    assert.match(msg, /63007/);
    assert.match(msg, /TWILIO_WHATSAPP_FROM/);
    assert.doesNotMatch(msg, /could not find a Channel/i);
    assert.equal(
      isWhatsappChannelMissingError(
        "[63007] Twilio could not find a Channel with the specified From address",
      ),
      true,
    );
  });

  it("WhatsApp From no reutiliza el número de voz", () => {
    const prev = {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      voice: process.env.TWILIO_VOICE_FROM,
      wa: process.env.TWILIO_WHATSAPP_FROM,
      mg: process.env.TWILIO_MESSAGING_SERVICE_SID,
      waMg: process.env.TWILIO_WHATSAPP_MESSAGING_SERVICE_SID,
    };
    process.env.TWILIO_ACCOUNT_SID = "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VOICE_FROM = "+15551234567";
    delete process.env.TWILIO_WHATSAPP_FROM;
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    delete process.env.TWILIO_WHATSAPP_MESSAGING_SERVICE_SID;
    try {
      const cfg = getTwilioConfig();
      assert.ok(cfg);
      assert.equal(cfg.fromVoice, "+15551234567");
      assert.equal(cfg.fromWhatsapp, null);
      assert.equal(cfg.whatsappMessagingServiceSid, null);
      assert.equal(
        buildWhatsappSendAttempts(cfg, {
          to: "+51918260514",
          body: "hola",
        }).length,
        0,
      );
    } finally {
      restoreEnv("TWILIO_ACCOUNT_SID", prev.sid);
      restoreEnv("TWILIO_AUTH_TOKEN", prev.token);
      restoreEnv("TWILIO_VOICE_FROM", prev.voice);
      restoreEnv("TWILIO_WHATSAPP_FROM", prev.wa);
      restoreEnv("TWILIO_MESSAGING_SERVICE_SID", prev.mg);
      restoreEnv("TWILIO_WHATSAPP_MESSAGING_SERVICE_SID", prev.waMg);
    }
  });

  it("normaliza sandbox y trata MG como Messaging Service", () => {
    assert.equal(
      normalizeWhatsappFromAddress("whatsapp:+14155238886"),
      "whatsapp:+14155238886",
    );
    assert.equal(
      normalizeWhatsappFromAddress("+14155238886"),
      "whatsapp:+14155238886",
    );
    const mg = "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    assert.equal(normalizeWhatsappFromAddress(mg), null);
    assert.equal(extractMessagingServiceSid(mg), mg);
    assert.equal(extractMessagingServiceSid(`whatsapp:${mg}`), mg);
  });

  it("envío WA usa Messaging Service si no hay From dedicado", () => {
    const attempts = buildWhatsappSendAttempts(
      {
        fromWhatsapp: null,
        whatsappMessagingServiceSid: "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        whatsappContentSid: "HXbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      {
        to: "+51918260514",
        body: "hola",
        contentVariables: { "1": "JORNADA", "2": "2", "3": "https://x" },
      },
    );
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].From, undefined);
    assert.equal(
      attempts[0].MessagingServiceSid,
      "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    assert.equal(attempts[0].To, "whatsapp:+51918260514");
    assert.equal(attempts[0].ContentSid, "HXbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("envío WA intenta From y luego Messaging Service", () => {
    const attempts = buildWhatsappSendAttempts(
      {
        fromWhatsapp: "whatsapp:+14155238886",
        whatsappMessagingServiceSid: "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        whatsappContentSid: null,
      },
      { to: "whatsapp:+51918260514", body: "hola" },
    );
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].From, "whatsapp:+14155238886");
    assert.equal(attempts[1].MessagingServiceSid, "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(attempts[1].From, undefined);
  });

  it("humaniza From whatsapp en voz", () => {
    assert.match(
      humanizeTwilioVoiceError(
        "TWILIO_VOICE_FROM is a whatsapp: address; Voice needs PSTN",
      ),
      /VOICE_FROM/,
    );
  });

  it("humaniza 21219 destino no verificado (trial)", () => {
    assert.match(
      humanizeTwilioVoiceError("[21219] 'To' phone number not verified"),
      /21219/,
    );
    assert.match(
      humanizeTwilioVoiceError("[21219] 'To' phone number not verified"),
      /Verified Caller IDs/,
    );
  });

  it("content variables planeta/codigo/enlace", () => {
    const v = buildWhatsAppContentVariables({
      planeta: "JORNADA",
      codigo: 2,
      deepLink: "https://www.sistemicar.app/pagos?plan=planificacion_base",
    });
    assert.equal(v["1"], "JORNADA");
    assert.equal(v["2"], "2");
    assert.match(v["3"], /planificacion_base/);
  });

  it("TwiML Gather tiene action y numDigits", () => {
    const xml = buildTwimlGatherPrompt({
      prompt: "Marca uno",
      actionUrl: "https://www.sistemicar.app/api/vendedor/twilio/gather?step=mirror",
      timeoutSay: "Sin marca",
    });
    assert.match(xml, /<Gather /);
    assert.match(xml, /numDigits="1"/);
    assert.match(xml, /input="dtmf speech"/);
    assert.match(xml, /action="https:\/\/www\.sistemicar\.app\/api\/vendedor\/twilio\/gather/);
    assert.match(xml, /Marca uno/);
    assert.match(buildTwimlHangupSay("Adiós <x>"), /Adiós &lt;x&gt;/);
    const paced = buildTwimlHangupSay(["Hola.", "Te mando el enlace."]);
    assert.match(paced, /<Pause length="1"\/>/);
    assert.match(paced, /Te mando el enlace/);
  });
});
