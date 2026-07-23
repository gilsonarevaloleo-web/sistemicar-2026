import { saveLocalVehicles, type Vehicle } from "@/lib/persistence";
import { runShadowTask } from "@/lib/desglosadorShadow";
import { enqueueLaunchPersistWork } from "@/lib/launchPersistGate";

let pending: Vehicle[] | null = null;
let scheduled = false;

/**
 * Persiste flota fuera del tap / tick de React.
 * Coalesce: varios CUMPLIDO/updates en el mismo burst → una sola escritura.
 * Usa sombra (idle) en vez de microtask, para no pelear el remount del cronómetro.
 */
export function scheduleSaveLocalVehicles(vehicles: Vehicle[]): void {
  pending = vehicles;
  if (scheduled) return;
  scheduled = true;
  runShadowTask(() => {
    scheduled = false;
    const snapshot = pending;
    pending = null;
    if (!snapshot) return;
    try {
      saveLocalVehicles(snapshot);
    } catch {
      /* quota */
    }
  });
}

/**
 * Post-lanzamiento: stringify de flota vía gate (oculto/cierre),
 * no setTimeout fijo — ese golpe contribuía al clavo ~00:00:01–03.
 * Si se pasa un getter, lee el snapshot al disparar (no el del launch): evita pisar Cumplido.
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
