/**
 * Fuente de verdad única de la flota — un solo subscribeToVehicles por sesión de usuario.
 */
import {
  getLocalVehicles,
  subscribeToVehicles,
  type Vehicle,
} from "@/lib/persistence";
import {
  armBackgroundWakeReentryShield,
  clearBackgroundWakeReentryShieldIfActive,
  forceResetOrphanMutationLocks,
  getLocalMutationLockDebug,
  isLocalVehicleMutationLocked,
  isStructuralCloseInTransit,
  LOCAL_VEHICLE_MUTATION_LOCK_MS,
} from "@/lib/localMutationLock";
import { reconcileVehicleListView } from "@/lib/vehicleSessionAuthority";
import { preferLocalSubTareasInVehicleList } from "@/lib/situacionSessionMerge";
import { vehiclesReactiveSignature } from "@/lib/situacionRepair";
import { writeLocalFlota } from "@/services/jornadaFlotaCache";
import {
  armFlotaFetchTimeout,
  beginFlotaFetch,
  completeFlotaFetch,
  getFlotaFetchStatus,
  setFlotaPaintedCount,
  shouldAcceptFlotaFetchResponse,
} from "@/services/jornadaFlotaFetch";

export type FlotaSyncStatus = "idle" | "loading" | "ready" | "timeout";

export type FlotaMergeContext = {
  userId: string;
  getOptimisticPending: () => Vehicle[];
  /** Fuentes locales adicionales (p.ej. vehiclesRef de Jornada). */
  getExtraLocalSources: () => Vehicle[];
  isCloseInFlight: (vehicleId: string) => boolean;
  /** Tras merge remoto exitoso (p.ej. cleanup de desglosador huérfano). */
  onAfterRemoteMerge?: (merged: Vehicle[]) => void;
};

type StoreListener = () => void;

let userId: string | null = null;
let vehicles: Vehicle[] = [];
let mergedSig = "";
/** Parse de localStorage una vez por sesión — evita JSON.parse en cada snapshot. */
let localCache: Vehicle[] | null = null;
let refCount = 0;
let unsubFirebase: (() => void) | null = null;
let mergeContext: FlotaMergeContext | null = null;
let fetchGeneration = 0;
let deferredMergeTimer: ReturnType<typeof setTimeout> | null = null;
let deferredMergeForceTimer: ReturnType<typeof setTimeout> | null = null;
/** Inicio del primer defer — TTL estricto aunque extendLocalVehicleMutation renueve el lock. */
let deferredMergeFirstAt = 0;
let syncReadyFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let pendingIncoming: { data: Vehicle[]; generation: number } | null = null;

const DEFERRED_MERGE_MAX_WAIT_MS = LOCAL_VEHICLE_MUTATION_LOCK_MS;
let vehiclesUpdatedHandler: (() => void) | null = null;
let deferredMergeWakeHandler: (() => void) | null = null;
let backgroundWakeFlushTimer: ReturnType<typeof setTimeout> | null = null;
let lastDocumentVisibility: DocumentVisibilityState | null = null;

const BACKGROUND_WAKE_SHIELD_MS = 800;

const listeners = new Set<StoreListener>();

function notify(): void {
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

function hydrateLocalCache(): Vehicle[] {
  if (localCache === null) {
    localCache = getLocalVehicles();
  }
  return localCache;
}

function syncLocalCache(next: Vehicle[]): void {
  localCache = next;
}

/** Fuentes locales para merge — memoria del store; sin JSON.parse repetido. */
function getLocalSourcesForMerge(ctx: FlotaMergeContext | null): Vehicle[] {
  const base = vehicles.length > 0 ? vehicles : hydrateLocalCache();
  if (!ctx) return base;
  const extra = ctx.getExtraLocalSources();
  if (extra.length === 0) return base;
  const seen = new Set(base.map(v => v.id));
  const merged = [...base];
  for (const v of extra) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      merged.push(v);
    }
  }
  return merged;
}

function setVehiclesInternal(next: Vehicle[], opts?: { skipNotify?: boolean }): void {
  vehicles = next;
  syncLocalCache(next);
  mergedSig = vehiclesReactiveSignature(next);
  if (!opts?.skipNotify) notify();
}

/** Actualiza búfer interno + firma sin disparar listeners de React (mutation lock activo). */
function setVehiclesBufferOnly(next: Vehicle[]): void {
  vehicles = next;
  syncLocalCache(next);
  mergedSig = vehiclesReactiveSignature(next);
}

export function getFlotaVehicles(): Vehicle[] {
  return vehicles;
}

export function getFlotaMergedSignature(): string {
  return mergedSig;
}

