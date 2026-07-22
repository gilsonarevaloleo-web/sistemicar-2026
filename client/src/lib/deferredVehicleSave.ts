import { saveLocalVehicles, type Vehicle } from "@/lib/persistence";
import { runShadowTask } from "@/lib/desglosadorShadow";

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
