import type { SubTarea, Vehicle } from "./persistence";
import {
  appendDecisionToPeldanoTranscript,
  registrarPasoEjecutadoEnProyecto,
  type ProyectoDecisionEnumerada,
} from "./proyectos";
import { enumerateRingDecisions, rawDecisionFromSubTarea, type DecisionStatus } from "./ringDecisionTranscript";
import { markImanReservaEjecutada } from "./situacionReserva";
import { resolveDireccionProyecto } from "./resolveDireccionProyecto";

/** Volca una decisión del ring/taller al proyecto y al peldaño vinculado. */
export async function syncRingDecisionToProyectoHub(
  userId: string,
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId" | "proyectoPeldanoId">,
  sub: SubTarea,
  status: DecisionStatus,
  ts: number
): Promise<{ pasoNumero: number | null }> {
  const raw = rawDecisionFromSubTarea(vehicle, sub, status, ts);
  const [enumerated] = enumerateRingDecisions([raw]);
  if (!enumerated) return { pasoNumero: null };

  const proyectoId = resolveDireccionProyecto({
    subProyectoId: sub.proyectoId,
    vehicleProyectoId: vehicle.proyectoId,
  });
  let pasoNumero: number | null = null;

  if (proyectoId) {
    const result = await registrarPasoEjecutadoEnProyecto(userId, proyectoId, {
      ...enumerated,
      peldanoId: vehicle.proyectoPeldanoId,
    });
    pasoNumero = result?.pasoNumero ?? null;
    if (pasoNumero != null && sub.origenImanId) {
      await markImanReservaEjecutada(userId, sub.origenImanId, pasoNumero);
    }
    if (pasoNumero != null && sub.pasoEjecutadoNumero == null) {
      enumerated.pasoEjecutadoNumero = pasoNumero;
    }
  }

  if (vehicle.proyectoPeldanoId) {
    const peldanoProyectoId = vehicle.proyectoId?.trim();
    const belongsToPeldano =
      !proyectoId || !peldanoProyectoId || proyectoId === peldanoProyectoId;
    if (belongsToPeldano) {
      const entry: ProyectoDecisionEnumerada = {
        ...enumerated,
        pasoEjecutadoNumero: enumerated.pasoEjecutadoNumero ?? pasoNumero ?? undefined,
        proyectoId,
      };
      await appendDecisionToPeldanoTranscript(userId, vehicle.proyectoPeldanoId, entry);
    }
  }

  return { pasoNumero };
}