/**
 * Guardián de autolimpieza — pulso del reloj global (1 s).
 * Libera candados cuyo TTL venció sin timer activo (candado perpetuo en caliente).
 */
export function runFlotaMutationLockGuardian(): void {
  const { until, closeInTransitUntil } = getLocalMutationLockDebug();
  const now = Date.now();
  if ((until > 0 && now > until) || (closeInTransitUntil > 0 && now > closeInTransitUntil)) {
    console.warn(
      "[FlotaStore] Guardián activado: Detectado candado residual expirado en caliente. Forzando liberación."
    );
    forceResetOrphanMutationLocks();
    flushFlotaDeferredMergeIfReady();
  }
}

export function subscribeFlotaStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFlotaVehicles(
  update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])
): void {
  const next = typeof update === "function" ? update(vehicles) : update;
  setVehiclesInternal(next);
  setFlotaPaintedCount(next.length);
}

export function registerFlotaMergeContext(ctx: FlotaMergeContext | null): void {
  mergeContext = ctx;
}

/** Marca fetch listo — siempre, incluso con mutation lock activo. */
export function markSyncReady(generation: number): void {
  setFlotaPaintedCount(vehicles.length);
  completeFlotaFetch(generation);
}

function clearSyncReadyFallback(): void {
  if (syncReadyFallbackTimer != null) {
    clearTimeout(syncReadyFallbackTimer);
    syncReadyFallbackTimer = null;
  }
}

/** Cierra skeleton si snapshots de red quedan bloqueados (lock / caché Firebase). */
function armSyncReadyFallback(generation: number): void {
  clearSyncReadyFallback();
  syncReadyFallbackTimer = setTimeout(() => {
    syncReadyFallbackTimer = null;
    if (!shouldAcceptFlotaFetchResponse(generation)) return;
    if (getFlotaFetchStatus() !== "loading") return;
    markSyncReady(generation);
  }, LOCAL_VEHICLE_MUTATION_LOCK_MS + 100);
}

function clearDeferredMerge(): void {
  if (deferredMergeTimer != null) {
    clearTimeout(deferredMergeTimer);
    deferredMergeTimer = null;
  }
  if (deferredMergeForceTimer != null) {
    clearTimeout(deferredMergeForceTimer);
    deferredMergeForceTimer = null;
  }
  pendingIncoming = null;
  deferredMergeFirstAt = 0;
}

function forceDeferredMerge(): void {
  const pending = pendingIncoming;
  if (deferredMergeTimer != null) {
    clearTimeout(deferredMergeTimer);
    deferredMergeTimer = null;
  }
  if (deferredMergeForceTimer != null) {
    clearTimeout(deferredMergeForceTimer);
    deferredMergeForceTimer = null;
  }
  pendingIncoming = null;
  deferredMergeFirstAt = 0;
  if (!pending) return;
  if (!shouldAcceptFlotaFetchResponse(pending.generation)) return;
  applyIncomingSnapshot(pending.data, pending.generation, { force: true });
}

function clearBackgroundWakeFlushTimer(): void {
  if (backgroundWakeFlushTimer != null) {
    clearTimeout(backgroundWakeFlushTimer);
    backgroundWakeFlushTimer = null;
  }
}

/** Al volver de segundo plano: disyuntor si el TTL desde el primer defer ya venció. */
export function flushFlotaDeferredMergeIfReady(opts?: { force?: boolean }): void {
  if (!pendingIncoming) return;
  if (opts?.force) {
    forceDeferredMerge();
    return;
  }
  const elapsed = deferredMergeFirstAt > 0 ? Date.now() - deferredMergeFirstAt : 0;
  if (elapsed >= DEFERRED_MERGE_MAX_WAIT_MS) {
    forceDeferredMerge();
    return;
  }
  if (!isLocalVehicleMutationLocked()) {
    const pending = pendingIncoming;
    pendingIncoming = null;
    deferredMergeFirstAt = 0;
    if (deferredMergeTimer != null) {
      clearTimeout(deferredMergeTimer);
      deferredMergeTimer = null;
    }
    if (deferredMergeForceTimer != null) {
      clearTimeout(deferredMergeForceTimer);
      deferredMergeForceTimer = null;
    }
    if (!shouldAcceptFlotaFetchResponse(pending.generation)) return;
    applyIncomingSnapshot(pending.data, pending.generation);
  }
}

