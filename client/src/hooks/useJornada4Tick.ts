import { useEffect, useState } from "react";
import { subscribeJornada4Tick } from "@/jornada4/jornada4Tick";

/** Contador local 1s/5s — fuerza recompute wall-clock en islands J4. */
export function useJornada4Tick(enabled = true): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    return subscribeJornada4Tick(() => setTick(n => n + 1));
  }, [enabled]);
  return tick;
}
