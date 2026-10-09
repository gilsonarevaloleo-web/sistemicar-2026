import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { scaffoldAnalysisResult } from "@shared/deposito/v3";
import {
  DEPOSITO_V2_COLLECTION_FORBIDDEN,
  DEPOSITO_V2_STORAGE_KEY_FORBIDDEN,
  DEPOSITO_V3_FIRESTORE_COLLECTION,
  DEPOSITO_V3_STORAGE_KEY,
  addVolcadoV3Entry,
  deleteVolcadoV3Entry,
  listVolcadosV3Local,
} from "./volcados.ts";

function installStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  return store;
}

describe("Depósito V3 — persistencia aislada", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
  });

  it("usa clave y colección distintas a V2", () => {
    assert.equal(DEPOSITO_V3_STORAGE_KEY, "sistemicar_volcados_v3");
    assert.equal(DEPOSITO_V3_FIRESTORE_COLLECTION, "volcados_v3");
    assert.notEqual(DEPOSITO_V3_STORAGE_KEY, DEPOSITO_V2_STORAGE_KEY_FORBIDDEN);
    assert.notEqual(
      DEPOSITO_V3_FIRESTORE_COLLECTION,
      DEPOSITO_V2_COLLECTION_FORBIDDEN,
    );
  });

  it("guarda un dictamen V3 sin tocar sistemicar_volcados", async () => {
    store.set(
      DEPOSITO_V2_STORAGE_KEY_FORBIDDEN,
      JSON.stringify([{ id: "v2_keep", texto: "volcado v2" }]),
    );
    const result = scaffoldAnalysisResult({
      perceptionEye: 7,
      characterSignedCode: 3,
    });
    const id = await addVolcadoV3Entry({
      userId: "u1",
      payload: {
        rawFact: "Vi el patrón a las 9:00. El pistón se atasca.",
        userTier: "MATRICULA",
      },
      result,
      source: "local_fallback",
      waitForRemote: false,
    });
    assert.match(id, /^local_v3_/);
    const listed = listVolcadosV3Local("u1");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].result.perceptionEye, 7);
    assert.equal(listed[0].result.characterSignedCode, 3);
    assert.equal(listed[0].result.deltaGap, 4);
    assert.equal(listed[0].rawFact.includes("patrón"), true);
    assert.equal(
      store.get(DEPOSITO_V2_STORAGE_KEY_FORBIDDEN),
      JSON.stringify([{ id: "v2_keep", texto: "volcado v2" }]),
    );
    assert.ok(store.get(DEPOSITO_V3_STORAGE_KEY));
    assert.doesNotMatch(
      String(store.get(DEPOSITO_V3_STORAGE_KEY)),
      /volcado v2/,
    );
  });

  it("filtra por usuario y borra solo V3", async () => {
    const result = scaffoldAnalysisResult({
      perceptionEye: 1,
      characterSignedCode: 1,
    });
    await addVolcadoV3Entry({
      userId: "ana",
      payload: { rawFact: "hecho de ana lo suficientemente largo", userTier: "FREE" },
      result,
      source: "local_fallback",
      waitForRemote: false,
    });
    await addVolcadoV3Entry({
      userId: "luis",
      payload: { rawFact: "hecho de luis lo suficientemente largo", userTier: "FREE" },
      result,
      source: "local_fallback",
      waitForRemote: false,
    });
    assert.equal(listVolcadosV3Local("ana").length, 1);
    assert.equal(listVolcadosV3Local("luis").length, 1);
    const ana = listVolcadosV3Local("ana")[0];
    await deleteVolcadoV3Entry("ana", ana.id);
    assert.equal(listVolcadosV3Local("ana").length, 0);
    assert.equal(listVolcadosV3Local("luis").length, 1);
  });
});
