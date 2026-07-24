import assert from "node:assert/strict";
import { describe, it, before, beforeEach, after } from "node:test";
import {
  readVehicleHistoryLocal,
  saveVehicleHistoryEntry,
  recordDesglosadorSubHistory,
} from "./vehicleHistoryStore";

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

describe("vehicleHistoryStore", () => {
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

  it("guarda entrada y la lee", () => {
    saveVehicleHistoryEntry("Armado → Pretina", 1.5, 15, "desglosador", undefined, {
      status: "cumplido",
    });
    const hist = readVehicleHistoryLocal();
    assert.equal(hist.length, 1);
    assert.equal(hist[0]!.titulo, "Armado → Pretina");
    assert.equal(hist[0]!.minPerUnit, 1.5);
    assert.equal(hist[0]!.tipoReloj, "desglosador");
  });

  it("recordDesglosadorSubHistory escribe Misión → Unidad", () => {
    recordDesglosadorSubHistory(
      "Armado de pretina",
      {
        titulo: "Coser",
        status: "cumplido",
        cantidadLograda: 10,
        duracionFinal: 600,
      },
      undefined
    );
    const hist = readVehicleHistoryLocal();
    assert.equal(hist.length, 1);
    assert.equal(hist[0]!.titulo, "Armado de pretina → Coser");
    assert.ok(Math.abs(hist[0]!.minPerUnit - 1) < 0.01);
  });

  it("ignora fallado o sin medición", () => {
    recordDesglosadorSubHistory("M", {
      titulo: "X",
      status: "fallado",
      cantidadLograda: 1,
      duracionFinal: 60,
    });
    recordDesglosadorSubHistory("M", {
      titulo: "Y",
      status: "cumplido",
      cantidadLograda: 0,
      duracionFinal: 60,
    });
    assert.equal(readVehicleHistoryLocal().length, 0);
  });
});
