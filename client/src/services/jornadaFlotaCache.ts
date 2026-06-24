/**
 * Caché local de flota — pintado optimista sin esperar red.
 */
import { getLocalVehicles, saveLocalVehicles, type Vehicle } from "@/lib/persistence";

export function readLocalFlota(_userId?: string): Vehicle[] {
  try {
    return getLocalVehicles();
  } catch {
    return [];
  }
}

export function writeLocalFlota(_userId: string | undefined, vehicles: Vehicle[]): void {
  if (!vehicles.length) return;
  try {
    saveLocalVehicles(vehicles);
  } catch {
    /* quota / private mode */
  }
}

export function hasLocalFlotaPaint(userId?: string): boolean {
  return readLocalFlota(userId).length > 0;
}
