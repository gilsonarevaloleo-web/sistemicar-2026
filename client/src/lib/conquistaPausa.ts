/**
 * Pausa de Conquista: congela el desglosador y sella presencia.
 * La justificación vive en `pausas[].titulo`. No crea vehículo hijo.
 *
 * Regla: pueden convivir dos conquistas; no dos pausas.
 * La segunda pausa duplica el hueco (paredes idle apiladas).
 */
import type { Vehicle } from "@/lib/persistence";
import { buildDesglosadorNestedPausePatch } from "@/lib/nestedContextStack";
import {
  isPausedPresence,
  labelVehiculoPausaAbierta,
  tituloPausaInterrupcion,
} from "@/lib/vehiculoPausa";

function isConquistaDesglosadorLite(v: Pick<Vehicle, "tipoFlota" | "tipoReloj">): boolean {
  return v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador";
}

/** Conquista activa congelada (pausa directa o nested). */
export function isConquistaPausaAbierta(v: Vehicle): boolean {
  if (v.status !== "activo") return false;
  if (!isConquistaDesglosadorLite(v)) return false;
  return isPausedPresence(v);
}

/** La otra conquista que ya ocupa el único cupo de pausa. */
export function findOtraConquistaPausa(
  vehicles: Vehicle[],
  exceptId?: string
): Vehicle | undefined {
  return vehicles.find(v => v.id !== exceptId && isConquistaPausaAbierta(v));
}

export function canOpenConquistaPausa(
  vehicles: Vehicle[],
  vehicleId: string
): { ok: true } | { ok: false; occupiedBy: Vehicle } {
  const occupiedBy = findOtraConquistaPausa(vehicles, vehicleId);
  if (occupiedBy) return { ok: false, occupiedBy };
  return { ok: true };
}

export const CONQUISTA_PAUSA_UNICA_TOAST = "Ya hay una conquista en pausa";

export function conquistaPausaUnicaHint(titulo?: string | null): string {
  const t = (titulo ?? "").trim() || "la otra conquista";
  return `${t} está congelada. Reanúdala o ciérrala antes de pausar otra.`;
}

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
