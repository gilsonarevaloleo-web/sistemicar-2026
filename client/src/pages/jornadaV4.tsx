/**
 * Entrada liviana Jornada V4 (Dual Kernel).
 * Autónomo: lanza y opera solo Conquista + Situacional.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuthContext } from "@/App";
import { Jornada4Shell, J4_COLORS } from "@/components/jornada4/Jornada4Shell";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { clearJornadaFatalError } from "@/lib/jornadaFatalError";
import { markJornadaChunkLoaded } from "@/lib/jornadaChunkBoot";
import { beginJornadaViewMount, endJornadaViewMount } from "@/lib/jornadaRemount";

const JornadaV4Session = lazy(() => import("./jornadaV4Session"));

const SESSION_IDLE_MS = 800;

export default function JornadaV4() {
  const { user } = useAuthContext();
  const [sessionReady, setSessionReady] = useState(false);
  const core = useJornada4Core();

  useEffect(() => {
    clearJornadaFatalError();
    markJornadaChunkLoaded();
    beginJornadaViewMount();
    return () => endJornadaViewMount();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const arm = () => {
      if (!cancelled) setSessionReady(true);
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(arm, { timeout: SESSION_IDLE_MS });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(arm, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: J4_COLORS.PIZARRA, color: J4_COLORS.MUTED }}
      >
        Inicia sesión para operar Dual Kernel (V4).
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: J4_COLORS.PIZARRA }}
      data-testid="jornada-v4"
    >
      {sessionReady ? (
        <Suspense
          fallback={
            <BootFallback
              dualCount={core.dualCount}
              dailyPS={core.dailyPS}
              statusLine="Cargando Dual Kernel…"
            />
          }
        >
          <JornadaV4Session />
        </Suspense>
      ) : (
        <BootFallback
          dualCount={core.dualCount}
          dailyPS={core.dailyPS}
          statusLine="Estás en Jornada V4 · Dual Kernel"
        />
      )}
    </div>
  );
}

function BootFallback({
  dualCount,
  dailyPS,
  statusLine,
}: {
  dualCount: number;
  dailyPS: number;
  statusLine: string;
}) {
  return (
    <div data-testid="jornada4-boot">
      <Jornada4Shell dualCount={dualCount} dailyPS={dailyPS} statusLine={statusLine} />
      <p
        className="max-w-lg mx-auto px-4 pt-6 text-center text-xs"
        style={{ color: J4_COLORS.MUTED }}
      >
        Preparando lanzador… Solo Conquista y Situacional.
      </p>
    </div>
  );
}
