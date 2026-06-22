import { describe, expect, it, vi, afterEach } from "vitest";
import {
  PLANEACION_CACHE_TTL_MS,
  getPlaneacionHeavyMetricsSnapshot,
  invalidatePlaneacionHeavyMetricsCache,
  setPlaneacionHeavyMetricsSnapshot,
} from "@/lib/planeacionCache";
import { createEmptyPlaneacionHeavyMetrics } from "@/lib/planeacionHeavyMetricsCompute";

describe("planeacionCache", () => {
  afterEach(() => {
    invalidatePlaneacionHeavyMetricsCache();
    vi.useRealTimers();
  });

  it("devuelve snapshot dentro del TTL con misma inputSig", () => {
    const metrics = createEmptyPlaneacionHeavyMetrics(null);
    setPlaneacionHeavyMetricsSnapshot("sig-a", metrics);
    expect(getPlaneacionHeavyMetricsSnapshot("sig-a")).toBe(metrics);
  });

  it("invalida por inputSig distinta o TTL expirado", () => {
    vi.useFakeTimers();
    const metrics = createEmptyPlaneacionHeavyMetrics(null);
    setPlaneacionHeavyMetricsSnapshot("sig-a", metrics);

    expect(getPlaneacionHeavyMetricsSnapshot("sig-b")).toBeNull();

    vi.advanceTimersByTime(PLANEACION_CACHE_TTL_MS + 1);
    expect(getPlaneacionHeavyMetricsSnapshot("sig-a")).toBeNull();
  });
});
