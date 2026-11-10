import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_PERIMETRO,
  CASA_OFICIO_RITUAL,
  CASA_OFICIO_RITUAL_CORTO,
  MATRIZ_OFICIO,
  OFICIO_PRODUCTO_VENTAS,
  fichaMatrizOficio,
} from "./oficioCasa.ts";
import { CASA_UMBRAL5_RITUAL } from "../casas/umbral5/prompt.ts";
import { CASA_CODIGO4_RITUAL } from "../casas/codigo4/prompt.ts";
import { PLANETA_OFICIO } from "../planetas/leyCasasUmbral.ts";

describe("Casa 5 Oficio — identidad", () => {
  it("el ritual corta con el saber del oficio, no con el límite ni el problema", () => {
    assert.equal(CASA_OFICIO_NOMBRE, "La Casa 5: Oficio");
    assert.equal(CASA_OFICIO_MARCA, "Oficio");
    assert.equal(CASA_OFICIO_RITUAL_CORTO, "¿Cuánto sabes sobre tu oficio?");
    assert.match(CASA_OFICIO_RITUAL, /responsabilidad, deber o cuenta/);
    assert.match(CASA_OFICIO_FIRMA, /valía que no se cobra/);
    assert.notEqual(CASA_OFICIO_RITUAL, CASA_UMBRAL5_RITUAL);
    assert.notEqual(CASA_OFICIO_RITUAL_CORTO, CASA_CODIGO4_RITUAL);
    assert.equal(PLANETA_OFICIO, 5);
    assert.match(CASA_OFICIO_PERIMETRO, /Cálculo/);
  });

  it("la matriz del 5 tiene diez códigos y C5 es Cálculo, no Decisión", () => {
    assert.equal(MATRIZ_OFICIO.length, 10);
    assert.equal(fichaMatrizOficio(5).marca, "Cálculo");
    assert.notEqual(fichaMatrizOficio(5).marca, "Decisión");
    assert.equal(fichaMatrizOficio(7).marca, "Justicia");
    assert.doesNotMatch(MATRIZ_OFICIO.map((f) => f.marca).join(" "), /Decisión|Límite|Mancha/);
  });

  it("el maestro de Oficio ofrece Maestro en ventas como capa profunda", () => {
    assert.equal(OFICIO_PRODUCTO_VENTAS, "Maestro en ventas");
  });
});
