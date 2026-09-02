import type { Vehicle } from "./persistence";
import { getJournalDayStartMs } from "./segmentTime";
import { isOrphanDesglosadorInterrupt } from "./situacionSessionMerge";
import { applyVehicleSessionSeal, isVehicleSessionSealed } from "./vehicleSessionSeal";

/** Sesión consciente activa más allá de esto se considera fantasma obsoleta. */
export const GHOST_MAX_SESSION_MS = 12 * 3600_000;

/** Ventana para preservar activos locales aún sincronizando con Firebase. */
export const LOCAL_SYNC_GRACE_MS = 15 * 60_000;

/**
 * Trabajo continuo legítimo que empezó justo antes de las 05:00 (p. ej. 04:00 → 09:00).
 * No confundir con sesión nocturna (21:00–23:00) dejada abierta al dormir.
 */
export const JOURNAL_PRESTART_WINDOW_MS = 3600_000;

/** Máxima duración de un arrastre pre-05:00 que sigue contando en el journal nuevo. */
export const JOURNAL_CARRYOVER_MAX_MS = 6 * 3600_000;

/**
 * Vehículo abierto en un journal anterior (p. ej. 21:00–23:00) que sigue `activo` tras las 05:00.
 * No cubre segmentos del día nuevo y puede inundar el anillo de rojo si no se cierra.
 */
export function isJournalStaleActiveVehicle(
  aperturaAt: number,
  nowMs: number,
  dayStartMs: number
): boolean {
  if (aperturaAt === 0 || aperturaAt >= dayStartMs) return false;
  const sessionAge = nowMs - aperturaAt;
  const startedJustBeforeJournal =
    aperturaAt >= dayStartMs - JOURNAL_PRESTART_WINDOW_MS && aperturaAt < dayStartMs;
  if (startedJustBeforeJournal && sessionAge <= JOURNAL_CARRYOVER_MAX_MS) return false;
  if (sessionAge <= 2 * 3600_000) return false;
  return true;
}

/**
 * Desglosador con trabajo real aún abierto (conquista o ring).
 * Debe resistir ausencias largas: no es «fantasma» solo por edad.
 */
export function hasLiveDesglosadorWork(v: Vehicle): boolean {
  if (v.status !== "activo" || v.autoVerdad) return false;

  if (v.tipoFlota === "tiempo" && v.tipoReloj === "desglosador") {
    const subs = v.subVehiculos ?? [];
    if (subs.length === 0) return false;
    if (v.interrupcionActiva || v.desglosadorPausa?.subActivoId) return true;
    return subs.some(
      s =>
        s.status === "activo" ||
        s.status === "pendiente" ||
        s.status === "nested_paused"
    );
  }

  if (v.tipoFlota === "situacion") {
    const sc = v.situacionCronometro;
    if (sc?.activo === true) return true;
    const subs = v.subTareas ?? [];
    return subs.some(
      st =>
        !!st.enDesgloseCronometro &&
        (st.resultadoSituacion ?? "pendiente") === "pendiente"
    );
  }

  return false;
}

/**
 * Vehículo consciente `activo` que no representa trabajo real en curso.
 * Bloquea entropía del anillo y al Centinela si no se filtra.
 */
export function isGhostActiveVehicle(
  v: Vehicle,
  nowMs: number,
  dayStartMs: number,
  vehiclesById?: Map<string, Vehicle>
): boolean {
  if (v.status !== "activo" || v.autoVerdad) return false;

  const apertura = v.aperturaAt || (v.createdAt instanceof Date ? v.createdAt.getTime() : 0);
  if (apertura === 0) return true;

  // Interrupción huérfana / padre cerrado — siempre fantasma.
  if (v.vehiculoPadreDesglosadorId) {
    const parent = vehiclesById?.get(v.vehiculoPadreDesglosadorId);
    if (!parent || parent.status !== "activo") return true;
  }

  if (vehiclesById && isOrphanDesglosadorInterrupt(v, vehiclesById)) return true;

  // Conquista/ring con trabajo vivo: no cortar por 12h ni por cruce 05:00.
  if (hasLiveDesglosadorWork(v)) return false;

  if (nowMs - apertura > GHOST_MAX_SESSION_MS) return true;
  if (isJournalStaleActiveVehicle(apertura, nowMs, dayStartMs)) return true;

  if (v.tipoFlota === "descanso") {
    const match = v.criterioDetalle?.match(/([\d.]+)\s*min/i);
    const plannedMin = match ? parseFloat(match[1]) : v.tipoDescanso === "punto_cero" ? 20 : 15;
    const graceMin = v.tipoDescanso === "punto_cero" ? 45 : 20;
    if (apertura > 0 && nowMs - apertura > (plannedMin + graceMin) * 60000) return true;
    if (v.puntoCero?.fase === "completada") {
      const since = v.puntoCero.faseInicioAt ?? apertura;
      if (nowMs - since > 20 * 60_000) return true;
    }
  }

  return false;
}

/** Desglosador `activo` con todos los subs cerrados — cascarón que bloquea entropía/anillo. */
export function isZombieDesglosadorShell(v: Vehicle): boolean {
  if (v.tipoReloj !== "desglosador" || v.status !== "activo" || v.autoVerdad) return false;
  const subs = v.subVehiculos ?? [];
  if (subs.length === 0) return false;
  return subs.every(s => s.status === "cumplido" || s.status === "fallado");
}
const sessionGhostIds = new Set<string>();

