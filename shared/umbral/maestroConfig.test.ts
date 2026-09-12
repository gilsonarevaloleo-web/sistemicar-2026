import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CODIGOS_NUMERO } from "./engineConfig.ts";
import {
  FICHAS_MAESTRO,
  KERNEL_MAESTRO,
  armarBloqueMaestro,
  feedbackMaestroLocal,
  obtenerFichaMaestro,
} from "./maestroConfig.ts";

describe("Umbral — Maestro de códigos", () => {
  it("cubre 1–10 con voz, R1, R2 y gesto", () => {
    assert.equal(Object.keys(FICHAS_MAESTRO).length, 10);
    for (const n of CODIGOS_NUMERO) {
      const f = obtenerFichaMaestro(n);
      assert.equal(f.numero, n);
      assert.ok(f.voz.length > 0);
      assert.ok(f.caracter.length > 0);
      assert.ok(f.metafora.length > 0);
      assert.ok(f.resistencia1Forja.length > 0);
      assert.ok(f.resistencia1Arena.length > 0);
      assert.ok(f.resistencia2Forja.length > 0);
      assert.ok(f.resistencia2Arena.length > 0);
      assert.ok(f.empatiaDeCodigo.length > 0);
      assert.ok(f.gestoEnsenanza.length > 0);
      assert.ok(f.fraseQuiebre.length > 0);
      assert.ok(f.fraseCruce.length > 0);
    }
  });

  it("el bloque inyecta solo la ficha activa + kernel compacto", () => {
    const bloque = armarBloqueMaestro(4, "EXTERNO_VENTAS");
    assert.match(bloque, /Ingeniero sin Flor/);
    assert.match(bloque, /La Arena/);
    assert.match(bloque, /Cínico|trauma/i);
    assert.match(bloque, /KERNEL|EMPATÍA DE CÓDIGO|DOS RESISTENCIAS/);
    assert.doesNotMatch(bloque, /Cortador de Niebla/);
    assert.doesNotMatch(bloque, /El Autor/);
    assert.ok(bloque.length < 2800);
    assert.ok(KERNEL_MAESTRO.length < 1600);
  });

  it("Forja y Arena no mezclan R1", () => {
    const forja = armarBloqueMaestro(3, "INTERNO_HABILIDAD");
    const arena = armarBloqueMaestro(3, "EXTERNO_VENTAS");
    assert.match(forja, /La Forja/);
    assert.match(arena, /Postergador|agenda/i);
    assert.doesNotMatch(forja, /Postergador/);
  });

  it("feedback local nombra segunda resistencia", () => {
    const ko = feedbackMaestroLocal({
      codigo: 1,
      modo: "INTERNO_HABILIDAD",
      aprobado: false,
      criterio: "Nombrar una excusa puntual.",
    });
    assert.match(ko, /niebla|frase/i);
    assert.match(ko, /lista|biografía|excusa/i);

    const ok = feedbackMaestroLocal({
      codigo: 10,
      modo: "EXTERNO_VENTAS",
      aprobado: true,
      criterio: "Autoridad limpia.",
    });
    assert.match(ok, /autoría|Autor/i);
  });
});
