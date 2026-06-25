/** Candado temporal contra ecos de Firebase durante mutaciones locales (create/close/delete). */

const LOCK_MS = 1500;
const STRUCTURAL_CLOSE_RELEASE_DELAY_MS = 300;

let lockUntil = 0;
let lockReason: string | undefined;
let closeInTransitUntil = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

export function beginLocalVehicleMutation(reason?: string): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  lockUntil = Date.now() + LOCK_MS;
  lockReason = reason;
}

export function extendLocalVehicleMutation(reason?: string): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  lockUntil = Date.now() + LOCK_MS;
  if (reason) lockReason = reason;
}

export function isLocalVehicleMutationLocked(): boolean {
  return Date.now() < lockUntil;
}

/** Cierre estructural (desglosador / flota) en tránsito — bloquea pintado reactivo del store. */
export function markStructuralCloseInTransit(durationMs = LOCK_MS + STRUCTURAL_CLOSE_RELEASE_DELAY_MS): void {
  closeInTransitUntil = Date.now() + durationMs;
}

export function isStructuralCloseInTransit(): boolean {
  return Date.now() < closeInTransitUntil;
}

/**
 * Gracia post-cierre: mantiene el lock activo `delayMs` antes de liberar,
 * para que React desmonte la vista de ciclo sin cruzarse con el eco de red.
 */
export function releaseMutationLockWithDelay(delayMs = STRUCTURAL_CLOSE_RELEASE_DELAY_MS): void {
  if (releaseTimer != null) clearTimeout(releaseTimer);
  const releaseAt = Date.now() + delayMs;
  lockUntil = releaseAt;
  closeInTransitUntil = releaseAt;
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    lockUntil = 0;
    closeInTransitUntil = 0;
    lockReason = undefined;
  }, delayMs);
}

export function getLocalMutationLockDebug(): { until: number; reason?: string; closeInTransitUntil: number } {
  return { until: lockUntil, reason: lockReason, closeInTransitUntil };
}

/** Expuesto para tests con fake timers. */
export function resetLocalVehicleMutationLockForTests(): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  lockUntil = 0;
  lockReason = undefined;
  closeInTransitUntil = 0;
}

export const LOCAL_VEHICLE_MUTATION_LOCK_MS = LOCK_MS;
