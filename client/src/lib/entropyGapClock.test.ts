import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLimaDayStartMs } from "./segmentTime.ts";
import {
  armLiveGapClock,
  clearLiveGapClock,
  computeTimestampGapEntropyMin,
  getLiveGapClockState,
  plannedMinutesBetween,
  resetLiveGapClockForTests,
} from "./entropyGapClock.ts";

function limaAt(y: number, mo: number, d: number, h: number, min = 0): number {
  return Date.UTC(y, mo, d, h + 5, min);
}

describe("entropyGapClock", () => {
  it("plannedMinutesBetween respeta ventanas de segmento", () => {
    const start = limaAt(2026, 4, 18, 8, 0);
    const end = limaAt(2026, 4, 18, 8, 10);
    const limaDayStart = getLimaDayStartMs(start);
    const mins = plannedMinutesBetween(
      [{ horaInicio: "08:00", horaFin: "12:00" }],
      limaDayStart,
      start,
      end
    );
    assert.equal(mins, 10);
  });

  it("plannedMinutesBetween fusiona segmentos solapados (no multiplica horas)", () => {
    const start = limaAt(2026, 4, 18, 5, 30);
    const end = limaAt(2026, 4, 18, 21, 0);
    const limaDayStart = getLimaDayStartMs(start);
    const mins = plannedMinutesBetween(
      [
        { horaInicio: "05:30", horaFin: "21:00" },
        { horaInicio: "05:30", horaFin: "21:00" },
        { horaInicio: "05:30", horaFin: "21:00" },
      ],
      limaDayStart,
      start,
      end
    );
    assert.equal(mins, 15.5 * 60, "3 ventanas idénticas → 15.5h únicas, no 46.5h");
  });

  it("computeTimestampGapEntropyMin suma baseline + minutos desde gapAnchor", () => {
    resetLiveGapClockForTests();
    const gapAnchor = limaAt(2026, 4, 18, 8, 0);
    const now = limaAt(2026, 4, 18, 8, 5);
    const gapState = armLiveGapClock({
      gapAnchorMs: gapAnchor,
      baselineEntropyMin: 3,
      nowMs: gapAnchor,
    });
    const entropia = computeTimestampGapEntropyMin({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      nowMs: now,
      gapState,
    });
    assert.equal(entropia, 8);
  });

  it("clearLiveGapClock elimina estado persistido", () => {
    armLiveGapClock({
      gapAnchorMs: Date.now(),
      baselineEntropyMin: 1,
    });
    clearLiveGapClock();
    assert.equal(getLiveGapClockState(), null);
  });
});
