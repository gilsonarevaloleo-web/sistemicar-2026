/**
 * Pausa de Conquista: congela el desglosador y sella presencia.
 * La justificación vive en `pausas[].titulo`. No crea vehículo hijo.
 */
import type { Vehicle } from "@/lib/persistence";
import { buildDesglosadorNestedPausePatch } from "@/lib/nestedContextStack";
import {
  labelVehiculoPausaAbierta,
  tituloPausaInterrupcion,
} from "@/lib/vehiculoPausa";

function restanteUnidadesAlPausar(vehicle: Vehicle, now: number): number | undefined {
  const activeSub = (vehicle.subVehiculos ?? []).find(s => s.status === "activo");
  if (!activeSub?.aperturaAt || !activeSub.cantidadObjetivo || !activeSub.tiempoRecordMinPerUnit) {
    return undefined;
  }
  const elapsedSec = Math.floor((now - activeSub.aperturaAt) / 1000);
  const done = Math.floor(elapsedSec / 60 / activeSub.tiempoRecordMinPerUnit);
  return Math.max(0, activeSub.cantidadObjetivo - done);
}

export function buildConquistaPausePatch(vehicle: Vehicle, titulo?: string) {
  const nombre = tituloPausaInterrupcion(titulo);
  const nested = buildDesglosadorNestedPausePatch(
    vehicle,
    "interrupcion_situacion",
    nombre
  );
  if (!nested) return null;
  const restanteUnidades = restanteUnidadesAlPausar(
    vehicle,
    nested.desglosadorPausa.pausadoAt
  );
  return {
    ...nested,
    desglosadorPausa: {
      ...nested.desglosadorPausa,
      restanteUnidades,
    },
  };
}

export function buildConquistaPauseLabelPatch(
  vehicle: Vehicle,
  raw: string
): Pick<Vehicle, "pausas"> | null {
  const titulo = raw.trim();
  if (!titulo) return null;
  if (!vehicle.interrupcionActiva && !vehicle.desglosadorPausa) return null;
  const pausas = labelVehiculoPausaAbierta(
    vehicle.pausas,
    titulo,
    vehicle.desglosadorPausa?.pausadoAt
  );
  if (!pausas || pausas === vehicle.pausas) return null;
  return { pausas };
}
