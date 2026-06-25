/** Candado temporal contra ecos de Firebase durante mutaciones locales (create/close/delete). */

const LOCK_MS = 1500;
const STRUCTURAL_CLOSE_RELEASE_DELAY_MS = 300;
/** Ráfagas <100 ms comparten techo absoluto — imposible postergar el release indefinidamente. */
const BURST_GAP_MS = 100;
const ABSOLUTE_LOCK_CAP_MS = LOCK_MS + STRUCTURAL_CLOSE_RELEASE_DELAY_MS;

let lockUntil = 0;
let lockReason: string | undefined;
let closeInTransitUntil = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledReleaseAt = 0;
let lockBurstStartedAt = 0;
let lastLockRequestAt = 0;

function noteLockBurst(): void {
  const now = Date.now();
  if (lockBurstStartedAt === 0 || now - lastLockRequestAt > BURST_GAP_MS) {
    lockBurstStartedAt = now;
  }
  lastLockRequestAt = now;
}

function absoluteLockCeiling(): number {
  if (lockBurstStartedAt === 0) return Date.now() + LOCK_MS;
  return lockBurstStartedAt + ABSOLUTE_LOCK_CAP_MS;
}

function capLockUntil(requestedUntil: number): number {
  return Math.min(requestedUntil, absoluteLockCeiling());
}

function finalizeMutationLockRelease(): void {
  releaseTimer = null;
  scheduledReleaseAt = 0;
  lockUntil = 0;
  closeInTransitUntil = 0;
  lockReason = undefined;
  lockBurstStartedAt = 0;
}

function scheduleReleaseAt(releaseAt: number, rapidFollowUp = false): void {
  const now = Date.now();
  const capped = capLockUntil(releaseAt);
  if (capped <= now) {
    finalizeMutationLockRelease();
    return;
  }

  if (releaseTimer != null && scheduledReleaseAt > 0 && rapidFollowUp && scheduledReleaseAt <= capped) {
    lockUntil = Math.max(lockUntil, now);
    lockUntil = Math.min(lockUntil, scheduledReleaseAt);
    closeInTransitUntil = Math.min(closeInTransitUntil || capped, scheduledReleaseAt);
    return;
  }

  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }

  scheduledReleaseAt = capped;
  lockUntil = capped;
  closeInTransitUntil = Math.min(closeInTransitUntil || capped, capped);
  releaseTimer = setTimeout(finalizeMutationLockRelease, capped - now);
}

function applyMutationLock(requestedUntil: number, reason?: string): void {
  const now = Date.now();
  const rapidFollowUp = now - lastLockRequestAt <= BURST_GAP_MS && lastLockRequestAt > 0;
  noteLockBurst();
  const capped = capLockUntil(Math.max(requestedUntil, now + LOCK_MS));
  lockUntil = capped;
  if (reason) lockReason = reason;
  if (releaseTimer != null && rapidFollowUp) return;
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
    scheduledReleaseAt = 0;
  }
}

export function beginLocalVehicleMutation(reason?: string): void {
  applyMutationLock(Date.now() + LOCK_MS, reason);
}

export function extendLocalVehicleMutation(reason?: string): void {
  applyMutationLock(Math.max(lockUntil, Date.now() + LOCK_MS), reason);
}

export function isLocalVehicleMutationLocked(): boolean {
  const now = Date.now();
  if (lockUntil > 0 && now >= lockUntil && releaseTimer == null) {
    lockUntil = 0;
    lockReason = undefined;
    if (closeInTransitUntil > 0 && now >= closeInTransitUntil) {
      closeInTransitUntil = 0;
    }
  }
  return now < lockUntil;
}

/** Candado síncrono al despertar desde background — absorbe ráfaga Firebase sin pintar React. */
export function armBackgroundWakeReentryShield(ms = 800): void {
  const until = Date.now() + ms;
  if (until > lockUntil) {
    lockUntil = until;
    lockReason = "background-wake";
  }
}

/** Libera solo el escudo de reentrada si sigue activo (p. ej. tras fallo de flush). */
export function clearBackgroundWakeReentryShieldIfActive(): void {
  if (lockReason === "background-wake" && releaseTimer == null) {
    lockUntil = 0;
    lockReason = undefined;
  }
}

/** Cierre estructural (desglosador / flota) en tránsito — bloquea pintado reactivo del store. */
export function markStructuralCloseInTransit(durationMs = LOCK_MS + STRUCTURAL_CLOSE_RELEASE_DELAY_MS): void {
  noteLockBurst();
  closeInTransitUntil = capLockUntil(Date.now() + durationMs);
}

export function isStructuralCloseInTransit(): boolean {
  const now = Date.now();
  if (closeInTransitUntil > 0 && now >= closeInTransitUntil) {
    closeInTransitUntil = 0;
  }
  return now < closeInTransitUntil;
}

/**
 * Gracia post-cierre: mantiene el lock activo `delayMs` antes de liberar,
 * para que React desmonte la vista de ciclo sin cruzarse con el eco de red.
 */
export function releaseMutationLockWithDelay(delayMs = STRUCTURAL_CLOSE_RELEASE_DELAY_MS): void {
  noteLockBurst();
  const releaseAt = capLockUntil(Date.now() + delayMs);
  lockUntil = releaseAt;
  closeInTransitUntil = releaseAt;
  scheduleReleaseAt(releaseAt);
}

export function getLocalMutationLockDebug(): { until: number; reason?: string; closeInTransitUntil: number } {
  return { until: lockUntil, reason: lockReason, closeInTransitUntil };
}

function clearMutationLockState(): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  scheduledReleaseAt = 0;
  lockBurstStartedAt = 0;
  lastLockRequestAt = 0;
  lockUntil = 0;
  lockReason = undefined;
  closeInTransitUntil = 0;
}

/** Pulso del reloj global — libera candados huérfanos cuyo TTL ya venció en caliente. */
export function sweepExpiredMutationLocks(): boolean {
  const { until, closeInTransitUntil: closeUntil } = getLocalMutationLockDebug();
  const now = Date.now();
  const lockExpired = until > 0 && now > until;
  const closeExpired = closeUntil > 0 && now > closeUntil;
  if (!lockExpired && !closeExpired) return false;
  forceResetOrphanMutationLocks();
  return true;
}

/**
 * Reset inmediato de candados huérfanos (p. ej. al salir de un módulo sin endClose).
 * No aplica gracia post-cierre — solo para rutas sin UI de mutación activa.
 */
export function forceResetOrphanMutationLocks(): void {
  clearMutationLockState();
}

/** Expuesto para tests con fake timers. */
export function resetLocalVehicleMutationLockForTests(): void {
  clearMutationLockState();
}

/** Simula candado huérfano (lockUntil residual sin releaseTimer). Solo tests. */
export function simulateOrphanMutationLockForTests(expiredSinceMs = 1): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  scheduledReleaseAt = 0;
  const expiredAt = Date.now() - expiredSinceMs;
  lockUntil = expiredAt;
  closeInTransitUntil = expiredAt;
  lockReason = "test-orphan";
}

export const LOCAL_VEHICLE_MUTATION_LOCK_MS = LOCK_MS;
