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
  Object.defineProperty(globalThis, "window", {
    value: { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} },
    configurable: true,
  });
}

describe("jornadaApunteStore", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("apunta el día y lo cierra con las dos frases", async () => {
    const { apuntarJornada, cerrarApunteJornada, readApunteDelDia } = await import(
      "./jornadaApunteStore.ts"
    );
    const now = Date.UTC(2026, 8, 19, 14, 0, 0);
    const a = apuntarJornada("cerrar dos unidades", now);
    assert.equal(a.blanco, "cerrar dos unidades");
    assert.equal(readApunteDelDia(undefined, now)?.blanco, "cerrar dos unidades");
    const cerrado = cerrarApunteJornada("cerré dos", "no planté anillo", now + 1000);
    assert.equal(cerrado.ocurrio, "cerré dos");
    assert.equal(cerrado.noOcurrio, "no planté anillo");
    assert.equal(readApunteDelDia(undefined, now + 1000)?.cerradoAt, now + 1000);
  });

  it("reescribir el blanco antes del cierre borra un contraste a medias", async () => {
    const { apuntarJornada, readApunteDelDia } = await import("./jornadaApunteStore.ts");
    const now = Date.UTC(2026, 8, 19, 14, 0, 0);
    apuntarJornada("primera", now);
    const otra = apuntarJornada("segunda", now + 50);
    assert.equal(otra.blanco, "segunda");
    assert.equal(otra.ocurrio, undefined);
    assert.equal(readApunteDelDia(undefined, now)?.blanco, "segunda");
  });

  it("no cierra si el día no tiene blanco", async () => {
    const { cerrarApunteJornada } = await import("./jornadaApunteStore.ts");
    assert.throws(
      () => cerrarApunteJornada("a", "b", Date.UTC(2026, 8, 19, 14, 0, 0)),
      /no se apuntó/i,
    );
  });
});
