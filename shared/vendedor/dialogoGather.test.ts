import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDialogTurns,
  parseGatherChoice,
} from "./dialogoGather.ts";

function textoGuion(codigo: 1 | 2 | 3) {
  const t = buildDialogTurns(codigo, "JORNADA", "ANA");
  return [
    t.opener,
    t.mirrorSi,
    t.mirrorNo,
    t.ctaSi,
    t.ctaNo,
    t.timeoutOpen,
    t.timeoutMirror,
  ].join("\n");
}

describe("Vendedor diálogo Gather (humano, Jornada Base)", () => {
  it("opener suena a persona y pide 1 / sí", () => {
    const t = buildDialogTurns(2, "JORNADA", "ANA");
    assert.match(t.opener, /te llamo de Sistemicar/i);
    assert.match(t.opener, /marca 1|di sí/i);
    assert.match(t.opener, /marca 2/i);
    assert.doesNotMatch(t.opener, /Código 2|vendedora de Sistemicar|objeción típica/i);
    assert.match(t.mirrorSi, /WhatsApp/i);
    assert.match(t.mirrorSi, /ANA/);
    assert.match(t.ctaSi, /enlace/i);
    assert.equal(t.puertaComercial, "JORNADA");
    assert.equal(t.codigo, 2);
    assert.ok(t.openerBeats.length >= 3);
  });

  it("código 1 habla de niebla y vende Jornada, sin Umbral", () => {
    const t = buildDialogTurns(1, "UMBRAL");
    assert.match(t.opener, /cerrar primero|mezcla/i);
    assert.match(t.mirrorSi, /Jornada/i);
    assert.doesNotMatch(t.mirrorSi, /Forja|Umbral|Espejo/i);
    assert.equal(t.puertaComercial, "JORNADA");
    assert.equal(t.codigo, 1);
  });

  it("código 6 se recorta a 3 y no nombra Espejo", () => {
    const t = buildDialogTurns(6, "ESPEJO");
    assert.equal(t.codigo, 3);
    assert.match(t.opener, /incendios|cierre/i);
    assert.doesNotMatch(t.opener + t.mirrorSi, /Espejo|Umbral/i);
  });

  it("ningún guion 1–3 nombra Umbral ni Espejo", () => {
    for (const n of [1, 2, 3] as const) {
      assert.doesNotMatch(textoGuion(n), /umbral|espejo/i);
    }
  });

  it("cta promete el enlace por WhatsApp", () => {
    const t = buildDialogTurns(3, "JORNADA");
    assert.match(t.ctaSi, /WhatsApp/i);
    assert.match(t.ctaNo, /WhatsApp/i);
    assert.match(t.ctaSiSinWhatsapp, /WhatsApp|sistemicar/i);
  });

  it("parseGatherChoice lee dígitos y habla corta", () => {
    assert.equal(parseGatherChoice({ digits: "1" }), "1");
    assert.equal(parseGatherChoice({ digits: "2" }), "2");
    assert.equal(parseGatherChoice({ digits: "9" }), null);
    assert.equal(parseGatherChoice({ speech: "sí, claro" }), "1");
    assert.equal(parseGatherChoice({ speech: "manda el enlace" }), "1");
    assert.equal(parseGatherChoice({ speech: "no gracias" }), "2");
    assert.equal(parseGatherChoice({}), null);
  });
});
