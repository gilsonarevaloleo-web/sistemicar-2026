/**
 * Fuente de verdad única de la flota — un solo subscribeToVehicles por sesión de usuario.
 */
import {
  getLocalVehicles,
  subscribeToVehicles,
  type Vehicle,
} from "@/lib/persistence";
import {
  isLocalVehicleMutationLocked,
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
let refCount = 0;
let unsubFirebase: (() => void) | null = null;
let mergeContext: FlotaMergeContext | null = null;
let fetchGeneration = 0;
let deferredMergeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingIncoming: { data: Vehicle[]; generation: number } | null = null;

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

function setVehiclesInternal(next: Vehicle[], opts?: { skipNotify?: boolean }): void {
  vehicles = next;
  mergedSig = vehiclesReactiveSignature(next);
  if (!opts?.skipNotify) notify();
}

export function getFlotaVehicles(): Vehicle[] {
  return vehicles;
}

export function getFlotaMergedSignature(): string {
  return mergedSig;
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

function clearDeferredMerge(): void {
  if (deferredMergeTimer != null) {
    clearTimeout(deferredMergeTimer);
    deferredMergeTimer = null;
  }
  pendingIncoming = null;
}

function scheduleDeferredMerge(data: Vehicle[], generation: number): void {
  pendingIncoming = { data, generation };
  if (deferredMergeTimer != null) return;
  deferredMergeTimer = setTimeout(() => {
    deferredMergeTimer = null;
    const pending = pendingIncoming;
    pendingIncoming = null;
    if (!pending) return;
    if (!shouldAcceptFlotaFetchResponse(pending.generation)) return;
    applyIncomingSnapshot(pending.data, pending.generation);
  }, LOCAL_VEHICLE_MUTATION_LOCK_MS + 50);
}

function applyIncomingSnapshot(data: Vehicle[], generation: number): void {
  const ctx = mergeContext;
  const current = vehicles;

  let merged: Vehicle[];
  if (ctx) {
    const firebaseIds = new Set(data.map(v => v.id));
    const pending = ctx.getOptimisticPending().filter(ov => !firebaseIds.has(ov.id));
    const localSources = [...getLocalVehicles(), ...ctx.getExtraLocalSources()];
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

  if (uid && merged.length > 0 && sig !== mergedSig) {
    writeLocalFlota(uid, merged);
  }

  if (sig === mergedSig) {
    markSyncReady(generation);
    return;
  }

  const localSig = vehiclesReactiveSignature(current);
  if (sig !== localSig && localSig === mergedSig) {
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
    markSyncReady(generation);
    scheduleDeferredMerge(data, generation);
    return;
  }

  applyIncomingSnapshot(data, generation);
}

function stopFirebaseSubscription(): void {
  unsubFirebase?.();
  unsubFirebase = null;
  clearDeferredMerge();
}

function startFirebaseSubscription(uid: string): void {
  stopFirebaseSubscription();

  const local = getLocalVehicles();
  if (local.length > 0 && vehicles.length === 0) {
    setVehiclesInternal(local);
    setFlotaPaintedCount(local.length);
    console.log("[flotaStore] pintado inicial desde local", local.length);
  }

  const isCloseInFlight = (vehicleId: string): boolean =>
    mergeContext?.isCloseInFlight(vehicleId) ?? false;

  unsubFirebase = subscribeToVehicles(
    uid,
    data => handleIncomingSnapshot(data, fetchGeneration),
    err => {
      if (!shouldAcceptFlotaFetchResponse(fetchGeneration)) return;
      console.error("[flotaStore]", err);
      markSyncReady(fetchGeneration);
    },
    { isCloseInFlight }
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
  return generation;
}

/** Incrementa refcount; abre listener Firebase si es el primero. */
export function acquireFlotaStore(uid: string): () => void {
  if (userId !== uid) {
    userId = uid;
    vehicles = [];
    mergedSig = "";
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
  }
}

/** Solo tests — reinicia estado global. */
export function resetFlotaStoreForTests(): void {
  stopFirebaseSubscription();
  clearDeferredMerge();
  listeners.clear();
  userId = null;
  vehicles = [];
  mergedSig = "";
  refCount = 0;
  mergeContext = null;
  fetchGeneration = 0;
}
