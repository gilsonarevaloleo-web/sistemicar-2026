/**
 * Sello de gasto de tiempo — un intervalo cerrado por vehículo.
 *
 * El JSON del especialista (vehiculo_id, tipo_cierre, duracion, started/ended)
 * se compacta: título y cupo viven en el vehículo; ISO → epoch; un sello por
 * cierre. Inconsciente no es un tipo de cierre: es el resto del plan
 * (huecos). Lo no planificado no es deuda — está no conquistado.
 *
 * Prohibido en ms0: solo sombra / idle / cierre ya pintado.
 */
import { feedsProyectoHub, resolveDestinoCierre } from "./destinoCierre";
import type { DestinoCierre } from "./destinoCierre";
import type { SubTarea, SubVehiculo, Vehicle } from "./persistence";

export type DestinoGasto = "presencia" | "direccion";

export type FuenteGasto =
  | "vehiculo"
  | "lista_rapida"
  | "interrupt"
  | "idle_desglose";

/** Sello compacto. `t` es título corto para la revelación; el resto es el intervalo. */
export type GastoTiempoSello = {
  vid: string;
  t?: string;
  pid?: string;
  dest: DestinoGasto;
  src: FuenteGasto;
  /** startedAt ms */
  a: number;
  /** endedAt ms */
  z: number;
  /** Pared, segundos sellados. */
  sec: number;
  /** Pared no cubierta por subs de medida. Solo si > 0. */
  idle?: number;
};

export type ProyectoGastoTiempo = {
  secPresencia: number;
  secDireccion: number;
  secIdle: number;
  n: number;
  keys: string[];
  sellos: GastoTiempoSello[];
};

export const EMPTY_PROYECTO_GASTO: ProyectoGastoTiempo = {
  secPresencia: 0,
  secDireccion: 0,
  secIdle: 0,
  n: 0,
  keys: [],
  sellos: [],
};

export const MAX_GASTO_SELLOS = 48;
export const MAX_GASTO_KEYS = 64;
/** Idle menor a esto se considera ruido de redondeo. */
const IDLE_FLOOR_SEC = 15;

export function gastoCreditKey(vehicleId: string, startedAt: number): string {
  return `g:${vehicleId}:${startedAt}`;
}

export function destinoGastoFromCierre(
  destino?: DestinoCierre | null
): DestinoGasto {
  return feedsProyectoHub(resolveDestinoCierre(destino))
    ? "direccion"
    : "presencia";
}

/**
 * Lista rápida situacional = sin ring. No usa isSituacionListaLibre (exige activo).
 * Interrupt = hijo de un desglosador pausado.
 */
export function classifyFuenteGasto(
  vehicle: Pick<
    Vehicle,
    | "tipoFlota"
    | "tipoReloj"
    | "situacionCronometro"
    | "vehiculoPadreDesglosadorId"
    | "subVehiculos"
  >
): FuenteGasto {
  if (vehicle.vehiculoPadreDesglosadorId) return "interrupt";
  if (vehicle.tipoFlota === "situacion" && !vehicle.situacionCronometro) {
    return "lista_rapida";
  }
  if (vehicle.tipoReloj === "desglosador") {
    const measured = measuredSubSeconds(vehicle.subVehiculos);
    if (measured <= 0) return "idle_desglose";
  }
  return "vehiculo";
}

export function measuredSubSeconds(
  subs?: Array<Pick<SubVehiculo, "duracionFinal">> | null
): number {
  if (!subs || subs.length === 0) return 0;
  let sec = 0;
  for (let i = 0; i < subs.length; i++) {
    const d = subs[i]?.duracionFinal;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) sec += d;
  }
  return Math.max(0, Math.floor(sec));
}

export function measuredSituacionSeconds(
  filas?: Array<Pick<SubTarea, "duracionRealSec">> | null
): number {
  if (!filas || filas.length === 0) return 0;
  let sec = 0;
  for (let i = 0; i < filas.length; i++) {
    const d = filas[i]?.duracionRealSec;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) {
      sec += Math.floor(d);
    }
  }
  return Math.max(0, sec);
}

export function wallSecondsFromRange(startedAt: number, endedAt: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return 0;
  if (endedAt <= startedAt) return 0;
  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

/**
 * Pared del vehículo. Si falta cierre, usa `now`.
 * No inventa duración: sin apertura no hay sello.
 */
export function resolveWallSeconds(
  vehicle: Pick<Vehicle, "aperturaAt" | "cierreAt" | "duracionFinal">,
  now = Date.now()
): { a: number; z: number; sec: number } | null {
  const a = vehicle.aperturaAt;
  const zRaw = vehicle.cierreAt;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) {
    const z =
      typeof zRaw === "number" && Number.isFinite(zRaw) && zRaw > a ? zRaw : now;
    let sec = wallSecondsFromRange(a, z);
    if (sec <= 0 && typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
      sec = Math.max(1, Math.round(vehicle.duracionFinal * 60));
      return { a, z: a + sec * 1000, sec };
    }
    if (sec <= 0) return null;
    return { a, z, sec };
  }
  if (typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
    const sec = Math.max(1, Math.round(vehicle.duracionFinal * 60));
    const z =
      typeof zRaw === "number" && Number.isFinite(zRaw) && zRaw > 0 ? zRaw : now;
    return { a: z - sec * 1000, z, sec };
  }
  return null;
}

