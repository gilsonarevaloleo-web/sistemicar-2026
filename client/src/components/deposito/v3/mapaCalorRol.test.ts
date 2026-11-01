import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celdaMuestraVacio, rolCeldaMapaCalor } from "./mapaCalorRol.ts";

describe("rolCeldaMapaCalor", () => {
  it("C10 FOCO vacío no se pinta como activo", () => {
    const rol = rolCeldaMapaCalor({
      isFoco: true,
      activo: false,
      isVacio: true,
      isCharacter: false,
      locked: false,
    });
    assert.equal(rol, "foco-vacio");
    assert.notEqual(rol, "foco-activo");
    assert.notEqual(rol, "activo");
    assert.equal(
      celdaMuestraVacio({ isVacio: true, isCharacter: false }),
      true,
    );
  });

  it("C8 presente se pinta activo, no FOCO", () => {
    const rol = rolCeldaMapaCalor({
      isFoco: false,
      activo: true,
      isVacio: false,
      isCharacter: true,
      locked: false,
    });
    assert.equal(rol, "activo");
  });

  it("C10 abrochado puede ser FOCO activo", () => {
    const rol = rolCeldaMapaCalor({
      isFoco: true,
      activo: true,
      isVacio: false,
      isCharacter: false,
      locked: false,
    });
    assert.equal(rol, "foco-activo");
    assert.equal(
      celdaMuestraVacio({ isVacio: false, isCharacter: false }),
      false,
    );
  });
});
