/** Debounce de escritura local de flota — sin dependencias Firebase. */

import { runWhenOrientationSettled } from "./orientationQuietGate";

export const LOCAL_VEHICLES_DEBOUNCE_MS = 500;

let pendingWrite: (() => boolean) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInit = false;

export function scheduleDebouncedWrite(
  writeFn: () => boolean,
  delayMs = LOCAL_VEHICLES_DEBOUNCE_MS
): void {
  pendingWrite = writeFn;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const fn = pendingWrite;
    pendingWrite = null;
    fn?.();
  }, delayMs);
}

export function flushDebouncedWrite(fallbackWrite?: () => boolean): boolean {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const fn = fallbackWrite ?? pendingWrite;
  pendingWrite = null;
  return fn ? fn() : true;
}

export function hasPendingDebouncedWrite(): boolean {
  return pendingWrite != null || saveTimer != null;
}

export function resetDebouncedWriteState(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pendingWrite = null;
}

export function initLocalVehiclesFlushListeners(flushPending: () => void): void {
  if (listenersInit || typeof window === "undefined") return;
  listenersInit = true;
  const flushSettled = () => runWhenOrientationSettled(flushPending);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSettled();
  });
  window.addEventListener("beforeunload", flushPending);
  window.addEventListener("pagehide", flushSettled);
}
