import type { Planilla, Vehicle } from "@/lib/persistence";
import { situacionRelojDebeMostrarse } from "@/lib/situacionCupoDistrib";
import { vehiclesReactiveSignature } from "@/lib/situacionRepair";

export function vehicleCardNeedsLiveTick(vehicle: Vehicle, expanded: boolean): boolean {
  if (vehicle.status !== "activo") return false;
  if (expanded) return true;
  if (vehicle.tipoReloj === "desglosador") return true;
  if (vehicle.tipoFlota === "situacion") {
    if (situacionRelojDebeMostrarse(vehicle)) return true;
    if (vehicle.situacionCronometro?.activo === true) return true;
  }
  return false;
}

export type VehicleCardMemoProps = {
  vehicle: Vehicle;
  expanded: boolean;
  minimal?: boolean;
  segmentoNumero?: number | null;
  planilla?: Planilla | null;
  arquitectoUnlocked?: boolean;
  situacionBloquePsTotal?: number;
  situacionDesgloseSummary?: { vehicleId?: string; psTotal?: number };
};

/** Campos del ring que vehiclesReactiveSignature omite — sin esto Cumplido/Fallado no re-renderiza. */
export function vehicleRingUiSignature(vehicle: Vehicle): string {
  if (vehicle.tipoFlota !== "situacion") return "";
  const sc = vehicle.situacionCronometro;
  const anchor = vehicle.situacionCupoAnchor;
  const cron = (vehicle.subTareas ?? [])
    .filter(st => st.enDesgloseCronometro)
    .map(st =>
      [
        st.id,
        st.resultadoSituacion ?? "pendiente",
        st.minutosCupo ?? 0,
        st.cupoFijo ? 1 : 0,
        st.cerradaAt ?? 0,
      ].join(".")
    )
    .sort()
    .join(",");
  return [
    sc?.activo ? 1 : 0,
    sc?.bloqueInicioAt ?? 0,
    sc?.saldoAdelantoMin ?? 0,
    sc?.minutosGanadosReto ?? 0,
    sc?.horaFinMs ?? 0,
    sc?.horaFinContratoMs ?? 0,
    anchor?.subTareaId ?? "",
    anchor?.startedAt ?? 0,
    cron,
  ].join("|");
}

export function areVehicleCardPropsEqual(
  prev: VehicleCardMemoProps,
  next: VehicleCardMemoProps
): boolean {
  if (prev.expanded !== next.expanded) return false;
  if (prev.minimal !== next.minimal) return false;
  if (prev.segmentoNumero !== next.segmentoNumero) return false;
  if (prev.arquitectoUnlocked !== next.arquitectoUnlocked) return false;
  if (prev.situacionBloquePsTotal !== next.situacionBloquePsTotal) return false;
  if (prev.situacionDesgloseSummary?.vehicleId !== next.situacionDesgloseSummary?.vehicleId) return false;
  if (prev.situacionDesgloseSummary?.psTotal !== next.situacionDesgloseSummary?.psTotal) return false;
  if (prev.planilla?.fecha !== next.planilla?.fecha) return false;
  if (vehicleRingUiSignature(prev.vehicle) !== vehicleRingUiSignature(next.vehicle)) {
    return false;
  }
  if (vehiclesReactiveSignature([prev.vehicle]) !== vehiclesReactiveSignature([next.vehicle])) {
    return false;
  }
  return true;
}
