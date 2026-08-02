import assert from "node:assert/strict";
import { describe, it, afterEach, mock } from "node:test";

describe("deferredVehicleSave (contrato)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("exporta flush sync para hide/pagehide", async () => {
    const mod = await import("./deferredVehicleSave.ts");
    assert.equal(typeof mod.flushPendingSaveLocalVehicles, "function");
    assert.equal(typeof mod.scheduleSaveLocalVehicles, "function");
    assert.equal(typeof mod.scheduleSaveLocalVehiclesAfterLaunch, "function");
  });
});
