import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_RITUAL,
  CASA_OFICIO_RITUAL_CORTO,
} from "./oficioCasa.ts";
import { CASA_UMBRAL5_RITUAL } from "../casas/umbral5/prompt.ts";
import { PLANETA_OFICIO } from "../planetas/leyCasasUmbral.ts";

describe("Casa 5 Oficio — identidad", () => {
  it("fija marca corta, ritual largo y no reusa el límite", () => {
    assert.equal(CASA_OFICIO_NOMBRE, "La Casa 5: Oficio");
    assert.equal(CASA_OFICIO_MARCA, "Oficio");
    assert.equal(CASA_OFICIO_RITUAL_CORTO, "¿Qué se te debe?");
    assert.match(CASA_OFICIO_RITUAL, /trabajo, favor, hora o pieza/);
    assert.match(CASA_OFICIO_RITUAL, /qué se te debe/i);
    assert.match(CASA_OFICIO_FIRMA, /valía que no se cobra/);
    assert.notEqual(CASA_OFICIO_RITUAL, CASA_UMBRAL5_RITUAL);
    assert.equal(PLANETA_OFICIO, 5);
  });
});
