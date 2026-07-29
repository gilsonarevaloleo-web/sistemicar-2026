/**
 * Core Dual Kernel: flota filtrada a conquista-desglosador + situacional.
 * Reutiliza useJornadaFlotaCore; no monta anillo/escalera/voz.
 */
import { useMemo, useState } from "react";
import { getDailyPointsLocalSync } from "@/lib/persistence";
import { useAuthContext } from "@/App";
import { useJornadaFlotaCore, type JornadaFlotaCore } from "@/hooks/useJornadaFlotaCore";
import { filterJornada4Vehicles } from "@/jornada4/filters";

export type Jornada4Core = JornadaFlotaCore & {
  dualVehicles: ReturnType<typeof filterJornada4Vehicles>;
  dualCount: number;
  dailyPS: number;
  setDailyPS: (n: number) => void;
};

export function useJornada4Core(): Jornada4Core {
  const { user } = useAuthContext();
  const [dailyPS, setDailyPS] = useState(() =>
    user ? getDailyPointsLocalSync(user.uid).total : 0
  );

  const core = useJornadaFlotaCore({ onDailyPsChange: setDailyPS });

  const dualVehicles = useMemo(
    () => filterJornada4Vehicles(core.vehicles),
    [core.vehicles]
  );

  return {
    ...core,
    dualVehicles,
    dualCount: dualVehicles.length,
    dailyPS,
    setDailyPS,
  };
}
