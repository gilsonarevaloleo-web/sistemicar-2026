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
    const deposito = SISTEMA_RECINTOS.find((r) => r.id === "deposito");
    assert.equal(deposito?.exploreHref, "/ventas-deposito");
    assert.equal(deposito?.publicExplore, true);
    const espejo = SISTEMA_RECINTOS.find((r) => r.id === "espejo");
    assert.equal(espejo?.exploreHref, "/espejo/v2");
    assert.notEqual(espejo?.exploreHref, "/espejo");
    assert.doesNotMatch(
      `${espejo?.detail} ${espejo?.oneLiner}`,
      /Doctor IA|créditos|vaciado mental/i,
    );
    const jornada = SISTEMA_RECINTOS.find((r) => r.id === "jornada");
    assert.match(`${jornada?.oneLiner} ${jornada?.detail}`, /ring de conquista/i);
    assert.match(`${jornada?.detail}`, /ring de enfoque/i);
    assert.equal(jornada?.exploreHref, "/jornada-base");
    const oficio = SISTEMA_RECINTOS.find((r) => r.id === "umbral");
    assert.equal(oficio?.name, "Oficio");
    assert.equal(oficio?.ritual, "¿Cuánto sabes sobre tu oficio?");
    assert.equal(oficio?.exploreHref, "/umbral/entrada");
    assert.doesNotMatch(oficio?.ritual ?? "", /límite/i);
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
      ["Espejo", "Depósito", "Jornada", "Oficio"],
    );
  });
});
