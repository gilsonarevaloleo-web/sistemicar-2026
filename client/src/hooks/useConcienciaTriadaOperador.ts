/**
 * Triada de conciencia del operador — idle only.
 * 100% = plan del día. No usa el pulso de cobertura.
 * Recalcula con ledger + vehículos (cierres y activos) contra minutos planificados.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  accumulateActiveTriadaMinutos,
  buildConcienciaTriadaModel,
  EMPTY_TRIADA_MODEL,
  getTriadaDayLedger,
  readTriadaSeriesLocal,
  resolveTriadaClosedMinutos,
  sumMinutosPlanDelDia,
  upsertTriadaDaySnapshot,
  type ConcienciaTriadaModel,
  type TriadaDaySnapshot,
} from "@/lib/concienciaTriadaOperador";
import { getJournalDateString } from "@/lib/segmentTime";
import type { Vehicle } from "@/lib/persistence";

export type UseConcienciaTriadaOperadorParams = {
  userId: string | undefined;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
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

function triadaRefreshIntervalMs(): number {
  if (typeof window === "undefined") return 5_000;
  try {
    if (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 768px)").matches
    ) {
      return 10_000;
    }
  } catch {
    /* ignore */
  }
  return 5_000;
}

function triadaInputSig(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  vehicles: Vehicle[]
): string {
  const plan = sumMinutosPlanDelDia(segmentos);
  const vPart = vehicles
    .map(
      v =>
        `${v.id}:${v.status}:${v.destinoCierre ?? ""}:${v.aperturaAt ?? ""}:${v.cierreAt ?? ""}:${v.duracionFinal ?? ""}:${v.tipoFlota ?? ""}`
    )
    .join("|");
  return `${plan}::${vPart}`;
}

export function useConcienciaTriadaOperador({
  userId,
  segmentos,
  vehicles,
  enabled = true,
}: UseConcienciaTriadaOperadorParams): {
  model: ConcienciaTriadaModel;
  series: TriadaDaySnapshot[];
} {
  const [model, setModel] = useState<ConcienciaTriadaModel>(EMPTY_TRIADA_MODEL);
  const [series, setSeries] = useState<TriadaDaySnapshot[]>([]);
  const genRef = useRef(0);
  const latestRef = useRef({ userId, segmentos, vehicles });
  latestRef.current = { userId, segmentos, vehicles };

  const fecha = useMemo(() => getJournalDateString(), []);
  const inputSig = useMemo(() => triadaInputSig(segmentos, vehicles), [segmentos, vehicles]);

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

    const runCompute = () => {
      if (cancelled) return;
      const gen = ++genRef.current;
      cancelPending?.();
      cancelPending = scheduleIdle(() => {
        if (cancelled || gen !== genRef.current) return;
        const { segmentos: segs, vehicles: vs } = latestRef.current;
        const minutosPlan = sumMinutosPlanDelDia(segs);
        const ledger = getTriadaDayLedger(userId, fecha);
        const closed = resolveTriadaClosedMinutos(ledger, vs, fecha);
        const active = accumulateActiveTriadaMinutos(vs);
        const next = buildConcienciaTriadaModel({
          fecha,
          minutosPlan,
          minutosPresenciaCerrados: closed.minutosPresencia,
          minutosDireccionCerrados: closed.minutosDireccion,
          minutosPresenciaActivos: active.minutosPresencia,
          minutosDireccionActivos: active.minutosDireccion,
        });
        setModel(prev =>
          prev.fecha === next.fecha &&
          prev.pctInconsciente === next.pctInconsciente &&
          prev.pctPresencia === next.pctPresencia &&
          prev.pctDireccion === next.pctDireccion &&
          prev.minutosInconsciente === next.minutosInconsciente &&
          prev.minutosPresencia === next.minutosPresencia &&
          prev.minutosDireccion === next.minutosDireccion &&
          prev.minutosPlan === next.minutosPlan &&
          prev.hasPlanificacion === next.hasPlanificacion
            ? prev
            : next
        );
        if (next.hasPlanificacion && next.minutosPlan > 0) {
          const ser = upsertTriadaDaySnapshot(userId, next);
          setSeries(ser);
        }
      }, 900);
    };

    const boot = window.setTimeout(runCompute, 280);
    const intervalId = window.setInterval(runCompute, triadaRefreshIntervalMs());
    const onVisible = () => {
      if (document.visibilityState === "visible") runCompute();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      genRef.current += 1;
      window.clearTimeout(boot);
      cancelPending?.();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, enabled, fecha, inputSig]);

  return { model, series };
}
