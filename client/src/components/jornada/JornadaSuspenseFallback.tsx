import { useEffect, useState } from "react";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";
import { isMobilePerfMode } from "@/lib/mobilePerf";
import { setJornadaChunkLoadPhase, getJornadaChunkLoadPhase } from "@/lib/jornadaChunkBoot";

const SLOW_LOAD_MS = isMobilePerfMode() ? 4_000 : 3_000;
const WATCHDOG_MS = isMobilePerfMode() ? 18_000 : 10_000;

/** Fallback de Suspense: shell inmediato + watchdog si el chunk no resuelve. */
export function JornadaSuspenseFallback() {
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
      if (getJornadaChunkLoadPhase() !== "loaded") {
        setJornadaChunkLoadPhase("idle");
      }
    };
  }, []);

  return (
    <div className="relative min-h-[60vh]" data-testid="jornada-suspense-fallback">
      <JornadaShell
        statusLine={
          stuck
            ? "Jornada no cargó a tiempo — usa Reparar"
            : slow
              ? "El módulo tarda más de lo normal…"
              : "Preparando Jornada…"
        }
      />
      {(slow || stuck) && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 max-w-lg mx-auto">
          <BotonRepararJornada
            title="Reparar Jornada"
            description="Si la pantalla no avanza, repara y recarga el módulo."
            compact
          />
        </div>
      )}
    </div>
  );
}
