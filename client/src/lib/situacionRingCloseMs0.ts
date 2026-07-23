import type { MutableRefObject } from "react";
import type { SubTarea, Vehicle } from "@/lib/persistence";
import { burstConcienciaClockTick } from "@/lib/concienciaClock";
import {
  aplicarTiempoGanadoAlCumplir,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";

export type SituacionRingClosePaintResult = {
  subTareas: SubTarea[];
  situacionCupoAnchor: Vehicle["situacionCupoAnchor"];
  minutosGanados: number;
  saldoAdelantoMin: number;
  minutosPerdidos: number;
  bloqueListo: boolean;
};

/** ms0: ancla + filas cerradas en memoria antes del await del handler (ring / VehicleCard). */
export function paintSituacionRingRowCloseOptimistic(
  vehiclesRef: MutableRefObject<Vehicle[]>,
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void,
  vehicleId: string,
  subTareaId: string,
  status: "cumplido" | "fallado"
): SituacionRingClosePaintResult | null {
  const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
  if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return null;

  const now = Date.now();
  const sc = vehicle.situacionCronometro;
  const bloqueInicio = sc?.bloqueInicioAt ?? vehicle.aperturaAt ?? now;

  let subTareas = vehicle.subTareas;
  let minutosGanados = 0;
  let saldoAdelantoMin = 0;
  let minutosPerdidos = 0;

  if (status === "cumplido") {
    const gained = aplicarTiempoGanadoAlCumplir(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio,
      sc?.horaFinContratoMs ?? sc?.horaFinMs
    );
    subTareas = gained.subTareas;
    minutosGanados = gained.minutosGanados;
    saldoAdelantoMin = gained.saldoAdelantoMin;
  } else {
    const failed = registrarCierreFalladoCronometro(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio
    );
    subTareas = failed.subTareas;
    minutosPerdidos = failed.minutosPerdidos;
  }

  const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
  const resolvedAnchor = bloqueListo
    ? null
    : resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
        forceResetSameRow: true,
        now,
      });
  const situacionCupoAnchor =
    resolvedAnchor === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolvedAnchor;

  vehiclesRef.current = vehiclesRef.current.map(v =>
    v.id === vehicleId ? { ...v, subTareas, situacionCupoAnchor } : v
  );
  setVehicles(prev =>
    prev.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCupoAnchor } : v))
  );
  burstConcienciaClockTick(1);

  return {
    subTareas,
    situacionCupoAnchor,
    minutosGanados,
    saldoAdelantoMin,
    minutosPerdidos,
    bloqueListo,
  };
}
