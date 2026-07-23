import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  enterOrientationQuietForTests,
  getOrientationQuietRemainingMs,
  isOrientationQuiet,
  ORIENTATION_QUIET_MS,
  resetOrientationQuietGateForTests,
  runWhenOrientationSettled,
} from "./orientationQuietGate.ts";

describe("orientationQuietGate", () => {
  beforeEach(() => {
    resetOrientationQuietGateForTests();
  });

  afterEach(() => {
    resetOrientationQuietGateForTests();
  });

  it("fuera de quiet ejecuta de inmediato", () => {
    let ran = 0;
    runWhenOrientationSettled(() => {
      ran += 1;
    });
    assert.equal(ran, 1);
    assert.equal(isOrientationQuiet(), false);
  });

  it("en quiet aplaza la ejecución", async () => {
    // Stub mínimo de window.setTimeout para entorno node.
    const timers: Array<{ id: number; fn: () => void; ms: number }> = [];
    let nextId = 1;
    // @ts-expect-error test stub
    globalThis.window = {
      setTimeout: (fn: () => void, ms?: number) => {
        const id = nextId++;
        timers.push({ id, fn, ms: ms ?? 0 });
        return id;
      },
      clearTimeout: () => {},
      innerWidth: 390,
      innerHeight: 844,
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {},
      scrollY: 0,
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      },
    };

    enterOrientationQuietForTests(80);
    assert.equal(isOrientationQuiet(), true);
    assert.ok(getOrientationQuietRemainingMs() > 0);
    assert.ok(getOrientationQuietRemainingMs() <= ORIENTATION_QUIET_MS);

    let ran = 0;
    runWhenOrientationSettled(() => {
      ran += 1;
    }, 200);
    assert.equal(ran, 0);
    assert.equal(timers.length, 1);

    timers[0].fn();
    assert.equal(ran, 1);
  });
});
