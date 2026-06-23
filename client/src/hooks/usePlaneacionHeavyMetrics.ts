/**
 * Fase 2 perf: métricas pesadas de Jornada con stale-while-revalidate (sin Worker).
 * Sobrevive background/foreground: abort, visibility, timeout, backup.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONCIENCIA_CLOCK_TICK_EVENT,
  isCoarseConcienciaDevice,
} from "@/lib/concienciaClock";
import type { FocusBandEvent } from "@/lib/focusBandLedger";
import {
  computePlaneacionHeavyMetrics,
  createEmptyPlaneacionHeavyMetrics,
  planeacionHeavyMetricsInputSig,
  type PlaneacionHeavyMetrics,
  type PlaneacionHeavyMetricsInput,
} from "@/lib/planeacionHeavyMetricsCompute";
import {
  getPlaneacionHeavyMetricsSnapshot,
  getPlaneacionHeavyMetricsWithBackup,
  PLANEACION_IDLE_DEFER_MS,
  setPlaneacionHeavyMetricsSnapshot,
  type PlaneacionSnapshotVehicle,
  validateHeavyMetrics,
  invalidatePlaneacionHeavyMetricsCache,
} from "@/lib/planeacionCache";
import {
  isJornadaHeavyComputeAllowed,
  msUntilJornadaHeavyComputeAllowed,
} from "@/lib/jornadaRemount";
import { setJornadaFatalError } from "@/lib/jornadaFatalError";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import type { PlanillaDailySnapshot } from "@/lib/termodinamicaAtencional";
import { SEGMENT_ATTENTION_TICK_EVENT } from "@/lib/segmentAttentionCycle";

const HEAVY_COMPUTE_TIMEOUT_MS = 6_000;

export type UsePlaneacionHeavyMetricsParams = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  focusEventsToday: FocusBandEvent[];
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null;
  disciplinaSnapshots: PlanillaDailySnapshot[];
  planTab?: "operar" | "metricas" | "meta";
};

function sleep(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), ms);
  });
}

function scheduleHeavyCompute(
  run: () => void,
  urgent: boolean,
  idleTimeoutMs = 900
): () => void {
  if (urgent) {
    run();
    return () => {};
  }
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(run, { timeout: idleTimeoutMs });
    return () => cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(run, 0);
  return () => clearTimeout(id);
}

function vehiclesToSnapshotVehicles(vehicles: Vehicle[]): PlaneacionSnapshotVehicle[] {
  return vehicles.map(v => ({
    id: v.id,
    segundos:
      typeof v.duracionFinal === "number" && Number.isFinite(v.duracionFinal)
        ? Math.max(0, v.duracionFinal * 60)
        : 0,
    cumplido: v.status === "archivado" || !!v.cierreAt,
    aperturaAt:
      typeof v.aperturaAt === "number" && Number.isFinite(v.aperturaAt)
        ? v.aperturaAt
        : undefined,
  }));
}

function resolveInitialMetrics(
  inputSig: string,
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null
): { metrics: PlaneacionHeavyMetrics; needsRecalc: boolean } {
  const cached =
    getPlaneacionHeavyMetricsSnapshot(inputSig) ??
    getPlaneacionHeavyMetricsWithBackup(inputSig, yesterdayTermoSnapshot);

  if (cached) {
    return { metrics: cached, needsRecalc: false };
  }

  return {
    metrics: createEmptyPlaneacionHeavyMetrics(yesterdayTermoSnapshot),
    needsRecalc: true,
  };
}

function backupMetrics(
  params: PlaneacionHeavyMetricsInput,
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null
): PlaneacionHeavyMetrics {
  return (
    getPlaneacionHeavyMetricsWithBackup(
      planeacionHeavyMetricsInputSig(params),
      yesterdayTermoSnapshot
    ) ?? createEmptyPlaneacionHeavyMetrics(yesterdayTermoSnapshot)
  );
}

async function computeHeavyMetricsSafe(
  params: PlaneacionHeavyMetricsInput,
  signal: AbortSignal
): Promise<PlaneacionHeavyMetrics> {
  const run = (): PlaneacionHeavyMetrics => {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return computePlaneacionHeavyMetrics(params);
  };

  return Promise.race([Promise.resolve().then(run), sleep(HEAVY_COMPUTE_TIMEOUT_MS)]);
}

export function usePlaneacionHeavyMetrics(
  params: UsePlaneacionHeavyMetricsParams
): PlaneacionHeavyMetrics {
  const paramsRef = useRef<PlaneacionHeavyMetricsInput>({
    userId: params.userId,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    focusEventsToday: params.focusEventsToday,
    yesterdayTermoSnapshot: params.yesterdayTermoSnapshot,
    disciplinaSnapshots: params.disciplinaSnapshots,
  });
  paramsRef.current = {
    userId: params.userId,
    segmentos: params.segmentos,
    vehicles: params.vehicles,
    focusEventsToday: params.focusEventsToday,
    yesterdayTermoSnapshot: params.yesterdayTermoSnapshot,
    disciplinaSnapshots: params.disciplinaSnapshots,
  };

  const inputSig = planeacionHeavyMetricsInputSig(paramsRef.current);

  const initialRef = useRef(
    resolveInitialMetrics(inputSig, params.yesterdayTermoSnapshot)
  );
  const needsRecalcRef = useRef(initialRef.current.needsRecalc);

  const [metrics, setMetrics] = useState<PlaneacionHeavyMetrics>(
    () => initialRef.current.metrics
  );

  const inputSigRef = useRef(inputSig);
  const firstRunRef = useRef(true);
  const prevPlanTabRef = useRef(params.planTab ?? "operar");
  const generationRef = useRef(0);
  const metricSkipRef = useRef(0);
  const isMountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const tabHiddenRef = useRef(
    typeof document !== "undefined" ? document.hidden : false
  );

  const applyBackupMetrics = useCallback(() => {
    const fallback = backupMetrics(
      paramsRef.current,
      paramsRef.current.yesterdayTermoSnapshot
    );
    setMetrics(fallback);
    needsRecalcRef.current = true;
    return fallback;
  }, []);

  const runCompute = useCallback((urgent: boolean, idleTimeoutMs?: number, swr = false) => {
    const generation = ++generationRef.current;
    const inputSigNow = planeacionHeavyMetricsInputSig(paramsRef.current);

    if (tabHiddenRef.current) {
      return () => {};
    }

    if (!swr && !needsRecalcRef.current) {
      return () => {};
    }

    if (!isJornadaHeavyComputeAllowed()) {
      const cached =
        getPlaneacionHeavyMetricsSnapshot(inputSigNow) ??
        getPlaneacionHeavyMetricsWithBackup(
          inputSigNow,
          paramsRef.current.yesterdayTermoSnapshot
        );
      if (cached) setMetrics(cached);

      const waitMs = msUntilJornadaHeavyComputeAllowed();
      if (waitMs > 0 && (needsRecalcRef.current || swr)) {
        const deferId = globalThis.setTimeout(() => {
          if (generation !== generationRef.current) return;
          if (!isMountedRef.current || tabHiddenRef.current) return;
          runCompute(false, idleTimeoutMs ?? PLANEACION_IDLE_DEFER_MS, swr);
        }, waitMs);
        return () => clearTimeout(deferId);
      }
      return () => {};
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cancelSchedule = scheduleHeavyCompute(() => {
      if (generation !== generationRef.current) return;
      if (!isMountedRef.current || tabHiddenRef.current || controller.signal.aborted) return;

      if (!isJornadaHeavyComputeAllowed()) {
        const cached =
          getPlaneacionHeavyMetricsSnapshot(inputSigNow) ??
          getPlaneacionHeavyMetricsWithBackup(
            inputSigNow,
            paramsRef.current.yesterdayTermoSnapshot
          );
        if (cached) setMetrics(cached);
        return;
      }

      void (async () => {
        try {
          const next = await computeHeavyMetricsSafe(paramsRef.current, controller.signal);
          if (
            !isMountedRef.current ||
            controller.signal.aborted ||
            generation !== generationRef.current
          ) {
            return;
          }

          if (!validateHeavyMetrics(next)) {
            invalidatePlaneacionHeavyMetricsCache();
            applyBackupMetrics();
            return;
          }

          setMetrics(next);
          needsRecalcRef.current = false;
          setPlaneacionHeavyMetricsSnapshot(
            planeacionHeavyMetricsInputSig(paramsRef.current),
            next,
            vehiclesToSnapshotVehicles(paramsRef.current.vehicles)
          );
        } catch (err) {
          if (controller.signal.aborted || !isMountedRef.current) return;
          if (generation !== generationRef.current) return;

          const message = err instanceof Error ? err.message : String(err);
          if (message === "timeout") {
            console.error("[HeavyMetrics] Timeout >6s — forzando ErrorBoundary");
            setJornadaFatalError("timeout");
            return;
          }

          console.error("[HeavyMetrics] Crash al calcular métricas", err);
          invalidatePlaneacionHeavyMetricsCache();
          applyBackupMetrics();
        }
      })();
    }, urgent, idleTimeoutMs);

    return () => {
      cancelSchedule();
      controller.abort();
    };
  }, [applyBackupMetrics]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.hidden;
      tabHiddenRef.current = hidden;

      if (hidden) {
        abortRef.current?.abort();
        ++generationRef.current;
        return;
      }

      const cached =
        getPlaneacionHeavyMetricsSnapshot(inputSigRef.current) ??
        getPlaneacionHeavyMetricsWithBackup(
          inputSigRef.current,
          paramsRef.current.yesterdayTermoSnapshot
        );
      if (cached) {
        setMetrics(cached);
        needsRecalcRef.current = false;
      } else {
        applyBackupMetrics();
      }

      runCompute(false, PLANEACION_IDLE_DEFER_MS, true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [applyBackupMetrics, runCompute]);

  useEffect(() => {
    const cached =
      getPlaneacionHeavyMetricsSnapshot(inputSig) ??
      getPlaneacionHeavyMetricsWithBackup(inputSig, params.yesterdayTermoSnapshot);

    if (cached) {
      setMetrics(cached);
      needsRecalcRef.current = false;
    } else {
      setMetrics(createEmptyPlaneacionHeavyMetrics(params.yesterdayTermoSnapshot));
      needsRecalcRef.current = true;
    }

    const urgent = firstRunRef.current && !cached;
    firstRunRef.current = false;
    inputSigRef.current = inputSig;
    const idleMs = cached ? PLANEACION_IDLE_DEFER_MS : undefined;
    return runCompute(urgent, idleMs, !!cached);
  }, [inputSig, runCompute, params.yesterdayTermoSnapshot]);

  useEffect(() => {
    const prev = prevPlanTabRef.current;
    prevPlanTabRef.current = params.planTab ?? "operar";
    if ((params.planTab ?? "operar") !== "operar" || prev === "operar") return;
    if (
      !getPlaneacionHeavyMetricsSnapshot(inputSigRef.current) &&
      !getPlaneacionHeavyMetricsWithBackup(
        inputSigRef.current,
        paramsRef.current.yesterdayTermoSnapshot
      )
    ) {
      return;
    }
    return runCompute(false, PLANEACION_IDLE_DEFER_MS, true);
  }, [params.planTab, runCompute]);

  useEffect(() => {
    const onAttentionTick = () => {
      if (!tabHiddenRef.current) runCompute(false, undefined, true);
    };
    const onClockTick = () => {
      if (tabHiddenRef.current) return;
      const step = isCoarseConcienciaDevice() ? 8 : 3;
      metricSkipRef.current += 1;
      if (metricSkipRef.current >= step) {
        metricSkipRef.current = 0;
        runCompute(false, undefined, true);
      }
    };

    window.addEventListener(SEGMENT_ATTENTION_TICK_EVENT, onAttentionTick);
    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClockTick);
    return () => {
      window.removeEventListener(SEGMENT_ATTENTION_TICK_EVENT, onAttentionTick);
      window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClockTick);
    };
  }, [runCompute]);

  return metrics;
}
