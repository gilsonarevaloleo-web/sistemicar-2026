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
  if (sc?.bloqueInicioAt != null) score += 20;
  if ((sc?.horaFinContratoMs ?? sc?.horaFinMs ?? 0) > 0) score += 15;
  if ((sc?.retosCompletados ?? 0) > 0) score += sc!.retosCompletados! * 8;
  score += subs.filter(st => st.enDesgloseCronometro).length * 10;
  score += subs.filter(
    st =>
      st.completada ||
      st.resultadoSituacion === "cumplido" ||
      st.resultadoSituacion === "fallado"
  ).length * 6;
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
  // Timestamps / pausa: mismo conteo de filas no implica misma sesión.
  for (const s of subs) {
    if (s.aperturaAt != null) score += 2;
    if (s.cierreAt != null) score += 2;
  }
  if (v.interrupcionActiva) score += 8;
  if (v.desglosadorPausa?.subActivoId) score += 8;
  if ((v.desglosadorBloqueDepthPsGranted ?? 0) > 0) {
    score += v.desglosadorBloqueDepthPsGranted!;
  }
  return score;
}

/** Disco/parked/memoria más rico que el candidato (shell sin ring, etc.). */
export function diskSessionRicherThanMemory(memory: Vehicle, disk: Vehicle): boolean {
  if (memory.id !== disk.id) return false;
  if (disk.status !== "activo" || memory.status !== "activo") return false;
  return (
    situacionSessionRichness(disk) > situacionSessionRichness(memory) ||
    conquistaSessionRichness(disk) > conquistaSessionRichness(memory)
  );
}

/**
 * Elige la sesión activa más rica entre candidatos del mismo id.
 * Usado al escribir disco: un snapshot lean no debe pisar ring/conquista.
 */
export function pickRicherActiveVehicle(
  base: Vehicle,
  ...sources: Array<Vehicle | undefined | null>
): Vehicle {
  if (base.status !== "activo" || base.autoVerdad) return base;
  let best = base;
  for (const src of sources) {
    if (!src || src.id !== best.id) continue;
    if (src.status !== "activo" || src.autoVerdad) continue;
    if (diskSessionRicherThanMemory(best, src)) {
      best = mergeActiveVehicleSessionState(best, src);
    }
  }
  return best;
}

/**
 * Enriquece una lista entrante con sesiones más ricas de disco/memoria/park.
 * No añade IDs nuevos — solo upgrade in-place de activos.
 */
export function upgradeActiveSessionsFromSources(
  incoming: Vehicle[],
  sources: Vehicle[]
): Vehicle[] {
  if (incoming.length === 0 || sources.length === 0) return incoming;
  const byId = new Map<string, Vehicle>();
  for (const s of sources) {
    if (s.status !== "activo" || s.autoVerdad) continue;
    const prev = byId.get(s.id);
    if (!prev || diskSessionRicherThanMemory(prev, s)) {
      byId.set(s.id, s);
    }
  }
  if (byId.size === 0) return incoming;

  let changed = false;
  const next = incoming.map(v => {
    if (v.status !== "activo" || v.autoVerdad) return v;
    const richer = byId.get(v.id);
    if (!richer || !diskSessionRicherThanMemory(v, richer)) return v;
    changed = true;
    return mergeActiveVehicleSessionState(v, richer);
  });
  return changed ? next : incoming;
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
