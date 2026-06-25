import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import {
  beginLocalVehicleMutation,
  extendLocalVehicleMutation,
  armBackgroundWakeReentryShield,
  clearBackgroundWakeReentryShieldIfActive,
  forceResetOrphanMutationLocks,
  isLocalVehicleMutationLocked,
  isStructuralCloseInTransit,
  markStructuralCloseInTransit,
  releaseMutationLockWithDelay,
  resetLocalVehicleMutationLockForTests,
  simulateOrphanMutationLockForTests,
  sweepExpiredMutationLocks,
  LOCAL_VEHICLE_MUTATION_LOCK_MS,
} from "./localMutationLock.ts";

const ABSOLUTE_LOCK_CAP_MS = LOCAL_VEHICLE_MUTATION_LOCK_MS + 300;

describe("localMutationLock", () => {
  afterEach(() => {
    mock.timers.reset();
    resetLocalVehicleMutationLockForTests();
  });

  it("bloquea durante 1500 ms tras beginLocalVehicleMutation", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    beginLocalVehicleMutation("create");
    assert.equal(isLocalVehicleMutationLocked(), true);
    mock.timers.tick(LOCAL_VEHICLE_MUTATION_LOCK_MS - 1);
    assert.equal(isLocalVehicleMutationLocked(), true);
    mock.timers.tick(1);
    assert.equal(isLocalVehicleMutationLocked(), false);
  });

  it("extendLocalVehicleMutation renueva la ventana", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    beginLocalVehicleMutation("create");
    mock.timers.tick(1000);
    extendLocalVehicleMutation("remap");
    mock.timers.tick(LOCAL_VEHICLE_MUTATION_LOCK_MS - 1);
    assert.equal(isLocalVehicleMutationLocked(), true);
    mock.timers.tick(1);
    assert.equal(isLocalVehicleMutationLocked(), false);
  });

  it("beginLocalVehicleMutation ring bloquea snapshots durante sellado", () => {
    beginLocalVehicleMutation("ring");
    assert.equal(isLocalVehicleMutationLocked(), true);
    extendLocalVehicleMutation("ring");
    assert.equal(isLocalVehicleMutationLocked(), true);
  });

  it("forceResetOrphanMutationLocks limpia lock y cierre en tránsito", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    beginLocalVehicleMutation("close");
    markStructuralCloseInTransit();
    assert.equal(isLocalVehicleMutationLocked(), true);
    assert.equal(isStructuralCloseInTransit(), true);
    forceResetOrphanMutationLocks();
    assert.equal(isLocalVehicleMutationLocked(), false);
    assert.equal(isStructuralCloseInTransit(), false);
  });

  it("armBackgroundWakeReentryShield extiende candado 800ms sin pisar lock más largo", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    beginLocalVehicleMutation("ring");
    mock.timers.tick(500);
    armBackgroundWakeReentryShield(800);
    mock.timers.tick(LOCAL_VEHICLE_MUTATION_LOCK_MS - 500 - 1);
    assert.equal(isLocalVehicleMutationLocked(), true);
    mock.timers.tick(1);
    assert.equal(isLocalVehicleMutationLocked(), false);
    clearBackgroundWakeReentryShieldIfActive();
  });

  it("ráfaga ring <100ms respeta techo absoluto y libera al vencer", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    beginLocalVehicleMutation("ring");
    for (let i = 0; i < 20; i++) {
      mock.timers.tick(40);
      extendLocalVehicleMutation("ring");
    }
    assert.equal(isLocalVehicleMutationLocked(), true);
    mock.timers.tick(ABSOLUTE_LOCK_CAP_MS);
    assert.equal(isLocalVehicleMutationLocked(), false);
  });

  it("sweepExpiredMutationLocks limpia candado residual expirado", () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"] });
    mock.timers.tick(5000);
    simulateOrphanMutationLockForTests();
    assert.equal(sweepExpiredMutationLocks(), true);
    assert.equal(isLocalVehicleMutationLocked(), false);
    assert.equal(isStructuralCloseInTransit(), false);
  });
});
