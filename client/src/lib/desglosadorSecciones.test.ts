import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySeccionTitulo,
  groupSubsBySeccion,
  lastSeccionTitulo,
  normalizeSeccionTitulo,
} from "./desglosadorSecciones.ts";

describe("normalizeSeccionTitulo", () => {
  it("recorta y vacía a null", () => {
    assert.equal(normalizeSeccionTitulo("  Armado de bolsillos  "), "Armado de bolsillos");
    assert.equal(normalizeSeccionTitulo("   "), null);
    assert.equal(normalizeSeccionTitulo(undefined), null);
    assert.equal(normalizeSeccionTitulo(""), null);
  });
});

describe("groupSubsBySeccion", () => {
  it("deja en un solo grupo las unidades sin familia", () => {
    const groups = groupSubsBySeccion([
      { id: "1", titulo: "panquequiar delantero" },
      { id: "2", titulo: "panquequiar espalda" },
      { id: "3", titulo: "manga" },
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.seccion, null);
    assert.equal(groups[0]!.items.length, 3);
  });

  it("abre una familia con título propio sin romper la misión", () => {
    const groups = groupSubsBySeccion([
      { id: "1", titulo: "panquequiar delantero" },
      { id: "2", titulo: "panquequiar espalda" },
      { id: "3", titulo: "cortar", seccionTitulo: "Armado de bolsillos" },
      { id: "4", titulo: "coser", seccionTitulo: "  Armado de bolsillos  " },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.seccion, null);
    assert.deepEqual(
      groups[0]!.items.map(s => s.id),
      ["1", "2"]
    );
    assert.equal(groups[1]!.seccion, "Armado de bolsillos");
    assert.deepEqual(
      groups[1]!.items.map(s => s.id),
      ["3", "4"]
    );
  });

  it("parte el grupo si la misma familia no es consecutiva", () => {
    const groups = groupSubsBySeccion([
      { id: "a", seccionTitulo: "Panquequiar" },
      { id: "b" },
      { id: "c", seccionTitulo: "Panquequiar" },
    ]);
    assert.equal(groups.length, 3);
    assert.equal(groups[0]!.seccion, "Panquequiar");
    assert.equal(groups[1]!.seccion, null);
    assert.equal(groups[2]!.seccion, "Panquequiar");
  });
});

describe("lastSeccionTitulo", () => {
  it("devuelve la última familia usada", () => {
    assert.equal(
      lastSeccionTitulo([
        { seccionTitulo: "Panquequiar" },
        { seccionTitulo: "Armado de bolsillos" },
      ]),
      "Armado de bolsillos"
    );
    assert.equal(lastSeccionTitulo([{ titulo: "solo" }]), null);
  });
});

describe("applySeccionTitulo", () => {
  it("asigna, limpia y no muta si no cambia", () => {
    const withSec = applySeccionTitulo({ id: "1", titulo: "x" }, "  Bolsillos ");
    assert.equal(withSec.seccionTitulo, "Bolsillos");
    const cleared = applySeccionTitulo(withSec, "  ");
    assert.equal(cleared.seccionTitulo, undefined);
    const same = applySeccionTitulo(withSec, "Bolsillos");
    assert.equal(same, withSec);
  });
});
