import type { Vehicle } from "@/lib/persistence";
import { hardwareElapsedMs, durationMinutesToMs } from "@/lib/hardwareClock";
import {
  situacionFilaEnFocoPendiente,
  situacionRelojDebeMostrarse,
  situacionTargetMsReloj,
} from "@/lib/situacionCupoDistrib";

export type SituacionTimerUi = {
  display: string;
  expired: boolean;
  debt: string;
  targetLabel: string;
  visible: boolean;
};

function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Reloj situacional puro — wall-clock; sin scheduler de conciencia. */
export function computeSituacionTimerUi(vehicle: Vehicle, nowMs = Date.now()): SituacionTimerUi {
  const empty: SituacionTimerUi = {
    display: "",
    expired: false,
    debt: "",
    targetLabel: "",
    visible: false,
  };
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return empty;
  if (vehicle.situacionNestedPause) {
    return { display: "—", expired: false, debt: "", targetLabel: "", visible: true };
  }
  if (!situacionRelojDebeMostrarse(vehicle)) return empty;

  const targetMs = situacionTargetMsReloj(vehicle, nowMs);
  if (targetMs == null) return empty;

  const targetLabel = fmtHHMM(new Date(targetMs));
  const anchor = vehicle.situacionCupoAnchor;
  const sub = anchor?.subTareaId
    ? (vehicle.subTareas || []).find(s => s.id === anchor.subTareaId)
    : null;

  if (
    anchor?.startedAt &&
    sub &&
    (sub.minutosCupo ?? 0) > 0 &&
    situacionFilaEnFocoPendiente(sub)
  ) {
    const durationInMs = durationMinutesToMs(sub.minutosCupo!);
    const elapsedMs = hardwareElapsedMs(anchor.startedAt, nowMs);
    const remainingMs = durationInMs - elapsedMs;
    const safeRemainingMs = Math.max(0, remainingMs);
    if (remainingMs > 0) {
      return {
        display: fmtTime(Math.floor(safeRemainingMs / 1000)),
        expired: false,
        debt: "",
        targetLabel,
        visible: true,
      };
    }
    if (elapsedMs >= durationInMs) {
      const overMs = elapsedMs - durationInMs;
      return {
        display: "00:00:00",
        expired: true,
        debt: overMs > 0 ? fmtTime(Math.floor(overMs / 1000)) : "",
        targetLabel,
        visible: true,
      };
    }
    return {
      display: fmtTime(Math.floor(safeRemainingMs / 1000)),
      expired: false,
      debt: "",
      targetLabel,
      visible: true,
    };
  }

  const remainingMs = targetMs - nowMs;
  if (remainingMs > 0) {
    return {
      display: fmtTime(Math.floor(Math.max(0, remainingMs) / 1000)),
      expired: false,
      debt: "",
      targetLabel,
      visible: true,
    };
  }
  return {
    display: "00:00:00",
    expired: true,
    debt: fmtTime(Math.floor(Math.abs(remainingMs) / 1000)),
    targetLabel,
    visible: true,
  };
}
