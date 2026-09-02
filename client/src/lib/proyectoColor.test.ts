import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROYECTO_PALETTE,
  hashProyectoId,
  normalizeProyectoHex,
  proyectoColorAlpha,
  resolveProyectoColor,
  rumboPickerListVisible,
  rumboPickerToggleEnabled,
} from "./proyectoColor.ts";

describe("proyectoColor", () => {
  it("respeta un hex guardado y expande #rgb", () => {
    assert.equal(normalizeProyectoHex("#38BDF8"), "#38bdf8");
    assert.equal(normalizeProyectoHex("#0f8"), "#00ff88");
    assert.equal(normalizeProyectoHex("naranja"), null);
    assert.equal(resolveProyectoColor("p1", "#F97316"), "#f97316");
  });

  it("sin color: paleta estable por id — no un único oro para todos", () => {
    const a = resolveProyectoColor("costura");
    const b = resolveProyectoColor("familia");
    assert.ok(PROYECTO_PALETTE.includes(a as (typeof PROYECTO_PALETTE)[number]));
    assert.ok(PROYECTO_PALETTE.includes(b as (typeof PROYECTO_PALETTE)[number]));
    assert.equal(resolveProyectoColor("costura"), a);
    assert.notEqual(hashProyectoId("costura"), hashProyectoId(""));
  });

  it("alpha se pega al hex de 6 dígitos", () => {
    assert.equal(proyectoColorAlpha("#38BDF8", "40"), "#38bdf840");
  });

  it("lista de rumbos: oculta con 1, solo se abre si el operador la pide", () => {
    assert.equal(rumboPickerListVisible(1, true), false);
    assert.equal(rumboPickerListVisible(7, false), false);
    assert.equal(rumboPickerListVisible(7, true), true);
    assert.equal(rumboPickerToggleEnabled(1), false);
    assert.equal(rumboPickerToggleEnabled(2), true);
  });
});
