/**
 * Sesión Dual Kernel — lanzar + operar solo Conquista y Situacional.
 */
import { useCallback, useRef } from "react";
import { useAuthContext } from "@/App";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import { Jornada4LaunchPanel } from "@/components/jornada4/Jornada4LaunchPanel";
import { Jornada4Boveda } from "@/components/jornada4/Jornada4Boveda";
import { Jornada4VehicleList } from "@/components/jornada4/Jornada4VehicleList";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { useJornada4Ops } from "@/hooks/useJornada4Ops";
import {
  executeJornada4Launch,
  type Jornada4LaunchForm,
} from "@/jornada4/executeJornada4Launch";

export default function JornadaV4Session() {
  const { user } = useAuthContext();
  const core = useJornada4Core();
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);
  const ops = useJornada4Ops({
    userId: user?.uid,
    vehiclesRef: core.vehiclesRef,
    setVehicles: core.setVehicles,
    safeAwardPS: core.safeAwardPS,
  });

  const handleLaunch = useCallback(
    async (form: Jornada4LaunchForm) => {
      if (!user) return null;
      return executeJornada4Launch({
        userId: user.uid,
        form,
        vehiclesRef: core.vehiclesRef,
        setVehicles: core.setVehicles,
        setExpandedId: core.setExpandedId,
        planilla: null,
        segmentoActivo: null,
        resolverProyectoId: () => undefined,
        applyCentinelaArchiveLocally: core.applyCentinelaArchiveLocally,
        safeAwardPS: core.safeAwardPS,
        recordVehiculoInicio: core.recordVehiculoInicio,
        scrollFlotaActivosIntoView: core.scrollFlotaActivosIntoView,
        optimisticVehiclesRef: core.optimisticVehiclesRef,
        ghostReconcileRef: core.ghostReconcileRef,
        lastLaunchRef,
      });
    },
    [user, core]
  );

  return (
    <div
      className="min-h-screen pb-28"
      style={{ backgroundColor: "#0a0a0a" }}
      data-testid="jornada4-session"
    >
      <Jornada4Shell
        dualCount={core.dualCount}
        dailyPS={core.dailyPS}
        statusLine="La Flota Dual Kernel · Conquista + Enfoque"
      />
      <div className="max-w-lg mx-auto pt-2">
        <Jornada4LaunchPanel onLaunch={handleLaunch} />
        <Jornada4Boveda />
        <Jornada4VehicleList vehicles={core.dualVehicles} ops={ops} />
      </div>
    </div>
  );
}
