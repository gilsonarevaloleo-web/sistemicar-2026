/**
 * Hook espejo del Pulso de cobertura.
 * - No suscribe al reloj 1s de conciencia.
 * - Recalcula en idle / intervalo lento / cambio de firma.
 * - Nunca corre en el hot path del gesto (solo reacciona a props ya pintadas).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCachedPulsoCobertura,
  pulsoRefreshIntervalMs,
} from "@/lib/pulsoCoberturaCache";
import {
  buildPulsoInputSig,
  EMPTY_PULSO_MODEL,
  type PulsoCoberturaModel,
  type PulsoSegmentoLite,
} from "@/lib/pulsoCoberturaCompute";
import type { Vehicle } from "@/lib/persistence";

export type UsePulsoCoberturaParams = {
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
  const t = window.setTimeout(run, Math.min(timeoutMs, 120));
  return () => window.clearTimeout(t);
}

export function usePulsoCobertura({
  segmentos,
  vehicles,
  segmentoActivoId = null,
  enabled = true,
}: UsePulsoCoberturaParams): PulsoCoberturaModel {
  const [model, setModel] = useState<PulsoCoberturaModel>(EMPTY_PULSO_MODEL);
  const genRef = useRef(0);
  const latestRef = useRef({ segmentos, vehicles, segmentoActivoId });
  latestRef.current = { segmentos, vehicles, segmentoActivoId };

  const inputSig = useMemo(
    () => buildPulsoInputSig(segmentos, vehicles, segmentoActivoId),
    [segmentos, vehicles, segmentoActivoId]
  );

  useEffect(() => {
    if (!enabled) {
      setModel(EMPTY_PULSO_MODEL);
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
          const next = getCachedPulsoCobertura({
            segmentos: src.segmentos,
            vehicles: src.vehicles,
            segmentoActivoId: src.segmentoActivoId,
          });
          setModel(prev =>
            prev.hasPlanificacion === next.hasPlanificacion &&
            prev.conquistaMin === next.conquistaMin &&
            prev.entropiaMin === next.entropiaMin &&
            prev.coberturaPct === next.coberturaPct &&
            prev.needsLaunch === next.needsLaunch &&
            prev.consciousNow === next.consciousNow &&
            prev.segmentoActivoNombre === next.segmentoActivoNombre
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
      }, 800);
    };

    // Post-paint debounce tras cambio de firma.
    const boot = window.setTimeout(runCompute, 280);
    const intervalId = setInterval(runCompute, pulsoRefreshIntervalMs());

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
