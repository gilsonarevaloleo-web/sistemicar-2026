import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  opcionesMatizParaPlaneta,
  resolverTriageVendedor,
  VENDEDOR_TRIAGE_PREGUNTAS,
} from "./triageLogic.ts";
import { PLANETAS, CODIGO_A_PLANETA_DEFAULT } from "./planetasConfig.ts";

describe("Vendedor Capa 1 — triage", () => {
  it("tiene 2 preguntas (grieta + matiz)", () => {
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS.length, 2);
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS[0].id, "grieta");
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS[1].id, "matiz");
  });

  it("carga emocional → ESPEJO", () => {
    const r = resolverTriageVendedor([
      { planeta: "ESPEJO", codigo: 6 },
      { planeta: "ESPEJO", codigo: 4 },
    ]);
    assert.equal(r.planeta, "ESPEJO");
    assert.equal(r.codigo, 4);
    assert.equal(r.planetaLabel, PLANETAS.ESPEJO.label);
    assert.match(r.checkoutHref, /espejo_inicio|espejo/);
  });

  it("tiempo → JORNADA Base", () => {
    const r = resolverTriageVendedor([
      { planeta: "JORNADA", codigo: 3 },
      { planeta: "JORNADA", codigo: 3 },
    ]);
    assert.equal(r.planeta, "JORNADA");
    assert.equal(r.codigo, 3);
    assert.match(r.checkoutHref, /planificacion_base/);
  });

  it("miedo a vender → UMBRAL", () => {
    const r = resolverTriageVendedor([
      { planeta: "UMBRAL", codigo: 1 },
      { planeta: "UMBRAL", codigo: 7 },
    ]);
    assert.equal(r.planeta, "UMBRAL");
    assert.equal(r.codigo, 7);
    assert.ok(r.arquetipoNombre);
    assert.match(r.trialHref, /umbral/);
  });

  it("sin Q2 usa código de Q1", () => {
    const r = resolverTriageVendedor([{ planeta: "JORNADA", codigo: 2 }]);
    assert.equal(r.codigo, 2);
    assert.equal(r.planeta, "JORNADA");
  });

  it("matiz filtra por planeta", () => {
    const espejo = opcionesMatizParaPlaneta("ESPEJO");
    assert.ok(espejo.length >= 2);
    assert.ok(espejo.every((o) => o.planeta === "ESPEJO"));
    const jornada = opcionesMatizParaPlaneta("JORNADA");
    assert.ok(jornada.every((o) => o.planeta === "JORNADA"));
  });

  it("mapa código→planeta por defecto cubre 1–10", () => {
    for (let n = 1; n <= 10; n++) {
      assert.ok(CODIGO_A_PLANETA_DEFAULT[n as 1]);
    }
  });
});
