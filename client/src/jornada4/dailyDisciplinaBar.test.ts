import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDailyDisciplinaBarModel } from "./dailyDisciplinaBar.ts";

describe("computeDailyDisciplinaBarModel", () => {
  it("usa ayer como 100% y escala hasta 120%", () => {
    const m = computeDailyDisciplinaBarModel(60, 100);
    assert.equal(m.referencePct, 100);
    assert.equal(m.target120Pct, 120);
    assert.equal(m.remainingTo100, 40);
    assert.equal(m.fillWidthPct, 50);
    assert.equal(m.marker100WidthPct, (100 / 120) * 100);
    assert.match(m.statusText, /Faltan 40%/);
  });

  it("marca 100% al alcanzar referencia de ayer", () => {
    const m = computeDailyDisciplinaBarModel(72, 72);
    assert.equal(m.atOrAbove100, true);
    assert.equal(m.remainingTo100, 0);
    assert.equal(m.pctOfReference, 100);
  });

  it("llena barra completa al 120%", () => {
    const m = computeDailyDisciplinaBarModel(120, 100);
    assert.equal(m.atOrAbove120, true);
    assert.equal(m.fillWidthPct, 100);
  });

  it("fallback cuando ayer fue 0%", () => {
    const m = computeDailyDisciplinaBarModel(25, 0, 120, 50);
    assert.equal(m.referencePct, 50);
    assert.equal(m.usingFallbackReference, true);
    assert.equal(m.remainingTo100, 25);
    assert.match(m.referenceLabel, /Ayer 0%/);
  });
});
