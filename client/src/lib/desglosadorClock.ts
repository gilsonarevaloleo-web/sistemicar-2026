import type { SubVehiculo, Vehicle } from "./persistence";
import { hardwareElapsedMs } from "./hardwareClock";
import { getLocalDayStartMs, parseSegmentTime } from "./segmentTime";

/** Desfase al activar el siguiente sub — evita colisión ms0 con cierre del anterior. */
export const SUB_APERTURA_ACTIVATION_SKEW_MS = 50;

/** Drift de merge local/Firebase considerado el mismo sub activo (no remontar reloj). */
export const SUB_APERTURA_MERGE_TOLERANCE_MS = 2500;

export function suggestedSec(sub: SubVehiculo): number | null {
  if (sub.cantidadObjetivo && sub.tiempoRecordMinPerUnit) {
    return Math.round(sub.cantidadObjetivo * sub.tiempoRecordMinPerUnit * 60);
  }
  return sub.tiempoSugeridoSeg ?? null;
}

/** Tope del ciclo conquista: meta HH:mm si existe; si no, apertura + Σ sugeridos originales. */
export function resolveConquistaTopeMs(
  vehicle: Pick<Vehicle, "aperturaAt" | "criterioDetalle">,
  subs: SubVehiculo[],
  nowMs: number
): number | null {
  const meta = (vehicle.criterioDetalle ?? "").trim();
  const parsed = parseSegmentTime(meta);
  if (parsed) {
    const start = vehicle.aperturaAt;
    const anchorMs = start != null && Number.isFinite(start) ? start : nowMs;
    const dayStart = getLocalDayStartMs(anchorMs);
    let deadline = dayStart + (parsed.h * 60 + parsed.m) * 60_000;
    if (start != null && Number.isFinite(start)) {
      // Meta anterior a la apertura → día siguiente. No saltar +24 h
      // solo porque ahora ya pasó la hora (desglosador de todo el día).
      if (deadline <= start) deadline += 86_400_000;
    } else if (deadline <= nowMs) {
      deadline += 86_400_000;
    }
    return deadline;
  }
  const allSuggested = subs.reduce((acc, s) => acc + (suggestedSec(s) ?? 0), 0);
  if (allSuggested <= 0) return null;
  const start = vehicle.aperturaAt;
  if (start == null || !Number.isFinite(start)) return null;
  return start + allSuggested * 1000;
}

/** Σ (real − sugerido) de subs cerrados. Negativo = ganancia; positivo = pérdida. */
export function desglosadorClosedDeltaSec(subs: SubVehiculo[]): number {
  return subs.reduce((acc, s) => {
    if (s.status !== "cumplido" && s.status !== "fallado") return acc;
    const sug = suggestedSec(s);
    if (s.duracionFinal == null || sug == null) return acc;
    return acc + (s.duracionFinal - sug);
  }, 0);
}

/** Σ sugeridos de pendientes (trabajo aún no abierto). */
export function desglosadorPendingSuggestedSec(subs: SubVehiculo[]): number {
  return subs.reduce((acc, s) => {
    if (s.status !== "pendiente") return acc;
    return acc + (suggestedSec(s) ?? 0);
  }, 0);
}

/** Trabajo medido: duraciones cerradas + elapsed del sub en foco. */
export function desglosadorWorkSec(subs: SubVehiculo[], subElapsedSec: number): number {
  let closed = 0;
  for (const s of subs) {
    if (s.status !== "cumplido" && s.status !== "fallado") continue;
    if (s.duracionFinal == null || !Number.isFinite(s.duracionFinal)) continue;
    closed += Math.max(0, Math.floor(s.duracionFinal));
  }
  return Math.max(0, closed + Math.max(0, Math.floor(subElapsedSec)));
}

/**
 * Pausa acumulada = pared de sesión − trabajo.
 * Incluye la pausa en curso (now avanza; el trabajo no).
 */
export function desglosadorPauseAccumSec(
  vehicle: Pick<Vehicle, "aperturaAt">,
  nowMs: number,
  workSec: number
): number {
  const start = vehicle.aperturaAt;
  if (start == null || !Number.isFinite(start) || start <= 0) return 0;
  const wallSec = Math.max(0, Math.floor((nowMs - start) / 1000));
  return Math.max(0, wallSec - Math.max(0, workSec));
}

