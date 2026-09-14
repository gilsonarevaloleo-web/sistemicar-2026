import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEY_OPTICA_CODIGO_AXIOMAS,
  LEY_OPTICA_CODIGO_CANON,
  LEY_OPTICA_CODIGO_FIRMA,
  LEY_OPTICA_CODIGO_KERNEL,
  LEY_OPTICA_CODIGO_MARCA,
  LEY_OPTICA_CODIGO_NOMBRE,
  LEY_OPTICA_CODIGO_NO_ES,
  LEY_OPTICA_CODIGO_OJOS,
  LEY_OPTICA_CODIGO_RITUAL,
  LEY_OPTICA_CODIGO_UNIDAD,
  resumenLeyOpticaCodigo,
} from "./leyOpticaCodigo.ts";

describe("Ley de los Diez Ojos / Óptica-Código", () => {
  it("nombra el ensamble y lo separa del tercer ojo y de Carácter-Código", () => {
    assert.equal(LEY_OPTICA_CODIGO_NOMBRE, "Ley de los Diez Ojos");
    assert.equal(LEY_OPTICA_CODIGO_MARCA, "Óptica-Código");
    assert.equal(LEY_OPTICA_CODIGO_UNIDAD, "volcado");
    assert.equal(LEY_OPTICA_CODIGO_RITUAL, "¿Qué aprendí hoy?");
    assert.match(LEY_OPTICA_CODIGO_FIRMA, /diez lecturas/i);
    assert.equal(LEY_OPTICA_CODIGO_AXIOMAS.length, 6);
    assert.equal(LEY_OPTICA_CODIGO_OJOS.length, 10);
    assert.ok(LEY_OPTICA_CODIGO_NO_ES.some((l) => /tercer ojo/i.test(l)));
    assert.ok(LEY_OPTICA_CODIGO_NO_ES.some((l) => /Carácter-Código/i.test(l)));
  });

  it("el kernel es corto y el canon cita a las hermanas y al techo observacional", () => {
    assert.ok(LEY_OPTICA_CODIGO_KERNEL.length < 420);
    assert.match(LEY_OPTICA_CODIGO_KERNEL, /Óptica-Código/);
    assert.match(LEY_OPTICA_CODIGO_KERNEL, /volcado/);
    assert.match(LEY_OPTICA_CODIGO_CANON, /Resistencia en Cascada/);
    assert.match(LEY_OPTICA_CODIGO_CANON, /Carácter-Código/);
    assert.match(LEY_OPTICA_CODIGO_CANON, /límite de observación/i);
    assert.match(LEY_OPTICA_CODIGO_CANON, /VOLCADO/);
    assert.match(resumenLeyOpticaCodigo(), /Ley de los Diez Ojos/);
  });

  it("los diez ojos cubren C1–C10 sin repetir código", () => {
    const numeros = LEY_OPTICA_CODIGO_OJOS.map((o) => o.codigo);
    assert.deepEqual(numeros, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const ojo of LEY_OPTICA_CODIGO_OJOS) {
      assert.match(LEY_OPTICA_CODIGO_CANON, new RegExp(`C${ojo.codigo}`));
      assert.match(LEY_OPTICA_CODIGO_CANON, new RegExp(ojo.nombre));
    }
  });
});
