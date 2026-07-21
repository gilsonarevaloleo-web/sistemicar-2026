/**
 * Persist remoto post-lanzamiento SIN bomba a N segundos.
 *
 * Mover el delay (4→6→12→13→28) solo movía el congelamiento del reloj conquista.
 * Aquí el setDoc quiet / pilares se disparan cuando el operador NO está mid-tick:
 * - pestaña oculta / pagehide
 * - primer cierre de sub (Cumplido/Fallado) del vehículo
 * - idle real (requestIdleCallback); forzado solo a los 3 min como red de seguridad
 */

export type LaunchPersistKind = "remote" | "local" | "pillars" | "centinela";

type PendingLaunchWork = {
  vehicleId: string;
  kind: LaunchPersistKind;
  run: () => void;
};

const pending: PendingLaunchWork[] = [];
let listenersArmed = false;
let idleHandle: number | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

/** Red de seguridad — no es la estrategia; solo si nunca hubo idle/oculto/cierre. */
export const LAUNCH_PERSIST_SAFETY_MS = 180_000;

function clearIdle(): void {
  if (idleHandle != null && typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(idleHandle);
    idleHandle = null;
  }
}

function clearSafety(): void {
  if (safetyTimer != null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function disarmIfEmpty(): void {
  if (pending.length > 0) return;
  clearIdle();
  clearSafety();
  if (!listenersArmed || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  listenersArmed = false;
}

function flushAll(reason: string): void {
  if (pending.length === 0) return;
  const batch = pending.splice(0, pending.length);
  disarmIfEmpty();
  for (const item of batch) {
    try {
      item.run();
    } catch (e) {
      console.warn(`[launchPersistGate] ${item.kind}/${reason}`, e);
    }
  }
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
  for (const item of runNow) {
    try {
      item.run();
    } catch (e) {
      console.warn(`[launchPersistGate] ${item.kind}/${reason}`, e);
    }
  }
}

function onVisibility(): void {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    flushAll("visibility-hidden");
  }
}

function onPageHide(): void {
  flushAll("pagehide");
}

function armIdleSafety(): void {
  clearIdle();
  clearSafety();
  if (typeof requestIdleCallback !== "undefined") {
    const schedule = () => {
      idleHandle = requestIdleCallback(
        deadline => {
          idleHandle = null;
          if (pending.length === 0) return;
          if (
            (typeof document !== "undefined" && document.visibilityState === "hidden") ||
            deadline.timeRemaining() > 12 ||
            deadline.didTimeout
          ) {
            flushAll(deadline.didTimeout ? "idle-timeout-safety" : "idle");
            return;
          }
          schedule();
        },
        { timeout: LAUNCH_PERSIST_SAFETY_MS }
      ) as unknown as number;
    };
    schedule();
    return;
  }
  safetyTimer = setTimeout(() => flushAll("timeout-safety"), LAUNCH_PERSIST_SAFETY_MS);
}

function ensureListeners(): void {
  if (listenersArmed || typeof document === "undefined") return;
  listenersArmed = true;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  armIdleSafety();
}

/** Encola trabajo de launch; no usa setTimeout(28s). */
export function enqueueLaunchPersistWork(
  vehicleId: string,
  kind: LaunchPersistKind,
  run: () => void
): void {
  // Un solo pending por vehículo+kind (re-lanzamientos).
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
  disarmIfEmpty();
}

/** Solo tests. */
export function countLaunchPersistPendingForTests(): number {
  return pending.length;
}
