import { useEffect, useMemo, type ReactNode } from "react";
import { Timer } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { hardwareClockNow, hardwareElapsedMs } from "@/lib/hardwareClock";
import { useVehicleTimerTick } from "@/lib/concienciaClock";
import { getHistoricalVehicleData } from "@/components/flota/vehicleCardShared";
import { VERDE } from "@/components/flota/vehicleCardShared";

export type VehicleTimerUi = {
  display: string;
  expired: boolean;
  debt: string;
  targetLabel: string;
  remainingUnits: number | null;
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

function resolveAperturaMs(vehicle: Vehicle): number {
  if (vehicle.aperturaAt) return vehicle.aperturaAt;
  const ti = vehicle.tiempoInicio;
  if (!ti) return Date.now();
  if (typeof ti === "object" && ti !== null && "seconds" in (ti as object)) {
    return (ti as { seconds: number }).seconds * 1000;
  }
  return new Date(ti as Date).getTime();
}

export function computeVehicleTimerUi(vehicle: Vehicle, nowMs = Date.now()): VehicleTimerUi {
  const empty: VehicleTimerUi = {
    display: "",
    expired: false,
    debt: "",
    targetLabel: "",
    remainingUnits: null,
    visible: false,
  };
  if (vehicle.status !== "activo" || vehicle.tipoReloj === "desglosador") return empty;

  const tipoFlota = vehicle.tipoFlota;
  const aperturaMs = resolveAperturaMs(vehicle);
  const parentesisExtra = (vehicle.parentesisRecarga || []).reduce((sum, p) => sum + p.duracionMin, 0);

  if (tipoFlota === "verdad") {
    const elapsed = Math.max(0, Math.floor(hardwareElapsedMs(aperturaMs, nowMs) / 1000));
    return { ...empty, display: fmtTime(elapsed), visible: true };
  }

  let targetMs: number | null = null;
  let matchProd: RegExpMatchArray | null = null;
  const detalle = vehicle.criterioDetalle ?? "";

  if ((tipoFlota === "tiempo" || vehicle.tipoTerminoRapido === "hora") && detalle) {
    const matchHora = detalle.match(/^(\d{1,2}):(\d{2})$/);
    matchProd = detalle.match(/^([\d.]+)\s*x\s*([\d.]+)\s*min$/i);
    if (matchHora) {
      const target = new Date(nowMs);
      target.setHours(parseInt(matchHora[1], 10), parseInt(matchHora[2], 10), 0, 0);
      target.setMinutes(target.getMinutes() + parentesisExtra);
      targetMs = target.getTime();
    } else if (matchProd) {
      const totalMin = parseFloat(matchProd[1]) * parseFloat(matchProd[2]);
      targetMs = aperturaMs + (totalMin + parentesisExtra) * 60000;
    }
  }

  if (tipoFlota === "descanso" && detalle) {
    const matchDur = detalle.match(/([\d.]+)\s*min/i);
    if (matchDur) {
      const durMin = parseFloat(matchDur[1]) + 5;
      targetMs = aperturaMs + (durMin + parentesisExtra) * 60000;
    }
  }

  if (targetMs != null) {
    const remainingMs = targetMs - hardwareClockNow(nowMs);
    let remainingUnits: number | null = null;
    if (matchProd) {
      const cantObj = parseFloat(matchProd[1]);
      const minPerUnit = parseFloat(matchProd[2]);
      const elapsedMin = (nowMs - aperturaMs) / 60000;
      const done = Math.floor(elapsedMin / minPerUnit);
      remainingUnits = Math.max(0, cantObj - done);
    }
    if (remainingMs > 0) {
      return {
        display: fmtTime(Math.floor(Math.max(0, remainingMs) / 1000)),
        expired: false,
        debt: "",
        targetLabel: fmtHHMM(new Date(targetMs)),
        remainingUnits,
        visible: true,
      };
    }
    return {
      display: "00:00:00",
      expired: true,
      debt: fmtTime(Math.floor(Math.abs(remainingMs) / 1000)),
      targetLabel: fmtHHMM(new Date(targetMs)),
      remainingUnits,
      visible: true,
    };
  }

  let remainingUnits: number | null = null;
  if (vehicle.tipoReloj === "investigador" && vehicle.cantidadObjetivo) {
    const hist = getHistoricalVehicleData(vehicle.titulo);
    const recordMpu = hist.bestMinPerUnit ?? hist.lastMinPerUnit;
    if (recordMpu) {
      const elapsedMin = (nowMs - aperturaMs) / 60000;
      const done = Math.floor(elapsedMin / recordMpu);
      remainingUnits = Math.max(0, vehicle.cantidadObjetivo - done);
    }
  }

  const elapsed = Math.max(0, Math.floor((nowMs - aperturaMs) / 1000));
  return {
    display: fmtTime(elapsed),
    expired: false,
    debt: "",
    targetLabel: "",
    remainingUnits,
    visible: Boolean(elapsed >= 0),
  };
}

type PanelProps = {
  vehicle: Vehicle;
  tipoFlota: Vehicle["tipoFlota"];
  showDescansoReloj?: boolean;
  onExpiredChange?: (expired: boolean) => void;
  onRemainingUnitsChange?: (n: number | null) => void;
  children?: (ui: VehicleTimerUi) => ReactNode;
};

/** Timer no-situación (hora, descanso, investigador, verdad) — aislado del monolito. */
export function VehicleTimerIsland({
  vehicle,
  tipoFlota,
  showDescansoReloj = false,
  onExpiredChange,
  onRemainingUnitsChange,
  children,
}: PanelProps) {
  const tick = useVehicleTimerTick();
  const ui = useMemo(() => computeVehicleTimerUi(vehicle, Date.now()), [tick, vehicle]);

  useEffect(() => {
    onExpiredChange?.(ui.expired);
  }, [ui.expired, onExpiredChange]);

  useEffect(() => {
    onRemainingUnitsChange?.(ui.remainingUnits);
  }, [ui.remainingUnits, onRemainingUnitsChange]);

  if (!ui.visible || !ui.display) return null;
  if (tipoFlota === "descanso" && !showDescansoReloj) return null;
  if (children) return <>{children(ui)}</>;

  const label =
    vehicle.tipoReloj === "investigador"
      ? "CRONÓMETRO LIBRE"
      : ui.expired
        ? tipoFlota === "descanso"
          ? "DESCANSO EN DEUDA"
          : "TIEMPO EN DEUDA"
        : "CUENTA REGRESIVA";

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
            {label}
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
            {tipoFlota === "descanso" && " (+5 min tolerancia)"}
          </p>
        )}
      </div>
    </div>
  );
}
