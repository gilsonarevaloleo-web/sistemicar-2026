/**
 * Minutos de vehículo vs pared del desglosador.
 *
 * El reporte de producción suma filas / unidades / interrupciones.
 * El contenedor (ring Enfoque o desglosador Conquista) no es un vehículo:
 * su pared incluye huecos sin fila/unidad y, tras reanudar, el tramo de
 * interrupción. Esos huecos son idle — medidos, pero no trabajo.
 *
 * Prohibido en ms0 / tick 1s. Idle, sello, Hub.
 */
import type { SubTarea, SubVehiculo } from "./persistence";

export type VehiculoMinutosFuente = {
  status?: string;
  tipoReloj?: string;
  tipoFlota?: string;
  situacionCronometro?: { activo?: boolean } | null;
  situacionCupoAnchor?: { subTareaId?: string; startedAt?: number } | null;
  situacionNestedPause?: {
    pausedAt?: number;
    situacionCupoAnchor?: { subTareaId?: string; startedAt?: number } | null;
  } | null;
  interrupcionActiva?: boolean;
  desglosadorPausa?: {
    pausadoAt?: number;
    subActivoId?: string;
    elapsedSecSnapshot?: number;
  } | null;
  vehiculoPadreDesglosadorId?: string;
  subVehiculos?: Array<
    Pick<SubVehiculo, "duracionFinal" | "status" | "aperturaAt" | "cierreAt" | "id">
  > | null;
  subTareas?: Array<
    Pick<
      SubTarea,
      | "id"
      | "duracionRealSec"
      | "enDesgloseCronometro"
      | "resultadoSituacion"
      | "cerradaAt"
    >
  > | null;
};

export type WorkMsInterval = { start: number; end: number };

