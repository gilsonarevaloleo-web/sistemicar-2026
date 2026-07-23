import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  enqueueLaunchPersistWork,
  flushLaunchPersistOnSubClose,
  flushLaunchPersistOnSubCloseSync,
  resetLaunchPersistGateForTests,
  countLaunchPersistPendingForTests,
  countLaunchPersistPendingByKindForTests,
  SUB_CLOSE_PERSIST_QUIET_MS,
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

  it("flush diferido en CUMPLIDO descarta local y no corre en el gesto ni a ≤2s", async () => {
    let localRan = 0;
    let remoteRan = 0;
    enqueueLaunchPersistWork("v1", "local", () => {
      localRan += 1;
    });
    enqueueLaunchPersistWork("v1", "remote", () => {
      remoteRan += 1;
    });
    flushLaunchPersistOnSubClose("v1");
    assert.equal(localRan, 0, "stringify local no debe correr en CUMPLIDO");
    assert.equal(remoteRan, 0, "remote no debe correr síncrono tras CUMPLIDO");
    assert.equal(
      countLaunchPersistPendingByKindForTests("local"),
      0,
      "local de launch se descarta — el handler agenda su propio save"
    );
    assert.equal(countLaunchPersistPendingByKindForTests("remote"), 1);

    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    assert.equal(remoteRan, 0, `remote no debe forzar antes de quiet ${SUB_CLOSE_PERSIST_QUIET_MS}ms`);
    assert.equal(localRan, 0);

    await new Promise<void>(resolve => setTimeout(resolve, SUB_CLOSE_PERSIST_QUIET_MS - 1500));
    assert.equal(remoteRan, 1, "remote corre tras quiet window");
    assert.equal(localRan, 0, "local sigue descartado");
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
