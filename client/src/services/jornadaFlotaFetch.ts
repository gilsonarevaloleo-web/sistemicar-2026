/**
 * Sesión global de fetch de flota — cancela huérfanos al volver de background.
 */
export const FLOTA_FETCH_TIMEOUT_MS = 6_000;
export const VISIBILITY_RETURN_DEBOUNCE_MS = 800;
export const FLOTA_STALE_ACCEPT_MS = 6_000;
export const FLOTA_VISIBILITY_REFETCH_MS = 5_000;

export type FlotaFetchStatus = "idle" | "loading" | "ready" | "timeout";

type StatusListener = () => void;
type ReturnListener = () => void;
type StaleRefetchListener = () => void;

let flotaGeneration = 0;
let flotaAbort: AbortController | null = null;
let flotaStatus: FlotaFetchStatus = "idle";
let loadingStartMs = 0;
let paintedVehicleCount = 0;
let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<StatusListener>();
const returnListeners = new Set<ReturnListener>();
const staleRefetchListeners = new Set<StaleRefetchListener>();

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

export function getFlotaLoadingAgeMs(): number {
  return loadingStartMs > 0 ? Date.now() - loadingStartMs : 0;
}

export function setFlotaPaintedCount(count: number): void {
  paintedVehicleCount = Math.max(0, count);
}

export function getFlotaPaintedCount(): number {
  return paintedVehicleCount;
}

export function cancelFlotaFetch(): void {
  flotaAbort?.abort();
  flotaAbort = null;
  if (activeTimeoutId != null) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }
}

export type BeginFlotaFetchOptions = {
  /** Ya pintamos desde localStorage — no volver a skeleton. */
  hasOptimisticPaint?: boolean;
};

/** Invalida fetch anterior y abre sesión nueva. */
export function beginFlotaFetch(
  opts?: BeginFlotaFetchOptions
): { generation: number; signal: AbortSignal } {
  cancelFlotaFetch();
  flotaGeneration += 1;
  flotaAbort = new AbortController();
  loadingStartMs = Date.now();
  if (!opts?.hasOptimisticPaint) {
    setFlotaStatus("loading");
  } else {
    setFlotaStatus("ready");
  }
  return { generation: flotaGeneration, signal: flotaAbort.signal };
}

export function isFlotaFetchCurrent(generation: number): boolean {
  return generation === flotaGeneration && !flotaAbort?.signal.aborted;
}

/** Acepta respuesta tardía si el usuario ya esperó >6s. */
export function shouldAcceptFlotaFetchResponse(generation: number): boolean {
  if (isFlotaFetchCurrent(generation)) return true;
  return getFlotaLoadingAgeMs() > FLOTA_STALE_ACCEPT_MS;
}

export function completeFlotaFetch(generation: number): void {
  if (!shouldAcceptFlotaFetchResponse(generation)) return;
  if (getFlotaLoadingAgeMs() > FLOTA_STALE_ACCEPT_MS && generation !== flotaGeneration) {
    console.warn("[flota] respuesta tardía gen", generation);
  }
  cancelFlotaFetch();
  flotaGeneration += 1;
  setFlotaStatus("ready");
}

export function failFlotaFetchTimeout(generation: number): void {
  if (generation !== flotaGeneration) return;
  if (paintedVehicleCount > 0) {
    cancelFlotaFetch();
    flotaGeneration += 1;
    setFlotaStatus("ready");
    return;
  }
  cancelFlotaFetch();
  flotaGeneration += 1;
  setFlotaStatus("timeout");
}

export function getFlotaFetchGeneration(): number {
  return flotaGeneration;
}

/** Timeout duro: solo timeout si no hay vehículos pintados. */
export function armFlotaFetchTimeout(generation: number): void {
  if (activeTimeoutId != null) clearTimeout(activeTimeoutId);
  activeTimeoutId = setTimeout(() => {
    activeTimeoutId = null;
    if (isFlotaFetchCurrent(generation) && flotaStatus === "loading") {
      failFlotaFetchTimeout(generation);
    }
  }, FLOTA_FETCH_TIMEOUT_MS);
}

export function retryFlotaFetch(opts?: BeginFlotaFetchOptions): {
  generation: number;
  signal: AbortSignal;
} {
  const session = beginFlotaFetch(opts);
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

function flushStaleLoadingRefetch(): void {
  if (flotaStatus !== "loading" || getFlotaLoadingAgeMs() < FLOTA_VISIBILITY_REFETCH_MS) return;
  console.log("[flota] refetch al volver de background");
  staleRefetchListeners.forEach(fn => {
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
    flushStaleLoadingRefetch();
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
      flushStaleLoadingRefetch();
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

/** Refetch si loading >5s al volver visible. */
export function onFlotaStaleLoadingRefetch(handler: StaleRefetchListener): () => void {
  installVisibilityHook();
  staleRefetchListeners.add(handler);
  return () => staleRefetchListeners.delete(handler);
}

/** Solo tests — reinicia estado global. */
export function resetJornadaFlotaFetchForTests(): void {
  cancelFlotaFetch();
  flotaGeneration = 0;
  flotaStatus = "idle";
  loadingStartMs = 0;
  paintedVehicleCount = 0;
  statusListeners.clear();
  returnListeners.clear();
  staleRefetchListeners.clear();
  if (visibilityDebounceTimer != null) {
    clearTimeout(visibilityDebounceTimer);
    visibilityDebounceTimer = null;
  }
  visibilityHookInstalled = false;
}
