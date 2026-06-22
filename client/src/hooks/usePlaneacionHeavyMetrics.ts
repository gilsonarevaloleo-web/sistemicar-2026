/**
 * Fase 2 perf: métricas pesadas de Jornada con stale-while-revalidate (sin Worker).
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
  PLANEACION_IDLE_DEFER_MS,
  setPlaneacionHeavyMetricsSnapshot,
} from "@/lib/planeacionCache";
import {
  isJornadaHeavyComputeAllowed,
  msUntilJornadaHeavyComputeAllowed,
} from "@/lib/jornadaRemount";
import type { PlanillaDailySnapshot, SegmentoV5, Vehicle } from "@/lib/persistence";
import { SEGMENT_ATTENTION_TICK_EVENT } from "@/lib/segmentAttentionCycle";

export type UsePlaneacionHeavyMetricsParams = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  focusEventsToday: FocusBandEvent[];
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null;
  disciplinaSnapshots: PlanillaDailySnapshot[];
  planTab?: "operar" | "metricas" | "meta";
};

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

  const [metrics, setMetrics] = useState<PlaneacionHeavyMetrics>(() => {
    const cached = getPlaneacionHeavyMetricsSnapshot(inputSig);
    if (cached) return cached;
    return createEmptyPlaneacionHeavyMetrics(params.yesterdayTermoSnapshot);
  });

  const inputSigRef = useRef(inputSig);
  const firstRunRef = useRef(true);
  const prevPlanTabRef = useRef(params.planTab ?? "operar");
  const generationRef = useRef(0);
  const metricSkipRef = useRef(0);

  const runCompute = useCallback((urgent: boolean, idleTimeoutMs?: number) => {
    const generation = ++generationRef.current;
    const inputSigNow = planeacionHeavyMetricsInputSig(paramsRef.current);

    if (!isJornadaHeavyComputeAllowed()) {
      const cached = getPlaneacionHeavyMetricsSnapshot(inputSigNow);
      if (cached) setMetrics(cached);
      const waitMs = msUntilJornadaHeavyComputeAllowed();
      if (waitMs > 0) {
        const deferId = globalThis.setTimeout(() => {
          if (generation !== generationRef.current) return;
          runCompute(false, idleTimeoutMs ?? PLANEACION_IDLE_DEFER_MS);
        }, waitMs);
        return () => clearTimeout(deferId);
      }
      return () => {};
    }

    const cancelSchedule = scheduleHeavyCompute(() => {
      if (generation !== generationRef.current) return;
      if (!isJornadaHeavyComputeAllowed()) {
        const cached = getPlaneacionHeavyMetricsSnapshot(inputSigNow);
        if (cached) setMetrics(cached);
        return;
      }
      const next = computePlaneacionHeavyMetrics(paramsRef.current);
      setMetrics(next);
      setPlaneacionHeavyMetricsSnapshot(
        planeacionHeavyMetricsInputSig(paramsRef.current),
        next
      );
    }, urgent, idleTimeoutMs);
    return cancelSchedule;
  }, []);

  useEffect(() => {
    const cached = getPlaneacionHeavyMetricsSnapshot(inputSig);
    if (cached) setMetrics(cached);
    const urgent = firstRunRef.current && !cached;
    firstRunRef.current = false;
    inputSigRef.current = inputSig;
    const idleMs = cached ? PLANEACION_IDLE_DEFER_MS : undefined;
    return runCompute(urgent, idleMs);
  }, [inputSig, runCompute]);

  useEffect(() => {
    const prev = prevPlanTabRef.current;
    prevPlanTabRef.current = params.planTab ?? "operar";
    if ((params.planTab ?? "operar") !== "operar" || prev === "operar") return;
    if (!getPlaneacionHeavyMetricsSnapshot(inputSigRef.current)) return;
    return runCompute(false, PLANEACION_IDLE_DEFER_MS);
  }, [params.planTab, runCompute]);

  useEffect(() => {
    const onAttentionTick = () => runCompute(false);
    const onClockTick = () => {
      const step = isCoarseConcienciaDevice() ? 8 : 3;
      metricSkipRef.current += 1;
      if (metricSkipRef.current >= step) {
        metricSkipRef.current = 0;
        runCompute(false);
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
