/**
 * Cache compartido del Pulso — bucket temporal + firma de entrada + suma de huecos.
 * Evita recalcular computeLiveEntropy en cada mount o tick UI.
 */
import { isCoarseConcienciaDevice } from "@/lib/concienciaClock";
import {
  buildPulsoInputSig,
  computePulsoCobertura,
  type PulsoCoberturaModel,
  type PulsoSegmentoLite,
} from "@/lib/pulsoCoberturaCompute";
import type { Vehicle } from "@/lib/persistence";
import {
  buildCoberturaHuecoIntervals,
  readCoberturaHuecosEvents,
  sumCoberturaHuecosMinutes,
} from "@/jornada4/coberturaHuecosLog";

/** Desktop ~5s; móvil coarse ~10s — nunca 1s. */
export function pulsoCacheBucketMs(): number {
  return isCoarseConcienciaDevice() ? 10_000 : 5_000;
}

/** Cadencia de refresco idle del hook (alineada al bucket). */
export function pulsoRefreshIntervalMs(): number {
  return pulsoCacheBucketMs();
}

type CacheEntry = { key: string; model: PulsoCoberturaModel };

let cache: CacheEntry | null = null;

export function getCachedPulsoCobertura(params: {
  segmentos: PulsoSegmentoLite[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  now?: number;
  applyMonotonic?: boolean;
}): PulsoCoberturaModel {
  const now = params.now ?? Date.now();
  const segmentoActivoId = params.segmentoActivoId ?? null;
  const bucket = Math.floor(now / pulsoCacheBucketMs());
  const intervals = buildCoberturaHuecoIntervals(readCoberturaHuecosEvents(), now);
  const huecosMin =
    intervals.length > 0 ? sumCoberturaHuecosMinutes(intervals, now) : null;
  const sig = buildPulsoInputSig(params.segmentos, params.vehicles, segmentoActivoId);
  const key = `${bucket}|${sig}|h${huecosMin ?? "x"}`;
  if (cache?.key === key) return cache.model;

  const model = computePulsoCobertura({
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    segmentoActivoId,
    now,
    huecosMin,
    applyMonotonic: params.applyMonotonic,
  });
  cache = { key, model };
  return model;
}

export function invalidatePulsoCoberturaCache(): void {
  cache = null;
}
