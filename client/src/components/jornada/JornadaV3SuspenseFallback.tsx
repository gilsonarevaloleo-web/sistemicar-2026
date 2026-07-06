import { useEffect, useState } from "react";
import { Link } from "wouter";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";
import { isMobilePerfMode } from "@/lib/mobilePerf";
import { setJornadaChunkLoadPhase } from "@/lib/jornadaChunkBoot";

const SLOW_LOAD_MS = isMobilePerfMode() ? 4_000 : 3_000;
/** Móvil: chunk V3 puede tardar >5s — no disparar watchdog agresivo del fallback clásico. */
const WATCHDOG_MS = isMobilePerfMode() ? 18_000 : 10_000;

/** Fallback Suspense para /jornada-v3 — watchdog largo y enlace a clásica. */
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
    <div className="relative min-h-[60vh]" data-testid="jornada-v3-suspense-fallback">
      <JornadaShell
        statusLine={
          stuck
            ? "V3 no cargó a tiempo — prueba reparar o usa Jornada clásica"
            : slow
              ? "Laboratorio V3 · el módulo tarda en móvil…"
              : "Laboratorio V3 · preparando…"
        }
      />
      {(slow || stuck) && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 max-w-lg mx-auto space-y-2">
          <BotonRepararJornada
            title="Reparar V3"
            description="Recarga el chunk del laboratorio modular."
            compact
          />
          <Link
            href="/planeacion"
            className="block w-full py-3 rounded-xl text-center text-xs font-bold uppercase tracking-wider border touch-manipulation"
            style={{ borderColor: "rgba(212,175,55,0.35)", color: "#D4AF37" }}
            data-testid="jornada-v3-fallback-classic"
          >
            Ir a Jornada clásica
          </Link>
        </div>
      )}
    </div>
  );
}
