import type { SubVehiculo, Vehicle } from "./persistence";

/**
 * Progreso por sub. nested_paused NO equivale a cerrado:
 * si puntúa como cumplido, un snapshot de interrupción pisa el sub actual.
 */
export function subVehiculoProgressScore(sub: SubVehiculo): number {
  if (sub.status === "pendiente") return 0;
  if (sub.status === "nested_paused") return 5;
  if (sub.status === "activo") return 10 + (sub.aperturaAt ?? 0) / 1e15;
  return 20 + (sub.cierreAt ?? 0) / 1e15;
}

export type ConquistaProgressKey = {
  closed: number;
  cursor: number;
  recency: number;
  subCount: number;
};

function isClosedSub(status: SubVehiculo["status"]): boolean {
  return status === "cumplido" || status === "fallado";
}

/** Huella de avance: cerrados > cursor > recencia. La pausa no suma riqueza. */
export function conquistaProgressKey(v: Vehicle): ConquistaProgressKey {
  const subs = v.subVehiculos ?? [];
  const closed = subs.filter(s => isClosedSub(s.status)).length;
  const activeIdx = subs.findIndex(s => s.status === "activo");
  const pausedId = v.desglosadorPausa?.subActivoId;
  const pausedIdx =
    pausedId != null
      ? subs.findIndex(s => s.id === pausedId)
      : subs.findIndex(s => s.status === "nested_paused");
  const cursor = activeIdx >= 0 ? activeIdx : pausedIdx >= 0 ? pausedIdx : -1;
  let recency = v.desglosadorPausa?.pausadoAt ?? 0;
  for (const s of subs) {
    if (s.aperturaAt != null && s.aperturaAt > recency) recency = s.aperturaAt;
    if (s.cierreAt != null && s.cierreAt > recency) recency = s.cierreAt;
  }
  return { closed, cursor, recency, subCount: subs.length };
}

/** >0 si `a` va más adelante que `b`. */
export function compareConquistaSession(a: Vehicle, b: Vehicle): number {
  const ka = conquistaProgressKey(a);
  const kb = conquistaProgressKey(b);
  if (ka.closed !== kb.closed) return ka.closed - kb.closed;
  if (ka.subCount !== kb.subCount) return ka.subCount - kb.subCount;
  if (ka.cursor !== kb.cursor) return ka.cursor - kb.cursor;
  if (ka.cursor < 0) {
    const aPause = a.interrupcionActiva === true && !!a.desglosadorPausa?.subActivoId;
    const bPause = b.interrupcionActiva === true && !!b.desglosadorPausa?.subActivoId;
    // Sin sub en curso: no reintroducir una pausa huérfana (tab / llamada).
    if (aPause !== bPause) return aPause ? -1 : 1;
  }
  if (ka.recency !== kb.recency) return ka.recency - kb.recency;
  return 0;
}

export function pickRicherConquistaSession(a: Vehicle, b: Vehicle): Vehicle {
  return compareConquistaSession(b, a) > 0 ? b : a;
}

/**
 * Pausa de interrupción solo es válida sobre el sub donde se pausó.
 * Si ya se cerró ese sub o hay otro activo, la pausa es ruido (llamada / tab).
 */
export function pruneStaleDesglosadorPause(vehicle: Vehicle): Vehicle {
  if (vehicle.tipoReloj !== "desglosador") return vehicle;
  if (!vehicle.interrupcionActiva && !vehicle.desglosadorPausa) return vehicle;

  const pausa = vehicle.desglosadorPausa;
  const subs = vehicle.subVehiculos ?? [];
  const paused = pausa?.subActivoId
    ? subs.find(s => s.id === pausa.subActivoId)
    : undefined;
  const active = subs.find(s => s.status === "activo");

  if (paused && isClosedSub(paused.status)) {
    return { ...vehicle, interrupcionActiva: false, desglosadorPausa: undefined };
  }
  if (pausa?.subActivoId && !paused) {
    return { ...vehicle, interrupcionActiva: false, desglosadorPausa: undefined };
  }
  if (active && pausa?.subActivoId && active.id !== pausa.subActivoId) {
    return { ...vehicle, interrupcionActiva: false, desglosadorPausa: undefined };
  }
  if (active && !pausa?.subActivoId) {
    return { ...vehicle, interrupcionActiva: false, desglosadorPausa: undefined };
  }
  return vehicle;
}
