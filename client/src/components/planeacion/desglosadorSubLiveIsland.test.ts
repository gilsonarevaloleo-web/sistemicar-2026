import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import {
  computeDesglosadorSubClockUi,
  desglosadorSubClockKey,
  emptyDesglosadorSubClockUi,
} from "./desglosadorSubLiveIsland";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    titulo: "Embolsado",
    status: "activo",
    tipoReloj: "desglosador",
    aperturaAt: 1_000_000,
    subVehiculos: [],
    ...overrides,
  } as Vehicle;
}

describe("computeDesglosadorSubClockUi", () => {
  it("devuelve estado vacío si el sub no tiene aperturaAt", () => {
    const sub: SubVehiculo = { id: "s1", titulo: "A", status: "activo" };
    const ui = computeDesglosadorSubClockUi(vehicle(), sub, 2_000_000);
    assert.equal(ui.subTimerDisplay, emptyDesglosadorSubClockUi().subTimerDisplay);
  });

  it("cuenta elapsed en sub sin medición", () => {
    const sub: SubVehiculo = {
      id: "s1",
      titulo: "A",
      status: "activo",
      aperturaAt: 1_000_000,
    };
    const ui = computeDesglosadorSubClockUi(vehicle({ subVehiculos: [sub] }), sub, 1_065_000);
    assert.equal(ui.subTimerIsCountdown, false);
    assert.equal(ui.subTimerDisplay, "00:01:05");
  });

  it("proyecta hora fin de ciclo con subs medidos", () => {
    const active: SubVehiculo = {
      id: "s1",
      titulo: "A",
      status: "activo",
      aperturaAt: 1_000_000,
      cantidadObjetivo: 2,
      tiempoRecordMinPerUnit: 1,
      tiempoSugeridoSeg: 120,
    };
    const pending: SubVehiculo = {
      id: "s2",
      titulo: "B",
      status: "pendiente",
      cantidadObjetivo: 1,
      tiempoRecordMinPerUnit: 2,
      tiempoSugeridoSeg: 120,
    };
    const v = vehicle({ subVehiculos: [active, pending] });
    const ui = computeDesglosadorSubClockUi(v, active, 1_030_000);
    assert.equal(ui.subTimerIsCountdown, true);
    assert.notEqual(ui.futuroCicloLabel, "—");
    assert.notEqual(ui.horaFinProyectada, null);
  });

  it("desglosadorSubClockKey invalida al cambiar aperturaAt", () => {
    const subA: SubVehiculo = { id: "s1", titulo: "A", status: "activo", aperturaAt: 100 };
    const subB: SubVehiculo = { ...subA, aperturaAt: 200 };
    assert.notEqual(desglosadorSubClockKey(subA), desglosadorSubClockKey(subB));
  });

  it("transición sub→sub reinicia elapsed en computeDesglosadorSubClockUi", () => {
    const t0 = 1_000_000;
    const sub1: SubVehiculo = {
      id: "s1",
      titulo: "A",
      status: "cumplido",
      aperturaAt: t0 - 120_000,
      cierreAt: t0,
    };
    const sub2: SubVehiculo = {
      id: "s2",
      titulo: "B",
      status: "activo",
      aperturaAt: t0,
    };
    const v = vehicle({ subVehiculos: [sub1, sub2] });
    const ui = computeDesglosadorSubClockUi(v, sub2, t0 + 5_000);
    assert.equal(ui.subTimerDisplay, "00:00:05");
  });
});
