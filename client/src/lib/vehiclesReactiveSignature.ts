import type { Vehicle } from "./persistence";

/** Firma estable para evitar setState/reconcile/disco en bucle cuando el snapshot no cambió. */
export function vehiclesReactiveSignature(vehicles: Vehicle[]): string {
  return vehicles
    .map(v => {
      const sc = v.situacionCronometro;
      return [
        v.id,
        v.status,
        v.clientRequestId ?? "",
        v.vehiculoPadreDesglosadorId ?? "",
        v.interrupcionActiva ? 1 : 0,
        v.desglosadorPausa?.subActivoId ?? "",
        sc?.activo ? 1 : 0,
        sc?.bloqueInicioAt ?? 0,
        sc?.retosCompletados ?? 0,
        sc?.depthBlockPsGranted ?? 0,
        v.subTareas?.length ?? 0,
        v.subVehiculos?.filter(s => s.status === "activo").length ?? 0,
      ].join(":");
    })
    .sort()
    .join("|");
}
