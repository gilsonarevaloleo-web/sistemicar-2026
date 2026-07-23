/**
 * Persist remoto post-lanzamiento SIN bomba a N segundos.
 *
 * Mover el delay (4→6→12→13→28) solo movía el congelamiento del reloj conquista.
 * Idle en foreground también disparaba el golpe ~00:00:03 entre ticks del reloj.
 *
 * Solo se vacía cuando el operador NO está mid-tick de medición:
 * - pestaña oculta / pagehide
 * - primer cierre de sub (Cumplido/Fallado): remote/pillars/centinela tras quiet window;
 *   **nunca** stringify local en ese flush (pelea con remount del reloj de la fila #2)
 * - red de seguridad a 3 min (setDoc async; no stringify forzado en foreground temprano)
 */

export type LaunchPersistKind = "remote" | "local" | "pillars" | "centinela";

type PendingLaunchWork = {
  vehicleId: string;
  kind: LaunchPersistKind;
  run: () => void;
};

const pending: PendingLaunchWork[] = [];
let listenersArmed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let deferredFlushHandles: Array<ReturnType<typeof setTimeout> | number> = [];

/** Red de seguridad — solo si nunca hubo oculto/cierre. */
export const LAUNCH_PERSIST_SAFETY_MS = 180_000;

/**
 * Tras CUMPLIDO/FALLADO el island de la siguiente fila necesita segundos quietos.
 * Flush launch a ≤1.2s (PR #13) aún clavaba el tick ~cupo (00:05:44 / 00:09:59).
 */
export const SUB_CLOSE_PERSIST_QUIET_MS = 15_000;

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

function flushVehicle(vehicleId: string, reason: string, kinds?: LaunchPersistKind[]): void {
  const keep: PendingLaunchWork[] = [];
  const runNow: PendingLaunchWork[] = [];
  const allow = kinds ? new Set(kinds) : null;
  for (const item of pending) {
    if (item.vehicleId === vehicleId && (!allow || allow.has(item.kind))) {
      runNow.push(item);
    } else {
      keep.push(item);
    }
  }
  pending.length = 0;
  pending.push(...keep);
  disarmIfEmpty();
  flushBatch(runNow, reason);
}

/** Descarta pending de un kind (p. ej. local en CUMPLIDO — el handler ya agenda su propio save). */
function dropVehicleKind(vehicleId: string, kind: LaunchPersistKind): void {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].vehicleId === vehicleId && pending[i].kind === kind) {
      pending.splice(i, 1);
    }
  }
  disarmIfEmpty();
}

function onVisibility(): void {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    flushAll("visibility-hidden");
  }
}

function onPageHide(): void {
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

/**
 * Sync — solo tests / pagehide paths que ya están fuera del gesto.
 * Preferir `flushLaunchPersistOnSubClose` en handlers de CUMPLIDO/FALLADO.
 */
export function flushLaunchPersistOnSubCloseSync(vehicleId: string): void {
  flushVehicle(vehicleId, "sub-close");
}

/**
 * Primer Cumplido/Fallado / cierre del desglosador.
 * - Descarta stringify `local` de launch (el cierre ya agenda su propio save).
 * - Remote/pillars/centinela tras quiet window — nunca en el stack del gesto ni a ≤1.2s.
 */
export function flushLaunchPersistOnSubClose(vehicleId: string): void {
  dropVehicleKind(vehicleId, "local");
  const run = () =>
    flushVehicle(vehicleId, "sub-close-quiet", ["remote", "pillars", "centinela"]);
  const t = setTimeout(run, SUB_CLOSE_PERSIST_QUIET_MS);
  deferredFlushHandles.push(t as unknown as number);
}

/** Solo tests. */
export function resetLaunchPersistGateForTests(): void {
  pending.length = 0;
  clearSafety();
  for (const h of deferredFlushHandles) {
    try {
      cancelAnimationFrame(h as number);
    } catch {
      /* noop */
    }
    try {
      clearTimeout(h as ReturnType<typeof setTimeout>);
    } catch {
      /* noop */
    }
    if (typeof cancelIdleCallback !== "undefined") {
      try {
        cancelIdleCallback(h as number);
      } catch {
        /* noop */
      }
    }
  }
  deferredFlushHandles = [];
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

/** Solo tests — cuenta por kind. */
export function countLaunchPersistPendingByKindForTests(kind: LaunchPersistKind): number {
  return pending.filter(p => p.kind === kind).length;
}
