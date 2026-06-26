import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeSafeRemainingMs,
  durationMinutesToMs,
  hardwareElapsedMs,
} from "./hardwareClock.ts";

describe("hardwareClock paridad ms", () => {
  it("durationMinutesToMs convierte minutos a milisegundos", () => {
    assert.equal(durationMinutesToMs(85), 85 * 60 * 1000);
  });

  it("computeSafeRemainingMs nunca negativo y respeta startedAt", () => {
    const startedAt = 1_000_000;
    const now = startedAt + 90_000;
    const remaining = computeSafeRemainingMs(startedAt, 2, now);
    assert.equal(remaining, 2 * 60 * 1000 - 90_000);
  });

  it("escudo evita deuda prematura si elapsed < duration", () => {
    const startedAt = 5_000_000;
    const durationMs = durationMinutesToMs(85);
    const now = startedAt - 50;
    const elapsed = hardwareElapsedMs(startedAt, now);
    const remainingMs = durationMs - elapsed;
    const safe = Math.max(0, remainingMs);
    assert.equal(elapsed, 0);
    assert.equal(safe, durationMs);
  });
});