function isFinitePos(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** Ring Enfoque o desglosador Conquista: el trabajo vive en las piezas internas. */
export function isContenedorDesglose(v: VehiculoMinutosFuente): boolean {
  if (v.vehiculoPadreDesglosadorId) return false;
  if (v.tipoReloj === "desglosador") return true;
  if (v.tipoFlota !== "situacion") return false;
  if (v.situacionCronometro) return true;
  return (v.subTareas ?? []).some(st => !!st.enDesgloseCronometro);
}

function closedSubSeconds(
  subs: Array<Pick<SubVehiculo, "duracionFinal">> | null | undefined
): number {
  if (!subs || subs.length === 0) return 0;
  let sec = 0;
  for (let i = 0; i < subs.length; i++) {
    const d = subs[i]?.duracionFinal;
    if (isFinitePos(d)) sec += Math.floor(d);
  }
  return Math.max(0, sec);
}

function closedFilaSeconds(
  filas: Array<Pick<SubTarea, "duracionRealSec">> | null | undefined
): number {
  if (!filas || filas.length === 0) return 0;
  let sec = 0;
  for (let i = 0; i < filas.length; i++) {
    const d = filas[i]?.duracionRealSec;
    if (isFinitePos(d)) sec += Math.floor(d);
  }
  return Math.max(0, sec);
}

function liveConquistaSeconds(v: VehiculoMinutosFuente, now: number): number {
  const pausa = v.desglosadorPausa;
  const nestedPaused = (v.subVehiculos ?? []).some(s => s.status === "nested_paused");
  const frozen =
    nestedPaused ||
    (v.interrupcionActiva === true &&
      pausa?.subActivoId != null &&
      pausa.elapsedSecSnapshot != null);
  if (frozen) {
    if (pausa?.elapsedSecSnapshot != null && pausa.elapsedSecSnapshot >= 0) {
      return Math.floor(pausa.elapsedSecSnapshot);
    }
    const pausedSub = pausa?.subActivoId
      ? (v.subVehiculos ?? []).find(s => s.id === pausa.subActivoId)
      : (v.subVehiculos ?? []).find(s => s.status === "nested_paused");
    if (pausedSub?.aperturaAt && pausa?.pausadoAt && pausa.pausadoAt > pausedSub.aperturaAt) {
      return Math.floor((pausa.pausadoAt - pausedSub.aperturaAt) / 1000);
    }
    return 0;
  }
  const active = (v.subVehiculos ?? []).find(s => s.status === "activo");
  if (!active?.aperturaAt || active.aperturaAt <= 0) return 0;
  if (isFinitePos(active.duracionFinal)) return 0;
  return Math.max(0, Math.floor((now - active.aperturaAt) / 1000));
}

function filaPendiente(
  st: Pick<SubTarea, "enDesgloseCronometro" | "resultadoSituacion" | "duracionRealSec">
): boolean {
  if (isFinitePos(st.duracionRealSec)) return false;
  return !!st.enDesgloseCronometro && (st.resultadoSituacion ?? "pendiente") === "pendiente";
}

function isConquistaFrozen(v: VehiculoMinutosFuente): boolean {
  const pausa = v.desglosadorPausa;
  const nestedPaused = (v.subVehiculos ?? []).some(s => s.status === "nested_paused");
  return (
    nestedPaused ||
    (v.interrupcionActiva === true &&
      pausa?.subActivoId != null &&
      pausa.elapsedSecSnapshot != null)
  );
}

function intervalFromDurationSec(
  start: number | undefined,
  end: number,
  durSec: number
): WorkMsInterval | null {
  if (!isFinitePos(end) || !isFinitePos(durSec)) return null;
  const durMs = Math.floor(durSec) * 1000;
  const s =
    typeof start === "number" && Number.isFinite(start) && start > 0 && start < end
      ? start
      : end - durMs;
  return end > s ? { start: s, end } : null;
}

function conquistaUnitIntervals(v: VehiculoMinutosFuente, now: number): WorkMsInterval[] {
  const out: WorkMsInterval[] = [];
  const pausa = v.desglosadorPausa;
  const frozen = isConquistaFrozen(v);
  const subs = v.subVehiculos ?? [];
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    if (!sub) continue;
    if (sub.status === "cumplido" || sub.status === "fallado") {
      const dur = sub.duracionFinal;
      if (!isFinitePos(dur)) continue;
      const end =
        typeof sub.cierreAt === "number" && sub.cierreAt > 0
          ? sub.cierreAt
          : typeof sub.aperturaAt === "number" && sub.aperturaAt > 0
            ? sub.aperturaAt + Math.floor(dur) * 1000
            : 0;
      const iv = intervalFromDurationSec(sub.aperturaAt, end, dur);
      if (iv) out.push(iv);
      continue;
    }
    const isPausedSub =
      sub.status === "nested_paused" ||
      (frozen && pausa?.subActivoId != null && pausa.subActivoId === sub.id);
    if (isPausedSub) {
      if (
        sub.aperturaAt &&
        pausa?.pausadoAt &&
        pausa.pausadoAt > sub.aperturaAt
      ) {
        out.push({ start: sub.aperturaAt, end: pausa.pausadoAt });
        continue;
      }
      if (pausa?.elapsedSecSnapshot != null && pausa.elapsedSecSnapshot > 0 && sub.aperturaAt) {
        out.push({
          start: sub.aperturaAt,
          end: sub.aperturaAt + Math.floor(pausa.elapsedSecSnapshot) * 1000,
        });
      }
      continue;
    }
    if (sub.status !== "activo" || v.status !== "activo" || frozen) continue;
    if (!sub.aperturaAt || sub.aperturaAt <= 0) continue;
    if (isFinitePos(sub.duracionFinal)) continue;
    if (now > sub.aperturaAt) out.push({ start: sub.aperturaAt, end: now });
  }
  return out;
}

function enfoqueFilaIntervals(v: VehiculoMinutosFuente, now: number): WorkMsInterval[] {
  const out: WorkMsInterval[] = [];
  const filas = v.subTareas ?? [];
  const snap = v.situacionNestedPause;
  const liveAnchor = snap?.situacionCupoAnchor ?? v.situacionCupoAnchor;
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila) continue;
    const sec =
      typeof fila.duracionRealSec === "number" && fila.duracionRealSec > 0
        ? fila.duracionRealSec
        : 0;
    if (isFinitePos(sec)) {
      const end =
        typeof fila.cerradaAt === "number" && fila.cerradaAt > 0
          ? fila.cerradaAt
          : 0;
      if (end > 0) {
        const iv = intervalFromDurationSec(undefined, end, sec);
        if (iv) out.push(iv);
        continue;
      }
    }
    if (v.status !== "activo") continue;
    if (!liveAnchor || !fila.id || liveAnchor.subTareaId !== fila.id) continue;
    if (!filaPendiente(fila)) continue;
    const started = liveAnchor.startedAt;
    if (!isFinitePos(started)) continue;
    const z = snap?.pausedAt && snap.pausedAt > started ? snap.pausedAt : now;
    if (z > started) out.push({ start: started, end: z });
  }
  return out;
}

