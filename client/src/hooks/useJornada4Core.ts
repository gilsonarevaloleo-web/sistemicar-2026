/**
 * Core Dual Kernel: flota filtrada a conquista-desglosador + situacional.
 * Reutiliza useJornadaFlotaCore; no monta anillo/escalera/voz.
 */
import { useEffect, useMemo, useState } from "react";
import {
  getDailyPointsLocalSync,
  subscribeToDailyPoints,
} from "@/lib/persistence";
import { useAuthContext } from "@/App";
import { useJornadaFlotaCore, type JornadaFlotaCore } from "@/hooks/useJornadaFlotaCore";
import { filterJornada4Vehicles } from "@/jornada4/filters";
import { MAX_LIVE_DESGLOSADOR_SESSIONS } from "@/lib/ghostVehicleEngine";
import { requestGhostReconcileForced } from "@/lib/ghostReconcileScheduler";

export type Jornada4Core = JornadaFlotaCore & {
  dualVehicles: ReturnType<typeof filterJornada4Vehicles>;
  dualCount: number;
  dailyPS: number;
  setDailyPS: (n: number) => void;
};

export function useJornada4Core(): Jornada4Core {
  const { user } = useAuthContext();
  const [dailyPS, setDailyPS] = useState(0);

  const core = useJornadaFlotaCore({ onDailyPsChange: setDailyPS });

  // Barra del día: misma fuente que Jornada clásica (local inmediato + Firebase).
  useEffect(() => {
    if (!user?.uid) {
      setDailyPS(0);
      return;
    }
    setDailyPS(getDailyPointsLocalSync(user.uid).total);
    const unsub = subscribeToDailyPoints(
      user.uid,
      data => setDailyPS(data.total),
      e => console.error("[j4.dailyPS]", e)
    );
    const onAward = () => {
      setDailyPS(getDailyPointsLocalSync(user.uid).total);
    };
    window.addEventListener("sovereignty-points-awarded", onAward);
    window.addEventListener("sp-log-repaired", onAward);
    return () => {
      unsub();
      window.removeEventListener("sovereignty-points-awarded", onAward);
      window.removeEventListener("sp-log-repaired", onAward);
    };
  }, [user?.uid]);

  const dualVehicles = useMemo(
    () => filterJornada4Vehicles(core.vehicles),
    [core.vehicles]
  );

  // Avalancha: Firebase/local devolvió decenas de `activo`. Archivar fantasmas.
  useEffect(() => {
    if (!user?.uid) return;
    if (core.activeCount > MAX_LIVE_DESGLOSADOR_SESSIONS) {
      requestGhostReconcileForced(user.uid);
    }
  }, [user?.uid, core.activeCount]);

  return {
    ...core,
    dualVehicles,
    dualCount: dualVehicles.length,
    dailyPS,
    setDailyPS,
  };
}
