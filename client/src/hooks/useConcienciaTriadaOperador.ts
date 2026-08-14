/**
 * Triada de conciencia del operador — idle only.
 * No suscribe al tick 1s; recalcula con pulso cacheado + ledger local.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { usePulsoCobertura } from "@/hooks/usePulsoCobertura";
import {
  accumulateActiveTriadaMinutos,
  buildConcienciaTriadaModel,
  EMPTY_TRIADA_MODEL,
  getTriadaDayLedger,
  readTriadaSeriesLocal,
  upsertTriadaDaySnapshot,
  type ConcienciaTriadaModel,
  type TriadaDaySnapshot,
} from "@/lib/concienciaTriadaOperador";
import { getJournalDateString } from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";
import type { PulsoSegmentoLite } from "@/lib/pulsoCoberturaCompute";

export type UseConcienciaTriadaOperadorParams = {
  userId: string | undefined;
  segmentos: PulsoSegmentoLite[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  enabled?: boolean;
};

function scheduleIdle(run: () => void, timeoutMs: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => run(), { timeout: timeoutMs });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(run, Math.min(timeoutMs, 200));
  return () => window.clearTimeout(t);
}

export function useConcienciaTriadaOperador({
  userId,
  segmentos,
  vehicles,
  segmentoActivoId = null,
  enabled = true,
}: UseConcienciaTriadaOperadorParams): {
  model: ConcienciaTriadaModel;
  series: TriadaDaySnapshot[];
} {
  const pulso = usePulsoCobertura({
    segmentos,
    vehicles,
    segmentoActivoId,
    enabled,
  });
  const [model, setModel] = useState<ConcienciaTriadaModel>(EMPTY_TRIADA_MODEL);
  const [series, setSeries] = useState<TriadaDaySnapshot[]>([]);
  const genRef = useRef(0);
  const latestRef = useRef({ userId, vehicles, pulso });
  latestRef.current = { userId, vehicles, pulso };

  const fecha = useMemo(() => getJournalDateString(), []);

  useEffect(() => {
    if (!enabled || !userId) {
      setModel(EMPTY_TRIADA_MODEL);
      setSeries([]);
      return;
    }
    let cancelled = false;
    const loadSeries = () => {
      if (cancelled) return;
      setSeries(readTriadaSeriesLocal(userId));
    };
    const cancelIdle = scheduleIdle(loadSeries, 1800);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [userId, enabled]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    let cancelPending: (() => void) | null = null;
    const gen = ++genRef.current;

    cancelPending = scheduleIdle(() => {
      if (cancelled || gen !== genRef.current) return;
      const { vehicles: vs, pulso: p } = latestRef.current;
      const ledger = getTriadaDayLedger(userId, fecha);
      const active = accumulateActiveTriadaMinutos(vs);
      const next = buildConcienciaTriadaModel({
        fecha,
        hasPlanificacion: p.hasPlanificacion,
        minutosInconsciente: p.entropiaMin,
        minutosPresenciaCerrados: ledger?.minutosPresencia ?? 0,
        minutosDireccionCerrados: ledger?.minutosDireccion ?? 0,
        minutosPresenciaActivos: active.minutosPresencia,
        minutosDireccionActivos: active.minutosDireccion,
      });
      setModel(prev =>
        prev.fecha === next.fecha &&
        prev.pctInconsciente === next.pctInconsciente &&
        prev.pctPresencia === next.pctPresencia &&
        prev.pctDireccion === next.pctDireccion &&
        prev.minutosPlanMedible === next.minutosPlanMedible &&
        prev.hasPlanificacion === next.hasPlanificacion
          ? prev
          : next
      );
      if (next.hasPlanificacion && next.minutosPlanMedible > 0) {
        const ser = upsertTriadaDaySnapshot(userId, next);
        setSeries(ser);
      }
    }, 900);

    return () => {
      cancelled = true;
      cancelPending?.();
    };
  }, [
    userId,
    enabled,
    fecha,
    pulso.hasPlanificacion,
    pulso.entropiaMin,
    pulso.conquistaMin,
    pulso.computedAt,
    vehicles,
  ]);

  return { model, series };
}
