import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import {
  computeDesglosadorClocks,
  desglosadorSubTimerUiFromClocks,
  formatHHMM,
  suggestedSec,
} from "@/lib/desglosadorClock";
import { useVehicleTimerTick } from "@/lib/concienciaClock";

export type DesglosadorSubClockUi = {
  subTimerDisplay: string;
  subTimerIsCountdown: boolean;
  subTimerExpired: boolean;
  subVehicleRestante: number | null;
  futuroSubLabel: string;
  futuroCicloLabel: string;
  horaFinProyectada: string | null;
  horaFinRemainSec: number | null;
  horaFinDeltaSec: number;
  liveAccumDeltaSec: number;
};

export function emptyDesglosadorSubClockUi(): DesglosadorSubClockUi {
  return {
    subTimerDisplay: "",
    subTimerIsCountdown: false,
    subTimerExpired: false,
    subVehicleRestante: null,
    futuroSubLabel: "—",
    futuroCicloLabel: "—",
    horaFinProyectada: null,
    horaFinRemainSec: null,
    horaFinDeltaSec: 0,
    liveAccumDeltaSec: 0,
  };
}

export function computeDesglosadorSubClockUi(
  vehicle: Vehicle,
  activeSub: SubVehiculo,
  nowMs: number
): DesglosadorSubClockUi {
  if (!activeSub.aperturaAt) return emptyDesglosadorSubClockUi();
  const clocks = computeDesglosadorClocks(nowMs, vehicle);
  const obj = suggestedSec(activeSub);
  const timerUi = desglosadorSubTimerUiFromClocks(clocks, obj);

  let subVehicleRestante: number | null = null;
  if (clocks.unitsRemaining !== null) {
    subVehicleRestante = clocks.unitsRemaining;
  } else if (activeSub.cantidadObjetivo && activeSub.tiempoRecordMinPerUnit) {
    subVehicleRestante = activeSub.cantidadObjetivo;
  }

  const futuroSubLabel =
    clocks.subEndAt != null ? formatHHMM(clocks.subEndAt) : "—";

  if (clocks.hasProjection && clocks.cycleEndAt != null && clocks.cycleRemainSec != null) {
    const horaFin = formatHHMM(clocks.cycleEndAt);
    return {
      subTimerDisplay: timerUi.display,
      subTimerIsCountdown: timerUi.isCountdown,
      subTimerExpired: timerUi.expired,
      subVehicleRestante,
      futuroSubLabel,
      futuroCicloLabel: horaFin,
      horaFinProyectada: horaFin,
      horaFinRemainSec: clocks.cycleRemainSec,
      horaFinDeltaSec: clocks.liveAccumDeltaSec,
      liveAccumDeltaSec: clocks.liveAccumDeltaSec,
    };
  }

  return {
    subTimerDisplay: timerUi.display,
    subTimerIsCountdown: timerUi.isCountdown,
    subTimerExpired: timerUi.expired,
    subVehicleRestante,
    futuroSubLabel,
    futuroCicloLabel: "—",
    horaFinProyectada: null,
    horaFinRemainSec: null,
    horaFinDeltaSec: 0,
    liveAccumDeltaSec: 0,
  };
}

function useDesglosadorSubClockUi(
  vehicle: Vehicle,
  activeSub: SubVehiculo | undefined
): DesglosadorSubClockUi {
  const tick = useVehicleTimerTick();
  return useMemo(() => {
    if (!activeSub?.aperturaAt) return emptyDesglosadorSubClockUi();
    return computeDesglosadorSubClockUi(vehicle, activeSub, Date.now());
  }, [tick, vehicle, activeSub]);
}

/**
 * Aísla ticks del sub activo: solo este subárbol re-renderiza cada segundo,
 * no el VehicleCard padre (~4k líneas).
 */
export function DesglosadorSubLiveIsland({
  vehicle,
  activeSub,
  onSubVehicleRestanteChange,
  children,
}: {
  vehicle: Vehicle;
  activeSub: SubVehiculo | undefined;
  onSubVehicleRestanteChange?: (n: number | null) => void;
  children: (ui: DesglosadorSubClockUi) => ReactNode;
}) {
  const ui = useDesglosadorSubClockUi(vehicle, activeSub);
  const prevRestanteRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!onSubVehicleRestanteChange) return;
    if (prevRestanteRef.current === ui.subVehicleRestante) return;
    prevRestanteRef.current = ui.subVehicleRestante;
    onSubVehicleRestanteChange(ui.subVehicleRestante);
  }, [ui.subVehicleRestante, onSubVehicleRestanteChange]);

  return <>{children(ui)}</>;
}
