import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { scheduleSituacionDesgloseShadow } from "./situacionDesgloseLiquidation.ts";

const originalRic = globalThis.requestIdleCallback;
const originalCancel = globalThis.cancelIdleCallback;

describe("scheduleSituacionDesgloseShadow", () => {
  afterEach(() => {
    if (originalRic) {
      globalThis.requestIdleCallback = originalRic;
    } else {
      // @ts-expect-error cleanup
      delete globalThis.requestIdleCallback;
    }
    if (originalCancel) {
      globalThis.cancelIdleCallback = originalCancel;
    }
  });

  it("no ejecuta updateVehicle en el frame del gesto (sombra)", async () => {
    let updateCalls = 0;
    const queued: Array<() => void> = [];
    globalThis.requestIdleCallback = ((cb: IdleRequestCallback) => {
      queued.push(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline));
      return 1;
    }) as typeof requestIdleCallback;

    scheduleSituacionDesgloseShadow({
      userId: "u1",
      vehicleId: "v1",
      titulo: "Ring",
      subTareas: [],
      situacionCronometro: {
        activo: false,
        bloqueInicioAt: Date.now(),
        depthBlockPsGranted: 2,
      } as never,
      deltaDepth: 2,
      updateVehicle: async () => {
        updateCalls += 1;
      },
      awardSovereigntyPoints: async () => {},
    });

    assert.equal(updateCalls, 0);
    assert.equal(queued.length, 1);
    queued[0]!();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(updateCalls, 1);
  });
});
