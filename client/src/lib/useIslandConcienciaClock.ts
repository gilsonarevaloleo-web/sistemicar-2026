import { useState } from "react";
import { useDomConcienciaClock } from "@/lib/domConcienciaClock";

/**
 * Tick para islands React con watchdog DOM (1.5s) — mismo patrón que RingDomClock.
 * Sustituye useVehicleTimerTick en segunderos críticos (tronco B.6).
 */
export function useIslandConcienciaClock(enabled = true): number {
  const [tick, setTick] = useState(0);
  useDomConcienciaClock(() => setTick(t => t + 1), enabled);
  return enabled ? tick : 0;
}
