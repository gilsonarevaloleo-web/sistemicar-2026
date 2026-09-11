import assert from "node:assert/strict";
import { describe, it, before, beforeEach, after } from "node:test";
import { saveDesglosadorLista } from "./desglosadorListasStore.ts";
import {
  getDesglosadorHabitualResolved,
  getDesglosadorHistorico,
  getDesglosadorMisionData,
} from "./desglosadorBuscador.ts";

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

describe("desglosadorBuscador", () => {
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

  it("carga las 25 ops de un armado partido en bloques, no el último hueco", () => {
    const t0 = 1_700_000_000_000;
    const history = [];
    for (let b = 0; b < 5; b++) {
      for (let i = 0; i < 5; i++) {
        const n = b * 5 + i + 1;
        history.push({
          titulo: `Casaca leñadora → Op ${String(n).padStart(2, "0")}`,
          minPerUnit: 1,
          totalMin: 5,
          tipoReloj: "desglosador",
          fecha: t0 + b * 2 * 3600_000 + i * 60_000,
          status: "cumplido",
        });
      }
    }
    localStorage.setItem("sistemicar_vehicle_history", JSON.stringify(history));
    const titles = getDesglosadorHistorico("Casaca leñadora");
    assert.equal(titles.length, 25, `esperaba 25, recibió ${titles.length}: ${titles.join(", ")}`);
    assert.equal(titles[0], "Op 01");
    assert.equal(titles[24], "Op 25");
  });

  it("el buscador muestra la lista guardada con su conteo", () => {
    saveDesglosadorLista({
      nombre: "Casaca leñadora",
      items: Array.from({ length: 25 }, (_, i) => ({
        titulo: `Op ${i + 1}`,
      })),
    });
    const sugs = getDesglosadorMisionData("casaca", 5);
    assert.ok(sugs.length >= 1);
    assert.equal(sugs[0]!.source, "lista");
    assert.equal(sugs[0]!.subs.length, 25);
    const resolved = getDesglosadorHabitualResolved("Casaca leñadora");
    assert.equal(resolved.source, "lista");
    assert.equal(resolved.items.length, 25);
  });
});
