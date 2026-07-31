/**
 * Recuperación de flota al volver de segundo plano / tab suspendida.
 * Puro: sin wakeLock, SW ni ticks en background.
 *
 * Objetivo: no perder ring/conquista por shell lean en memoria o snapshot remoto.
 */
import type { Vehicle } from "./persistence";
import { shouldPreserveLocalActivo } from "./ghostVehicleEngine";
import { getJournalDayStartMs } from "./segmentTime";
import { ringSessionOperable } from "./ringEnfoqueReal";
import { mergeActiveVehicleSessionState } from "./situacionSessionMerge";

function situacionSessionRichness(v: Vehicle): number {
  if (v.tipoFlota !== "situacion") return 0;
  const sc = v.situacionCronometro;
  const subs = v.subTareas ?? [];
  let score = 0;
  if (sc?.activo === true) score += 100;
  if (ringSessionOperable(sc, subs)) score += 50;
  score += subs.filter(st => st.enDesgloseCronometro).length * 10;
  score += subs.length;
  if (v.situacionCupoAnchor?.subTareaId) score += 5;
  return score;
}

function conquistaSessionRichness(v: Vehicle): number {
  if (v.tipoFlota !== "tiempo" || v.tipoReloj !== "desglosador") return 0;
  const subs = v.subVehiculos ?? [];
  let score = subs.length * 10;
  score += subs.filter(s => s.status === "cumplido" || s.status === "fallado").length * 5;
  score += subs.filter(s => s.status === "activo").length * 3;
  return score;
}

/** Disco/parked más rico que memoria (shell sin ring, etc.). */
export function diskSessionRicherThanMemory(memory: Vehicle, disk: Vehicle): boolean {
  if (memory.id !== disk.id) return false;
  if (disk.status !== "activo" || memory.status !== "activo") return false;
  return (
    situacionSessionRichness(disk) > situacionSessionRichness(memory) ||
    conquistaSessionRichness(disk) > conquistaSessionRichness(memory)
  );
}

export type RehydrateFlotaInput = {
  memory: Vehicle[];
  local: Vehicle[];
  parked: Vehicle[];
  nowMs?: number;
  dayStartMs?: number;
  wasRecentlyClosed?: (id: string, clientRequestId?: string) => boolean;
};

export type RehydrateFlotaResult = {
  next: Vehicle[];
  changed: boolean;
  upgradedIds: string[];
  addedIds: string[];
};

/**
 * Al volver visible: fusiona sesiones más ricas desde disco/park
 * y reincorpora activos que faltan en memoria.
 */
export function rehydrateFlotaFromDiskSources(input: RehydrateFlotaInput): RehydrateFlotaResult {
  const nowMs = input.nowMs ?? Date.now();
  const dayStart = input.dayStartMs ?? getJournalDayStartMs(nowMs);
  const wasClosed = input.wasRecentlyClosed ?? (() => false);

  const diskById = new Map<string, Vehicle>();
  for (const v of [...input.local, ...input.parked]) {
    if (v.status !== "activo" || v.autoVerdad) continue;
    if (wasClosed(v.id, v.clientRequestId)) continue;
    const prev = diskById.get(v.id);
    if (!prev || diskSessionRicherThanMemory(prev, v)) {
      diskById.set(v.id, v);
    }
  }

  const upgradedIds: string[] = [];
  const next = input.memory.map(mem => {
    const disk = diskById.get(mem.id);
    if (!disk) return mem;
    if (!diskSessionRicherThanMemory(mem, disk)) return mem;
    upgradedIds.push(mem.id);
    // memory = lean "remote-like"; disk = local rico → merge conserva ring/subs.
    return mergeActiveVehicleSessionState(mem, disk);
  });

  const byId = new Map(next.map(v => [v.id, v]));
  const addedIds: string[] = [];
  for (const v of Array.from(diskById.values())) {
    if (byId.has(v.id)) continue;
    if (wasClosed(v.id, v.clientRequestId)) continue;
    if (!shouldPreserveLocalActivo(v, nowMs, dayStart)) continue;
    byId.set(v.id, v);
    addedIds.push(v.id);
    next.unshift(v);
  }

  const changed = upgradedIds.length > 0 || addedIds.length > 0;
  return { next: changed ? [...next] : input.memory, changed, upgradedIds, addedIds };
}
