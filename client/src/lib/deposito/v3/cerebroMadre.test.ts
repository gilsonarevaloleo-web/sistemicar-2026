import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { scaffoldAnalysisResult } from "@shared/deposito/v3";
import {
  AXIOMAS_V2_KEY_FORBIDDEN,
  CEREBRO_MADRE_STORAGE_KEY,
  DEPOSITO_V2_STORAGE_KEY_FORBIDDEN,
  DEPOSITO_V3_STORAGE_KEY_FORBIDDEN,
  enviarCandidatoAFiltro,
  leyesCasaLocal,
  loadCerebroMadre,
  promoverFiltroALey,
  registrarAuditoriaEnCerebroMadre,
} from "./cerebroMadre.ts";

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

const VOLCADO =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite.";

describe("Cerebro Madre — persistencia de casa", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
    store.set(DEPOSITO_V2_STORAGE_KEY_FORBIDDEN, JSON.stringify([{ id: "v2" }]));
    store.set(DEPOSITO_V3_STORAGE_KEY_FORBIDDEN, JSON.stringify([{ id: "v3" }]));
    store.set(AXIOMAS_V2_KEY_FORBIDDEN, JSON.stringify({ axiomas: [{ id: "ax" }] }));
  });

  it("escribe su propia clave y no toca V2, volcados V3 ni axiomas del alumno", () => {
    const result = scaffoldAnalysisResult({
      characterSignedCode: 2,
      focoRevelacionCode: 7,
      groundingStatus: {
        isFullyGrounded: true,
        diagnosticMessage: "Firma C2 foco C7.",
      },
    });
    registrarAuditoriaEnCerebroMadre(
      { rawFact: VOLCADO, userTier: "MATRICULA" },
      result,
    );
    const cerebro = loadCerebroMadre();
    assert.equal(cerebro.principios.length, 1);
    assert.equal(cerebro.principios[0].estado, "candidato");
    assert.ok(store.get(CEREBRO_MADRE_STORAGE_KEY));
    assert.equal(
      store.get(DEPOSITO_V2_STORAGE_KEY_FORBIDDEN),
      JSON.stringify([{ id: "v2" }]),
    );
    assert.equal(
      store.get(DEPOSITO_V3_STORAGE_KEY_FORBIDDEN),
      JSON.stringify([{ id: "v3" }]),
    );
    assert.equal(
      store.get(AXIOMAS_V2_KEY_FORBIDDEN),
      JSON.stringify({ axiomas: [{ id: "ax" }] }),
    );
    assert.equal(leyesCasaLocal().length, 0);
  });

  it("promover a ley exige filtro y conserva createdAt", () => {
    const result = scaffoldAnalysisResult({
      characterSignedCode: 2,
      focoRevelacionCode: 7,
      groundingStatus: {
        isFullyGrounded: true,
        diagnosticMessage: "Firma C2 foco C7.",
      },
    });
    const nacido = registrarAuditoriaEnCerebroMadre(
      { rawFact: VOLCADO, userTier: "MATRICULA" },
      result,
    );
    const id = nacido.principios[0].id;
    const createdAt = nacido.principios[0].createdAt;
    promoverFiltroALey(id);
    assert.equal(loadCerebroMadre().principios[0].estado, "candidato");
    enviarCandidatoAFiltro(id);
    promoverFiltroALey(id);
    const ley = leyesCasaLocal()[0];
    assert.equal(ley.estado, "ley");
    assert.equal(ley.createdAt, createdAt);
  });
});
