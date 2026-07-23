import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  enqueueLaunchPersistWork,
  flushLaunchPersistOnSubClose,
  flushLaunchPersistOnSubCloseSync,
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

  it("flush sync en cierre de sub ejecuta el persist pendiente", () => {
    let ran = 0;
    enqueueLaunchPersistWork("v1", "remote", () => {
      ran += 1;
    });
    enqueueLaunchPersistWork("v1", "pillars", () => {
      ran += 10;
    });
    flushLaunchPersistOnSubCloseSync("v1");
    assert.equal(ran, 11);
    assert.equal(countLaunchPersistPendingForTests(), 0);
  });

  it("flush deferido en CUMPLIDO no corre en el stack del gesto", async () => {
    let ran = 0;
    enqueueLaunchPersistWork("v1", "local", () => {
      ran += 1;
    });
    flushLaunchPersistOnSubClose("v1");
    assert.equal(ran, 0, "stringify no debe correr síncrono tras CUMPLIDO");
    assert.equal(countLaunchPersistPendingForTests(), 1);
    await new Promise<void>(resolve => {
      const deadline = Date.now() + 2000;
      const poll = () => {
        if (ran > 0 || Date.now() > deadline) {
          resolve();
          return;
        }
        setTimeout(poll, 20);
      };
      poll();
    });
    assert.equal(ran, 1);
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
    flushLaunchPersistOnSubCloseSync("va");
    assert.equal(a, 1);
    assert.equal(b, 0);
    assert.equal(countLaunchPersistPendingForTests(), 1);
  });
});
