/**
 * Entrada liviana de Jornada V3 (paso 2 migración).
 * Primer paint: flota core + lanzamiento — SIN useDesglosadorManager.
 * Idle: lazy-load de planeacionV3Session (flota core + useJornadaV3Ops + shell).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import { JornadaStuckProbe } from "@/components/jornada/JornadaStuckProbe";
import { JornadaV3BootStatus } from "@/components/jornada/JornadaV3BootStatus";
import { FlotaLaunchPanel } from "@/components/jornada/FlotaLaunchPanel";
import { JornadaShell } from "@/components/jornada/JornadaShell";
import { useJornadaFlotaCore } from "@/hooks/useJornadaFlotaCore";
import {
  getPlanillaHoy,
  subscribeToPlanilla,
  type Planilla,
} from "@/lib/persistence";
import { getJournalDateString } from "@/lib/segmentTime";
import { beginJornadaViewMount, endJornadaViewMount } from "@/lib/jornadaRemount";
import { clearJornadaFatalError } from "@/lib/jornadaFatalError";
import { markJornadaChunkLoaded } from "@/lib/jornadaChunkBoot";
import {
  cancelJornadaRemountGuard,
  unlockSpeechSynthesis,
  warmupSpeechSynthesis,
  recoverSpeechQueue,
} from "@/lib/speechQueue";
import { executeFlotaLaunch } from "@/lib/executeFlotaLaunch";
import type { FlotaLaunchForm } from "@/lib/executeFlotaLaunch";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PlaneacionV3Session = lazy(() => import("./planeacionV3Session"));

const SESSION_IDLE_TIMEOUT_MS = 1_200;

export default function PlaneacionV3() {
  const { user } = useAuthContext();
  const [sessionReady, setSessionReady] = useState(false);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [planillaFecha] = useState(() => getJournalDateString());
  const [dailyPS, setDailyPS] = useState(0);

  const core = useJornadaFlotaCore({ onDailyPsChange: setDailyPS });
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") ?? null;
  }, [planilla]);

  const resolverProyectoId = useCallback(
    (_ctx: { proyectoId: string; peldanoId?: string } | null) =>
      segmentoActivo?.proyectoVinculadoId ?? undefined,
    [segmentoActivo]
  );

  useEffect(() => {
    clearJornadaFatalError();
    markJornadaChunkLoaded();
    beginJornadaViewMount();
    warmupSpeechSynthesis();
    recoverSpeechQueue();
    return () => {
      endJornadaViewMount();
      cancelJornadaRemountGuard();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void getPlanillaHoy(user.uid).then(setPlanilla);
    const unsub = subscribeToPlanilla(
      user.uid,
      planillaFecha,
      p => setPlanilla(p),
      e => console.error(e)
    );
    return unsub;
  }, [user, planillaFecha]);

  /** Diferir chunk del manager: primer paint no parsea ~4k LOC del orquestador. */
  useEffect(() => {
    let cancelled = false;
    const arm = () => {
      if (!cancelled) setSessionReady(true);
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(arm, { timeout: SESSION_IDLE_TIMEOUT_MS });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(arm, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const handleFlotaLaunch = useCallback(
    async (form: FlotaLaunchForm) => {
      if (!user) return null;
      return executeFlotaLaunch({
        userId: user.uid,
        form,
        vehiclesRef: core.vehiclesRef,
        setVehicles: core.setVehicles,
        setExpandedId: core.setExpandedId,
        planilla,
        segmentoActivo,
        resolverProyectoId,
        applyCentinelaArchiveLocally: core.applyCentinelaArchiveLocally,
        safeAwardPS: core.safeAwardPS,
        recordVehiculoInicio: core.recordVehiculoInicio,
        scrollFlotaActivosIntoView: core.scrollFlotaActivosIntoView,
        optimisticVehiclesRef: core.optimisticVehiclesRef,
        ghostReconcileRef: core.ghostReconcileRef,
        lastLaunchRef,
      });
    },
    [user, core, planilla, segmentoActivo, resolverProyectoId]
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-500 text-sm">
        Inicia sesión para operar la jornada V3.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      onPointerDown={() => unlockSpeechSynthesis(true)}
      data-testid="planeacion-v3"
    >
      <JornadaStuckProbe />
      <JornadaV3BootStatus />

      {sessionReady ? (
        <Suspense
          fallback={
            <JornadaV3BootFallback
              activeCount={core.activeCount}
              dailyPS={dailyPS}
              onLaunch={handleFlotaLaunch}
              statusLine="Cargando motores de operación…"
            />
          }
        >
          <PlaneacionV3Session />
        </Suspense>
      ) : (
        <JornadaV3BootFallback
          activeCount={core.activeCount}
          dailyPS={dailyPS}
          onLaunch={handleFlotaLaunch}
          statusLine={`${JORNADA_MODULE.title} · shell listo · flota ${core.activeCount}`}
        />
      )}
    </div>
  );
}

function JornadaV3BootFallback({
  activeCount,
  dailyPS,
  onLaunch,
  statusLine,
}: {
  activeCount: number;
  dailyPS: number;
  onLaunch: (form: FlotaLaunchForm) => Promise<string | null>;
  statusLine: string;
}) {
  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-4" data-testid="planeacion-v3-boot">
      <JornadaShell statusLine={statusLine} />
      <p className="text-[11px] text-slate-500 text-center">
        PS hoy {dailyPS} · activos {activeCount}
      </p>
      <FlotaLaunchPanel onLaunch={onLaunch} disabled={false} />
      <p className="text-[10px] text-slate-600 text-center leading-relaxed">
        El ring y métricas llegan en idle — así el celular abre sin bajar el monolito de
        planificación.
      </p>
    </div>
  );
}
