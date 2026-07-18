import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { MutableRefObject } from "react";
import type { Vehicle } from "./persistence.ts";
import {
  paintFlotaLaunchOptimistic,
  shouldExpandAfterPaint,
} from "./flotaLaunchMs0.ts";
import { resetConcienciaSchedulerForTests } from "./concienciaScheduler.ts";

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: "Conquista",
    criterioFin: "tiempo",
    criterioDetalle: "",
    userId: "u1",
    status: "activo",
    tipoReloj: "desglosador",
    tipoFlota: "tiempo",
    createdAt: new Date(),
    tiempoInicio: new Date(),
    aperturaAt: Date.now(),
    subVehiculos: [
      {
        id: "sv_0",
        titulo: "Sub 1",
        status: "activo",
        aperturaAt: Date.now(),
      },
    ],
    ...partial,
  } as Vehicle;
}

describe("flotaLaunchMs0 conquista", () => {
  afterEach(() => {
    resetConcienciaSchedulerForTests();
  });

  it("shouldExpandAfterPaint: conquista desglosador y situacion", () => {
    assert.equal(
      shouldExpandAfterPaint(veh({ id: "c1", tipoReloj: "desglosador", tipoFlota: "tiempo" }), true),
      true
    );
    assert.equal(
      shouldExpandAfterPaint(veh({ id: "s1", tipoFlota: "situacion", tipoReloj: undefined }), true),
      true
    );
    assert.equal(
      shouldExpandAfterPaint(veh({ id: "d1", tipoFlota: "descanso", tipoReloj: undefined }), true),
      false
    );
  });

  it("paintFlotaLaunchOptimistic no expande conquista en el mismo frame", async () => {
    const store = new Map<string, string>();
    // @ts-expect-error test stub
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    // @ts-expect-error test stub
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(0), 0) as unknown as number;
    };

    const vehiclesRef: MutableRefObject<Vehicle[]> = { current: [] };
    const optimisticVehiclesRef: MutableRefObject<Vehicle[]> = { current: [] };
    let expanded: string | null = null;

    const optimistic = veh({ id: "desg-1" });
    paintFlotaLaunchOptimistic({
      userId: "u1",
      optimisticVehicle: optimistic,
      vehiclesRef,
      optimisticVehiclesRef,
      setVehicles: () => {},
      setExpandedId: id => {
        expanded = id;
      },
      expandIfSituacion: true,
    });

    assert.equal(vehiclesRef.current[0]?.id, "desg-1");
    assert.equal(expanded, null, "expand debe diferirse (doble rAF / transition)");
    await new Promise(r => setTimeout(r, 20));
  });
});
