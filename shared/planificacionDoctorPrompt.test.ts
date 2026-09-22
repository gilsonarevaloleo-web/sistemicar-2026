import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlanificacionTutorSystemPrompt } from "./planificacionDoctorPrompt.ts";
import { LEY_FRENO_VEHICULO_MARCA } from "./jornada/leyFrenoVehiculo.ts";

describe("planificacionDoctorPrompt", () => {
  it("enseña la Ley del Freno cuando preguntan por qué lanzar", () => {
    const prompt = buildPlanificacionTutorSystemPrompt({
      userName: "Operador",
      planProfile: "base",
    });
    assert.match(prompt, new RegExp(LEY_FRENO_VEHICULO_MARCA));
    assert.match(prompt, /de frente/i);
    assert.match(prompt, /imagen detallada/);
    assert.match(prompt, /nombra la misión y lanza/i);
    assert.match(prompt, /antiemociones desordenadas/);
  });
});
