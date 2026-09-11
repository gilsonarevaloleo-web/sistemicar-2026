import assert from "node:assert/strict";
import { describe, it, before, beforeEach, after } from "node:test";
import {
  deleteDesglosadorLista,
  readDesglosadorListas,
  saveDesglosadorLista,
  searchDesglosadorListas,
} from "./desglosadorListasStore.ts";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  (globalThis as { localStorage: typeof ls }).localStorage = ls;
  return ls;
}

describe("desglosadorListasStore", () => {
  let prev: unknown;
  before(() => {
    prev = (globalThis as { localStorage?: unknown }).localStorage;
    installMemoryLocalStorage();
  });
  after(() => {
    (globalThis as { localStorage?: unknown }).localStorage = prev as never;
  });
  beforeEach(() => {
    localStorage.clear();
  });

  it("exige 2 unidades con nombre", () => {
    const r = saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: [{ titulo: "Solo una" }],
    });
    assert.equal(r.ok, false);
  });

  it("guarda y aparece en el buscador", () => {
    const r = saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: [{ titulo: "Cortar" }, { titulo: "Manga" }, { titulo: "Botón" }],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.overwritten, false);
    const found = searchDesglosadorListas("casaca");
    assert.equal(found.length, 1);
    assert.equal(found[0]!.items.length, 3);
  });

  it("al repetir el nombre actualiza la secuencia (tras varios intentos)", () => {
    saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: [{ titulo: "Mal 1" }, { titulo: "Mal 2" }],
    });
    const r = saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: [{ titulo: "Cortar" }, { titulo: "Manga" }, { titulo: "Cierre" }],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.overwritten, true);
    assert.equal(readDesglosadorListas().length, 1);
    assert.deepEqual(
      readDesglosadorListas()[0]!.items.map(i => i.titulo),
      ["Cortar", "Manga", "Cierre"]
    );
  });

  it("borra una lista", () => {
    const r = saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: [{ titulo: "A" }, { titulo: "B" }],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    deleteDesglosadorLista(r.lista.id);
    assert.equal(readDesglosadorListas().length, 0);
  });
});
