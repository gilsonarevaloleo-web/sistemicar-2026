import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  JUEZ_DRAFT_KEY,
  guardarBorradorJuez,
  leerBorradorJuez,
  limpiarBorradorJuez,
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

describe("borrador Juez Serio", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guarda y restaura en sistemicar_juez_draft", () => {
    guardarBorradorJuez("Hoy el pistón no paró.");
    assert.equal(localStorage.getItem(JUEZ_DRAFT_KEY), "Hoy el pistón no paró.");
    assert.equal(leerBorradorJuez(), "Hoy el pistón no paró.");
  });

  it("el volcado sigue ahí después de auditar: no se limpia solo", () => {
    guardarBorradorJuez("el volcado de ayer");
    assert.equal(leerBorradorJuez(), "el volcado de ayer");
    guardarBorradorJuez("el volcado de ayer");
    assert.equal(localStorage.getItem(JUEZ_DRAFT_KEY), "el volcado de ayer");
  });

  it("limpiarBorradorJuez vacía la clave si el operador lo pide", () => {
    guardarBorradorJuez("texto vivo");
    limpiarBorradorJuez();
    assert.equal(localStorage.getItem(JUEZ_DRAFT_KEY), null);
    assert.equal(leerBorradorJuez(), "");
  });
});
