/**
 * Hook espejo Disciplina lite — idle / intervalo lento / firma.
 * No toca Dual Kernel ni reloj 1s.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCachedDisciplinaLite,
  disciplinaLiteRefreshIntervalMs,
} from "@/lib/disciplinaLiteCache";
import {
  buildDisciplinaLiteInputSig,
  EMPTY_DISCIPLINA_LITE,
  type DisciplinaLiteModel,
} from "@/lib/disciplinaLiteCompute";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";

export type UseDisciplinaLiteParams = {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  enabled?: boolean;
};

function scheduleIdle(run: () => void, timeoutMs: number): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => run(), { timeout: timeoutMs });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(run, Math.min(timeoutMs, 120));
  return () => window.clearTimeout(t);
}

export function useDisciplinaLite({
  segmentos,
  vehicles,
  segmentoActivoId = null,
  enabled = true,
}: UseDisciplinaLiteParams): DisciplinaLiteModel {
  const [model, setModel] = useState<DisciplinaLiteModel>(EMPTY_DISCIPLINA_LITE);
  const genRef = useRef(0);
  const latestRef = useRef({ segmentos, vehicles, segmentoActivoId });
  latestRef.current = { segmentos, vehicles, segmentoActivoId };

  const inputSig = useMemo(
    () => buildDisciplinaLiteInputSig(segmentos, vehicles, segmentoActivoId),
    [segmentos, vehicles, segmentoActivoId]
  );

  useEffect(() => {
    if (!enabled) {
      setModel(EMPTY_DISCIPLINA_LITE);
      return;
    }

    let cancelled = false;
    let cancelPending: (() => void) | null = null;

    const runCompute = () => {
      if (cancelled) return;
      const gen = ++genRef.current;
      cancelPending?.();
      cancelPending = scheduleIdle(() => {
        if (cancelled || gen !== genRef.current) return;
        const paint = () => {
          if (cancelled || gen !== genRef.current) return;
          const src = latestRef.current;
          const next = getCachedDisciplinaLite({
            segmentos: src.segmentos,
            vehicles: src.vehicles,
            segmentoActivoId: src.segmentoActivoId,
          });
          setModel(prev =>
            prev.indice === next.indice &&
            prev.valorPrincipal === next.valorPrincipal &&
            prev.subheadline === next.subheadline &&
            prev.needsEntrada === next.needsEntrada &&
            prev.segmentoHint === next.segmentoHint &&
            prev.coberturaPct === next.coberturaPct &&
            prev.puntualidadPct === next.puntualidadPct
              ? prev
              : next
          );
        };
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => {
            if (typeof requestAnimationFrame === "function") {
              requestAnimationFrame(paint);
            } else {
              paint();
            }
          });
        } else {
          paint();
        }
      }, 900);
    };

    const boot = window.setTimeout(runCompute, 360);
    const intervalId = setInterval(runCompute, disciplinaLiteRefreshIntervalMs());

    const onVisible = () => {
      if (document.visibilityState === "visible") runCompute();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      genRef.current += 1;
      window.clearTimeout(boot);
      cancelPending?.();
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, inputSig]);

  return model;
}
