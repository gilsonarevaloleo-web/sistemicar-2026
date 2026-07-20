import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatUnitFocusElapsed,
  unitFocusElapsedMs,
} from "./conquistaUnitFocusClock.ts";

describe("conquistaUnitFocusClock", () => {
  it("formatea mm:ss bajo una hora", () => {
    assert.equal(formatUnitFocusElapsed(0), "00:00");
    assert.equal(formatUnitFocusElapsed(1_000), "00:01");
    assert.equal(formatUnitFocusElapsed(65_000), "01:05");
    assert.equal(formatUnitFocusElapsed(3_599_000), "59:59");
  });

  it("formatea h:mm:ss desde 1h", () => {
    assert.equal(formatUnitFocusElapsed(3_600_000), "1:00:00");
    assert.equal(formatUnitFocusElapsed(3_661_000), "1:01:01");
  });

  it("elapsed no es negativo", () => {
    assert.equal(unitFocusElapsedMs(1000, 500), 0);
    assert.equal(unitFocusElapsedMs(1000, 2500), 1500);
  });
});
