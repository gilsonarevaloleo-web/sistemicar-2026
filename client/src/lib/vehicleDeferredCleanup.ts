const DEFER_MS = 500;

let timer: ReturnType<typeof setTimeout> | null = null;
const pendingJobs: Array<() => void> = [];

function flushDeferredVehicleCleanupJobs(): void {
  timer = null;
  if (pendingJobs.length === 0) return;

  const jobs = pendingJobs.splice(0, pendingJobs.length);
  for (const job of jobs) {
    try {
      job();
    } catch {
      /* noop */
    }
  }
}

/** Coalesce mutaciones destructivas fuera del frame de snapshot. */
export function scheduleDeferredVehicleCleanup(job: () => void): void {
  pendingJobs.push(job);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushDeferredVehicleCleanupJobs, DEFER_MS);
}

export function resetDeferredVehicleCleanupForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pendingJobs.length = 0;
}

export const VEHICLE_DEFERRED_CLEANUP_MS = DEFER_MS;
