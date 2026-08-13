import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePhoneE164, escapeXml, buildTwimlSay } from "./twilioVendedor.ts";

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
});