export function resetGhostSessionCache(): void {
  sessionGhostIds.clear();
}

export function isGhostActiveVehicleStable(
  v: Vehicle,
  nowMs: number,
  dayStartMs: number,
  vehiclesById?: Map<string, Vehicle>
): boolean {
  if (v.status !== "activo" || v.autoVerdad) {
    sessionGhostIds.delete(v.id);
    return false;
  }
  if (sessionGhostIds.has(v.id)) return true;
  const ghost = isGhostActiveVehicle(v, nowMs, dayStartMs, vehiclesById);
  if (ghost) sessionGhostIds.add(v.id);
  return ghost;
}

/**
 * Reconcile: no reincorporar activos clasificados como fantasma (evita flicker Firebase).
 */
export function excludeGhostActivesFromReconcile(
  vehicles: Vehicle[],
  nowMs = Date.now()
): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  const byId = new Map(vehicles.map(v => [v.id, v]));
  return vehicles.filter(v => {
    if (v.status !== "activo" || v.autoVerdad) return true;
    return !isGhostActiveVehicleStable(v, nowMs, dayStart, byId);
  });
}

/**
 * Preservar activos locales ausentes del snapshot de Firebase.
 * Cualquier vehículo consciente abierto en el día-jornada actual se mantiene
 * hasta cierre explícito (no solo 15 min de gracia de sync).
 */
export function shouldPreserveLocalActivo(v: Vehicle, nowMs: number, dayStartMs?: number): boolean {
  if (v.status !== "activo" || v.autoVerdad) return false;
  const dayStart = dayStartMs ?? getJournalDayStartMs(nowMs);
  if (isGhostActiveVehicle(v, nowMs, dayStart)) return false;

  // Desglosador con trabajo vivo: preservar tras ausencias largas / borde de jornada.
  if (hasLiveDesglosadorWork(v)) return true;

  const apertura = v.aperturaAt || (v.createdAt instanceof Date ? v.createdAt.getTime() : 0);
  if (apertura >= dayStart) return true;

  const age = apertura > 0 ? nowMs - apertura : Infinity;
  if (age < LOCAL_SYNC_GRACE_MS) return true;
  if (v.clientRequestId && age < 30 * 60_000) return true;
  return false;
}

/** Reincorpora activos del día-jornada guardados en local pero ausentes del merge remoto. */
export function recoverMissingJournalDayActives(
  merged: Vehicle[],
  localSource: Vehicle[],
  nowMs: number = Date.now(),
  isRecentlyClosed: (id: string, clientRequestId?: string) => boolean = () => false,
  isLocallyClosed: (id: string) => boolean = () => false
): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  const mergedIds = new Set(merged.map(v => v.id));
  const mergedCrq = new Set(merged.map(v => v.clientRequestId).filter(Boolean));
  const byId = new Map(merged.map(v => [v.id, v]));
  const missing = localSource.filter(v => {
    if (v.status !== "activo" || v.autoVerdad) return false;
    if (mergedIds.has(v.id)) return false;
    if (v.clientRequestId && mergedCrq.has(v.clientRequestId)) return false;
    if (isRecentlyClosed(v.id, v.clientRequestId)) return false;
    if (isLocallyClosed(v.id)) return false;
    if (isVehicleSessionSealed(v.id, v.clientRequestId)) return false;
    if (isOrphanDesglosadorInterrupt(v, byId)) return false;
    return shouldPreserveLocalActivo(v, nowMs, dayStart);
  });
  if (missing.length === 0) return merged;
  return [...missing, ...merged];
}

/** Excluye fantasmas del cálculo de cobertura / entropía del anillo. */
export function filterVehiclesForEntropy(vehicles: Vehicle[], nowMs = Date.now()): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  const byId = new Map(vehicles.map(v => [v.id, v]));
  return vehicles.filter(v => !isGhostActiveVehicleStable(v, nowMs, dayStart, byId));
}

/**
 * Cobertura del anillo de conciencia: solo cuenta trabajo consciente abierto
 * en la jornada actual (desde 05:00). Un `activo` arrastrado de antes de las 05:00
 * no bloquea entropía aunque siga en Firebase/local.
 */
export function filterVehiclesForAnilloCoverage(vehicles: Vehicle[], nowMs = Date.now()): Vehicle[] {
  const dayStart = getJournalDayStartMs(nowMs);
  return filterVehiclesForEntropy(vehicles, nowMs)
    .map(applyVehicleSessionSeal)
    .filter(v => {
    if (isVehicleSessionSealed(v.id, v.clientRequestId) && v.status === "activo") return false;
    if (isZombieDesglosadorShell(v)) return false;
    // Centinela (autoVerdad): sesiones selladas de entropía — siempre incluir.
    if (v.autoVerdad) return true;
    if (v.status !== "activo") return true;

    const apertura = v.aperturaAt || (v.createdAt instanceof Date ? v.createdAt.getTime() : 0);
    if (apertura > 0 && apertura < dayStart) return false;

    if (v.tipoFlota === "descanso" || v.tipoDescanso === "punto_cero") {
      return apertura >= dayStart;
    }
    return true;
  });
}

export function hasRealActiveConsciousVehicle(vehicles: Vehicle[], nowMs = Date.now()): boolean {
  return filterVehiclesForEntropy(vehicles, nowMs).some(v => v.status === "activo" && !v.autoVerdad);
}
