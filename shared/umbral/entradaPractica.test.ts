import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOficioPracticaHref,
  modoUmbralDesdeParam,
  parseOficioPracticaSearch,
} from "./entradaPractica.ts";

describe("Oficio — deep link de la práctica de 10 códigos", () => {
  it("arena y forja se leen desde la query", () => {
    assert.equal(modoUmbralDesdeParam("arena"), "EXTERNO_VENTAS");
    assert.equal(modoUmbralDesdeParam("EXTERNO_VENTAS"), "EXTERNO_VENTAS");
    assert.equal(modoUmbralDesdeParam("forja"), "INTERNO_HABILIDAD");
    assert.equal(modoUmbralDesdeParam("limite"), null);
  });

  it("parsea modo + código y descarta el planeta 8", () => {
    const arena = parseOficioPracticaSearch("?modo=arena&codigo=1");
    assert.equal(arena?.modo, "EXTERNO_VENTAS");
    assert.equal(arena?.codigo, 1);
    const forja = parseOficioPracticaSearch("modo=forja&codigo=4");
    assert.equal(forja?.modo, "INTERNO_HABILIDAD");
    assert.equal(forja?.codigo, 4);
    assert.equal(parseOficioPracticaSearch("?planeta=8"), null);
    assert.equal(parseOficioPracticaSearch(""), null);
  });

  it("arma el href de La Arena y La Forja sobre /umbral/v2", () => {
    assert.equal(
      buildOficioPracticaHref("EXTERNO_VENTAS"),
      "/umbral/v2?modo=arena",
    );
    assert.equal(
      buildOficioPracticaHref("INTERNO_HABILIDAD", 1),
      "/umbral/v2?modo=forja&codigo=1",
    );
  });
});
