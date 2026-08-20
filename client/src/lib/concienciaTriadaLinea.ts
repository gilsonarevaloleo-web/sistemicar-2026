/**
 * Reloj de línea vs paralelo meritorio — tríada de conciencia (idle).
 *
 * Línea: minutos únicos del plan. Un hilo. El futuro del plan sigue inconsciente.
 * Hueco de cobertura: plan ya ocurrido sin vehículo. Resta al inconsciente de línea.
 * Interrupt: el padre se congela en pausadoAt; el enfoque cubre la línea. No multiplica.
 * Paralelo meritorio: ≥2 hilos avanzando de verdad (no el par padre-pausado + hijo).
 * Dopamina: extra = apilado − único, y ambos cierran cumplido.
 *
 * No importa ConcienciaEngine / pulso / ms0.
 */
import { feedsProyectoHub, resolveDestinoCierre } from "./destinoCierre";
import { getJournalDateString, getLimaDayStartMs, segmentWindowMs } from "./segmentTime";
import type { Vehicle } from "./persistence";

export type MsInterval = { start: number; end: number };

export type TriadaLineaOccupancy = {
  minutosPlan: number;
  minutosPresencia: number;
  minutosDireccion: number;
  minutosHueco: number;
  minutosPlanFuturo: number;
  minutosInconsciente: number;
  hilosAvanzando: number;
  paraleloMeritorio: boolean;
  interruptCubreLinea: boolean;
  minutosParaleloEnJuego: number;
  minutosParaleloGanado: number;
};

export const EMPTY_TRIADA_LINEA: TriadaLineaOccupancy = {
  minutosPlan: 0,
  minutosPresencia: 0,
  minutosDireccion: 0,
  minutosHueco: 0,
  minutosPlanFuturo: 0,
  minutosInconsciente: 0,
  hilosAvanzando: 0,
  paraleloMeritorio: false,
  interruptCubreLinea: false,
  minutosParaleloEnJuego: 0,
  minutosParaleloGanado: 0,
};

function round1(n: number): number {
  return Math.round(Math.max(0, n) * 10) / 10;
}

export function skipsTriadaCoverage(
  vehicle: Pick<Vehicle, "autoVerdad" | "tipoFlota"> | null | undefined
): boolean {
  if (!vehicle) return true;
  if (vehicle.autoVerdad) return true;
  const flota = vehicle.tipoFlota;
  return flota === "descanso" || flota === "verdad";
}

function hasActiveInterruptChild(parent: Vehicle, vehicles: Vehicle[]): boolean {
  const id = parent.id;
  if (!id) return false;
  for (let i = 0; i < vehicles.length; i++) {
    const c = vehicles[i];
    if (!c || c.vehiculoPadreDesglosadorId !== id) continue;
    if (c.status !== "activo" || skipsTriadaCoverage(c)) continue;
    return true;
  }
  return false;
}

/** True si el vehículo avanza de verdad (no padre congelado, no centinela). El hijo interrupt sí. */
export function isTriadaAdvancingVehicle(vehicle: Vehicle, vehicles: Vehicle[] = []): boolean {
  if (skipsTriadaCoverage(vehicle) || vehicle.status !== "activo") return false;
  if (vehicle.interrupcionActiva) return false;
  if (vehicle.situacionNestedPause) return false;
  if (hasActiveInterruptChild(vehicle, vehicles)) return false;
  return true;
}

export function clipInterval(
  interval: MsInterval,
  winStart: number,
  winEnd: number
): MsInterval | null {
  const start = Math.max(interval.start, winStart);
  const end = Math.min(interval.end, winEnd);
  return end > start ? { start, end } : null;
}

