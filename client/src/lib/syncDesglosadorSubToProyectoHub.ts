/**
 * Volca un sub de conquista (desglosador) al Hub del proyecto resuelto.
 * Cascada: sub.proyectoId > vehicle.proyectoId > segmento.proyectoVinculadoId.
 * Solo sombra / async — no en el gesto ms0.
 */
import type { SegmentoV5, SubVehiculo, Vehicle } from "./persistence";
import { registrarPasoEjecutadoEnProyecto } from "./proyectos";
import { resolveDireccionDesdeEntidades } from "./resolveDireccionProyecto";

export async function syncDesglosadorSubToProyectoHub(
  userId: string,
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId" | "proyectoPeldanoId">,
  sub: SubVehiculo,
  status: "cumplido" | "fallado",
  segmento?: Pick<SegmentoV5, "proyectoVinculadoId"> | null
): Promise<{ pasoNumero: number | null; proyectoId: string | undefined }> {
  const proyectoId = resolveDireccionDesdeEntidades({
    sub,
    vehicle,
    segmento: segmento ?? null,
  });
  if (!proyectoId) {
    return { pasoNumero: null, proyectoId };
  }

  const ts = sub.cierreAt ?? Date.now();
  const result = await registrarPasoEjecutadoEnProyecto(userId, proyectoId, {
    key: `desg:${vehicle.id}:${sub.id}:${status}`,
    texto: sub.titulo,
    kind: "sub_desglosador",
    status,
    ts,
    vehicleId: vehicle.id,
    vehicleTitulo: vehicle.titulo,
    subId: sub.id,
    peldanoId: vehicle.proyectoPeldanoId,
  });

  return { pasoNumero: result?.pasoNumero ?? null, proyectoId };
}
