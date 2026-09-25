import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SISTEMA_OFERTA, SISTEMA_RECINTOS, SISTEMA_DIA } from "./sistemaRecintos.ts";

describe("sistemaRecintos — oferta actual", () => {
  it("expone los cuatro recintos vivos, no la oferta anterior", () => {
    assert.deepEqual(
      SISTEMA_RECINTOS.map((r) => r.id),
      ["espejo", "deposito", "jornada", "umbral"],
    );
    const blob = `${SISTEMA_OFERTA.headline} ${SISTEMA_OFERTA.subhead} ${SISTEMA_RECINTOS.map((r) => r.detail).join(" ")}`;
    assert.doesNotMatch(blob, /Alquimia|Historia|ordenar (la|mi) mente/i);
  });

  it("cada recinto tiene ritual, detalle y un día encaja", () => {
    for (const recinto of SISTEMA_RECINTOS) {
      assert.ok(recinto.ritual.length > 0);
      assert.ok(recinto.oneLiner.length > 0);
      assert.ok(recinto.detail.length > 20);
    }
    assert.equal(SISTEMA_DIA.length, 4);
    assert.deepEqual(
      SISTEMA_DIA.map((p) => p.recinto),
      ["Espejo", "Depósito", "Jornada", "Umbral"],
    );
  });
});
