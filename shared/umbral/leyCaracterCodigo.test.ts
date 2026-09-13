import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEY_CARACTER_CODIGO_AXIOMAS,
  LEY_CARACTER_CODIGO_CANON,
  LEY_CARACTER_CODIGO_FIRMA,
  LEY_CARACTER_CODIGO_KERNEL,
  LEY_CARACTER_CODIGO_MARCA,
  LEY_CARACTER_CODIGO_NOMBRE,
  LEY_CARACTER_CODIGO_NO_ES,
  resumenLeyCaracterCodigo,
} from "./leyCaracterCodigo.ts";

describe("Ley del Carácter del Código", () => {
  it("nombra el ensamble y lo separa de coaching y DISC", () => {
    assert.equal(LEY_CARACTER_CODIGO_NOMBRE, "Ley del Carácter del Código");
    assert.equal(LEY_CARACTER_CODIGO_MARCA, "Carácter-Código");
    assert.match(LEY_CARACTER_CODIGO_FIRMA, /voz del obstáculo/i);
    assert.equal(LEY_CARACTER_CODIGO_AXIOMAS.length, 5);
    assert.ok(LEY_CARACTER_CODIGO_NO_ES.some((l) => /coaching/i.test(l)));
    assert.ok(LEY_CARACTER_CODIGO_NO_ES.some((l) => /DISC/i.test(l)));
  });

  it("el kernel es corto y el canon cita a la Cascada", () => {
    assert.ok(LEY_CARACTER_CODIGO_KERNEL.length < 420);
    assert.match(LEY_CARACTER_CODIGO_KERNEL, /Carácter-Código/);
    assert.match(LEY_CARACTER_CODIGO_CANON, /Resistencia en Cascada/);
    assert.match(LEY_CARACTER_CODIGO_CANON, /segunda resistencia/i);
    assert.match(resumenLeyCaracterCodigo(), /Ley del Carácter del Código/);
  });
});
