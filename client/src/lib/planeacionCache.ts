import type { PlaneacionHeavyMetrics } from "@/lib/planeacionHeavyMetricsCompute";

export const PLANEACION_CACHE_TTL_MS = 30_000;
export const PLANEACION_IDLE_DEFER_MS = 2_000;

type Snapshot = {
  inputSig: string;
  metrics: PlaneacionHeavyMetrics;
  atMs: number;
};

let snapshot: Snapshot | null = null;

/** Snapshot reciente con la misma firma de entrada (TTL 30s). */
export function getPlaneacionHeavyMetricsSnapshot(
  inputSig?: string
): PlaneacionHeavyMetrics | null {
  if (!snapshot) return null;
  if (inputSig != null && snapshot.inputSig !== inputSig) return null;
  if (Date.now() - snapshot.atMs > PLANEACION_CACHE_TTL_MS) return null;
  return snapshot.metrics;
}

export function setPlaneacionHeavyMetricsSnapshot(
  inputSig: string,
  metrics: PlaneacionHeavyMetrics
): void {
  snapshot = { inputSig, metrics, atMs: Date.now() };
}

export function invalidatePlaneacionHeavyMetricsCache(): void {
  snapshot = null;
}
