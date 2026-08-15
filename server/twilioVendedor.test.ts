import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePhoneE164,
  escapeXml,
  buildTwimlSay,
  resolvePublicBaseUrl,
  buildTwilioCallbackQuery,
  humanizeTwilioWhatsAppError,
  humanizeTwilioVoiceError,
  buildWhatsAppContentVariables,
} from "./twilioVendedor.ts";

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

  it("humaniza From whatsapp en voz", () => {
    assert.match(
      humanizeTwilioVoiceError(
        "TWILIO_VOICE_FROM is a whatsapp: address; Voice needs PSTN",
      ),
      /VOICE_FROM/,
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
});
