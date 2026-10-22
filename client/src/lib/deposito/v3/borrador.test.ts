import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEPOSITO_V3_DRAFT_KEY,
  guardarBorradorDepositoV3,
  leerBorradorDepositoV3,
  limpiarBorradorDepositoV3,
} from "./borrador.ts";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

describe("borrador Depósito V3", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda y restaura en sistemicar_deposito_v3_draft", () => {
    guardarBorradorDepositoV3({
      rawFact: "Vi el patrón a las 9:00.",
      detectedNoise: "debería",
      omittedShadow: "no nombré el quiebre",
      studentHypothesis: "C3",
    });
    assert.ok(localStorage.getItem(DEPOSITO_V3_DRAFT_KEY));
    const leido = leerBorradorDepositoV3();
    assert.equal(leido.rawFact, "Vi el patrón a las 9:00.");
    assert.equal(leido.omittedShadow, "no nombré el quiebre");
  });

  it("limpia la clave tras una auditoría", () => {
    guardarBorradorDepositoV3({
      rawFact: "texto vivo",
      detectedNoise: "",
      omittedShadow: "",
      studentHypothesis: "",
    });
    limpiarBorradorDepositoV3();
    assert.equal(localStorage.getItem(DEPOSITO_V3_DRAFT_KEY), null);
    assert.equal(leerBorradorDepositoV3().rawFact, "");
  });
});
