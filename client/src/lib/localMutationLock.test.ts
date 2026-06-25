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
  resetLocalVehicleMutationLockForTests,
  LOCAL_VEHICLE_MUTATION_LOCK_MS,
} from "./localMutationLock.ts";

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
});
