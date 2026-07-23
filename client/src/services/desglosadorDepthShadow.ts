/**
 * Profundidad horaria del desglosador — un solo hub de fondo (no un intervalo por tarjeta).
 */
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";

/** Tras launch: lejos del cluster 1.5–5.5 s (antes 3200 chocaba con sombra). */
const DEPTH_ON_TAP_DEFER_MS = 8_000;

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

/** Tras tap / mutación local — PS de profundidad en sombra. */
export function scheduleDesglosadorDepthOnTap(
  vehicleId: string,
  options?: { silent?: boolean; resetGranted?: number }
): void {
  if (!reconcileFn) return;
  globalThis.setTimeout(() => {
    runShadowTaskAsync(() => {
      void reconcileFn!(vehicleId, options);
    });
  }, DEPTH_ON_TAP_DEFER_MS);
}

/** Solo tests. */
export function resetDesglosadorDepthShadowForTests(): void {
  if (hubTimer != null) clearInterval(hubTimer);
  hubTimer = null;
  activeVehicleIds.clear();
  reconcileFn = null;
}
