import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  PLANEACION_CACHE_TTL_MS,
  PLANEACION_SNAPSHOT_STORAGE_KEY,
  clearPlaneacionCache,
  getPlaneacionHeavyMetricsSnapshot,
  loadPlaneacionSnapshot,
  setPlaneacionHeavyMetricsSnapshot,
  validateSnapshot,
} from "@/lib/planeacionCache";
import { createEmptyPlaneacionHeavyMetrics } from "@/lib/planeacionHeavyMetricsCompute";

describe("planeacionCache", () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: () => null,
      length: 0,
    } as Storage;
    clearPlaneacionCache();
  });

  afterEach(() => {
    clearPlaneacionCache();
    globalThis.localStorage = prev;
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

  it("validateSnapshot corrige aperturaAt NaN sin lanzar", () => {
    const safe = validateSnapshot({
      aperturaAt: NaN,
      segundosTotales: -5,
      vehiculos: [{ segundos: NaN, cumplido: 1 }],
    });
    expect(Number.isFinite(safe.aperturaAt)).toBe(true);
    expect(safe.segundosTotales).toBe(0);
    expect(safe.vehiculos[0].segundos).toBe(0);
    expect(safe.vehiculos[0].cumplido).toBe(true);
  });

  it("loadPlaneacionSnapshot borra JSON corrupto y retorna null", () => {
    localStorage.setItem(PLANEACION_SNAPSHOT_STORAGE_KEY, "{not-json");
    expect(loadPlaneacionSnapshot()).toBeNull();
    expect(localStorage.getItem(PLANEACION_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });

  it("loadPlaneacionSnapshot sanea aperturaAt NaN silenciosamente", () => {
    localStorage.setItem(
      PLANEACION_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({ aperturaAt: NaN, segundosTotales: 10, vehiculos: [] })
    );
    const snap = loadPlaneacionSnapshot();
    expect(snap).not.toBeNull();
    expect(Number.isFinite(snap!.aperturaAt)).toBe(true);
    expect(snap!.segundosTotales).toBe(10);
  });

  it("clearPlaneacionCache vacía memoria y localStorage", () => {
    const metrics = createEmptyPlaneacionHeavyMetrics(null);
    setPlaneacionHeavyMetricsSnapshot("sig-a", metrics);
    expect(localStorage.getItem(PLANEACION_SNAPSHOT_STORAGE_KEY)).not.toBeNull();

    clearPlaneacionCache();
    expect(getPlaneacionHeavyMetricsSnapshot("sig-a")).toBeNull();
    expect(localStorage.getItem(PLANEACION_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });
});
