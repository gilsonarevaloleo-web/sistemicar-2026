/**
 * Sesión operativa V3 — chunk pesado (useDesglosadorManager + shell completo).
 * Se carga lazy desde planeacionV3 tras el primer paint (paso 2 migración).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import JornadaShellV3 from "@/components/jornada/JornadaShellV3";
import { FlotaLaunchPanel } from "@/components/jornada/FlotaLaunchPanel";
import { JornadaV3MigrationChecklist } from "@/components/jornada/JornadaV3MigrationChecklist";
import type { CrisolAterrizarPayload } from "@/components/jornada/CrisolModule";
import { useDesglosadorManager } from "@/hooks/useDesglosadorManager";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  getPlanillaHoy,
  getYesterdayDailyPointsTotal,
  subscribeToDailyPoints,
  subscribeToPlanilla,
  type Planilla,
} from "@/lib/persistence";
import { getJournalDateString } from "@/lib/segmentTime";
import { unlockSpeechSynthesis } from "@/lib/speechQueue";
import { executeFlotaLaunch } from "@/lib/executeFlotaLaunch";
import type { FlotaLaunchForm } from "@/lib/executeFlotaLaunch";

export default function PlaneacionV3Session() {
  const { user } = useAuthContext();
  const [dailyPS, setDailyPS] = useState(0);
  const [yesterdayPS, setYesterdayPS] = useState<number | null>(null);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [planillaFecha] = useState(() => getJournalDateString());

  const { vehicles: vehicleState, modales, handlers } = useDesglosadorManager({
    onDailyPsChange: setDailyPS,
  });

  const { all: vehicles, setVehicles } = vehicleState;

  const {
    expandedId,
    setExpandedId,
    situacionReserva,
    vehiclesRef,
    rehydrateFlotaFromLocalRef,
  } = modales;

  const {
    handleReservaTacticaQuickAdd,
    handleReservaRutaChange,
    handleEnviarReservaASituacion,
    handleToggleSubTarea,
    handleSituacionCronometroCumplido,
    handleSituacionCronometroFallado,
    handleDesglosadorUpdate,
    setupFlotaSubscription,
    applyCentinelaArchiveLocally,
    safeAwardPS,
    recordVehiculoInicio,
    scrollFlotaActivosIntoView,
    resolverProyectoId,
    optimisticVehiclesRef,
    ghostReconcileRef,
  } = handlers;

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") ?? null;
  }, [planilla]);

  const { proyectosHub, volcarMetricasAlHub } = useSegmentoProyectoVinculo(
    user?.uid,
    segmentoActivo
  );

  const imanProyectos = useMemo(
    () =>
      proyectosHub.map(p => ({
        id: p.id,
        titulo: p.titulo,
        etiqueta: p.etiqueta,
        color: p.color,
      })),
    [proyectosHub]
  );

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDailyPoints(user.uid, data => setDailyPS(data.total), e =>
      console.error(e)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getYesterdayDailyPointsTotal(user.uid)
      .then(setYesterdayPS)
      .catch(() => setYesterdayPS(0));
  }, [user]);

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

  const handleAterrizarReserva = useCallback(
    (payload: CrisolAterrizarPayload) =>
      handleReservaTacticaQuickAdd(payload.texto, payload.ruta, payload.proyectoId),
    [handleReservaTacticaQuickAdd]
  );

  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);

  const handleFlotaLaunch = useCallback(
    async (form: FlotaLaunchForm) => {
      if (!user) return null;
      return executeFlotaLaunch({
        userId: user.uid,
        form,
        vehiclesRef,
        setVehicles,
        setExpandedId,
        planilla,
        segmentoActivo,
        resolverProyectoId,
        applyCentinelaArchiveLocally,
        safeAwardPS,
        recordVehiculoInicio,
        scrollFlotaActivosIntoView,
        optimisticVehiclesRef,
        ghostReconcileRef,
        lastLaunchRef,
      });
    },
    [
      user,
      vehiclesRef,
      setVehicles,
      setExpandedId,
      planilla,
      segmentoActivo,
      resolverProyectoId,
      applyCentinelaArchiveLocally,
      safeAwardPS,
      recordVehiculoInicio,
      scrollFlotaActivosIntoView,
      optimisticVehiclesRef,
      ghostReconcileRef,
    ]
  );

  if (!user) return null;

  return (
    <div
      className="min-h-screen"
      onPointerDown={() => unlockSpeechSynthesis(true)}
      data-testid="planeacion-v3-session"
    >
      <div className="px-3 pt-2 max-w-lg mx-auto">
        <JornadaV3MigrationChecklist />
      </div>
      <JornadaShellV3
        userId={user.uid}
        segmentos={planilla?.segmentos ?? []}
        segmentoActivoId={segmentoActivo?.id ?? null}
        vehicles={vehicles}
        vehiclesRef={vehiclesRef}
        setVehicles={setVehicles}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        todayPs={dailyPS}
        yesterdayPs={yesterdayPS}
        situacionReserva={situacionReserva}
        imanProyectos={imanProyectos}
        onAterrizarReserva={handleAterrizarReserva}
        onReservaRutaChange={handleReservaRutaChange}
        onEnviarReservaASituacion={handleEnviarReservaASituacion}
        handleSituacionCronometroCumplido={handleSituacionCronometroCumplido}
        handleSituacionCronometroFallado={handleSituacionCronometroFallado}
        handleToggleSubTarea={handleToggleSubTarea}
        handleDesglosadorUpdate={handleDesglosadorUpdate}
        volcarMetricasAlHub={volcarMetricasAlHub}
        rehydrateFlotaFromLocalRef={rehydrateFlotaFromLocalRef}
        setupFlotaSubscription={setupFlotaSubscription}
        flotaLaunchSlot={
          <FlotaLaunchPanel onLaunch={handleFlotaLaunch} disabled={false} />
        }
      />
    </div>
  );
}
