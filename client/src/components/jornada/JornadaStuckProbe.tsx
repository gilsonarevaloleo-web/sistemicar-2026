import { useSyncExternalStore } from "react";
import { getJornadaFatal, subscribeJornadaFatal } from "@/lib/jornadaFatalError";

/** Lanza durante render si hay error fatal (timeout / watchdog) → ErrorBoundary. */
export function JornadaStuckProbe() {
  const fatal = useSyncExternalStore(subscribeJornadaFatal, getJornadaFatal, getJornadaFatal);
  if (fatal) throw new Error(fatal);
  return null;
}
