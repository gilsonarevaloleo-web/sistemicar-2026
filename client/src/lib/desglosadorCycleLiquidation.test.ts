import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { SubVehiculo, Vehicle } from "./persistence.ts";
import {
  applyDesglosadorCloseOptimistic,
  resetDesglosadorLiquidationForTests,
  scheduleGlobalCycleLiquidation,
  type DesglosadorLiquidationDeps,
} from "./desglosadorCycleLiquidation.ts";
import { resetVehicleSessionSealsForTests } from "./vehicleSessionSeal.ts";

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: "Ciclo test",
    criterioFin: "tiempo",
    criterioDetalle: "30 min",
    userId: "u1",
    status: "activo",
    tipoReloj: "desglosador",
    createdAt: new Date(),
    tiempoInicio: new Date(),
    aperturaAt: Date.now() - 600_000,
    subVehiculos: [],
    ...partial,
  } as Vehicle;
}

function sub(id: string, status: SubVehiculo["status"]): SubVehiculo {
  return { id, titulo: `Sub ${id}`, status };
}

describe("desglosadorCycleLiquidation", () => {
  afterEach(() => {
    resetDesglosadorLiquidationForTests();
    resetVehicleSessionSealsForTests();
  });

  it("applyDesglosadorCloseOptimistic sella cumplido local sin Firebase", () => {
    const vehicleId = "dg1";
    const subs = [sub("s1", "cumplido"), sub("s2", "cumplido")];
    let vehicles = [veh({ id: vehicleId, subVehiculos: subs })];
    let persistCalls = 0;

    const result = applyDesglosadorCloseOptimistic({
      userId: "u1",
      vehicleId,
      vehicle: vehicles[0],
      subs,
      getAllVehicles: () => vehicles,
      patchAllVehicles: mapper => {
        vehicles = mapper(vehicles);
      },
      removeFromOptimisticRef: () => {},
      persistVehicles: () => {
        persistCalls++;
      },
      segmentos: [],
      onConquistaPulse: () => {},
    });

    assert.ok(result);
    assert.equal(result!.closePatch.status, "cumplido");
    assert.equal(result!.closePatch.cierreManual, true);
    assert.equal(vehicles[0].status, "cumplido");
    assert.equal(vehicles[0].cierreManual, true);
    assert.ok(vehicles[0].cierreAt);
    assert.equal(persistCalls, 0);
  });

  it("scheduleGlobalCycleLiquidation agenda executeGlobalCycleLiquidation", () => {
    let deferred = false;
    let executed = false;

    scheduleGlobalCycleLiquidation({} as DesglosadorLiquidationDeps, {
      defer: run => {
        deferred = true;
        run();
      },
      execute: async () => {
        executed = true;
      },
    });

    assert.equal(deferred, true);
    assert.equal(executed, true);
  });
});
