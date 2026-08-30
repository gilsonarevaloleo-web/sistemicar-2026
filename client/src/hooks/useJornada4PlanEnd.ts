/**
 * Término del plan — sello de revelación + barrido de vehículos.
 * Idle / timeout al horaFin. Sin tick 1s. Vive en el root de sesión.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatPlanEndLabel,
  isPlanTerminado,
  readRevelacionPlanDia,
  resolvePlanWindowMs,
  type RevelacionPlanDia,
} from "@/jornada4/revelacionPlanDia";
import {
  readCierreConscientePlan,
  type CierreConscientePlanLedger,
  type PlanEndSweepResult,
} from "@/jornada4/cierrePlanSweep";
import type { Vehicle } from "@/lib/persistence";

export type { PlanEndSweepResult };

export type UseJornada4PlanEndParams = {
  userId: string | undefined;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehiclesRef: { current: Vehicle[] };
  sweepPlanEnd: (
    segmentos: { horaInicio?: string; horaFin?: string }[]
  ) => Promise<PlanEndSweepResult>;
  enabled?: boolean;
};

function scheduleIdle(run: () => void, timeoutMs: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => run(), { timeout: timeoutMs });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(run, timeoutMs);
  return () => window.clearTimeout(t);
}

function segmentosSig(
  segmentos: { horaInicio?: string; horaFin?: string }[]
): string {
  let s = "";
  for (let i = 0; i < segmentos.length; i++) {
    const g = segmentos[i];
    s += `${g?.horaInicio ?? ""}-${g?.horaFin ?? ""}|`;
  }
  return s;
}

export function useJornada4PlanEnd({
  userId,
  segmentos,
  sweepPlanEnd,
  enabled = true,
}: UseJornada4PlanEndParams): {
  revelacion: RevelacionPlanDia | null;
  ledger: CierreConscientePlanLedger | null;
  planEndLabel: string | null;
} {
  const [revelacion, setRevelacion] = useState<RevelacionPlanDia | null>(null);
  const [ledger, setLedger] = useState<CierreConscientePlanLedger | null>(null);
  const sweepRef = useRef(sweepPlanEnd);
  sweepRef.current = sweepPlanEnd;
  const segsRef = useRef(segmentos);
  segsRef.current = segmentos;
  const sig = segmentosSig(segmentos);

  const planEndLabel = useMemo(() => {
    const win = resolvePlanWindowMs(segmentos);
    return win ? formatPlanEndLabel(win.endMs) : null;
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !userId) {
      setRevelacion(null);
      setLedger(null);
      return;
    }
    const existing = readRevelacionPlanDia(userId);
    const existingLedger = readCierreConscientePlan(userId);
    if (existing) setRevelacion(existing);
    if (existingLedger) setLedger(existingLedger);

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      void sweepRef.current(segsRef.current).then(result => {
        if (cancelled) return;
        if (result.revelacion) setRevelacion(result.revelacion);
        if (result.ledger) setLedger(result.ledger);
      });
    };

    const segs = segsRef.current;
    if (isPlanTerminado(segs)) {
      return scheduleIdle(run, 1800);
    }

    const win = resolvePlanWindowMs(segs);
    if (!win) return;
    const delay = win.endMs - Date.now() + 600;
    if (delay <= 0) return scheduleIdle(run, 800);
    if (delay > 36 * 3_600_000) return;
    const t = window.setTimeout(run, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [userId, enabled, sig]);

  return { revelacion, ledger, planEndLabel };
}
