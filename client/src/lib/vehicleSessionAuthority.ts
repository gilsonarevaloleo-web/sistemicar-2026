/**
 * Autoridad única de sesión vehicular: reconcilia snapshots sin reabrir cierres.
 * Puntero, localStorage y Firebase convergen aquí (mismo patrón que buildConcienciaTimeline).
 */
import type { Vehicle } from "./persistence";
import {
  dedupeVehiclesPreferClosed,
  findLocalClosedOverride,
  getLocalVehicles,
  getParkedActiveVehicles,
  notifyVehicleClosed,
  resolveLocalVehicleMatch,
  wasVehicleRecentlyClosed,
} from "./persistence";
import { recoverMissingJournalDayActives, excludeGhostActivesFromReconcile } from "./ghostVehicleEngine";
import { applyVehicleSessionSeal, sealVehicleSessionClose } from "./vehicleSessionSeal";
import {
  archiveOrphanDesglosadorInterrupts,
  mergeActiveVehicleSessionState,
} from "./situacionSessionMerge";
import { pickRicherConquistaSession } from "./conquistaSessionCompare";

export interface ReconcileVehicleListParams {
  incoming: Vehicle[];
  localSources?: Vehicle[];
  optimisticPending?: Vehicle[];
  parkedActives?: Vehicle[];
  nowMs?: number;
  /** Cierre en curso en UI — bloquea re-apertura hasta que Firebase confirme. */
  isCloseInFlight?: (vehicleId: string) => boolean;
}

function isVehicleLocallyClosed(v: Vehicle, localSources: Vehicle[]): boolean {
  if (wasVehicleRecentlyClosed(v.id, v.clientRequestId)) return true;
  if (findLocalClosedOverride(v, localSources)) return true;
  const match = resolveLocalVehicleMatch(v, localSources);
  if (match && match.status !== "activo") return true;
  return false;
}

function applyClosedOverride(v: Vehicle, localSources: Vehicle[]): Vehicle {
  const closedOverride = findLocalClosedOverride(v, localSources);
  if (closedOverride) {
    return mergeActiveVehicleSessionState(v, closedOverride);
  }
  if (v.status !== "activo") return v;
  if (!wasVehicleRecentlyClosed(v.id, v.clientRequestId)) return v;

  const closedLocal =
    localSources.find(l => l.id === v.id && l.status !== "activo") ??
    (v.clientRequestId
      ? localSources.find(
          l => l.clientRequestId === v.clientRequestId && l.status !== "activo"
        )
      : undefined);
  if (closedLocal) {
    return mergeActiveVehicleSessionState(v, closedLocal);
  }
  return v;
}

function pickRicherDesglosador(a: Vehicle, b: Vehicle): Vehicle {
  return pickRicherConquistaSession(a, b);
}

/** Evita dos desglosadores activos duplicados (sync Firebase + local). */
function dedupeActiveDesglosadorParents(vehicles: Vehicle[]): Vehicle[] {
  const seenCrq = new Map<string, number>();
  const seenFingerprint = new Map<string, number>();
  const out: Vehicle[] = [];

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v.tipoReloj !== "desglosador" || v.status !== "activo") {
      out.push(v);
      continue;
    }

    const apertura = v.aperturaAt ?? v.createdAt?.getTime?.() ?? 0;
    const fingerprint = `${v.titulo}|${Math.floor(apertura / 60000)}`;
    const crq = v.clientRequestId;

    let dupIdx = crq ? seenCrq.get(crq) : undefined;
    if (dupIdx == null) dupIdx = seenFingerprint.get(fingerprint);

    if (dupIdx == null) {
      if (crq) seenCrq.set(crq, out.length);
      seenFingerprint.set(fingerprint, out.length);
      out.push(v);
      continue;
    }

    out[dupIdx] = pickRicherDesglosador(out[dupIdx], v);
  }

  return out;
}

function mergeIncomingWithLocal(incoming: Vehicle[], localSources: Vehicle[]): Vehicle[] {
  return incoming.map(v => {
    const local = resolveLocalVehicleMatch(v, localSources);
    let merged = mergeActiveVehicleSessionState(v, local);
    merged = applyClosedOverride(merged, localSources);
    if (merged.status === "activo" && isVehicleLocallyClosed(v, localSources)) {
      merged = applyClosedOverride(v, localSources);
    }
    return merged;
  });
}

/**
 * Reconciliación pasiva para snapshots (sin archivar huérfanos síncronamente).
 */
export function reconcileVehicleListView(params: ReconcileVehicleListParams): Vehicle[] {
  const nowMs = params.nowMs ?? Date.now();
  const localSources = params.localSources ?? getLocalVehicles();
  const localClosedIds = new Set(
    localSources.filter(v => v.status !== "activo").map(v => v.id)
  );

  const isBlocked = (v: Vehicle): boolean => {
    if (params.isCloseInFlight?.(v.id)) return true;
    return isVehicleLocallyClosed(v, localSources);
  };

  let merged = mergeIncomingWithLocal(params.incoming, localSources);

  const pending = (params.optimisticPending ?? []).filter(
    p =>
      p.status === "activo" &&
      !isBlocked(p) &&
      !merged.some(
        m =>
          m.id === p.id ||
          (p.clientRequestId && m.clientRequestId === p.clientRequestId)
      )
  );
  if (pending.length > 0) {
    merged = [...pending, ...merged];
  }

  const parked =
    params.parkedActives ??
    getParkedActiveVehicles().filter(p => !isBlocked(p));

  merged = recoverMissingJournalDayActives(
    merged,
    [...localSources, ...parked],
    nowMs,
    wasVehicleRecentlyClosed,
    id => localClosedIds.has(id)
  );

  merged = dedupeVehiclesPreferClosed(merged);
  merged = dedupeActiveDesglosadorParents(merged);
  merged = excludeGhostActivesFromReconcile(merged, nowMs);

  return merged.map(v => {
    const sealed = applyVehicleSessionSeal(v);
    if (sealed.status !== "activo" || !isBlocked(sealed)) return sealed;
    return applyClosedOverride(sealed, localSources);
  });
}

/**
 * Lista final de vehículos: incluye archivado diferido de huérfanos (tests / jobs).
 */
export function reconcileVehicleList(params: ReconcileVehicleListParams): Vehicle[] {
  const nowMs = params.nowMs ?? Date.now();
  let merged = reconcileVehicleListView(params);
  merged = archiveOrphanDesglosadorInterrupts(merged, nowMs);
  return merged;
}

export interface CloseVehicleLocallyParams {
  vehicleId: string;
  clientRequestId?: string;
  patch: Partial<Vehicle> & { status: Vehicle["status"] };
  currentList: Vehicle[];
}

/** Cierre optimista atómico: guard + estado local coherente. */
export function closeVehicleLocally(params: CloseVehicleLocallyParams): Vehicle[] {
  notifyVehicleClosed(params.vehicleId, params.clientRequestId);
  if (params.patch.status !== "activo" && params.patch.cierreAt != null) {
    sealVehicleSessionClose(params.vehicleId, {
      cierreAt: params.patch.cierreAt,
      status: params.patch.status,
      clientRequestId: params.clientRequestId,
    });
  }
  return params.currentList.map(v =>
    v.id === params.vehicleId ? { ...v, ...params.patch } : v
  );
}
