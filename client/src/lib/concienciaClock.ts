/**-
 * Reloj global de conciencia: fuerza re-render del anillo y métricas en vivo
 * aunque no haya vehículos activos ni cambios de estado en segmentos.
 */

import { useEffect, useRef, useState } from "react";

export const CONCIENCIA_CLOCK_TICK_EVENT = "sistemicar-conciencia-clock-tick";

/**
 * Sticky: una vez detectado coarse/móvil en la sesión, NO volver a false.
 * Rotar a landscape suele cruzar max-width:768 → antes se apagaba el modo
 * supervivencia justo cuando hay 1–2 desglosadores midiendo (freeze).
 */
let stickyCoarseSession: boolean | null = null;

/** Móvil / pantalla estrecha: métricas densas cada 5 s, puntero cada 1 s. */
export function isCoarseConcienciaDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (stickyCoarseSession === true) return true;
  try {
    const coarse =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 768px)").matches;
    if (coarse) stickyCoarseSession = true;
    return coarse;
  } catch {
    return false;
  }
}

/** Solo tests. */
export function resetCoarseConcienciaStickyForTests(): void {
  stickyCoarseSession = null;
}

export function dispatchConcienciaClockTick(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONCIENCIA_CLOCK_TICK_EVENT));
}

/** Tras volver de segundo plano, fuerza varios re-cálculos con Date.now() actualizado. */
export function burstConcienciaClockTick(bursts = 3, gapMs = 120): void {
  dispatchConcienciaClockTick();
  if (typeof window === "undefined") return;
  for (let i = 1; i < bursts; i++) {
    window.setTimeout(dispatchConcienciaClockTick, gapMs * i);
  }
}

/** Suscripción al reloj global (1 s) — puntero visual. */
export function useConcienciaClockTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onClock = () => setTick(t => t + 1);
    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
    dispatchConcienciaClockTick();
    return () => window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
  }, []);
  return tick;
}

/** Igual que useConcienciaClockTick pero sin suscripción cuando enabled=false (p. ej. Jornada V3). */
export function useConcienciaClockTickWhen(enabled: boolean): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const onClock = () => setTick(t => t + 1);
    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
    dispatchConcienciaClockTick();
    return () => window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
  }, [enabled]);
  return enabled ? tick : 0;
}

/**
 * Tick para métricas pesadas (entropía, arcos): ~3 s escritorio, ~5 s móvil.
 */
export function useConcienciaMetricTick(): number {
  const [tick, setTick] = useState(0);
  const skipRef = useRef(0);
  const coarseRef = useRef(isCoarseConcienciaDevice());
  useEffect(() => {
    const onClock = () => {
      const step = coarseRef.current ? 8 : 3;
      skipRef.current += 1;
      if (skipRef.current >= step) {
        skipRef.current = 0;
        setTick(t => t + 1);
      }
    };
    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
    setTick(t => t + 1);
    return () => window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
  }, []);
  return tick;
}

/**
 * Tick compartido para timers de VehicleCard — usa el reloj global (sin N× setInterval).
 * Cada evento de reloj (~1 s) — datos pre-calculados en memoria, sin tocar disco.
 */
export function useVehicleTimerTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onClock = () => setTick(t => t + 1);
    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
    requestAnimationFrame(() => dispatchConcienciaClockTick());
    return () => window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
  }, []);
  return tick;
}
