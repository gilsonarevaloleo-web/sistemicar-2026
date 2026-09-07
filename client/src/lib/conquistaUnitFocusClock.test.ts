import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUnitFocusLap,
  buildUnitFocusRingView,
  formatGananciaDelta,
  formatUnitFocusElapsed,
  gananciaKindFromDelta,
  recordPaceMs,
  unitFocusCurrentLapMs,
  unitFocusElapsedMs,
  unitFocusMatch,
  vehicleRecordUnitElapsedMs,
  vehicleRecordUnitsDone,
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

  it("vuelta en curso = elapsed menos última absoluta", () => {
    assert.equal(unitFocusCurrentLapMs(12_000, null), 12_000);
    assert.equal(unitFocusCurrentLapMs(30_000, 12_000), 18_000);
    assert.equal(unitFocusCurrentLapMs(5_000, 12_000), 0);
  });

  it("récord 3.8 min/u cuenta unidades del vehículo", () => {
    assert.equal(recordPaceMs(3.8), 228_000);
    assert.equal(vehicleRecordUnitsDone(0, 3.8), 0);
    assert.equal(vehicleRecordUnitsDone(227_999, 3.8), 0);
    assert.equal(vehicleRecordUnitsDone(228_000, 3.8), 1);
    assert.equal(vehicleRecordUnitsDone(456_000, 3.8), 2);
    assert.equal(vehicleRecordUnitElapsedMs(240_000, 3.8), 12_000);
    assert.equal(vehicleRecordUnitsDone(60_000, null), 0);
  });

  it("match: unidad vs récord sin ensuciar el récord", () => {
    assert.equal(unitFocusMatch(0, 0, false), "no-record");
    assert.equal(unitFocusMatch(2, 2, true), "even");
    assert.equal(unitFocusMatch(3, 2, true), "ahead");
    assert.equal(unitFocusMatch(1, 2, true), "behind");
  });

  it("ganancia anclada: ±5s es ritmo, no desaparece", () => {
    assert.equal(gananciaKindFromDelta(-6), "ganando");
    assert.equal(gananciaKindFromDelta(-5), "ritmo");
    assert.equal(gananciaKindFromDelta(0), "ritmo");
    assert.equal(gananciaKindFromDelta(5), "ritmo");
    assert.equal(gananciaKindFromDelta(6), "perdiendo");
    assert.equal(formatGananciaDelta(-135), "2m 15s");
    assert.equal(formatGananciaDelta(8), "0m 08s");
  });

  it("ring: competencia live + ganancia fija", () => {
    const even = buildUnitFocusRingView({
      vehicleElapsedMs: 456_000,
      recordMinPerUnit: 3.8,
      unitsTarget: 10,
      orangeUnits: 2,
      orangeCurrentLapMs: 12_000,
      gananciaDeltaSec: -135,
      hasProjection: true,
      vehicleTimerDisplay: "12:00",
      vehicleTimerExpired: false,
    });
    assert.equal(even.recordUnitsDone, 2);
    assert.equal(even.orangeUnits, 2);
    assert.equal(even.match, "even");
    assert.equal(even.matchLabel, "Coinciden · foco sostenido");
    assert.equal(even.recordPaceLabel, "3.8 min/u");
    assert.equal(even.recordPaceDisplay, "03:48");
    assert.equal(even.gananciaKind, "ganando");
    assert.equal(even.gananciaPhrase, "ganando");
    assert.equal(even.showGananciaClock, true);
    assert.equal(even.vehicleTimerDisplay, "12:00");

    const kickoff = buildUnitFocusRingView({
      vehicleElapsedMs: 0,
      recordMinPerUnit: 3.8,
      unitsTarget: 10,
      orangeUnits: 0,
      orangeCurrentLapMs: 0,
      gananciaDeltaSec: 0,
      hasProjection: true,
    });
    assert.equal(kickoff.match, "even");
    assert.equal(kickoff.matchLabel, "Compite la unidad");

    const noRecord = buildUnitFocusRingView({
      vehicleElapsedMs: 30_000,
      recordMinPerUnit: null,
      unitsTarget: null,
      orangeUnits: 1,
      orangeCurrentLapMs: 8_000,
      gananciaDeltaSec: 0,
      hasProjection: false,
    });
    assert.equal(noRecord.hasRecord, false);
    assert.equal(noRecord.match, "no-record");
    assert.equal(noRecord.matchLabel, null);
    assert.equal(noRecord.showGananciaClock, false);
    assert.equal(noRecord.gananciaKind, "ritmo");
  });
});
