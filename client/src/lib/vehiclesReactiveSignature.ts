import type { Vehicle } from "./persistence";

/**
 * Firma estable para reconcile/disco.
 * Debe incluir ancla + resultado de filas del ring: si se omiten, Cumplido
 * puede saltarse el flush a disco y rehidratarse el reloj viejo (freeze percibido).
 */
export function vehiclesReactiveSignature(vehicles: Vehicle[]): string {
  return vehicles
    .map(v => {
      const sc = v.situacionCronometro;
      const anchor = v.situacionCupoAnchor;
      const cronSig = (v.subTareas ?? [])
        .filter(st => st.enDesgloseCronometro)
        .map(
          st =>
            `${st.id}.${st.resultadoSituacion ?? "p"}.${st.minutosCupo ?? 0}.${st.cerradaAt ?? 0}`
        )
        .join(",");
      const desgSig = (v.subVehiculos ?? [])
        .map(s => `${s.id}.${s.status}.${s.aperturaAt ?? 0}`)
        .join(",");
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
        anchor?.subTareaId ?? "",
        anchor?.startedAt ?? 0,
        cronSig,
        desgSig,
        v.subTareas?.length ?? 0,
      ].join(":");
    })
    .sort()
    .join("|");
}
