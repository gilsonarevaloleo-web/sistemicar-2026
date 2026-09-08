import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampCodigoJornadaBase,
  opcionesMatizParaPlaneta,
  resolverTriageVendedor,
  VENDEDOR_TRIAGE_PREGUNTAS,
} from "./triageLogic.ts";
import { PUERTA_COMERCIAL_VENDEDOR } from "./planetasConfig.ts";

const TEXTO_PREGUNTAS = JSON.stringify(VENDEDOR_TRIAGE_PREGUNTAS);

describe("Vendedor Capa 1 — triage Jornada Base", () => {
  it("tiene 2 preguntas (grieta + matiz) solo con códigos 1–3", () => {
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS.length, 2);
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS[0].id, "grieta");
    assert.equal(VENDEDOR_TRIAGE_PREGUNTAS[1].id, "matiz");
    for (const p of VENDEDOR_TRIAGE_PREGUNTAS) {
      assert.ok(p.opciones.length >= 3);
      for (const op of p.opciones) {
        assert.equal(op.planeta, "JORNADA");
        assert.ok([1, 2, 3].includes(op.codigo));
      }
    }
  });

  it("no nombra Umbral ni Espejo en las preguntas", () => {
    assert.doesNotMatch(TEXTO_PREGUNTAS, /umbral|espejo/i);
  });

  it("Q1 cubre los 3 códigos de Jornada Base", () => {
    const codes = VENDEDOR_TRIAGE_PREGUNTAS[0].opciones.map((o) => o.codigo);
    assert.deepEqual([...new Set(codes)].sort(), [1, 2, 3]);
  });

  it("niebla → código 1, checkout Jornada Base", () => {
    const r = resolverTriageVendedor([
      { planeta: "JORNADA", codigo: 1 },
      { planeta: "JORNADA", codigo: 1 },
    ]);
    assert.equal(r.planeta, "JORNADA");
    assert.equal(r.codigo, 1);
    assert.equal(r.puertaComercial, PUERTA_COMERCIAL_VENDEDOR);
    assert.match(r.checkoutHref, /planificacion_base/);
    assert.match(r.resumenHumano, /mezcla|unidad/i);
  });

  it("saturación → código 2", () => {
    const r = resolverTriageVendedor([
      { planeta: "JORNADA", codigo: 2 },
      { planeta: "JORNADA", codigo: 2 },
    ]);
    assert.equal(r.codigo, 2);
    assert.match(r.resumenHumano, /tope|saturaci/i);
  });

  it("día sin cierre → código 3", () => {
    const r = resolverTriageVendedor([
      { planeta: "JORNADA", codigo: 3 },
      { planeta: "JORNADA", codigo: 3 },
    ]);
    assert.equal(r.codigo, 3);
    assert.match(r.checkoutHref, /planificacion_base/);
  });

  it("Q2 gana sobre Q1 y siempre deja planeta JORNADA", () => {
    const r = resolverTriageVendedor([
      { planeta: "ESPEJO", codigo: 6 },
      { planeta: "JORNADA", codigo: 2 },
    ]);
    assert.equal(r.planeta, "JORNADA");
    assert.equal(r.codigo, 2);
    assert.equal(r.puertaComercial, "JORNADA");
  });

  it("sin Q2 usa código de Q1 (clamp 1–3)", () => {
    const r = resolverTriageVendedor([{ planeta: "JORNADA", codigo: 2 }]);
    assert.equal(r.codigo, 2);
    assert.equal(r.planeta, "JORNADA");
  });

  it("códigos fuera de 1–3 se recortan a 3", () => {
    assert.equal(clampCodigoJornadaBase(6), 3);
    assert.equal(clampCodigoJornadaBase(7), 3);
    assert.equal(clampCodigoJornadaBase(1), 1);
    const r = resolverTriageVendedor([{ planeta: "UMBRAL", codigo: 7 }]);
    assert.equal(r.codigo, 3);
    assert.equal(r.planeta, "JORNADA");
  });

  it("matiz es siempre Jornada (3 opciones)", () => {
    const jornada = opcionesMatizParaPlaneta("JORNADA");
    assert.equal(jornada.length, 3);
    assert.ok(jornada.every((o) => o.planeta === "JORNADA"));
    const espejo = opcionesMatizParaPlaneta("ESPEJO");
    assert.equal(espejo.length, 3);
    assert.ok(espejo.every((o) => o.planeta === "JORNADA"));
  });
});
