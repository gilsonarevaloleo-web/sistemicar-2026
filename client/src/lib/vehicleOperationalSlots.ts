import type { TipoFlota, Vehicle } from "./persistence";
import { isGhostActiveVehicle } from "./ghostVehicleEngine";
import { getJournalDayStartMs } from "./segmentTime";
import { isPausedPresence } from "./vehiculoPausa";

export const MAX_OPERATIONAL_SLOTS = 2;

export type VehicleLaunchKind = "flota_general" | "descanso" | "interrupcion" | "quick_save";

export interface OperationalSlotsCheck {
  allowed: boolean;
  reason?: string;
  blockingVehicles?: Vehicle[];
}

/**
 * Activos conscientes que consumen slot operativo.
 * Pausa / interrupción / cascarón fantasma no cuentan: se pausa horas
 * y Dual Kernel debe poder lanzar hasta 2 conquistas reales.
 */
export function getOperationalActives(
  vehicles: Vehicle[],
  nowMs = Date.now()
): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  const byId = new Map(vehicles.map(v => [v.id, v]));
  return vehicles.filter(
    v =>
      v.status === "activo" &&
      !v.autoVerdad &&
      v.tipoFlota !== "descanso" &&
      !isPausedPresence(v) &&
      !isGhostActiveVehicle(v, nowMs, dayStart, byId)
  );
}

/** Desglosador con trabajo en curso (durabilidad / cruce de segmentos). */
export function isDesglosadorEnFoco(vehicle: Vehicle): boolean {
  if (vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo") return false;
  if (vehicle.interrupcionActiva) return true;
  const subs = vehicle.subVehiculos ?? [];
  if (subs.length === 0) return false;
  return subs.some(s => s.status === "activo" || s.status === "pendiente");
}

/**
 * Ring / lista / interrupción de enfoque aún operables.
 * Deben sobrevivir ausencias largas y cruce de segmento (igual que conquista).
 */
export function isEnfoqueSessionLive(vehicle: Vehicle): boolean {
  if (vehicle.status !== "activo" || vehicle.autoVerdad) return false;
  if (vehicle.tipoFlota !== "situacion") return false;
  if (vehicle.situacionCronometro?.activo === true) return true;
  if (vehicle.situacionNestedPause) return true;
  if (vehicle.vehiculoPadreDesglosadorId) return true;
  const subs = vehicle.subTareas ?? [];
  return subs.some(
    st =>
      !st.completada && (st.resultadoSituacion ?? "pendiente") === "pendiente"
  );
}

export function isDesglosadorCrossSegmentExempt(vehicle: Vehicle): boolean {
  // Contrato opt-in: anclado al segmento pierde la exención de cruce.
  if (vehicle.ancladoAlSegmento === true) return false;
  return isDesglosadorEnFoco(vehicle);
}

/** Conquista o enfoque vivos: el motor de cruce no los archiva al salir de Dual Kernel. */
export function isLiveWorkCrossSegmentExempt(vehicle: Vehicle): boolean {
  if (isDesglosadorCrossSegmentExempt(vehicle)) return true;
  if (vehicle.ancladoAlSegmento === true) return false;
  return isEnfoqueSessionLive(vehicle);
}

function blockResult(
  reason: string,
  blockingVehicles: Vehicle[]
): OperationalSlotsCheck {
  return { allowed: false, reason, blockingVehicles };
}

/**
 * Tope de 2 misiones operativas (descanso y pausa exentos).
 * La interrupción no abre un cupo: congela el padre y no es un vehículo activo.
 */
export function assertCanOpenVehicle(
  vehicles: Vehicle[],
  kind: VehicleLaunchKind,
  _opts?: { parentDesglosadorId?: string }
): OperationalSlotsCheck {
  const actives = getOperationalActives(vehicles);

  if (kind === "interrupcion") {
    return { allowed: true };
  }

  if (kind === "descanso") {
    return { allowed: true };
  }

  if (actives.length >= MAX_OPERATIONAL_SLOTS) {
    return blockResult(
      "Tienes 2 misiones abiertas. Cierra o retoma una antes de abrir otra.",
      actives
    );
  }

  return { allowed: true };
}

export function formatOperationalSlotsBlockMessage(check: OperationalSlotsCheck): string {
  if (!check.reason) return "No puedes abrir otra misión ahora.";
  const names = check.blockingVehicles?.map(v => v.titulo).filter(Boolean) ?? [];
  if (names.length === 0) return check.reason;
  return `${check.reason} Abiertas: ${names.join(" · ")}.`;
}

export function launchKindFromFlota(tipoFlota: TipoFlota | undefined): VehicleLaunchKind {
  if (tipoFlota === "descanso") return "descanso";
  return "flota_general";
}
