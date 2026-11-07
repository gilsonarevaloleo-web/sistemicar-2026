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
  PLANETA_JUEZ,
  PLANETA_OFICIO,
  PLANETA_UMBRAL,
  etiquetaMundo,
  resumenLeyCasasUmbral,
} from "./leyCasasUmbral.ts";

describe("Ley de las Casas y el Umbral", () => {
  it("fija Oficio en 5 y Umbral en 6 (casas independientes)", () => {
    assert.equal(LEY_CASAS_UMBRAL_NOMBRE, "Ley de las Casas y el Umbral");
    assert.equal(LEY_CASAS_UMBRAL_MARCA, "Casa-Umbral");
    assert.match(LEY_CASAS_UMBRAL_FIRMA, /círculo cerrado/);
    assert.equal(PLANETA_DEPOSITO, 2);
    assert.equal(PLANETA_JUEZ, 4);
    assert.equal(PLANETA_OFICIO, 5);
    assert.equal(PLANETA_UMBRAL, 6);
    assert.equal(MUNDOS_OPERATIVOS[3].nombre, "Juez Serio");
    assert.equal(MUNDOS_OPERATIVOS[3].tipo, "casa");
    assert.equal(MUNDOS_OPERATIVOS[1].nombre, "Depósito");
    assert.equal(MUNDOS_OPERATIVOS[1].tipo, "casa");
    assert.equal(MUNDOS_OPERATIVOS[4].nombre, "Oficio");
    assert.equal(MUNDOS_OPERATIVOS[4].tipo, "casa");
    assert.equal(MUNDOS_OPERATIVOS[5].nombre, "Umbral");
    assert.equal(MUNDOS_OPERATIVOS[5].tipo, "casa");
    assert.equal(MUNDOS_OPERATIVOS[7].nombre, "—");
    assert.equal(MUNDOS_OPERATIVOS[7].tipo, "sin_mundo");
    assert.equal(LEY_CASAS_UMBRAL_AXIOMAS.length, 6);
    assert.ok(LEY_CASAS_UMBRAL_NO_ES.some((l) => /ranking/i.test(l)));
    assert.ok(LEY_CASAS_UMBRAL_NO_ES.some((l) => /escalera/i.test(l)));
  });

  it("el kernel es corto y el canon nombra círculo cerrado, no pasaporte", () => {
    assert.ok(LEY_CASAS_UMBRAL_KERNEL.length < 420);
    assert.match(LEY_CASAS_UMBRAL_KERNEL, /círculo cerrado/);
    assert.match(LEY_CASAS_UMBRAL_KERNEL, /5 Oficio, 6 Umbral/);
    assert.doesNotMatch(LEY_CASAS_UMBRAL_KERNEL, /puerta del 8/);
    assert.doesNotMatch(LEY_CASAS_UMBRAL_CANON, /Pasaporte 1→2/);
    assert.doesNotMatch(LEY_CASAS_UMBRAL_CANON, /3→8/);
    assert.match(LEY_CASAS_UMBRAL_CANON, /círculo cerrado/i);
    assert.match(LEY_CASAS_UMBRAL_CANON, /Óptica-Código/);
    assert.match(etiquetaMundo(2), /Casa · Depósito/);
    assert.match(etiquetaMundo(4), /Casa · Juez Serio/);
    assert.match(etiquetaMundo(5), /Casa · Oficio/);
    assert.match(etiquetaMundo(6), /Casa · Umbral/);
    assert.match(LEY_CASAS_UMBRAL_CANON, /JUEZ SERIO/);
    assert.match(LEY_CASAS_UMBRAL_CANON, /OFICIO/);
    assert.match(LEY_CASAS_UMBRAL_KERNEL, /4 Juez/);
    assert.match(resumenLeyCasasUmbral(), /Ley de las Casas y el Umbral/);
  });
});
