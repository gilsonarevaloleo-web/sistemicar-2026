import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  enqueueLaunchPersistWork,
  flushLaunchPersistOnSubClose,
  resetLaunchPersistGateForTests,
  countLaunchPersistPendingForTests,
} from "./launchPersistGate.ts";

describe("launchPersistGate", () => {
  beforeEach(() => {
    resetLaunchPersistGateForTests();
  });
  afterEach(() => {
    resetLaunchPersistGateForTests();
  });

  it("no ejecuta al encolar (sin bomba inmediata)", () => {
    let ran = 0;
    enqueueLaunchPersistWork("v1", "remote", () => {
      ran += 1;
    });
    assert.equal(countLaunchPersistPendingForTests(), 1);
    assert.equal(ran, 0);
  });

  it("flush en cierre de sub ejecuta el persist pendiente", () => {
    let ran = 0;
    enqueueLaunchPersistWork("v1", "remote", () => {
      ran += 1;
    });
    enqueueLaunchPersistWork("v1", "pillars", () => {
      ran += 10;
    });
    flushLaunchPersistOnSubClose("v1");
    assert.equal(ran, 11);
    assert.equal(countLaunchPersistPendingForTests(), 0);
  });

  it("flush de un vehículo no dispara otro", () => {
    let a = 0;
    let b = 0;
    enqueueLaunchPersistWork("va", "remote", () => {
      a += 1;
    });
    enqueueLaunchPersistWork("vb", "remote", () => {
      b += 1;
    });
    flushLaunchPersistOnSubClose("va");
    assert.equal(a, 1);
    assert.equal(b, 0);
    assert.equal(countLaunchPersistPendingForTests(), 1);
  });
});
