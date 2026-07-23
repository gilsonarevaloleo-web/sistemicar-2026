/**
 * Profundidad horaria del desglosador — un solo hub de fondo (no un intervalo por tarjeta).
 * Sin setTimeout(3200): esa bomba clavaba el reloj conquista ~00:00:03.
 */
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";
import { enqueueLaunchPersistWork } from "@/lib/launchPersistGate";

export type DesglosadorDepthReconcileFn = (
  vehicleId: string,
  options?: { silent?: boolean; resetGranted?: number }
) => Promise<{ grantedTotal: number; awardedNow: number }>;

let reconcileFn: DesglosadorDepthReconcileFn | null = null;
const activeVehicleIds = new Set<string>();
let hubTimer: ReturnType<typeof setInterval> | null = null;

const DEPTH_HUB_INTERVAL_MS = 60_000;

export function registerDesglosadorDepthReconciler(fn: DesglosadorDepthReconcileFn | null): void {
  reconcileFn = fn;
}

export function syncDesglosadorDepthActiveIds(ids: string[]): void {
  activeVehicleIds.clear();
  ids.forEach(id => activeVehicleIds.add(id));
  if (activeVehicleIds.size === 0) {
    if (hubTimer != null) {
      clearInterval(hubTimer);
      hubTimer = null;
    }
    return;
  }
  ensureDepthHub();
}

function ensureDepthHub(): void {
  if (hubTimer != null || !reconcileFn) return;
  hubTimer = setInterval(() => {
    if (!reconcileFn || activeVehicleIds.size === 0) return;
    Array.from(activeVehicleIds).forEach(vehicleId => {
      runShadowTaskAsync(() => {
        void reconcileFn!(vehicleId, { silent: true });
      });
    });
  }, DEPTH_HUB_INTERVAL_MS);
}

/**
 * Tras tap / mutación local — PS de profundidad en el gate (gesto/oculto/idle),
 * no a 3.2s fijos (clavo ~00:00:03).
 */
export function scheduleDesglosadorDepthOnTap(
  vehicleId: string,
  options?: { silent?: boolean; resetGranted?: number }
): void {
  if (!reconcileFn) return;
  enqueueLaunchPersistWork(vehicleId, "pillars", () => {
    runShadowTaskAsync(() => {
      void reconcileFn!(vehicleId, options);
    });
  });
}

/** Solo tests. */
export function resetDesglosadorDepthShadowForTests(): void {
  if (hubTimer != null) clearInterval(hubTimer);
  hubTimer = null;
  activeVehicleIds.clear();
  reconcileFn = null;
}
