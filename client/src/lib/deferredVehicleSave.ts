import {
  parkActiveVehiclesForResume,
  saveLocalVehicles,
  type Vehicle,
} from "@/lib/persistence";
import { runShadowTask } from "@/lib/desglosadorShadow";
import { enqueueLaunchPersistWork } from "@/lib/launchPersistGate";

let pending: Vehicle[] | null = null;
let scheduled = false;

function parkNow(vehicles: Vehicle[]): void {
  try {
    parkActiveVehiclesForResume(vehicles);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Persiste flota fuera del tap / tick de React.
 * Coalesce: varios CUMPLIDO/updates en el mismo burst → una sola escritura.
 * Usa sombra (idle) en vez de microtask, para no pelear el remount del cronómetro.
 *
 * Park durable es síncrono: si el SO mata la pestaña antes del idle/pagehide,
 * ring/conquista siguen recuperables al volver.
 */
export function scheduleSaveLocalVehicles(vehicles: Vehicle[]): void {
  pending = vehicles;
  parkNow(vehicles);
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
 * Vacía el pending idle de inmediato (hide/pagehide/bfcache).
 * No espera requestIdleCallback — en celular lento el timeout de 8s pierde la carrera.
 */
export function flushPendingSaveLocalVehicles(): void {
  scheduled = false;
  const snapshot = pending;
  pending = null;
  if (!snapshot) return;
  try {
    saveLocalVehicles(snapshot);
    parkNow(snapshot);
  } catch {
    /* quota */
  }
}

/**
 * Post-lanzamiento: stringify de flota vía gate (oculto/cierre),
 * no setTimeout fijo — ese golpe contribuía al clavo ~00:00:01–03.
 * Si se pasa un getter, lee el snapshot al disparar (no el del launch): evita pisar Cumplido.
 *
 * Park inmediato: sobrevivir kill sin pagehide tras lanzar ring/conquista.
 */
export function scheduleSaveLocalVehiclesAfterLaunch(
  vehiclesOrGetter: Vehicle[] | (() => Vehicle[]),
  vehicleId?: string
): void {
  try {
    const now =
      typeof vehiclesOrGetter === "function" ? vehiclesOrGetter() : vehiclesOrGetter;
    parkNow(now);
  } catch {
    /* quota */
  }
  const id = vehicleId ?? "__launch_local__";
  enqueueLaunchPersistWork(id, "local", () => {
    try {
      const vehicles =
        typeof vehiclesOrGetter === "function" ? vehiclesOrGetter() : vehiclesOrGetter;
      saveLocalVehicles(vehicles);
      parkNow(vehicles);
    } catch {
      /* quota */
    }
  });
}