export type DesglosadorClockOpsInput = {
  remainActiveSec: number;
  pendingSec: number;
  completedDeltaSec: number;
  liveOvertimeSec: number;
  pauseAccumSec: number;
  baseTopeMs: number | null;
  nowMs: number;
  hasActiveSuggested: boolean;
};

export type DesglosadorClockOps = {
  /** Ganancia/pérdida visible: cerrados + overtime del sub activo. */
  liveAccumDeltaSec: number;
  /** Trabajo restante si se cumple el plan (no incluye delta ni pausa). */
  remainWorkSec: number;
  /** Tope corrido por pausas (suma). */
  effectiveTopeMs: number | null;
  topeRemainSec: number | null;
  /** Holgura vs tope: positivo = ganancia absorbible; negativo = vamos tarde. */
  slackSec: number;
  cycleRemainSec: number;
  absorbSlackIntoActive: boolean;
};

/**
 * Motor del reloj global y del sub.
 *
 * Ciclo global = Σ sugeridos que faltan (activo restante + pendientes).
 * Al lanzar: ahora + suma de todos los subs.
 * Ganancia: el operador cerró antes → `now` ya adelantó el fin (resta).
 * Pausa: el trabajo se congela y `now` avanza → el fin suma la pausa.
 * Pérdida: `now` ya atrasó el fin (suma).
 *
 * El sub proyectivo es solo SU sugerido: lanzamiento + duración.
 * Nunca absorbe holgura de ganancias previas.
 */
export function applyDesglosadorClockOps(input: DesglosadorClockOpsInput): DesglosadorClockOps {
  const liveAccumDeltaSec = input.completedDeltaSec + Math.max(0, input.liveOvertimeSec);
  const remainWorkSec = Math.max(0, input.remainActiveSec + input.pendingSec);
  const pauseSec = Math.max(0, input.pauseAccumSec);
  const effectiveTopeMs =
    input.baseTopeMs != null ? input.baseTopeMs + pauseSec * 1000 : null;
  const topeRemainSec =
    effectiveTopeMs != null ? Math.floor((effectiveTopeMs - input.nowMs) / 1000) : null;
  const slackSec = topeRemainSec != null ? topeRemainSec - remainWorkSec : 0;
  return {
    liveAccumDeltaSec,
    remainWorkSec,
    effectiveTopeMs,
    topeRemainSec,
    slackSec,
    cycleRemainSec: remainWorkSec,
    absorbSlackIntoActive: false,
  };
}

export interface DesglosadorClockResult {
  subElapsedSec: number;
  subRemainingSec: number | null;
  subEndAt: number | null;
  cycleRemainSec: number | null;
  cycleEndAt: number | null;
  /** Ganancia del ciclo (subs cerrados + overtime). */
  liveAccumDeltaSec: number;
  /** Ganancia de ESTE sub: elapsed − sugerido. Negativo = va adelantado. */
  subLiveDeltaSec: number;
  /** Duración sugerida del sub en foco (la que se suma a Termina a las). */
  subPlannedSec: number | null;
  unitsRemaining: number | null;
  hasProjection: boolean;
  /** Pausa acumulada (pared − trabajo), incluye la pausa en curso. */
  pauseAccumSec: number;
  /** Holgura vs tope efectivo. Positivo = ganancia; negativo = retraso. */
  slackSec: number;
}

/** Firma única del reloj de un sub — invalida UI al transicionar. */
export function desglosadorSubClockKey(sub: SubVehiculo | undefined): string {
  if (!sub?.aperturaAt) return "";
  return `${sub.id}:${sub.aperturaAt}`;
}

/** Solo id del sub activo — el reloj DOM no se reinicia por drift de aperturaAt. */
export function desglosadorSubActiveIdKey(sub: SubVehiculo | undefined): string {
  return sub?.id ?? "";
}

/**
 * Pausa real del reloj conquista: interrupción anidada con snapshot,
 * no un flag huérfano de `interrupcionActiva`.
 */
