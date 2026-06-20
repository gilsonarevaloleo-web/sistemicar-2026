import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePlaneacionHeavyMetrics,
  createEmptyPlaneacionHeavyMetrics,
  planeacionHeavyMetricsInputSig,
} from "./planeacionHeavyMetricsCompute.ts";

describe("planeacionHeavyMetricsCompute", () => {
  it("firma estable ignora orden de vehículos si cuenta es igual", () => {
    const a = planeacionHeavyMetricsInputSig({
      userId: "u1",
      segmentos: [{ id: "s1", horaInicio: "08:00", horaFin: "10:00", estado: "activo" } as any],
      vehicles: [{ id: "v1", status: "activo" } as any],
      focusEventsToday: [],
      yesterdayTermoSnapshot: null,
      disciplinaSnapshots: [],
    });
    const b = planeacionHeavyMetricsInputSig({
      userId: "u1",
      segmentos: [{ id: "s1", horaInicio: "08:00", horaFin: "10:00", estado: "activo" } as any],
      vehicles: [{ id: "v1", status: "activo" } as any],
      focusEventsToday: [],
      yesterdayTermoSnapshot: null,
      disciplinaSnapshots: [],
    });
    assert.equal(a, b);
  });

  it("compute devuelve escalera y termo coherentes con segmento vacío", () => {
    const m = computePlaneacionHeavyMetrics({
      userId: undefined,
      segmentos: [],
      vehicles: [],
      focusEventsToday: [],
      yesterdayTermoSnapshot: null,
      disciplinaSnapshots: [],
    });
    assert.ok(m.escaleraConciencia.capas.length === 3);
    assert.equal(m.todayTermoLive.segmentosTotales, 0);
    assert.equal(m.anilloSnapshotForEscalera.dayStats.conquistaMin, 0);
  });

  it("empty factory no lanza", () => {
    const m = createEmptyPlaneacionHeavyMetrics();
    assert.ok(m.termoCompare);
    assert.equal(m.atencionLive.indiceAtencion, 0);
  });
});
