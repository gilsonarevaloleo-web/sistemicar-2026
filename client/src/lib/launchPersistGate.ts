/**
 * Persist remoto post-lanzamiento SIN bomba a N segundos.
 *
 * Mover el delay (4→6→12→13→28) solo movía el congelamiento del reloj conquista.
 * Idle en foreground también disparaba el golpe ~00:00:03 entre ticks del reloj.
 *
 * Solo se vacía cuando el operador NO está mid-tick de medición:
 * - pestaña oculta / pagehide
 * - primer cierre de sub (Cumplido/Fallado) del vehículo
 * - red de seguridad a 3 min (setDoc async; no stringify forzado en foreground temprano)
 *
 * Rotación: visibility/pagehide durante orientation quiet se aplaza (~1.2s).
 */

import { isOrientationQuiet, runWhenOrientationSettled } from "@/lib/orientationQuietGate";

export type LaunchPersistKind = "remote" | "local" | "pillars" | "centinela";

type PendingLaunchWork = {
  vehicleId: string;
  kind: LaunchPersistKind;
  run: () => void;
};

const pending: PendingLaunchWork[] = [];
let listenersArmed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

/** Red de seguridad — solo si nunca hubo oculto/cierre. */
export const LAUNCH_PERSIST_SAFETY_MS = 180_000;

function clearSafety(): void {
  if (safetyTimer != null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function disarmIfEmpty(): void {
  if (pending.length > 0) return;
  clearSafety();
  if (!listenersArmed || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  listenersArmed = false;
}

function flushBatch(batch: PendingLaunchWork[], reason: string): void {
  for (const item of batch) {
    try {
      item.run();
    } catch (e) {
      console.warn(`[launchPersistGate] ${item.kind}/${reason}`, e);
    }
  }
}

function flushAll(reason: string): void {
  if (pending.length === 0) return;
  const batch = pending.splice(0, pending.length);
  disarmIfEmpty();
  flushBatch(batch, reason);
}

/** Seguridad: en foreground solo remote/centinela/pillars (red); local stringify espera oculto/cierre. */
function flushSafetyForeground(): void {
  if (pending.length === 0) return;
  const runNow: PendingLaunchWork[] = [];
  const keep: PendingLaunchWork[] = [];
  for (const item of pending) {
    if (item.kind === "local") keep.push(item);
    else runNow.push(item);
  }
  pending.length = 0;
  pending.push(...keep);
  if (pending.length === 0) {
    disarmIfEmpty();
  } else {
    // Sigue armado por el stringify local pendiente.
    clearSafety();
    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        flushAll("safety-hidden");
      } else {
        // Último recurso: también local, pero lejos del arranque.
        flushAll("safety-final");
      }
    }, LAUNCH_PERSIST_SAFETY_MS);
  }
  flushBatch(runNow, "safety-foreground");
}

function flushVehicle(vehicleId: string, reason: string): void {
  const keep: PendingLaunchWork[] = [];
  const runNow: PendingLaunchWork[] = [];
  for (const item of pending) {
    if (item.vehicleId === vehicleId) runNow.push(item);
    else keep.push(item);
  }
  pending.length = 0;
  pending.push(...keep);
  disarmIfEmpty();
  flushBatch(runNow, reason);
}

function onVisibility(): void {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    if (isOrientationQuiet()) {
      runWhenOrientationSettled(() => flushAll("visibility-hidden-settled"));
      return;
    }
    flushAll("visibility-hidden");
  }
}

function onPageHide(): void {
  if (isOrientationQuiet()) {
    runWhenOrientationSettled(() => flushAll("pagehide-settled"));
    return;
  }
  flushAll("pagehide");
}

function ensureListeners(): void {
  if (typeof document === "undefined") return;
  if (!listenersArmed) {
    listenersArmed = true;
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
  }
  if (safetyTimer == null && pending.length > 0) {
    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        flushAll("safety-hidden");
      } else {
        flushSafetyForeground();
      }
    }, LAUNCH_PERSIST_SAFETY_MS);
  }
}

/** Encola trabajo de launch; no usa setTimeout(28s) ni idle en foreground. */
export function enqueueLaunchPersistWork(
  vehicleId: string,
  kind: LaunchPersistKind,
  run: () => void
): void {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].vehicleId === vehicleId && pending[i].kind === kind) {
      pending.splice(i, 1);
    }
  }
  pending.push({ vehicleId, kind, run });
  ensureListeners();
}

/** Primer Cumplido/Fallado / cierre del desglosador — momento seguro con gesto. */
export function flushLaunchPersistOnSubClose(vehicleId: string): void {
  flushVehicle(vehicleId, "sub-close");
}

/** Solo tests. */
export function resetLaunchPersistGateForTests(): void {
  pending.length = 0;
  clearSafety();
  if (listenersArmed && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    listenersArmed = false;
  }
}

/** Solo tests. */
export function countLaunchPersistPendingForTests(): number {
  return pending.length;
}