export function isDesglosadorClockPaused(vehicle: Vehicle): boolean {
  const subs = vehicle.subVehiculos ?? [];
  if (subs.some(s => s.status === "nested_paused")) return true;
  return (
    vehicle.interrupcionActiva === true &&
    vehicle.desglosadorPausa?.subActivoId != null &&
    vehicle.desglosadorPausa.elapsedSecSnapshot != null
  );
}

/** Reloj del sub activo explícito (evita frames con find(activo) desincronizado). */
export function computeActiveSubClocks(
  now: number,
  vehicle: Vehicle,
  activeSub: SubVehiculo
): DesglosadorClockResult {
  const subs = (vehicle.subVehiculos ?? []).map(s => {
    if (s.id === activeSub.id) return { ...activeSub, status: "activo" as const };
    if (s.status === "activo") return { ...s, status: "pendiente" as const };
    return s;
  });
  return computeDesglosadorClocks(now, { ...vehicle, subVehiculos: subs });
}

export function computeDesglosadorClocks(now: number, vehicle: Vehicle): DesglosadorClockResult {
  const subs = vehicle.subVehiculos || [];
  const pausa = vehicle.desglosadorPausa;
  const pausedSub =
    pausa?.subActivoId != null
      ? subs.find(s => s.id === pausa.subActivoId)
      : undefined;
  const activeSub =
    subs.find(s => s.status === "activo") ??
    (isDesglosadorClockPaused(vehicle) && pausedSub ? pausedSub : undefined);
  const frozen =
    isDesglosadorClockPaused(vehicle) &&
    pausa?.elapsedSecSnapshot != null &&
    pausedSub != null &&
    pausa.subActivoId === pausedSub.id;

  let subElapsedSec = 0;
  if (activeSub) {
    if (frozen) {
      subElapsedSec = pausa!.elapsedSecSnapshot!;
    } else if (activeSub.aperturaAt) {
      subElapsedSec = Math.floor(hardwareElapsedMs(activeSub.aperturaAt, now) / 1000);
    }
  }

  const objSecs = activeSub ? suggestedSec(activeSub) : null;
  const remainActive = objSecs != null ? Math.max(0, objSecs - subElapsedSec) : 0;
  let subRemainingSec = objSecs != null ? remainActive : null;
  // Proyección del sub = su duración, no la holgura del ciclo.
  // En pausa, now + restante suma la pausa; en marcha, equivale a apertura + sugerido.
  let subEndAt: number | null = null;
  if (objSecs != null && activeSub) {
    if (frozen) {
      subEndAt = now + remainActive * 1000;
    } else if (activeSub.aperturaAt) {
      subEndAt = activeSub.aperturaAt + objSecs * 1000;
    }
  }

  let unitsRemaining: number | null = null;
  if (
    activeSub?.cantidadObjetivo &&
    activeSub.tiempoRecordMinPerUnit &&
    activeSub.tiempoRecordMinPerUnit > 0
  ) {
    const elapsedMin = subElapsedSec / 60;
    const done = Math.floor(elapsedMin / activeSub.tiempoRecordMinPerUnit);
    unitsRemaining = Math.max(0, activeSub.cantidadObjetivo - done);
  }

  const completedDelta = desglosadorClosedDeltaSec(subs);
  const pendingSec = desglosadorPendingSuggestedSec(subs);
  const anySuggested = subs.some(s => suggestedSec(s) != null);
  const workSec = desglosadorWorkSec(subs, subElapsedSec);
  const pauseAccumSec = desglosadorPauseAccumSec(vehicle, now, workSec);

  const subLiveDeltaSec = objSecs != null ? subElapsedSec - objSecs : 0;

  if (!anySuggested) {
    return {
      subElapsedSec,
      subRemainingSec,
      subEndAt,
      cycleRemainSec: null,
      cycleEndAt: null,
      liveAccumDeltaSec: 0,
      subLiveDeltaSec,
      subPlannedSec: objSecs,
      unitsRemaining,
      hasProjection: false,
      pauseAccumSec,
      slackSec: 0,
    };
  }

  const liveOvertimeSec = objSecs != null ? Math.max(0, subElapsedSec - objSecs) : 0;
  const ops = applyDesglosadorClockOps({
    remainActiveSec: remainActive,
    pendingSec,
    completedDeltaSec: completedDelta,
    liveOvertimeSec,
    pauseAccumSec,
    baseTopeMs: resolveConquistaTopeMs(vehicle, subs, now),
    nowMs: now,
    hasActiveSuggested: objSecs != null,
  });

  const cycleRemainSec = ops.cycleRemainSec;
  const cycleEndAt = now + cycleRemainSec * 1000;

  return {
    subElapsedSec,
    subRemainingSec,
    subEndAt,
    cycleRemainSec,
    cycleEndAt,
    liveAccumDeltaSec: ops.liveAccumDeltaSec,
    subLiveDeltaSec,
    subPlannedSec: objSecs,
    unitsRemaining,
    hasProjection: true,
    pauseAccumSec,
    slackSec: ops.slackSec,
  };
}

