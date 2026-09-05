import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

function installLocalStorage() {
  const mem = new Map<string, string>();
  const store = {
    getItem(k: string) {
      return mem.has(k) ? mem.get(k)! : null;
    },
    setItem(k: string, v: string) {
      mem.set(k, v);
    },
    removeItem(k: string) {
      mem.delete(k);
    },
    clear() {
      mem.clear();
    },
    key(i: number) {
      return [...mem.keys()][i] ?? null;
    },
    get length() {
      return mem.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
}

describe("recintoMinimoStore", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("entra, el operador saca, y el tick no convierte salida en herencia", async () => {
    const {
      addRecintoMinimo,
      listRecintosDelDia,
      sacarRecintoOperador,
    } = await import("./recintoMinimoStore.ts");
    const now = Date.now();
    const r = addRecintoMinimo({
      texto: "El feed",
      saleAt: now + 60_000,
      nowMs: now,
    });
    assert.equal(r.estado, "dentro");
    const out = sacarRecintoOperador(r.id, now + 1_000);
    assert.equal(out?.estado, "salio");
    assert.equal(out?.cerradoPor, "operador");
    assert.equal(listRecintosDelDia(undefined, now + 120_000).find((x) => x.id === r.id)?.estado, "salio");
  });

  it("si nadie saca a tiempo, el sistema hereda", async () => {
    const { addRecintoMinimo, listRecintosDelDia } = await import("./recintoMinimoStore.ts");
    const now = Date.now();
    const r = addRecintoMinimo({
      texto: "Culpa de ayer",
      saleAt: now + 5_000,
      nowMs: now,
    });
    const later = listRecintosDelDia(undefined, now + 6_000);
    const item = later.find((x) => x.id === r.id);
    assert.equal(item?.estado, "heredado");
    assert.equal(item?.cerradoPor, "sistema");
  });
});
