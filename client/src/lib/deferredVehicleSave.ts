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

/**
 * Post-lanzamiento: stringify de flota ANTES del cluster expand/Firebase.
 * Antes 2200 ms chocaba con shadow 3200 y Firebase launchPaint 2200 → Aw Snap ~4s.
 * Si se pasa un getter, lee el snapshot al disparar (no el del launch): evita pisar Cumplido.
 */
export const LAUNCH_LOCAL_SAVE_DELAY_MS = 1_500;

export function scheduleSaveLocalVehiclesAfterLaunch(
  vehiclesOrGetter: Vehicle[] | (() => Vehicle[]),
  delayMs = LAUNCH_LOCAL_SAVE_DELAY_MS
): void {
  globalThis.setTimeout(() => {
    try {
      const vehicles =
        typeof vehiclesOrGetter === "function" ? vehiclesOrGetter() : vehiclesOrGetter;
      saveLocalVehicles(vehicles);
    } catch {
      /* quota */
    }
  }, delayMs);
}