function scheduleDeferredMerge(data: Vehicle[], generation: number): void {
  pendingIncoming = { data, generation };
  const now = Date.now();
  if (deferredMergeFirstAt === 0) deferredMergeFirstAt = now;

  const ttlRemaining = DEFERRED_MERGE_MAX_WAIT_MS - (now - deferredMergeFirstAt);
  if (ttlRemaining <= 0) {
    forceDeferredMerge();
    return;
  }

  if (deferredMergeForceTimer == null) {
    deferredMergeForceTimer = setTimeout(forceDeferredMerge, ttlRemaining);
  }

  if (deferredMergeTimer != null) return;

  deferredMergeTimer = setTimeout(() => {
    deferredMergeTimer = null;
    if (!isLocalVehicleMutationLocked()) {
      const pending = pendingIncoming;
      pendingIncoming = null;
      deferredMergeFirstAt = 0;
      if (deferredMergeForceTimer != null) {
        clearTimeout(deferredMergeForceTimer);
        deferredMergeForceTimer = null;
      }
      if (!pending) return;
      if (!shouldAcceptFlotaFetchResponse(pending.generation)) return;
      applyIncomingSnapshot(pending.data, pending.generation);
      return;
    }
    const elapsed = Date.now() - deferredMergeFirstAt;
    const wait = Math.max(0, DEFERRED_MERGE_MAX_WAIT_MS - elapsed);
    if (wait === 0) {
      forceDeferredMerge();
    } else {
      deferredMergeTimer = setTimeout(forceDeferredMerge, wait);
    }
  }, LOCAL_VEHICLE_MUTATION_LOCK_MS + 50);
}

type ApplySnapshotOpts = { duringMutationLock?: boolean; force?: boolean };

function applyIncomingSnapshot(
  data: Vehicle[],
  generation: number,
  opts?: ApplySnapshotOpts
): void {
  const ctx = mergeContext;
  const current = vehicles;

  let merged: Vehicle[];
  if (ctx) {
    const firebaseIds = new Set(data.map(v => v.id));
    const pending = ctx.getOptimisticPending().filter(ov => !firebaseIds.has(ov.id));
    const localSources = getLocalSourcesForMerge(ctx);
    const mergedRaw = reconcileVehicleListView({
      incoming: data,
      localSources,
      optimisticPending: pending,
      isCloseInFlight: ctx.isCloseInFlight,
    });
    merged = preferLocalSubTareasInVehicleList(mergedRaw, current);
  } else {
    merged = data.length > 0 ? data : current;
  }

  const sig = vehiclesReactiveSignature(merged);
  const uid = ctx?.userId ?? userId;
  const lockActive = isLocalVehicleMutationLocked();
  const silentBuffer = opts?.duringMutationLock === true && lockActive && opts?.force !== true;

  // FASE 1: búfer silencioso — disco + memoria interna, sin hook reactivo
  if (silentBuffer) {
    if (uid && merged.length > 0) {
      writeLocalFlota(uid, merged);
    }
    setVehiclesBufferOnly(merged);
    markSyncReady(generation);
    return;
  }

  if (uid && merged.length > 0 && sig !== mergedSig) {
    writeLocalFlota(uid, merged);
    syncLocalCache(merged);
  }

  if (sig === mergedSig && !opts?.force) {
    markSyncReady(generation);
    return;
  }

  const localSig = vehiclesReactiveSignature(current);
  if (!opts?.force && sig !== localSig && localSig === mergedSig) {
    markSyncReady(generation);
    return;
  }

  // Filtro de transición: cierre estructural en tránsito — búfer sin notify
  if (isStructuralCloseInTransit() && !opts?.force) {
    if (uid && merged.length > 0) {
      writeLocalFlota(uid, merged);
    }
    setVehiclesBufferOnly(merged);
    markSyncReady(generation);
    return;
  }

  setVehiclesInternal(merged);
  setFlotaPaintedCount(merged.length);
  ctx?.onAfterRemoteMerge?.(merged);
  markSyncReady(generation);
}

function handleIncomingSnapshot(data: Vehicle[], generation: number): void {
  if (!shouldAcceptFlotaFetchResponse(generation)) return;

  if (isLocalVehicleMutationLocked()) {
    applyIncomingSnapshot(data, generation, { duringMutationLock: true });
    scheduleDeferredMerge(data, generation);
    return;
  }

  clearDeferredMerge();
  applyIncomingSnapshot(data, generation);
}

