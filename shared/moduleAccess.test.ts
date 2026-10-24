import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasNorteAccess,
  hasPlanificacionBaseAccess,
  hasRitmoAccess,
  jornadaPeldañoFlags,
  modulesGrantedByPlan,
  planGrantStillNeeded,
  resolveActiveModules,
} from "./moduleAccess.ts";

describe("moduleAccess — stack Norte abre enfoque", () => {
  it("Norte otorga Base + Ritmo + Hub", () => {
    assert.deepEqual(modulesGrantedByPlan("soberania_dia"), [
      "planificacion_base",
      "operativo",
      "soberania_dia",
    ]);
  });

  it("Ritmo otorga Base + Ritmo", () => {
    assert.deepEqual(modulesGrantedByPlan("operativo"), [
      "planificacion_base",
      "operativo",
    ]);
  });

  it("Base sola no abre el desglosador de enfoque", () => {
    const input = { activeModules: ["planificacion_base"] };
    assert.equal(hasPlanificacionBaseAccess(input), true);
    assert.equal(hasRitmoAccess(input), false);
    assert.equal(hasNorteAccess(input), false);
    assert.equal(planGrantStillNeeded(input, "soberania_dia"), true);
    assert.equal(planGrantStillNeeded(input, "planificacion_base"), false);
  });

  it("Norte ya escrito (sin Ritmo en el array) abre enfoque", () => {
    const input = { activeModules: ["planificacion_base", "soberania_dia"] };
    const flags = jornadaPeldañoFlags(input);
    assert.equal(flags.hasBase, true);
    assert.equal(flags.hasRitmo, true);
    assert.equal(flags.hasNorte, true);
    assert.equal(hasRitmoAccess(input), true);
    assert.equal(planGrantStillNeeded(input, "soberania_dia"), false);
  });

  it("subscriptionPlan Norte (grant admin previo) abre enfoque", () => {
    const input = {
      activeModules: ["planificacion_base"],
      subscriptionPlan: "soberania_dia",
    };
    assert.equal(hasRitmoAccess(input), true);
    assert.equal(hasNorteAccess(input), true);
    const mods = resolveActiveModules(input);
    assert.equal(mods.has("operativo"), true);
  });
});
