/**
 * Reconcile de vehículos fantasma bajo demanda (debounced).
 * Evita trabajo en background cada 60 s que bloqueaba el hilo principal en móvil.
 */
import { reconcileGhostActiveVehicles } from "./persistence";
import { runShadowTaskAsync } from "./desglosadorShadow";

const DEFAULT_DEBOUNCE_MS = 1_500;
const POST_LAUNCH_SUPPRESS_MS = 8_000;
const MIN_INTERVAL_MS = 45_000;

let lastRunAt = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUserId: string | null = null;
let inFlight = false;
let suppressUntilMs = 0;

async function runGhostReconcile(userId: string, force: boolean): Promise<string[]> {
  if (inFlight) return [];
  const now = Date.now();
  if (!force && now - lastRunAt < MIN_INTERVAL_MS) return [];
  if (!force && now < suppressUntilMs) return [];

  inFlight = true;
  try {
    lastRunAt = now;
    return await reconcileGhostActiveVehicles(userId);
  } finally {
    inFlight = false;
  }
}

function flushScheduled(force: boolean): void {
  debounceTimer = null;
  const userId = pendingUserId;
  pendingUserId = null;
  if (!userId) return;
  if (!force && Date.now() < suppressUntilMs) return;
  runShadowTaskAsync(() => {
    void runGhostReconcile(userId, force);
  });
}

/** Tras lanzar desglosador Conquista — evita getDocs completo en t+1.5s. */
export function suppressGhostReconcileForMs(ms: number): void {
  suppressUntilMs = Math.max(suppressUntilMs, Date.now() + ms);
}

export function suppressGhostReconcileAfterLaunch(): void {
  suppressGhostReconcileForMs(POST_LAUNCH_SUPPRESS_MS);
}

/** Tras abrir/cerrar vehículo consciente — no en render ni en intervalos de UI. */
export function requestGhostReconcileAfterVehicleAction(
  userId: string,
  opts?: { force?: boolean; deferMs?: number }
): void {
  pendingUserId = userId;
  if (debounceTimer) clearTimeout(debounceTimer);
  const delay = opts?.deferMs ?? DEFAULT_DEBOUNCE_MS;
  debounceTimer = setTimeout(() => flushScheduled(opts?.force === true), delay);
}

/** Cambio de día-jornada u otras señales puntuales. */
export function requestGhostReconcileForced(userId: string): void {
  pendingUserId = userId;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => flushScheduled(true), 0);
}

export function resetGhostReconcileSchedulerForTests(): void {
  lastRunAt = 0;
  pendingUserId = null;
  inFlight = false;
  suppressUntilMs = 0;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}
