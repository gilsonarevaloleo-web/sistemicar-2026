import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHierarchyPromptBlock,
  classifyQueja,
  isCodigoSuperior,
  selectDominantCodigo,
} from "./espejoV2.ts";

describe("Ley de Jerarquía de Códigos — classifyQueja", () => {
  it("tiempo solo → Código 1.3 (base táctico)", () => {
    const r = classifyQueja(
      "Trabajo sin parar y el tiempo se me escapa, no avanzo nada en horas.",
    );
    assert.equal(r.codigo, "1.3");
    assert.equal(r.hierarchyLevel, "base");
    assert.equal(r.hierarchyApplied, false);
  });

  it("tiempo + familia/proveer → 1.10 anula 1.3", () => {
    const r = classifyQueja(
      "Voy con retraso en las entregas y siento que no puedo proveer a mi familia.",
    );
    assert.equal(r.codigo, "1.10");
    assert.equal(r.hierarchyLevel, "superior");
    assert.equal(r.hierarchyApplied, true);
    assert.ok(r.dominatedCodes.includes("1.3"));
  });

  it("tiempo + juicio de valor/inútil → 1.8 anula 1.3", () => {
    const r = classifyQueja(
      "Pierdo el tiempo en madrugadas y me juzgo como inútil por no avanzar.",
    );
    assert.equal(r.codigo, "1.8");
    assert.equal(r.hierarchyLevel, "superior");
    assert.equal(r.hierarchyApplied, true);
    assert.ok(r.dominatedCodes.includes("1.3"));
  });

  it("rutina/apatía → 1.9 superior", () => {
    const r = classifyQueja(
      "Todo es rutina gris, apatía, no disfruto nada, sin energía.",
    );
    assert.equal(r.codigo, "1.9");
    assert.equal(r.hierarchyLevel, "superior");
  });

  it("medio anula base: dinero + horas → 1.5", () => {
    const r = classifyQueja(
      "Se me van las horas y no hay flujo de dinero, la caja está en fuga.",
    );
    assert.equal(r.codigo, "1.5");
    assert.equal(r.hierarchyLevel, "medio");
    assert.equal(r.hierarchyApplied, true);
    assert.ok(r.dominatedCodes.includes("1.3"));
  });

  it("selectDominantCodigo: superior gana aunque tenga menos hits", () => {
    const best = selectDominantCodigo({
      "1.3": 5,
      "1.8": 1,
    });
    assert.equal(best, "1.8");
  });

  it("selectDominantCodigo: entre superiores, más hits; empate → 1.10", () => {
    assert.equal(selectDominantCodigo({ "1.8": 2, "1.10": 1 }), "1.8");
    assert.equal(selectDominantCodigo({ "1.8": 1, "1.10": 1 }), "1.10");
  });
});

describe("Ley de Jerarquía — prompt Gemini", () => {
  it("bloque superior prohíbe preguntas de agenda/tiempo", () => {
    const block = buildHierarchyPromptBlock("1.8");
    assert.match(block, /PROHIBICIÓN RÍGIDA/);
    assert.match(block, /gestión del tiempo|Código 1\.3/i);
    assert.match(block, /SOBERANÍA|DIGNIDAD|TERRITORIO/);
    assert.equal(isCodigoSuperior("1.8"), true);
    assert.equal(isCodigoSuperior("1.3"), false);
  });

  it("bloque base permite táctica pero avisa reencuadre", () => {
    const block = buildHierarchyPromptBlock("1.3");
    assert.match(block, /Nivel Base/);
    assert.match(block, /1\.8–1\.10|1\.8-1\.10|reencuadre/i);
  });
});
