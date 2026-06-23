/**
 * Sesión global de fetch de flota — cancela huérfanos al volver de background.
 */
export const FLOTA_FETCH_TIMEOUT_MS = 6_000;
export const VISIBILITY_RETURN_DEBOUNCE_MS = 800;

export type FlotaFetchStatus = "idle" | "loading" | "ready" | "timeout";

type StatusListener = () => void;
type ReturnListener = () => void;

let flotaGeneration = 0;
let flotaAbort: AbortController | null = null;
let flotaStatus: FlotaFetchStatus = "idle";
let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<StatusListener>();
const returnListeners = new Set<ReturnListener>();

let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityHookInstalled = false;

function setFlotaStatus(next: FlotaFetchStatus): void {
  if (flotaStatus === next) return;
  flotaStatus = next;
  statusListeners.forEach(fn => fn());
}

export function subscribeFlotaFetchStatus(cb: StatusListener): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function getFlotaFetchStatus(): FlotaFetchStatus {
  return flotaStatus;
}

export function cancelFlotaFetch(): void {
  flotaAbort?.abort();
  flotaAbort = null;
  if (activeTimeoutId != null) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }
}

/** Invalida fetch anterior y abre sesión nueva. */
export function beginFlotaFetch(): { generation: number; signal: AbortSignal } {
  cancelFlotaFetch();
  flotaGeneration += 1;
  flotaAbort = new AbortController();
  setFlotaStatus("loading");
  return { generation: flotaGeneration, signal: flotaAbort.signal };
}

export function isFlotaFetchCurrent(generation: number): boolean {
  return generation === flotaGeneration && !flotaAbort?.signal.aborted;
}

export function completeFlotaFetch(generation: number): void {
  if (generation !== flotaGeneration) return;
  cancelFlotaFetch();
  flotaGeneration += 1;
  setFlotaStatus("ready");
}

export function failFlotaFetchTimeout(generation: number): void {
  if (generation !== flotaGeneration) return;
  cancelFlotaFetch();
  flotaGeneration += 1;
  setFlotaStatus("timeout");
}

export function getFlotaFetchGeneration(): number {
  return flotaGeneration;
}

/** Arranca timeout duro — si sigue loading a los 6s → timeout. */
export function armFlotaFetchTimeout(generation: number): void {
  if (activeTimeoutId != null) clearTimeout(activeTimeoutId);
  activeTimeoutId = setTimeout(() => {
    activeTimeoutId = null;
    if (isFlotaFetchCurrent(generation) && flotaStatus === "loading") {
      failFlotaFetchTimeout(generation);
    }
  }, FLOTA_FETCH_TIMEOUT_MS);
}

export function retryFlotaFetch(): { generation: number; signal: AbortSignal } {
  const session = beginFlotaFetch();
  armFlotaFetchTimeout(session.generation);
  return session;
}

function flushVisibilityReturn(): void {
  returnListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

/** Solo tests — simula visibility visible sin document. */
export function queueVisibilityReturnForTests(): void {
  if (visibilityDebounceTimer != null) clearTimeout(visibilityDebounceTimer);
  visibilityDebounceTimer = setTimeout(() => {
    visibilityDebounceTimer = null;
    flushVisibilityReturn();
  }, VISIBILITY_RETURN_DEBOUNCE_MS);
}

function installVisibilityHook(): void {
  if (visibilityHookInstalled || typeof document === "undefined") return;
  visibilityHookInstalled = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      cancelFlotaFetch();
      if (visibilityDebounceTimer != null) {
        clearTimeout(visibilityDebounceTimer);
        visibilityDebounceTimer = null;
      }
      return;
    }

    if (visibilityDebounceTimer != null) clearTimeout(visibilityDebounceTimer);
    visibilityDebounceTimer = setTimeout(() => {
      visibilityDebounceTimer = null;
      flushVisibilityReturn();
    }, VISIBILITY_RETURN_DEBOUNCE_MS);
  });
}

/** Debounce 800ms — solo el último app-switch dispara retorno. */
export function onJornadaVisibilityReturn(handler: ReturnListener): () => void {
  installVisibilityHook();
  returnListeners.add(handler);
  return () => returnListeners.delete(handler);
}

/** Solo tests — reinicia estado global. */
export function resetJornadaFlotaFetchForTests(): void {
  cancelFlotaFetch();
  flotaGeneration = 0;
  flotaStatus = "idle";
  statusListeners.clear();
  returnListeners.clear();
  if (visibilityDebounceTimer != null) {
    clearTimeout(visibilityDebounceTimer);
    visibilityDebounceTimer = null;
  }
  visibilityHookInstalled = false;
}
