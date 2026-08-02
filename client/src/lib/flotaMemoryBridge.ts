/**
 * Puente sin ciclos: persistence puede consultar la memoria viva del store
 * al escribir disco, sin importar flotaStore directamente.
 */
import type { Vehicle } from "./persistence";

let memoryGetter: (() => readonly Vehicle[]) | null = null;

export function registerFlotaMemoryGetter(getter: (() => readonly Vehicle[]) | null): void {
  memoryGetter = getter;
}

export function getFlotaMemoryVehicles(): Vehicle[] {
  if (!memoryGetter) return [];
  try {
    return [...memoryGetter()];
  } catch {
    return [];
  }
}