export function mergeMsIntervals(intervals: MsInterval[]): MsInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: MsInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function subtractMsIntervals(base: MsInterval[], subtract: MsInterval[]): MsInterval[] {
  let result = base.map(iv => ({ ...iv }));
  for (const sub of subtract) {
    const next: MsInterval[] = [];
    for (const interval of result) {
      if (sub.end <= interval.start || sub.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (sub.start > interval.start) {
        next.push({ start: interval.start, end: sub.start });
      }
      if (sub.end < interval.end) {
        next.push({ start: sub.end, end: interval.end });
      }
    }
    result = next;
  }
  return result;
}

export function intersectIntervalsWithWindows(
  intervals: MsInterval[],
  windows: MsInterval[]
): MsInterval[] {
  if (windows.length === 0 || intervals.length === 0) return [];
  const out: MsInterval[] = [];
  for (const interval of intervals) {
    for (const w of windows) {
      const clipped = clipInterval(interval, w.start, w.end);
      if (clipped) out.push(clipped);
    }
  }
  return mergeMsIntervals(out);
}

export function sumIntervalMinutes(intervals: MsInterval[]): number {
  let ms = 0;
  for (let i = 0; i < intervals.length; i++) {
    ms += intervals[i].end - intervals[i].start;
  }
  return ms / 60_000;
}

function stackedMinusUnique(intervals: MsInterval[]): number {
  if (intervals.length === 0) return 0;
  return Math.max(0, sumIntervalMinutes(intervals) - sumIntervalMinutes(mergeMsIntervals(intervals)));
}

/** Medianoche Lima del YYYY-MM-DD de jornada (fecha del journal a las 05:00). */
export function limaMidnightFromJournalFecha(fecha: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return Date.UTC(y, mo - 1, d, 5, 0, 0, 0);
}

export function plannedWindowsMs(
  segmentos: { horaInicio?: string; horaFin?: string }[],
  limaDayStartMs: number
): MsInterval[] {
  const windows: MsInterval[] = [];
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i];
    if (!s) continue;
    const { start, end } = segmentWindowMs(s.horaInicio || "", s.horaFin || "", limaDayStartMs);
    if (end > start) windows.push({ start, end });
  }
  return mergeMsIntervals(windows);
}

function vehicleRawSessionRange(v: Vehicle, now: number): MsInterval | null {
  const start = v.aperturaAt;
  if (typeof start !== "number" || !Number.isFinite(start) || start <= 0) return null;
  let end: number;
  if (v.status === "activo") {
    if (v.interrupcionActiva && v.desglosadorPausa?.pausadoAt) {
      end = v.desglosadorPausa.pausadoAt;
    } else if (v.situacionNestedPause?.pausedAt) {
      end = v.situacionNestedPause.pausedAt;
    } else {
      end = now;
    }
  } else if (typeof v.cierreAt === "number" && v.cierreAt > start) {
    end = v.cierreAt;
  } else if (typeof v.duracionFinal === "number" && v.duracionFinal > 0) {
    end = start + v.duracionFinal * 60_000;
  } else {
    return null;
  }
  return end > start ? { start, end } : null;
}

function interruptChildRawRanges(parentId: string, vehicles: Vehicle[], now: number): MsInterval[] {
  const out: MsInterval[] = [];
  for (let i = 0; i < vehicles.length; i++) {
    const c = vehicles[i];
    if (!c || c.vehiculoPadreDesglosadorId !== parentId) continue;
    if (skipsTriadaCoverage(c)) continue;
    const range = vehicleRawSessionRange(c, now);
    if (range) out.push(range);
  }
  return out;
}

/** Intervalos en los que el vehículo avanzó (agujero del interrupt hijo). */
export function vehicleAdvancingIntervals(
  vehicle: Vehicle,
  vehicles: Vehicle[],
  now: number
): MsInterval[] {
  if (skipsTriadaCoverage(vehicle)) return [];
  const raw = vehicleRawSessionRange(vehicle, now);
  if (!raw) return [];
  const holes = vehicle.id ? interruptChildRawRanges(vehicle.id, vehicles, now) : [];
  return holes.length > 0 ? subtractMsIntervals([raw], holes) : [raw];
}

function vehicleIsDireccion(vehicle: Vehicle): boolean {
  return feedsProyectoHub(resolveDestinoCierre(vehicle.destinoCierre));
}

function vehicleOfJournalDay(vehicle: Vehicle, fecha: string): boolean {
  if (vehicle.status === "activo") return true;
  const cierre = vehicle.cierreAt;
  if (typeof cierre === "number" && Number.isFinite(cierre) && cierre > 0) {
    return getJournalDateString(cierre) === fecha;
  }
  const apertura = vehicle.aperturaAt;
  if (typeof apertura === "number" && Number.isFinite(apertura) && apertura > 0) {
    return getJournalDateString(apertura) === fecha;
  }
  return false;
}

function splitPlanElapsedFuture(
  plan: MsInterval[],
  now: number
): { elapsed: MsInterval[]; future: MsInterval[] } {
  const elapsed: MsInterval[] = [];
  const future: MsInterval[] = [];
  for (let i = 0; i < plan.length; i++) {
    const w = plan[i];
    const past = clipInterval(w, w.start, now);
    if (past) elapsed.push(past);
    const pending = clipInterval(w, Math.max(w.start, now), w.end);
    if (pending) future.push(pending);
  }
  return { elapsed, future };
}

