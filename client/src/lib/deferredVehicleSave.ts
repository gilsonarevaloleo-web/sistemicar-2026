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
