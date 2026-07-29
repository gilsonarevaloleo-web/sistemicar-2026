import { useEffect, useState } from "react";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";
import { isMobilePerfMode } from "@/lib/mobilePerf";
import { setJornadaChunkLoadPhase } from "@/lib/jornadaChunkBoot";

const SLOW_LOAD_MS = isMobilePerfMode() ? 4_000 : 3_000;
const WATCHDOG_MS = isMobilePerfMode() ? 18_000 : 10_000;

/** Fallback Suspense para /jornada-v4 — watchdog largo. */
export function JornadaV3SuspenseFallback() {
  const [slow, setSlow] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    setJornadaChunkLoadPhase("loading");
    const slowId = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    const watchdogId = window.setTimeout(() => {
      setStuck(true);
      setJornadaChunkLoadPhase("timeout");
    }, WATCHDOG_MS);
    return () => {
      clearTimeout(slowId);
      clearTimeout(watchdogId);
      setJornadaChunkLoadPhase("idle");
    };
  }, []);

  return (
    <div className="relative min-h-[60vh]" data-testid="jornada-v4-suspense-fallback">
      <JornadaShell
        statusLine={
          stuck
            ? "Jornada no cargó a tiempo — prueba reparar"
            : slow
              ? "Dual Kernel · el módulo tarda en móvil…"
              : "Dual Kernel · preparando…"
        }
      />
      {(slow || stuck) && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 max-w-lg mx-auto space-y-2">
          <BotonRepararJornada
            title="Reparar Jornada"
            description="Recarga el chunk Dual Kernel."
            compact
          />
        </div>
      )}
    </div>
  );
}
