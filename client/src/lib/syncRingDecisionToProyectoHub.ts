import type { SubTarea, Vehicle } from "./persistence";
import { feedsProyectoHub, resolveDestinoCierre } from "./destinoCierre";
import { nidoFeedsEscalera } from "./nidoNaturaleza";
import {
  appendDecisionToPeldanoTranscript,
  getProyectosLocal,
  registrarPasoEjecutadoEnProyecto,
  type ProyectoDecisionEnumerada,
} from "./proyectos";
import { enumerateRingDecisions, rawDecisionFromSubTarea, type DecisionStatus } from "./ringDecisionTranscript";
import { markImanReservaEjecutada } from "./situacionReserva";

/** Volca una decisión del ring/taller al proyecto y al peldaño vinculado. */
export async function syncRingDecisionToProyectoHub(
  userId: string,
  vehicle: Pick<Vehicle, "id" | "titulo" | "proyectoId" | "proyectoPeldanoId" | "destinoCierre">,
  sub: SubTarea,
  status: DecisionStatus,
  ts: number
): Promise<{ pasoNumero: number | null }> {
  if (!feedsProyectoHub(resolveDestinoCierre(vehicle.destinoCierre))) {
    return { pasoNumero: null };
  }

  const raw = rawDecisionFromSubTarea(vehicle, sub, status, ts);
  const [enumerated] = enumerateRingDecisions([raw]);
  if (!enumerated) return { pasoNumero: null };

  const proyectoId = sub.proyectoId?.trim() ?? vehicle.proyectoId?.trim();
  if (
    proyectoId &&
    !nidoFeedsEscalera(getProyectosLocal(userId).find(p => p.id === proyectoId)?.etiqueta)
  ) {
    return { pasoNumero: null };
  }
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