export function formatHHMM(fromMs: number): string {
  const d = new Date(fromMs);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatMMSS(totalSec: number): string {
  const abs = Math.abs(totalSec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatElapsedHHMMSS(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type DesglosadorSubTimerUi = {
  display: string;
  isCountdown: boolean;
  expired: boolean;
};

/** Mapeo puro reloj → display del sub activo (countdown, elapsed u overtime). */
export function desglosadorSubTimerUiFromClocks(
  clocks: DesglosadorClockResult,
  objSecs: number | null
): DesglosadorSubTimerUi {
  if (objSecs != null && clocks.subRemainingSec !== null) {
    const expired = clocks.subRemainingSec <= 0;
    const display = expired
      ? formatMMSS(clocks.subElapsedSec - objSecs)
      : formatMMSS(clocks.subRemainingSec);
    return { display, isCountdown: true, expired };
  }
  return {
    display: formatElapsedHHMMSS(clocks.subElapsedSec),
    isCountdown: false,
    expired: false,
  };
}

/** Tiempo total en el vehículo desglosador (desde apertura) — base de profundidad y resistencia. */
export function getDesglosadorSessionElapsedSec(vehicle: Vehicle, now = Date.now()): number {
  const aperturaMs = vehicle.aperturaAt ?? vehicle.createdAt?.getTime?.() ?? 0;
  if (aperturaMs <= 0) return 0;
  const pausa = vehicle.desglosadorPausa;
  if (vehicle.interrupcionActiva && pausa?.pausadoAt) {
    return Math.max(0, Math.floor((pausa.pausadoAt - aperturaMs) / 1000));
  }
  return Math.max(0, Math.floor((now - aperturaMs) / 1000));
}

export function desglosadorHourProgress(elapsedSec: number): {
  hoursDone: number;
  secInCurrentHour: number;
  pctToNextHour: number;
  secToNextHour: number;
} {
  const sec = Math.max(0, Math.floor(elapsedSec));
  const hoursDone = Math.floor(sec / 3600);
  const secInCurrentHour = sec % 3600;
  const pctToNextHour = (secInCurrentHour / 3600) * 100;
  const secToNextHour = 3600 - secInCurrentHour;
  return { hoursDone, secInCurrentHour, pctToNextHour, secToNextHour };
}

export function formatDesglosadorDurationHuman(elapsedSec: number): string {
  const sec = Math.max(0, Math.floor(elapsedSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${sec % 60}s`;
}

export type SubCloseVerdict = "gain" | "loss" | "neutral" | "noRef";

const SUB_CLOSE_NEUTRAL_SEC = 5;

export type SubCloseCantidadValidation =
  | { ok: true; cantidad: number }
  | { ok: false; message: string };

/** Exige cantidad lograda cuando el sub tiene cantidad objetivo (evita cierre sin medición). */
export function validateSubCloseCantidad(
  sub: SubVehiculo,
  cantidadInput: string,
  status: "cumplido" | "fallado"
): SubCloseCantidadValidation {
  if (!sub.cantidadObjetivo || sub.cantidadObjetivo <= 0) {
    return { ok: true, cantidad: Math.max(0, Number(cantidadInput) || 0) };
  }
  const trimmed = cantidadInput.trim();
  const hasRecord = Boolean(sub.tiempoRecordMinPerUnit && sub.tiempoRecordMinPerUnit > 0);
  if (trimmed === "") {
    // Primer ciclo sin récord: no hay voz ni ruta; permitir cerrar sin fricción.
    if (!hasRecord) {
      return {
        ok: true,
        cantidad: status === "cumplido" ? sub.cantidadObjetivo : 0,
      };
    }
    return { ok: false, message: "Indica la cantidad lograda antes de cerrar este sub." };
  }
  const cantidad = Number(trimmed);
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { ok: false, message: "Cantidad inválida. Usa un número ≥ 0." };
  }
  if (status === "cumplido" && cantidad === 0) {
    return { ok: false, message: "Si no completaste unidades, cierra como Fallado (cantidad 0)." };
  }
  return { ok: true, cantidad };
}

/** Veredicto al cerrar sub desglosador tiempo vs referencia sugerida. */
export function computeSubCloseVerdict(sub: SubVehiculo): {
  verdict: SubCloseVerdict;
  deltaSec: number;
  refSec: number | null;
  realSec: number | null;
} {
  const refSec = suggestedSec(sub);
  const realSec = sub.duracionFinal ?? null;
  if (refSec == null || realSec == null) {
    return { verdict: "noRef", deltaSec: 0, refSec, realSec };
  }
  const deltaSec = realSec - refSec;
  if (Math.abs(deltaSec) <= SUB_CLOSE_NEUTRAL_SEC) {
    return { verdict: "neutral", deltaSec, refSec, realSec };
  }
  return {
    verdict: deltaSec < 0 ? "gain" : "loss",
    deltaSec,
    refSec,
    realSec,
  };
}

/**
 * Segundos por unidad de un sub (takt del paso).
 * Medido: duracionFinal / cantidadLograda.
 * Referencia: tiempoRecordMinPerUnit × 60 (si no hay medido).
 */
export function subSecPerUnit(
  sub: SubVehiculo,
  mode: "measured" | "ref" | "best" = "best"
): number | null {
  const measured =
    sub.duracionFinal != null &&
    sub.duracionFinal > 0 &&
    sub.cantidadLograda != null &&
    sub.cantidadLograda > 0
      ? sub.duracionFinal / sub.cantidadLograda
      : null;
  const ref =
    sub.tiempoRecordMinPerUnit != null && sub.tiempoRecordMinPerUnit > 0
      ? sub.tiempoRecordMinPerUnit * 60
      : null;

  if (mode === "measured") return measured;
  if (mode === "ref") return ref;
  return measured ?? ref;
}

export type UnitCycleSum = {
  /** Σ seg/unidad de cada sub (cadena completa = 1 producto). */
  totalSec: number;
  /** Cuántos pasos aportaron a la suma. */
  stepsCounted: number;
  /** Total de subs del desglosador. */
  stepsTotal: number;
  /** true si al menos un paso usó medido (no solo récord). */
  hasMeasured: boolean;
  /** true si la suma es solo referencia (aún sin cierres medidos). */
  allRef: boolean;
};

/**
 * Tiempo de 1 unidad completa del desglosador = suma de (seg/unidad) de cada sub.
 * Ejemplo: pegar + cortar + marco + bandas → duración del armado de 1 bolsillo.
 */
export function sumDesglosadorUnitCycle(subs: SubVehiculo[]): UnitCycleSum {
  let totalSec = 0;
  let stepsCounted = 0;
  let measuredCount = 0;
  let refOnlyCount = 0;

  for (const sub of subs) {
    const measured = subSecPerUnit(sub, "measured");
    const ref = subSecPerUnit(sub, "ref");
    const value = measured ?? ref;
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    totalSec += value;
    stepsCounted += 1;
    if (measured != null) measuredCount += 1;
    else if (ref != null) refOnlyCount += 1;
  }

  return {
    totalSec,
    stepsCounted,
    stepsTotal: subs.length,
    hasMeasured: measuredCount > 0,
    allRef: measuredCount === 0 && refOnlyCount > 0,
  };
}

