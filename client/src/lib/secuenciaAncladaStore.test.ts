import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  readSecuenciasAncladas,
  secuenciaAncladaStorageKey,
  writeSecuenciasAncladas,
} from "./secuenciaAncladaStore.ts";
import type { SecuenciaAnclada } from "./secuenciaAnclada.ts";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const sample: SecuenciaAnclada = {
  letra: "A",
  titulo: "Cierre de tarde",
  filas: ["Responder", "Cerrar caja"],
  filasProyectoIds: ["", ""],
  modo: "rapido",
  hora: "08:00",
  diasActivos: [1, 2, 3, 4, 5],
  ancladaAt: 10,
  updatedAt: 10,
};

describe("secuenciaAncladaStore", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it("la clave es por usuario y rechaza ids con slash", () => {
    assert.equal(
      secuenciaAncladaStorageKey("user_1"),
      "sistemicar_secuencia_anclada_v2_user_1"
    );
    assert.equal(secuenciaAncladaStorageKey("../etc"), null);
    assert.equal(secuenciaAncladaStorageKey("a/b"), null);
    assert.equal(secuenciaAncladaStorageKey(""), null);
  });

  it("roundtrip local y aísla usuarios", () => {
    writeSecuenciasAncladas("u1", [sample]);
    writeSecuenciasAncladas("u2", [
      { ...sample, letra: "B", titulo: "Otra" },
    ]);
    assert.equal(readSecuenciasAncladas("u1")[0]?.titulo, "Cierre de tarde");
    assert.equal(readSecuenciasAncladas("u2")[0]?.letra, "B");
    assert.equal(readSecuenciasAncladas("u3").length, 0);
  });

  it("JSON roto no tira y no cruza cuentas", () => {
    localStorage.setItem("sistemicar_secuencia_anclada_v2_u1", "{nope");
    assert.deepEqual(readSecuenciasAncladas("u1"), []);
  });
});
