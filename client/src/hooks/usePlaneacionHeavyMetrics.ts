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
import type { PlanillaDailySnapshot, SegmentoV5, Vehicle } from "@/lib/persistence";
import { SEGMENT_ATTENTION_TICK_EVENT } from "@/lib/segmentAttentionCycle";

export type UsePlaneacionHeavyMetricsParams = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  focusEventsToday: FocusBandEvent[];
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null;
  disciplinaSnapshots: PlanillaDailySnapshot[];
};

function scheduleHeavyCompute(run: () => void, urgent: boolean): () => void {
  if (urgent) {
    run();
    return () => {};
  }
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(run, { timeout: 900 });
    return () => cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(run, 0);
  return () => clearTimeout(id);
}

export function usePlaneacionHeavyMetrics(
  params: UsePlaneacionHeavyMetricsParams
): PlaneacionHeavyMetrics {
  const [metrics, setMetrics] = useState<PlaneacionHeavyMetrics>(() =>
    createEmptyPlaneacionHeavyMetrics(params.yesterdayTermoSnapshot)
  );

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
  const inputSigRef = useRef(inputSig);
  const firstRunRef = useRef(true);
  const generationRef = useRef(0);
  const metricSkipRef = useRef(0);

  const runCompute = useCallback((urgent: boolean) => {
    const generation = ++generationRef.current;
    const cancelSchedule = scheduleHeavyCompute(() => {
      if (generation !== generationRef.current) return;
      const next = computePlaneacionHeavyMetrics(paramsRef.current);
      setMetrics(next);
    }, urgent);
    return cancelSchedule;
  }, []);

  useEffect(() => {
    const urgent = firstRunRef.current;
    firstRunRef.current = false;
    inputSigRef.current = inputSig;
    return runCompute(urgent);
  }, [inputSig, runCompute]);

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
