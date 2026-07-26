/**
 * Cache compartido Disciplina lite — bucket temporal + firma.
 */
import { isCoarseConcienciaDevice } from "@/lib/concienciaClock";
import {
  buildDisciplinaLiteInputSig,
  computeDisciplinaLite,
  type DisciplinaLiteModel,
} from "@/lib/disciplinaLiteCompute";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";

export function disciplinaLiteCacheBucketMs(): number {
  return isCoarseConcienciaDevice() ? 12_000 : 6_000;
}

export function disciplinaLiteRefreshIntervalMs(): number {
  return disciplinaLiteCacheBucketMs();
}

type CacheEntry = { key: string; model: DisciplinaLiteModel };

let cache: CacheEntry | null = null;

export function getCachedDisciplinaLite(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  now?: number;
}): DisciplinaLiteModel {
  const now = params.now ?? Date.now();
  const segmentoActivoId = params.segmentoActivoId ?? null;
  const bucket = Math.floor(now / disciplinaLiteCacheBucketMs());
  const sig = buildDisciplinaLiteInputSig(
    params.segmentos,
    params.vehicles,
    segmentoActivoId
  );
  const key = `${bucket}|${sig}`;
  if (cache?.key === key) return cache.model;

  const model = computeDisciplinaLite({
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    segmentoActivoId,
    now,
  });
  cache = { key, model };
  return model;
}

export function invalidateDisciplinaLiteCache(): void {
  cache = null;
}
