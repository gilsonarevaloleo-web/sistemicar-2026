import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { MutableRefObject } from "react";
import type { Vehicle } from "./persistence.ts";
import {
  paintFlotaLaunchOptimistic,
  projectedConquistaMinutes,
  shouldDeferHeavyExpand,
  shouldExpandAfterPaint,
  CONQUISTA_HEAVY_SUBS_MIN,
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

  it("shouldDeferHeavyExpand: conquista ≥3 subs en coarse", () => {
    const prevWindow = globalThis.window;
    const prevMatch = globalThis.matchMedia;
    const media = (q: string) => ({
      matches: String(q).includes("pointer: coarse") || String(q).includes("max-width"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    });
    // @ts-expect-error test stub
    globalThis.window = { matchMedia: media };
    // @ts-expect-error test stub
    globalThis.matchMedia = media;
    try {
      const heavy = veh({
        id: "heavy",
        subVehiculos: Array.from({ length: CONQUISTA_HEAVY_SUBS_MIN }, (_, i) => ({
          id: `sv_${i}`,
          titulo: `Sub ${i}`,
          status: i === 0 ? ("activo" as const) : ("pendiente" as const),
          aperturaAt: i === 0 ? Date.now() : undefined,
          tiempoSugeridoSeg: 30 * 60,
        })),
      });
      assert.ok(heavy.subVehiculos!.length >= CONQUISTA_HEAVY_SUBS_MIN);
      assert.ok(projectedConquistaMinutes(heavy) >= 60);
      assert.equal(shouldDeferHeavyExpand(heavy), true);

      const light = veh({ id: "light" });
      assert.equal(shouldDeferHeavyExpand(light), false);
    } finally {
      // @ts-expect-error restore
      globalThis.window = prevWindow;
      globalThis.matchMedia = prevMatch;
    }
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

  it("paintFlotaLaunchOptimistic: situacion no usa save inmediato (after-launch)", () => {
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

    const vehiclesRef: MutableRefObject<Vehicle[]> = { current: [] };
    const optimisticVehiclesRef: MutableRefObject<Vehicle[]> = { current: [] };
    const optimistic = veh({
      id: "sit-1",
      tipoFlota: "situacion",
      tipoReloj: undefined,
      subVehiculos: [],
    });

    paintFlotaLaunchOptimistic({
      userId: "u1",
      optimisticVehicle: optimistic,
      vehiclesRef,
      optimisticVehiclesRef,
      setVehicles: () => {},
      setExpandedId: () => {},
      expandIfSituacion: true,
    });

    // Tras paint, el disco no debe haberse escrito en el mismo tick (defer 1.5s).
    assert.equal(store.has("sistemicar_vehicles"), false);
  });
});
