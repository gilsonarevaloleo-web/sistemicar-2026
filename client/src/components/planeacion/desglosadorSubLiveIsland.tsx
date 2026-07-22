import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { SubVehiculo, Vehicle } from "@/lib/persistence";
import {
  computeActiveSubClocks,
  desglosadorSubClockKey,
  desglosadorSubTimerUiFromClocks,
  formatHHMM,
  getDesglosadorSessionElapsedSec,
  suggestedSec,
} from "@/lib/desglosadorClock";
import { useIslandConcienciaClock } from "@/lib/useIslandConcienciaClock";

export type DesglosadorSubClockUi = {
  /** Reloj de pared del tick del island — un solo suscriptor (sin VehicleCardLiveNow anidado). */
  nowMs: number;
  sessionElapsedSec: number;
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

export function emptyDesglosadorSubClockUi(nowMs = Date.now()): DesglosadorSubClockUi {
  return {
    nowMs,
    sessionElapsedSec: 0,
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

export { desglosadorSubClockKey };

export function computeDesglosadorSubClockUi(
  vehicle: Vehicle,
  activeSub: SubVehiculo,
  nowMs: number
): DesglosadorSubClockUi {
  const sessionElapsedSec = getDesglosadorSessionElapsedSec(vehicle, nowMs);
  if (!activeSub.aperturaAt) {
    return { ...emptyDesglosadorSubClockUi(nowMs), sessionElapsedSec };
  }
  const clocks = computeActiveSubClocks(nowMs, vehicle, activeSub);
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
      nowMs,
      sessionElapsedSec,
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
    nowMs,
    sessionElapsedSec,
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
  const tick = useIslandConcienciaClock(Boolean(activeSub?.aperturaAt));
  const clockKey = desglosadorSubClockKey(activeSub);

  return useMemo(() => {
    const nowMs = Date.now();
    if (!activeSub?.aperturaAt) {
      return {
        ...emptyDesglosadorSubClockUi(nowMs),
        sessionElapsedSec: getDesglosadorSessionElapsedSec(vehicle, nowMs),
      };
    }
    return computeDesglosadorSubClockUi(vehicle, activeSub, nowMs);
    // Island: un suscriptor. `vehicle` del render actual; no meterlo en deps
    // o cada setVehicles del padre re-pintaría el cronómetro sin tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick/clockKey/activeSub
  }, [tick, clockKey, activeSub]);
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
