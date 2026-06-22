import { useEffect, useState } from "react";
import { JornadaShell } from "./JornadaShell";
import { BotonRepararJornada } from "./BotonRepararJornada";

const SLOW_LOAD_MS = 3000;

/** Fallback de Suspense: shell inmediato + botón reparar tras 3s si el chunk no llega. */
export function JornadaSuspenseFallback() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(id);
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
