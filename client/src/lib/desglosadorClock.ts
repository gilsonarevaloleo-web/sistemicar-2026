import type { SubVehiculo, Vehicle } from "./persistence";
import { hardwareElapsedMs } from "./hardwareClock";

export function suggestedSec(sub: SubVehiculo): number | null {
  if (sub.cantidadObjetivo && sub.tiempoRecordMinPerUnit) {
    return Math.round(sub.cantidadObjetivo * sub.tiempoRecordMinPerUnit * 60);
  }
  return sub.tiempoSugeridoSeg ?? null;
}

export interface DesglosadorClockResult {
  subElapsedSec: number;
  subRemainingSec: number | null;
  subEndAt: number | null;
  cycleRemainSec: number | null;
  cycleEndAt: number | null;
  liveAccumDeltaSec: number;
  unitsRemaining: number | null;
  hasProjection: boolean;
}

export function computeDesglosadorClocks(now: number, vehicle: Vehicle): DesglosadorClockResult {
  const subs = vehicle.subVehiculos || [];
  const activeSub = subs.find(s => s.status === "activo");
  const pausa = vehicle.desglosadorPausa;
  const frozen =
    vehicle.interrupcionActiva &&
    pausa?.elapsedSecSnapshot != null &&
    pausa.subActivoId === activeSub?.id;

  let subElapsedSec = 0;
  if (activeSub?.aperturaAt) {
    subElapsedSec = frozen
      ? pausa!.elapsedSecSnapshot!
      : Math.floor(hardwareElapsedMs(activeSub.aperturaAt, now) / 1000);
  }

  const objSecs = activeSub ? suggestedSec(activeSub) : null;
  const subRemainingSec =
    objSecs != null ? Math.max(0, objSecs - subElapsedSec) : null;
  const subEndAt =
    activeSub?.aperturaAt && objSecs != null
      ? activeSub.aperturaAt + objSecs * 1000
      : null;

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

  const terminados = subs.filter(s => s.status === "cumplido" || s.status === "fallado");
  const pendientes = subs.filter(s => s.status === "pendiente");

  const completedDelta = terminados.reduce((acc, s) => {
    const sug = suggestedSec(s);
    if (s.duracionFinal == null || sug == null) return acc;
    return acc + (s.duracionFinal - sug);
  }, 0);

  const pendingSec = pendientes.reduce((acc, s) => acc + (suggestedSec(s) ?? 0), 0);
  const anySuggested = subs.some(s => suggestedSec(s) != null);

  if (!anySuggested) {
    return {
      subElapsedSec,
      subRemainingSec,
      subEndAt,
      cycleRemainSec: null,
      cycleEndAt: null,
      liveAccumDeltaSec: 0,
      unitsRemaining,
      hasProjection: false,
    };
  }

  const remainActive = objSecs != null ? Math.max(0, objSecs - subElapsedSec) : 0;
  const cycleRemainSec = Math.max(0, remainActive + pendingSec + completedDelta);
  const cycleEndAt = now + cycleRemainSec * 1000;
  const liveAccumDeltaSec =
    objSecs != null ? completedDelta + (subElapsedSec - objSecs) : completedDelta;

  return {
    subElapsedSec,
    subRemainingSec,
    subEndAt,
    cycleRemainSec,
    cycleEndAt,
    liveAccumDeltaSec,
    unitsRemaining,
    hasProjection: true,
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
