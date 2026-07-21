import { saveLocalVehicles, type Vehicle } from "@/lib/persistence";
import { enqueueLaunchPersistWork } from "@/lib/launchPersistGate";

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
 * Post-lanzamiento: stringify de flota vía gate (oculto/idle/cierre),
 * no setTimeout(1.5s) — ese golpe contribuía al clavo ~00:00:01–03.
 */
export function scheduleSaveLocalVehiclesAfterLaunch(
  vehiclesOrGetter: Vehicle[] | (() => Vehicle[]),
  vehicleId?: string
): void {
  const id = vehicleId ?? "__launch_local__";
  enqueueLaunchPersistWork(id, "local", () => {
    try {
      const vehicles =
        typeof vehiclesOrGetter === "function" ? vehiclesOrGetter() : vehiclesOrGetter;
      saveLocalVehicles(vehicles);
    } catch {
      /* quota */
    }
  });
}