/**
 * Intervalos de trabajo medido (unidades / filas), no la pared del contenedor.
 * Un desglosador abierto todo el día con 40 min de unidades cubre 40 min, no 21 h.
 */
export function measuredWorkIntervals(
  v: VehiculoMinutosFuente,
  now = Date.now()
): WorkMsInterval[] {
  if (v.tipoReloj === "desglosador") return conquistaUnitIntervals(v, now);
  if (v.tipoFlota === "situacion" && isContenedorDesglose(v)) {
    return enfoqueFilaIntervals(v, now);
  }
  return [];
}

/**
 * Hay reloj vivo de unidad/fila. Un desglosador `activo` sin pieza en curso
 * no cubre conciencia — ese rato es hueco, no trabajo.
 */
export function hasTickingDesgloseWork(
  v: VehiculoMinutosFuente,
  now = Date.now()
): boolean {
  if (!isContenedorDesglose(v) || v.status !== "activo") return false;
  if (v.interrupcionActiva) return false;
  if (v.desglosadorPausa?.pausadoAt || v.desglosadorPausa?.subActivoId) return false;
  if (v.situacionNestedPause) return false;
  if (v.tipoReloj === "desglosador") {
    return (v.subVehiculos ?? []).some(s => s.status === "activo");
  }
  return liveEnfoqueSeconds(v, now) > 0;
}

function liveEnfoqueSeconds(v: VehiculoMinutosFuente, now: number): number {
  const snap = v.situacionNestedPause;
  if (snap?.pausedAt) {
    const anchor = snap.situacionCupoAnchor ?? v.situacionCupoAnchor;
    const started = anchor?.startedAt;
    if (!isFinitePos(started) || snap.pausedAt <= started) return 0;
    const live = (v.subTareas ?? []).find(s => s.id === anchor?.subTareaId);
    if (live && !filaPendiente(live) && isFinitePos(live.duracionRealSec)) return 0;
    return Math.max(0, Math.floor((snap.pausedAt - started) / 1000));
  }
  const anchor = v.situacionCupoAnchor;
  const started = anchor?.startedAt;
  if (!isFinitePos(started)) return 0;
  const live = (v.subTareas ?? []).find(s => s.id === anchor?.subTareaId);
  if (!live || !filaPendiente(live)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

/**
 * Segundos de trabajo medido: Σ unidades/filas cerradas + tramo vivo.
 * No incluye pared del contenedor ni el tiempo de una interrupción hija.
 */
export function measuredWorkSeconds(
  v: VehiculoMinutosFuente,
  now = Date.now()
): number {
  let sec = 0;
  if (v.tipoReloj === "desglosador") {
    sec += closedSubSeconds(v.subVehiculos);
    if (v.status === "activo") sec += liveConquistaSeconds(v, now);
    return Math.max(0, sec);
  }
  if (v.tipoFlota === "situacion") {
    sec += closedFilaSeconds(v.subTareas);
    if (v.status === "activo") sec += liveEnfoqueSeconds(v, now);
    return Math.max(0, sec);
  }
  return 0;
}

export function roundMinFromSec(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.max(1, Math.round(sec / 60));
}

/** Minutos de vehículo para el reporte. Contenedor vacío → 0 (no inflar con la pared). */
export function trabajoMinutosDeVehiculo(
  v: VehiculoMinutosFuente,
  now = Date.now()
): number {
  return roundMinFromSec(measuredWorkSeconds(v, now));
}

/** Idle del contenedor: pared − trabajo. El vehículo simple no tiene idle de desglose. */
export function idleSecondsContenedor(
  v: VehiculoMinutosFuente,
  wallSec: number,
  now = Date.now()
): number {
  if (!isContenedorDesglose(v) || wallSec <= 0) return 0;
  const work = measuredWorkSeconds(v, now);
  if (work <= 0) return wallSec;
  const idle = wallSec - work;
  return idle >= 15 ? idle : 0;
}
