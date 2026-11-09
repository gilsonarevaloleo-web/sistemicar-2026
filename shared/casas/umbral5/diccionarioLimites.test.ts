import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CODIGOS_LIMITE,
  DICCIONARIO_LIMITES,
  asientoDeCanal,
  entradaLimite,
} from "./diccionarioLimites.ts";

describe("Diccionario de límites C1–C10", () => {
  it("tiene los diez códigos, C1 identidad y C2 exposición", () => {
    assert.deepEqual([...CODIGOS_LIMITE], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(entradaLimite(1).nombre, "Identidad / Ego / Cimiento");
    assert.match(entradaLimite(1).pregunta, /identidad interna/);
    assert.match(entradaLimite(1).contra, /no hay cimiento/i);
    assert.equal(entradaLimite(2).nombre, "Exposición pública");
    assert.match(entradaLimite(2).pregunta, /exposición pública/);
    assert.equal(DICCIONARIO_LIMITES[6].nombre, "Cuerpo / Roce");
    assert.equal(asientoDeCanal(4), 4);
    assert.equal(asientoDeCanal(10), 7);
    assert.equal(asientoDeCanal(8), 7);
  });
});