function installDeferredMergeWakeBridge(): void {
  if (deferredMergeWakeHandler || typeof document === "undefined") return;
  lastDocumentVisibility = document.visibilityState;
  deferredMergeWakeHandler = () => {
    const prev = lastDocumentVisibility;
    const next = document.visibilityState;
    lastDocumentVisibility = next;
    if (next !== "visible") return;
    if (prev !== "hidden" && prev !== "prerender") return;

    armBackgroundWakeReentryShield(BACKGROUND_WAKE_SHIELD_MS);

    clearBackgroundWakeFlushTimer();
    backgroundWakeFlushTimer = setTimeout(() => {
      backgroundWakeFlushTimer = null;
      try {
        flushFlotaDeferredMergeIfReady({ force: true });
      } catch (err) {
        console.warn("[flotaStore] background-wake flush failed:", err);
        clearDeferredMerge();
        clearBackgroundWakeReentryShieldIfActive();
      }
    }, BACKGROUND_WAKE_SHIELD_MS);
  };
  document.addEventListener("visibilitychange", deferredMergeWakeHandler);
}

function uninstallDeferredMergeWakeBridge(): void {
  if (!deferredMergeWakeHandler || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", deferredMergeWakeHandler);
  deferredMergeWakeHandler = null;
  lastDocumentVisibility = null;
  clearBackgroundWakeFlushTimer();
}

function installVehiclesUpdatedBridge(): void {
  if (vehiclesUpdatedHandler || typeof window === "undefined") return;
  vehiclesUpdatedHandler = () => {
    if (isLocalVehicleMutationLocked()) return;
    const disk = getLocalVehicles();
    syncLocalCache(disk);
    if (vehicles.length === 0 && disk.length > 0) {
      setVehiclesInternal(disk);
      setFlotaPaintedCount(disk.length);
    }
  };
  window.addEventListener("vehicles-updated", vehiclesUpdatedHandler);
}

function uninstallVehiclesUpdatedBridge(): void {
  if (!vehiclesUpdatedHandler || typeof window === "undefined") return;
  window.removeEventListener("vehicles-updated", vehiclesUpdatedHandler);
  vehiclesUpdatedHandler = null;
}

function stopFirebaseSubscription(): void {
  unsubFirebase?.();
  unsubFirebase = null;
  clearDeferredMerge();
  clearBackgroundWakeFlushTimer();
  clearSyncReadyFallback();
  uninstallVehiclesUpdatedBridge();
  uninstallDeferredMergeWakeBridge();
}

function startFirebaseSubscription(uid: string): void {
  stopFirebaseSubscription();
  installVehiclesUpdatedBridge();
  installDeferredMergeWakeBridge();

  const local = hydrateLocalCache();
  if (local.length > 0 && vehicles.length === 0) {
    setVehiclesInternal(local);
    setFlotaPaintedCount(local.length);
    console.log("[flotaStore] pintado inicial desde local", local.length);
    markSyncReady(fetchGeneration);
  }

  const isCloseInFlight = (vehicleId: string): boolean =>
    mergeContext?.isCloseInFlight(vehicleId) ?? false;

  const generationAtSubscribe = fetchGeneration;
  armSyncReadyFallback(generationAtSubscribe);

  unsubFirebase = subscribeToVehicles(
    uid,
    data => handleIncomingSnapshot(data, fetchGeneration),
    err => {
      if (!shouldAcceptFlotaFetchResponse(fetchGeneration)) return;
      console.error("[flotaStore]", err);
      markSyncReady(fetchGeneration);
    },
    { isCloseInFlight, deliverDuringMutationLock: true }
  );
}

/**
 * Inicia sesión de fetch (timeout, estado loading/ready).
 * Llamar desde Jornada al montar o reintentar.
 */
export function refreshFlotaSession(opts?: { hasOptimisticPaint?: boolean }): number {
  const { generation } = beginFlotaFetch(opts);
  fetchGeneration = generation;
  armFlotaFetchTimeout(generation);
  if (vehicles.length > 0 && getFlotaFetchStatus() === "loading") {
    markSyncReady(generation);
  } else {
    armSyncReadyFallback(generation);
  }
  return generation;
}

/** Incrementa refcount; abre listener Firebase si es el primero. */
export function acquireFlotaStore(uid: string): () => void {
  if (userId !== uid) {
    userId = uid;
    vehicles = [];
    mergedSig = "";
    localCache = null;
    stopFirebaseSubscription();
  }
  refCount += 1;
  if (refCount === 1) {
    startFirebaseSubscription(uid);
  }
  return () => releaseFlotaStore();
}

/** Decrementa refcount; cierra listener si llega a cero. */
export function releaseFlotaStore(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    stopFirebaseSubscription();
    userId = null;
    mergeContext = null;
    localCache = null;
  }
}

/** Solo tests — reinicia estado global. */
export function resetFlotaStoreForTests(): void {
  stopFirebaseSubscription();
  clearDeferredMerge();
  clearSyncReadyFallback();
  listeners.clear();
  userId = null;
  vehicles = [];
  mergedSig = "";
  localCache = null;
  refCount = 0;
  mergeContext = null;
  fetchGeneration = 0;
}
