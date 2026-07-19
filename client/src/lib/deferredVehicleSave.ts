import { saveLocalVehicles, type Vehicle } from "@/lib/persistence";

/** Persiste flota en localStorage fuera del hilo de navegación / tap. */
export function scheduleSaveLocalVehicles(vehicles: Vehicle[]): void {
  queueMicrotask(() => {
    try {
      saveLocalVehicles(vehicles);
    } catch {
      /* quota */
    }
  });
}

/** Post-lanzamiento: el stringify de flota no debe chocar con toast/expand (0.5–2s). */
export const LAUNCH_LOCAL_SAVE_DELAY_MS = 2_200;

export function scheduleSaveLocalVehiclesAfterLaunch(
  vehicles: Vehicle[],
  delayMs = LAUNCH_LOCAL_SAVE_DELAY_MS
): void {
  globalThis.setTimeout(() => {
    try {
      saveLocalVehicles(vehicles);
    } catch {
      /* quota */
    }
  }, delayMs);
}
