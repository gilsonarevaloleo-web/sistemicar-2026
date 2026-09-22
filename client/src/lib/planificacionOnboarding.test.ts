import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePrimerDiaAutoComplete,
  getPrimerDiaItems,
  getTutorialSteps,
  PLANIFICACION_DOCTOR_QUICK_PROMPTS,
} from "./planificacionOnboarding.ts";

describe("planificacionOnboarding", () => {
  it("getTutorialSteps varía por perfil", () => {
    assert.equal(getTutorialSteps("base").length, 5);
    assert.ok(getTutorialSteps("estudiante").length > getTutorialSteps("base").length);
    assert.ok(getTutorialSteps("produccion").length > getTutorialSteps("base").length);
  });

  it("computePrimerDiaAutoComplete detecta vehículo y cierre", () => {
    const dayStart = Date.now() - 3600_000;
    const now = Date.now();
    const auto = computePrimerDiaAutoComplete({
      dayStartMs: dayStart,
      segmentos: [{ estado: "pendiente" }],
      vehicles: [
        { status: "cumplido", cierreAt: now, aperturaAt: now },
      ],
    });
    assert.equal(auto.segmento, true);
    assert.equal(auto.vehiculo, true);
    assert.equal(auto.cierre, true);
  });

  it("tutorial enseña por qué se lanza, no se va de frente", () => {
    const steps = getTutorialSteps("base");
    const freno = steps.find(s => /freno|de frente/i.test(s.title));
    assert.ok(freno, "falta el paso del freno");
    assert.match(freno!.description, /reactividad|imagen detallada/i);
    assert.match(freno!.description, /desglosador/);
  });

  it("tutorial describe La Flota actual, no 4 ejes legacy", () => {
    const step = getTutorialSteps("base").find(s => /Conquista|Flota/i.test(s.title));
    assert.ok(step, "falta el paso de Conquista/Flota");
    assert.doesNotMatch(step!.description, /4 ejes|Express|Profundo|conflicto.*alcance/i);
    assert.match(step!.description, /Conquista|Enfoque/i);
  });

  it("getPrimerDiaItems incluye desglosador en produccion", () => {
    const keys = getPrimerDiaItems("produccion").map(i => i.key);
    assert.ok(keys.includes("desglosador"));
    assert.ok(!keys.includes("proyecto"));
  });

  it("Doctor IA ofrece la objeción del freno", () => {
    assert.ok(
      PLANIFICACION_DOCTOR_QUICK_PROMPTS.some(q => /de frente/i.test(q))
    );
  });
});
