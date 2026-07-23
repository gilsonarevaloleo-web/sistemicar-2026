import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUnitFocusLap,
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

  it("vuelta: split = delta desde la anterior", () => {
    const lap1 = buildUnitFocusLap(1, 12_000, 0);
    assert.equal(lap1.n, 1);
    assert.equal(lap1.absoluteMs, 12_000);
    assert.equal(lap1.splitMs, 12_000);

    const lap2 = buildUnitFocusLap(2, 30_000, 12_000);
    assert.equal(lap2.splitMs, 18_000);
    assert.equal(lap2.absoluteMs, 30_000);
  });
});
