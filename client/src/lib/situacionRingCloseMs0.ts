import type { MutableRefObject } from "react";
import type { Vehicle } from "@/lib/persistence";
import { burstConcienciaClockTick } from "@/lib/concienciaClock";
import {
  aplicarTiempoGanadoAlCumplir,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";

/** ms0: ancla + filas cerradas en memoria antes del await del handler (ring / VehicleCard). */
export function paintSituacionRingRowCloseOptimistic(
  vehiclesRef: MutableRefObject<Vehicle[]>,
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void,
  vehicleId: string,
  subTareaId: string,
  status: "cumplido" | "fallado"
): void {
  const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
  if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return;

  const now = Date.now();
  const sc = vehicle.situacionCronometro;
  const bloqueInicio = sc?.bloqueInicioAt ?? vehicle.aperturaAt ?? now;

  let subTareas = vehicle.subTareas;
  if (status === "cumplido") {
    ({ subTareas } = aplicarTiempoGanadoAlCumplir(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio,
      sc?.horaFinContratoMs ?? sc?.horaFinMs
    ));
  } else {
    ({ subTareas } = registrarCierreFalladoCronometro(
      subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio
    ));
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
}
