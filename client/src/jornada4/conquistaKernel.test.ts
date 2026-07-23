import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyConquistaSubClose,
  applyConquistaCycleClose,
} from "./conquistaKernel.ts";
import type { SubVehiculo, Vehicle } from "../lib/persistence.ts";

function sub(partial: Partial<SubVehiculo> & { id: string; titulo: string }): SubVehiculo {
  return {
    status: "pendiente",
    ...partial,
  } as SubVehiculo;
}

function vehicle(subs: SubVehiculo[]): Vehicle {
  return {
    id: "v1",
    titulo: "Test conquista",
    status: "activo",
    userId: "u1",
    tipoFlota: "tiempo",
    tipoReloj: "desglosador",
    aperturaAt: Date.now() - 60_000,
    subVehiculos: subs,
  } as Vehicle;
}

describe("conquistaKernel", () => {
  it("cierra sub activo y activa el siguiente", () => {
    const now = 1_700_000_000_000;
    const v = vehicle([
      sub({ id: "a", titulo: "A", status: "activo", aperturaAt: now - 10_000 }),
      sub({ id: "b", titulo: "B", status: "pendiente" }),
    ]);
    const patch = applyConquistaSubClose({
      vehicle: v,
      subId: "a",
      status: "cumplido",
      now,
    });
    assert.ok(patch);
    assert.equal(patch!.closedSub.status, "cumplido");
    assert.equal(patch!.nextActiveSubId, "b");
    assert.equal(patch!.cycleReady, false);
    assert.equal(patch!.subVehiculos.find(s => s.id === "b")?.status, "activo");
  });

  it("marca cycleReady cuando no quedan pendientes", () => {
    const now = 1_700_000_000_000;
    const v = vehicle([
      sub({ id: "a", titulo: "A", status: "activo", aperturaAt: now - 5_000 }),
    ]);
    const patch = applyConquistaSubClose({
      vehicle: v,
      subId: "a",
      status: "cumplido",
      now,
    });
    assert.ok(patch);
    assert.equal(patch!.cycleReady, true);

    const closed = applyConquistaCycleClose({
      ...v,
      subVehiculos: patch!.subVehiculos,
    }, now);
    assert.ok(closed);
    assert.equal(closed!.status, "cumplido");
  });
});