export function idleSecondsOfVehicle(
  vehicle: Pick<Vehicle, "tipoReloj" | "tipoFlota" | "subVehiculos" | "subTareas">,
  wallSec: number
): number {
  if (wallSec <= 0) return 0;
  let measured = 0;
  if (vehicle.tipoReloj === "desglosador") {
    measured = measuredSubSeconds(vehicle.subVehiculos);
  } else if (vehicle.tipoFlota === "situacion") {
    measured = measuredSituacionSeconds(vehicle.subTareas);
  }
  if (measured <= 0) return wallSec;
  const idle = wallSec - measured;
  return idle >= IDLE_FLOOR_SEC ? idle : 0;
}

export function sealGastoTiempo(
  vehicle: Pick<
    Vehicle,
    | "id"
    | "titulo"
    | "proyectoId"
    | "destinoCierre"
    | "aperturaAt"
    | "cierreAt"
    | "duracionFinal"
    | "tipoFlota"
    | "tipoReloj"
    | "situacionCronometro"
    | "vehiculoPadreDesglosadorId"
    | "subVehiculos"
    | "subTareas"
  >,
  now = Date.now()
): GastoTiempoSello | null {
  const vid = (vehicle.id ?? "").trim();
  if (!vid) return null;
  const wall = resolveWallSeconds(vehicle, now);
  if (!wall) return null;
  const dest = destinoGastoFromCierre(vehicle.destinoCierre);
  const src = classifyFuenteGasto(vehicle);
  const idle = idleSecondsOfVehicle(vehicle, wall.sec);
  const titulo = vehicle.titulo?.trim();
  const pid = vehicle.proyectoId?.trim();
  return {
    vid,
    ...(titulo ? { t: titulo.slice(0, 80) } : {}),
    ...(pid ? { pid } : {}),
    dest,
    src,
    a: wall.a,
    z: wall.z,
    sec: wall.sec,
    ...(idle > 0 ? { idle } : {}),
  };
}

export type ProyectoRendicionTiempo = {
  minutosPresencia: number;
  minutosDireccion: number;
  minutosIdle: number;
  minutosGastados: number;
  /** Plan vinculado ya ocurrido sin cubrir — no es deuda. */
  minutosNoConquistado: number;
  minutosPlanVinculado: number;
  hasPlanVinculado: boolean;
  headline: string;
};

export function minutosFromGastoSec(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.round(sec / 60);
}

/**
 * Revelación del proyecto: 100% = plan vinculado si existe.
 * Lo no conquistado = plan − gastado. Nunca se llama deuda.
 */
export function buildProyectoRendicion(params: {
  gasto?: ProyectoGastoTiempo | null;
  minutosPlanVinculado?: number;
}): ProyectoRendicionTiempo {
  const g = params.gasto;
  const minutosPresencia = minutosFromGastoSec(g?.secPresencia ?? 0);
  const minutosDireccion = minutosFromGastoSec(g?.secDireccion ?? 0);
  const minutosIdle = minutosFromGastoSec(g?.secIdle ?? 0);
  const minutosGastados = minutosPresencia + minutosDireccion;
  const minutosPlanVinculado = Math.max(0, Math.round(params.minutosPlanVinculado ?? 0));
  const hasPlanVinculado = minutosPlanVinculado > 0;
  const minutosNoConquistado = hasPlanVinculado
    ? Math.max(0, minutosPlanVinculado - minutosGastados)
    : 0;

  let headline: string;
  if (minutosGastados <= 0 && !hasPlanVinculado) {
    headline = "Aún no hay gasto sellado en este proyecto.";
  } else if (hasPlanVinculado && minutosNoConquistado > minutosGastados) {
    headline = `El proyecto revela lo no conquistado: ${minutosNoConquistado} min del plan siguen abiertos.`;
  } else if (minutosDireccion >= minutosPresencia && minutosDireccion > 0) {
    headline = `El proyecto revela Dirección: ${minutosDireccion} min de rumbo frente a ${minutosPresencia} min de presencia.`;
  } else if (minutosPresencia > 0) {
    headline = `El proyecto revela Presencia: estuviste ${minutosPresencia} min sin reclamar Norte.`;
  } else {
    headline = "El proyecto revela el gasto del tiempo planificado.";
  }

  return {
    minutosPresencia,
    minutosDireccion,
    minutosIdle,
    minutosGastados,
    minutosNoConquistado,
    minutosPlanVinculado,
    hasPlanVinculado,
    headline,
  };
}

function pushKey(prev: string[] | undefined, key: string): { next: string[]; isNew: boolean } {
  const cur = prev ?? [];
  if (cur.includes(key)) return { next: cur, isNew: false };
  const next = [...cur, key];
  if (next.length > MAX_GASTO_KEYS) {
    return { next: next.slice(next.length - MAX_GASTO_KEYS), isNew: true };
  }
  return { next, isNew: true };
}

/** Acumula un sello en el ledger del proyecto. Idempotente por vid+apertura. */
export function accrueGastoTiempo(
  prev: ProyectoGastoTiempo | null | undefined,
  sello: GastoTiempoSello
): ProyectoGastoTiempo {
  const base = prev ?? EMPTY_PROYECTO_GASTO;
  const key = gastoCreditKey(sello.vid, sello.a);
  const { next, isNew } = pushKey(base.keys, key);
  if (!isNew) return base;

  const secIdle = Math.max(0, sello.idle ?? 0);
  const sellos = [...(base.sellos ?? []), sello];
  const trimmed =
    sellos.length > MAX_GASTO_SELLOS
      ? sellos.slice(sellos.length - MAX_GASTO_SELLOS)
      : sellos;

  return {
    secPresencia: base.secPresencia + (sello.dest === "presencia" ? sello.sec : 0),
    secDireccion: base.secDireccion + (sello.dest === "direccion" ? sello.sec : 0),
    secIdle: base.secIdle + secIdle,
    n: base.n + 1,
    keys: next,
    sellos: trimmed,
  };
}
