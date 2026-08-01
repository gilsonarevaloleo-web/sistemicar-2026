import type { TipoFlota, Vehicle } from "./persistence";

export const MAX_OPERATIONAL_SLOTS = 2;

export type VehicleLaunchKind = "flota_general" | "descanso" | "interrupcion" | "quick_save";

export interface OperationalSlotsCheck {
  allowed: boolean;
  reason?: string;
  blockingVehicles?: Vehicle[];
}

/** Activos conscientes que consumen slot operativo (descanso no cuenta: recarga libre). */
export function getOperationalActives(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(
    v => v.status === "activo" && !v.autoVerdad && v.tipoFlota !== "descanso"
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

export function isDesglosadorCrossSegmentExempt(vehicle: Vehicle): boolean {
  // Contrato opt-in: anclado al segmento pierde la exención de cruce.
  if (vehicle.ancladoAlSegmento === true) return false;
  return isDesglosadorEnFoco(vehicle);
}

function blockResult(
  reason: string,
  blockingVehicles: Vehicle[]
): OperationalSlotsCheck {
  return { allowed: false, reason, blockingVehicles };
}

/**
 * Tope de 2 misiones operativas (descanso exento — usable en cualquier momento).
 * Interrupción: padre pausado + hijo = 2 slots (máx. antes de lanzar: 1 activo = el padre).
 */
export function assertCanOpenVehicle(
  vehicles: Vehicle[],
  kind: VehicleLaunchKind,
  opts?: { parentDesglosadorId?: string }
): OperationalSlotsCheck {
  const actives = getOperationalActives(vehicles);

  if (kind === "interrupcion") {
    const parentId = opts?.parentDesglosadorId;
    const withoutParent = parentId ? actives.filter(v => v.id !== parentId) : actives;
    if (actives.length >= MAX_OPERATIONAL_SLOTS && withoutParent.length >= 1) {
      return blockResult(
        "Tienes 2 misiones abiertas. Cierra o retoma una antes de lanzar la interrupción.",
        actives
      );
    }
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
