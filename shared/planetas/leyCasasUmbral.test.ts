import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEY_CASAS_UMBRAL_AXIOMAS,
  LEY_CASAS_UMBRAL_CANON,
  LEY_CASAS_UMBRAL_FIRMA,
  LEY_CASAS_UMBRAL_KERNEL,
  LEY_CASAS_UMBRAL_MARCA,
  LEY_CASAS_UMBRAL_NOMBRE,
  LEY_CASAS_UMBRAL_NO_ES,
  MUNDOS_OPERATIVOS,
  PLANETA_DEPOSITO,
  PLANETA_UMBRAL,
  SALTO_ORIGEN_UMBRAL,
  etiquetaMundo,
  resumenLeyCasasUmbral,
} from "./leyCasasUmbral.ts";

describe("Ley de las Casas y el Umbral", () => {
  it("fija Depósito en 2 (casa) y Umbral en 8 (puerta)", () => {
    assert.equal(LEY_CASAS_UMBRAL_NOMBRE, "Ley de las Casas y el Umbral");
    assert.equal(LEY_CASAS_UMBRAL_MARCA, "Casa-Umbral");
    assert.match(LEY_CASAS_UMBRAL_FIRMA, /puerta del 8/);
    assert.equal(PLANETA_DEPOSITO, 2);
    assert.equal(PLANETA_UMBRAL, 8);
    assert.equal(SALTO_ORIGEN_UMBRAL, "3→8");
    assert.equal(MUNDOS_OPERATIVOS[1].nombre, "Depósito");
    assert.equal(MUNDOS_OPERATIVOS[1].tipo, "casa");
    assert.equal(MUNDOS_OPERATIVOS[7].nombre, "Umbral");
    assert.equal(MUNDOS_OPERATIVOS[7].tipo, "umbral");
    assert.equal(LEY_CASAS_UMBRAL_AXIOMAS.length, 6);
    assert.ok(LEY_CASAS_UMBRAL_NO_ES.some((l) => /ranking/i.test(l)));
  });

  it("el kernel es corto y el canon nombra el salto 3→8", () => {
    assert.ok(LEY_CASAS_UMBRAL_KERNEL.length < 420);
    assert.match(LEY_CASAS_UMBRAL_CANON, /3→8/);
    assert.match(LEY_CASAS_UMBRAL_CANON, /no es casa/i);
    assert.match(LEY_CASAS_UMBRAL_CANON, /Óptica-Código/);
    assert.match(etiquetaMundo(2), /Casa · Depósito/);
    assert.match(etiquetaMundo(8), /Puerta · Umbral/);
    assert.match(resumenLeyCasasUmbral(), /Ley de las Casas y el Umbral/);
  });
});