/**
 * Ocupación de línea: intersección única con el plan.
 * Dirección gana si se solapa con Presencia. El futuro no se puede convertir aún.
 */
export function computeTriadaLineaOccupancy(params: {
  fecha: string;
  segmentos: { horaInicio?: string; horaFin?: string }[];
  vehicles: Vehicle[];
  now?: number;
}): TriadaLineaOccupancy {
  const now = params.now ?? Date.now();
  const limaMidnight =
    limaMidnightFromJournalFecha(params.fecha) ?? getLimaDayStartMs(now);
  const plan = plannedWindowsMs(params.segmentos, limaMidnight);
  const minutosPlan = sumIntervalMinutes(plan);
  if (minutosPlan <= 0) return { ...EMPTY_TRIADA_LINEA };

  const clipEnd = Math.min(now, limaMidnight + 48 * 3_600_000);
  const { elapsed: planElapsed, future: planFuture } = splitPlanElapsedFuture(plan, clipEnd);

  const dayVehicles = params.vehicles.filter(v => v && vehicleOfJournalDay(v, params.fecha));

  const dirIv: MsInterval[] = [];
  const preIv: MsInterval[] = [];
  const cumplidoIv: MsInterval[] = [];
  const advancingIv: MsInterval[] = [];
  let hilosAvanzando = 0;
  let interruptChildAdvancing = false;
  let parentPaused = false;

  for (let i = 0; i < dayVehicles.length; i++) {
    const v = dayVehicles[i];
    const advancing = isTriadaAdvancingVehicle(v, params.vehicles);
    if (advancing) {
      hilosAvanzando += 1;
      if (v.vehiculoPadreDesglosadorId) interruptChildAdvancing = true;
    }
    if (v.interrupcionActiva && v.status === "activo") parentPaused = true;

    const pieces = vehicleAdvancingIntervals(v, params.vehicles, now);
    if (pieces.length === 0) continue;
    const clipped: MsInterval[] = [];
    for (let p = 0; p < pieces.length; p++) {
      const c = clipInterval(pieces[p], limaMidnight, clipEnd);
      if (c) clipped.push(c);
    }
    if (clipped.length === 0) continue;
    if (vehicleIsDireccion(v)) dirIv.push(...clipped);
    else preIv.push(...clipped);
    if (advancing) advancingIv.push(...clipped);
    if (v.status === "cumplido") cumplidoIv.push(...clipped);
  }

  const dirOnPlan = intersectIntervalsWithWindows(dirIv, planElapsed);
  const preOnPlanRaw = intersectIntervalsWithWindows(preIv, planElapsed);
  const preOnPlan = subtractMsIntervals(preOnPlanRaw, dirOnPlan);
  const covered = mergeMsIntervals([...dirOnPlan, ...preOnPlan]);
  const huecos = subtractMsIntervals(planElapsed, covered);

  let minutosDireccion = round1(sumIntervalMinutes(dirOnPlan));
  let minutosPresencia = round1(sumIntervalMinutes(preOnPlan));
  let minutosHueco = round1(sumIntervalMinutes(huecos));
  let minutosPlanFuturo = round1(sumIntervalMinutes(planFuture));
  const planR = round1(minutosPlan);
  const used = minutosDireccion + minutosPresencia + minutosHueco + minutosPlanFuturo;
  const drift = Math.round((planR - used) * 10) / 10;
  if (drift !== 0) {
    if (minutosPlanFuturo + drift >= 0) minutosPlanFuturo = round1(minutosPlanFuturo + drift);
    else if (minutosHueco + drift >= 0) minutosHueco = round1(minutosHueco + drift);
    else minutosPresencia = round1(Math.max(0, minutosPresencia + drift));
  }
  const minutosInconsciente = round1(minutosHueco + minutosPlanFuturo);

  const interruptCubreLinea = interruptChildAdvancing && parentPaused;
  const paraleloMeritorio = hilosAvanzando >= 2;
  const minutosParaleloEnJuego = paraleloMeritorio ? round1(stackedMinusUnique(advancingIv)) : 0;
  const minutosParaleloGanado = round1(stackedMinusUnique(cumplidoIv));

  return {
    minutosPlan: planR,
    minutosPresencia,
    minutosDireccion,
    minutosHueco,
    minutosPlanFuturo,
    minutosInconsciente,
    hilosAvanzando,
    paraleloMeritorio,
    interruptCubreLinea,
    minutosParaleloEnJuego,
    minutosParaleloGanado,
  };
}
