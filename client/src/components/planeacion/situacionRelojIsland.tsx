import { useEffect, useMemo } from "react";
import { Timer } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { hardwareClockNow, hardwareElapsedMs, durationMinutesToMs } from "@/lib/hardwareClock";
import {
  situacionFilaEnFocoPendiente,
  situacionRelojDebeMostrarse,
  situacionTargetMsReloj,
} from "@/lib/situacionCupoDistrib";
import { useVehicleTimerTick } from "@/lib/concienciaClock";
import { GOLD, VERDE } from "@/components/flota/vehicleCardShared";

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

export function computeSituacionTimerUi(vehicle: Vehicle, nowMs = Date.now()): SituacionTimerUi {
  const empty: SituacionTimerUi = { display: "", expired: false, debt: "", targetLabel: "", visible: false };
  if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return empty;
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

  const remainingMs = targetMs - hardwareClockNow(nowMs);
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

type Props = {
  vehicle: Vehicle;
  compact?: boolean;
  onExpiredChange?: (expired: boolean) => void;
};

/** Reloj situacional aislado — no re-renderiza VehicleCard cada segundo. */
export function SituacionRelojIsland({ vehicle, compact = false, onExpiredChange }: Props) {
  const tick = useVehicleTimerTick();
  const ui = useMemo(() => computeSituacionTimerUi(vehicle, Date.now()), [tick, vehicle]);

  useEffect(() => {
    if (ui.visible) onExpiredChange?.(ui.expired);
  }, [ui.expired, ui.visible, onExpiredChange]);

  if (!ui.visible) return null;

  if (compact) {
    return (
      <span
        className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono tracking-wider"
        style={{
          backgroundColor: ui.expired ? "rgba(153,27,27,0.25)" : "rgba(212,175,55,0.15)",
          color: ui.expired ? "#ef4444" : GOLD,
          border: `1px solid ${ui.expired ? "rgba(153,27,27,0.45)" : "rgba(212,175,55,0.35)"}`,
        }}
        data-testid={`situacion-header-timer-${vehicle.id}`}
      >
        {ui.display}
      </span>
    );
  }

  return (
    <div className="pt-3">
      <div
        className="p-3 rounded-xl border text-center"
        style={{
          backgroundColor: ui.expired ? "rgba(153,27,27,0.15)" : `${VERDE}08`,
          borderColor: ui.expired ? "#991b1b" : `${VERDE}40`,
          boxShadow: ui.expired ? "0 0 20px rgba(153,27,27,0.3)" : `0 0 15px ${VERDE}15`,
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Timer size={12} style={{ color: ui.expired ? "#ef4444" : VERDE }} />
          <span
            className="text-[8px] font-bold uppercase tracking-widest"
            style={{ color: ui.expired ? "#ef4444" : VERDE }}
          >
            FILA EN FOCO
          </span>
        </div>
        {!ui.expired ? (
          <span
            className="text-2xl font-black tracking-wider"
            style={{ color: VERDE, fontFamily: "JetBrains Mono, monospace" }}
          >
            {ui.display}
          </span>
        ) : (
          <div>
            <span
              className="text-sm text-slate-600 line-through"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              00:00:00
            </span>
            {ui.debt && (
              <div className="mt-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-red-500 block mb-0.5">
                  DEUDA ACUMULADA
                </span>
                <span
                  className="text-2xl font-black tracking-wider"
                  style={{
                    color: "#ef4444",
                    fontFamily: "JetBrains Mono, monospace",
                    textShadow: "0 0 15px rgba(239,68,68,0.4)",
                  }}
                >
                  +{ui.debt}
                </span>
              </div>
            )}
          </div>
        )}
        {ui.targetLabel && (
          <p className="text-[9px] mt-1" style={{ color: ui.expired ? "#ef4444" : VERDE }}>
            Objetivo: {ui.targetLabel}
          </p>
        )}
      </div>
    </div>
  );
}
