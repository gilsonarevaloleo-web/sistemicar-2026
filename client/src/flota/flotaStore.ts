/**
 * Fuente de verdad única de la flota — un solo subscribeToVehicles por sesión de usuario.
 */
import {
  getLocalVehicles,
  subscribeToVehicles,
  type Vehicle,
} from "@/lib/persistence";
import { reconcileVehicleListView } from "@/lib/vehicleSessionAuthority";
import { preferLocalSubTareasInVehicleList } from "@/lib/situacionSessionMerge";
import { vehiclesReactiveSignature } from "@/lib/situacionRepair";
import { writeLocalFlota } from "@/services/jornadaFlotaCache";
import { scheduleCoalescedNotify } from "@/lib/concienciaScheduler";
import { runShadowTask } from "@/lib/desglosadorShadow";
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
/** Parse de localStorage una vez por sesión — evita JSON.parse en cada snapshot. */
let localCache: Vehicle[] | null = null;
let refCount = 0;
let unsubFirebase: (() => void) | null = null;
let mergeContext: FlotaMergeContext | null = null;
let fetchGeneration = 0;
let remoteNotifyRafId: number | null = null;
let remoteNotifyPending = false;
let pendingRemoteAfterMerge: (() => void) | null = null;

let vehiclesUpdatedHandler: (() => void) | null = null;

const listeners = new Set<StoreListener>();

function notify(): void {
  scheduleCoalescedNotify(() => {
    listeners.forEach(fn => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
  });
}

/** Cancela notify diferido de snapshot remoto — mutadores locales tienen prioridad absoluta. */
function cancelRemoteSnapshotNotifySchedule(): void {
  if (remoteNotifyRafId != null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(remoteNotifyRafId);
    remoteNotifyRafId = null;
  }
  remoteNotifyPending = false;
  pendingRemoteAfterMerge = null;
}

/**
 * Snapshots Firebase: búfer + disco sincrónico, pub/sub React en el siguiente frame.
 * Nunca compite con taps del operador en el mismo tick.
 */
function scheduleRemoteSnapshotNotify(after?: () => void): void {
  if (after) {
    const prev = pendingRemoteAfterMerge;
    pendingRemoteAfterMerge = prev
      ? () => {
          prev();
          after();
        }
      : after;
  }
  if (remoteNotifyPending) return;
  remoteNotifyPending = true;
  const flush = () => {
    remoteNotifyRafId = null;
    remoteNotifyPending = false;
    const cb = pendingRemoteAfterMerge;
    pendingRemoteAfterMerge = null;
    notify();
    cb?.();
  };
  if (typeof requestAnimationFrame !== "undefined") {
    remoteNotifyRafId = requestAnimationFrame(flush);
  } else {
    queueMicrotask(flush);
  }
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

/** Actualiza búfer interno + firma sin disparar listeners de React. */
function setVehiclesBufferOnly(next: Vehicle[]): void {
  vehicles = next;
  syncLocalCache(next);
  mergedSig = vehiclesReactiveSignature(next);
}

export function getFlotaVehicles(): Vehicle[] {
  return vehicles;
}

let flotaStoreHydrated = false;

export function isFlotaStoreHydrated(): boolean {
  return flotaStoreHydrated;
}

function markFlotaStoreHydrated(): void {
  flotaStoreHydrated = true;
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
  cancelRemoteSnapshotNotifySchedule();
  const next = typeof update === "function" ? update(vehicles) : update;
  setVehiclesInternal(next);
  setFlotaPaintedCount(next.length);
}

export function registerFlotaMergeContext(ctx: FlotaMergeContext | null): void {
  mergeContext = ctx;
}

export function markSyncReady(generation: number): void {
  setFlotaPaintedCount(vehicles.length);
  completeFlotaFetch(generation);
}

type ApplySnapshotOpts = { force?: boolean };

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

  if (sig === mergedSig && !opts?.force) {
    markSyncReady(generation);
    return;
  }

  const localSig = vehiclesReactiveSignature(current);
  if (!opts?.force && sig !== localSig && localSig === mergedSig) {
    markSyncReady(generation);
    return;
  }

  if (uid && merged.length > 0) {
    runShadowTask(() => {
      writeLocalFlota(uid, merged);
    });
  }
  setVehiclesBufferOnly(merged);
  setFlotaPaintedCount(merged.length);
  markFlotaStoreHydrated();
  markSyncReady(generation);

  scheduleRemoteSnapshotNotify(() => ctx?.onAfterRemoteMerge?.(merged));
}

function handleIncomingSnapshot(data: Vehicle[], generation: number): void {
  if (!shouldAcceptFlotaFetchResponse(generation)) return;
  applyIncomingSnapshot(data, generation);
}

function installVehiclesUpdatedBridge(): void {
  if (vehiclesUpdatedHandler || typeof window === "undefined") return;
  vehiclesUpdatedHandler = () => {
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
  cancelRemoteSnapshotNotifySchedule();
  uninstallVehiclesUpdatedBridge();
}

function startFirebaseSubscription(uid: string): void {
  stopFirebaseSubscription();
  installVehiclesUpdatedBridge();

  const local = hydrateLocalCache();
  if (local.length > 0 && vehicles.length === 0) {
    setVehiclesInternal(local);
    setFlotaPaintedCount(local.length);
    markFlotaStoreHydrated();
    console.log("[flotaStore] pintado inicial desde local", local.length);
    markSyncReady(fetchGeneration);
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
 * Inicia sesión de fetch silenciosa en background.
 * Llamar desde Jornada al montar o reintentar.
 */
export function refreshFlotaSession(opts?: { hasOptimisticPaint?: boolean }): number {
  const { generation } = beginFlotaFetch(opts);
  fetchGeneration = generation;
  armFlotaFetchTimeout(generation);
  if (vehicles.length > 0) {
    markSyncReady(generation);
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
    flotaStoreHydrated = false;
  }
}

/** Solo tests — reinicia estado global. */
export function resetFlotaStoreForTests(): void {
  stopFirebaseSubscription();
  cancelRemoteSnapshotNotifySchedule();
  listeners.clear();
  userId = null;
  vehicles = [];
  mergedSig = "";
  localCache = null;
  refCount = 0;
  mergeContext = null;
  fetchGeneration = 0;
}
