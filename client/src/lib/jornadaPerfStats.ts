/**
 * Observabilidad ligera del hilo principal (brief Capa E — ?debug=perf).
 * Ring buffer en memoria; sin trabajo en hot path salvo cuando hay sample.
 */

export type PerfSampleName =
  | "diskFlush"
  | "diskFlushSkip"
  | "diskFlushTrimmed"
  | "schedulerDrain"
  | "situacionTeardown"
  | "situacionShadow";

type Sample = { name: PerfSampleName; ms: number; at: number };

const MAX_SAMPLES = 80;
const samples: Sample[] = [];
const listeners = new Set<() => void>();

export function recordPerfSample(name: PerfSampleName, ms: number): void {
  samples.push({ name, ms, at: Date.now() });
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  listeners.forEach(l => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

export function getPerfSamples(): readonly Sample[] {
  return samples;
}

export function getPerfSummary(): Record<
  string,
  { count: number; lastMs: number; maxMs: number; avgMs: number }
> {
  const acc = new Map<string, { count: number; sum: number; lastMs: number; maxMs: number }>();
  for (const s of samples) {
    const cur = acc.get(s.name) ?? { count: 0, sum: 0, lastMs: 0, maxMs: 0 };
    cur.count += 1;
    cur.sum += s.ms;
    cur.lastMs = s.ms;
    cur.maxMs = Math.max(cur.maxMs, s.ms);
    acc.set(s.name, cur);
  }
  const out: Record<string, { count: number; lastMs: number; maxMs: number; avgMs: number }> = {};
  acc.forEach((v, name) => {
    out[name] = {
      count: v.count,
      lastMs: Math.round(v.lastMs * 10) / 10,
      maxMs: Math.round(v.maxMs * 10) / 10,
      avgMs: Math.round((v.sum / v.count) * 10) / 10,
    };
  });
  return out;
}

export function subscribePerfStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetPerfStatsForTests(): void {
  samples.length = 0;
  listeners.clear();
}

export function isPerfDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("debug");
    return q === "perf" || localStorage.getItem("sistemicar_debug_perf") === "1";
  } catch {
    return false;
  }
}
