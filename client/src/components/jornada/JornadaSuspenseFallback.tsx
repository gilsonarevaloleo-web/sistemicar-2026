import { useEffect, useState } from "react";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";
import { isMobilePerfMode } from "@/lib/mobilePerf";

const SLOW_LOAD_MS = isMobilePerfMode() ? 4_000 : 3_000;

/** Fallback de Suspense: shell inmediato + botón reparar si el chunk tarda (sin fatal throw). */
export function JornadaSuspenseFallback() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const slowId = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => {
      clearTimeout(slowId);
    };
  }, []);

  return (
    <div className="relative min-h-[60vh]" data-testid="jornada-suspense-fallback">
      <JornadaShell
        statusLine={slow ? "El módulo tarda más de lo normal…" : "Preparando Jornada…"}
      />
      {slow && (
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
