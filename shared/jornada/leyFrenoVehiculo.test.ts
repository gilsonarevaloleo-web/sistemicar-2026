import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEY_FRENO_VEHICULO_AXIOMAS,
  LEY_FRENO_VEHICULO_CANON,
  LEY_FRENO_VEHICULO_FIRMA,
  LEY_FRENO_VEHICULO_KERNEL,
  LEY_FRENO_VEHICULO_MARCA,
  LEY_FRENO_VEHICULO_NOMBRE,
  LEY_FRENO_VEHICULO_NO_ES,
  LEY_FRENO_VEHICULO_OBJECION,
  LEY_FRENO_VEHICULO_RITUAL,
  LEY_FRENO_VEHICULO_UNIDAD,
  resumenLeyFrenoVehiculo,
} from "./leyFrenoVehiculo.ts";

describe("Ley del Freno / Freno-Vehículo", () => {
  it("nombra el ensamble y lo separa de burocracia y de las hermanas", () => {
    assert.equal(LEY_FRENO_VEHICULO_NOMBRE, "Ley del Freno");
    assert.equal(LEY_FRENO_VEHICULO_MARCA, "Freno-Vehículo");
    assert.equal(LEY_FRENO_VEHICULO_UNIDAD, "lanzamiento nombrado");
    assert.equal(LEY_FRENO_VEHICULO_RITUAL, "Antes de moverse: póngale nombre.");
    assert.match(LEY_FRENO_VEHICULO_FIRMA, /reactividad/i);
    assert.match(LEY_FRENO_VEHICULO_FIRMA, /Nombrar el vehículo/i);
    assert.equal(LEY_FRENO_VEHICULO_AXIOMAS.length, 5);
    assert.ok(LEY_FRENO_VEHICULO_NO_ES.some((l) => /burocracia|perder tiempo/i.test(l)));
    assert.ok(LEY_FRENO_VEHICULO_NO_ES.some((l) => /coach/i.test(l)));
  });

  it("el kernel es corto y el canon cita objeción, imagen y hermanas", () => {
    assert.ok(LEY_FRENO_VEHICULO_KERNEL.length < 420);
    assert.match(LEY_FRENO_VEHICULO_KERNEL, /Freno-Vehículo/);
    assert.match(LEY_FRENO_VEHICULO_KERNEL, /imagen detallada/);
    assert.match(LEY_FRENO_VEHICULO_CANON, /Óptica-Código/);
    assert.match(LEY_FRENO_VEHICULO_CANON, /Carácter-Código/);
    assert.match(LEY_FRENO_VEHICULO_CANON, /antiemociones desordenadas/);
    assert.match(LEY_FRENO_VEHICULO_CANON, /pereza es ausencia/i);
    assert.match(resumenLeyFrenoVehiculo(), /Ley del Freno/);
  });

  it("la objeción canónica nombra de frente, el freno y la imagen", () => {
    assert.match(LEY_FRENO_VEHICULO_OBJECION.q, /de frente/i);
    assert.match(LEY_FRENO_VEHICULO_OBJECION.a, /freno/i);
    assert.match(LEY_FRENO_VEHICULO_OBJECION.a, /imagen detallada/);
    assert.match(LEY_FRENO_VEHICULO_OBJECION.a, /desglosador/);
  });
});
