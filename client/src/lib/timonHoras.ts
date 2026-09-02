/**
 * Horas enumeradas del timón.
 *
 * El punto de producción acumula vehículos en Hora 1, Hora 2, Hora 3…
 * La conciencia siente el enfoque en horas, no en minutos sueltos.
 * Al cambiar el timón, esa numeración se sella: la estancia se vuelve peldaño
 * (lo ya caminado). El nuevo punto empieza otra vez en Hora 1.
 */

export const MINUTOS_POR_HORA = 60;

export interface TimonVehiculoStamp {
  vehicleId: string;
  titulo: string;
  minutos: number;
  tipoOrigen: "tiempo" | "situacion";
  closedAt: number;
  /** Hora 1-based en la que empieza a contar este vehículo. */
  horaInicio: number;
  /** Hora 1-based en la que termina (puede ser la misma). */
  horaFin: number;
}

/** Trozo de un vehículo dentro de UNA hora. `minutosEnHora` no es la duración total. */
export interface TimonHoraCorte {
  vehicleId: string;
  titulo: string;
  /** Minutos de este vehículo que caen en esta hora (máx. 60). */
  minutosEnHora: number;
  /** Duración real del vehículo, para el ledger (no repetirla en cada hora). */
  minutosTotales: number;
}

export interface TimonHoraVista {
  numero: number;
  minutos: number;
  vehiculos: TimonVehiculoStamp[];
  /** Cortes por hora: 90 min → 60 en Hora 1 + 30 en Hora 2, sin triplicar. */
  cortes: TimonHoraCorte[];
  completa: boolean;
}

export interface TimonEpisodio {
  id: string;
  puntoId: string;
  puntoTitulo: string;
  startedAt: number;
  /** Minutos de todos los envíos a este timón (enumeración). */
  minutosAcumulados: number;
  /** Minutos de origen tiempo — alimentan Min/Horas norte al sellar. */
  minutosTiempo: number;
  vehiculos: TimonVehiculoStamp[];
}

export interface TimonResumenPeldano {
  puntoId: string;
  puntoTitulo: string;
  horas: number;
  minutos: number;
  minutosTiempo: number;
  vehiculos: TimonVehiculoStamp[];
}

/** Offset 0-based en la línea de minutos → número de hora (1-based). */
export function horaNumeroDeMinuto(offsetMin: number): number {
  if (offsetMin < 0) return 1;
  return Math.floor(offsetMin / MINUTOS_POR_HORA) + 1;
}

/** Hora en curso del episodio (siempre ≥ 1). */
export function horaEnCurso(minutosAcumulados: number): number {
  if (minutosAcumulados <= 0) return 1;
  return horaNumeroDeMinuto(minutosAcumulados - 1);
}

export function horasCompletasDeMinutos(minutos: number): number {
  return Math.max(0, Math.floor(Math.max(0, minutos) / MINUTOS_POR_HORA));
}

export function crearTimonEpisodio(
  puntoId: string,
  puntoTitulo: string,
  now = Date.now()
): TimonEpisodio {
  return {
    id: `timon_${now}_${Math.random().toString(36).slice(2, 7)}`,
    puntoId,
    puntoTitulo: puntoTitulo.trim() || "Punto de producción",
    startedAt: now,
    minutosAcumulados: 0,
    minutosTiempo: 0,
    vehiculos: [],
  };
}

export function episodioTimonVacio(
  episodio: TimonEpisodio | null | undefined
): boolean {
  if (!episodio) return true;
  return episodio.minutosAcumulados <= 0 && episodio.vehiculos.length === 0;
}

export function yaEstaEnTimon(
  episodio: TimonEpisodio | null | undefined,
  vehicleId: string
): boolean {
  const id = vehicleId.trim();
  if (!id || !episodio) return false;
  return episodio.vehiculos.some(v => v.vehicleId === id);
}

export function accrueVehiculoAlTimon(
  episodio: TimonEpisodio,
  input: {
    vehicleId: string;
    titulo: string;
    minutos: number;
    tipoOrigen: "tiempo" | "situacion";
    closedAt?: number;
  }
): TimonEpisodio {
  const vehicleId = input.vehicleId.trim();
  if (!vehicleId) return episodio;
  if (yaEstaEnTimon(episodio, vehicleId)) return episodio;
  const minutos = Math.max(0, Math.round(input.minutos));
  if (minutos <= 0) return episodio;

  const start = episodio.minutosAcumulados;
  const horaInicio = horaNumeroDeMinuto(start);
  const horaFin = horaNumeroDeMinuto(start + minutos - 1);
  const stamp: TimonVehiculoStamp = {
    vehicleId,
    titulo: input.titulo.trim() || "Vehículo",
    minutos,
    tipoOrigen: input.tipoOrigen,
    closedAt: input.closedAt ?? Date.now(),
    horaInicio,
    horaFin,
  };
  return {
    ...episodio,
    minutosAcumulados: start + minutos,
    minutosTiempo:
      input.tipoOrigen === "tiempo"
        ? episodio.minutosTiempo + minutos
        : episodio.minutosTiempo,
    vehiculos: [...episodio.vehiculos, stamp],
  };
}

/** Intersección de [offset, offset+minutos) con la hora n (1-based). */
export function minutosCruceHora(
  offsetStart: number,
  minutos: number,
  horaNumero: number
): number {
  const lo = (Math.max(1, horaNumero) - 1) * MINUTOS_POR_HORA;
  const hi = lo + MINUTOS_POR_HORA;
  const a = Math.max(0, offsetStart);
  const b = a + Math.max(0, minutos);
  return Math.max(0, Math.round(Math.min(b, hi) - Math.max(a, lo)));
}

function offsetsDeVehiculos(vehiculos: TimonVehiculoStamp[]): Map<string, number> {
  const map = new Map<string, number>();
  let off = 0;
  for (const v of vehiculos) {
    map.set(v.vehicleId, off);
    off += Math.max(0, v.minutos);
  }
  return map;
}

export function horasDeEpisodio(episodio: TimonEpisodio): TimonHoraVista[] {
  if (episodio.minutosAcumulados <= 0) {
    return [
      {
        numero: 1,
        minutos: 0,
        vehiculos: [],
        cortes: [],
        completa: false,
      },
    ];
  }
  const n = horaEnCurso(episodio.minutosAcumulados);
  const offsets = offsetsDeVehiculos(episodio.vehiculos);
  const horas: TimonHoraVista[] = [];
  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const minutos = isLast
      ? episodio.minutosAcumulados - (i - 1) * MINUTOS_POR_HORA
      : MINUTOS_POR_HORA;
    const vehiculos = episodio.vehiculos.filter(
      v => v.horaInicio <= i && i <= v.horaFin
    );
    const cortes: TimonHoraCorte[] = [];
    for (const v of vehiculos) {
      const slice = minutosCruceHora(offsets.get(v.vehicleId) ?? 0, v.minutos, i);
      if (slice <= 0) continue;
      cortes.push({
        vehicleId: v.vehicleId,
        titulo: v.titulo,
        minutosEnHora: slice,
        minutosTotales: v.minutos,
      });
    }
    horas.push({
      numero: i,
      minutos,
      vehiculos,
      cortes,
      completa: minutos >= MINUTOS_POR_HORA,
    });
  }
  return horas;
}

/** Historia del timón: cada vehículo una vez, con su duración real. */
export function ledgerVehiculosTimon(
  episodio: TimonEpisodio | null | undefined
): { vehicleId: string; titulo: string; minutos: number }[] {
  if (!episodio) return [];
  return episodio.vehiculos
    .filter(v => v.minutos > 0)
    .map(v => ({ vehicleId: v.vehicleId, titulo: v.titulo, minutos: v.minutos }));
}

export function formatHoraLabel(numero: number): string {
  return `Hora ${Math.max(1, Math.round(numero))}`;
}

/**
 * Cantidad que la conciencia puede sentir: horas enteras, sin minutos sueltos.
 * Menos de 60 min → "menos de 1 h".
 */
export function formatHorasCerradas(minutos: number): string {
  const h = horasCompletasDeMinutos(minutos);
  if (h <= 0) return "menos de 1 h";
  return h === 1 ? "1 h" : `${h} h`;
}

export function resumenTimonDesdeEpisodio(
  episodio: TimonEpisodio
): TimonResumenPeldano {
  const horas = horasDeEpisodio(episodio);
  const n =
    episodio.minutosAcumulados <= 0 ? 0 : horas.length;
  return {
    puntoId: episodio.puntoId,
    puntoTitulo: episodio.puntoTitulo,
    horas: n,
    minutos: episodio.minutosAcumulados,
    minutosTiempo: episodio.minutosTiempo,
    vehiculos: episodio.vehiculos,
  };
}

/** Duración sentida con minutos reales (no solo horas cerradas). */
export function formatDuracionTimon(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

/**
 * Pared real del vehículo: apertura → cierre (o ahora si sigue vivo).
 * Cubre el día-jornada (cuándo estuvo abierto). El timón de producción
 * usa `trabajoMinutosReales`: unidades/filas medidas, no la pared inflada.
 */
export function wallMinutosReales(
  vehicle: {
    status?: string;
    aperturaAt?: number;
    cierreAt?: number;
    duracionFinal?: number;
    interrupcionActiva?: boolean;
    desglosadorPausa?: { pausadoAt?: number } | null;
    situacionNestedPause?: { pausedAt?: number } | null;
  },
  now = Date.now()
): number {
  const a = vehicle.aperturaAt;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) {
    let z: number;
    if (vehicle.status === "activo") {
      if (vehicle.interrupcionActiva && vehicle.desglosadorPausa?.pausadoAt) {
        z = vehicle.desglosadorPausa.pausadoAt;
      } else if (vehicle.situacionNestedPause?.pausedAt) {
        z = vehicle.situacionNestedPause.pausedAt;
      } else {
        z = now;
      }
    } else if (typeof vehicle.cierreAt === "number" && vehicle.cierreAt > a) {
      z = vehicle.cierreAt;
    } else {
      z = now;
    }
    if (z > a) return Math.max(1, Math.round((z - a) / 60_000));
  }
  if (typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
    return Math.max(1, Math.round(vehicle.duracionFinal));
  }
  return 0;
}

function measuredMinutosDeSubs(vehicle: {
  tipoReloj?: string;
  tipoFlota?: string;
  subVehiculos?: Array<{ duracionFinal?: number }> | null;
  subTareas?: Array<{ duracionRealSec?: number }> | null;
}): number {
  if (vehicle.tipoReloj === "desglosador" && vehicle.subVehiculos) {
    let sec = 0;
    for (const s of vehicle.subVehiculos) {
      const d = s.duracionFinal;
      if (typeof d === "number" && Number.isFinite(d) && d > 0) sec += d;
    }
    if (sec > 0) return Math.max(1, Math.round(sec / 60));
  }
  if (vehicle.tipoFlota === "situacion" && vehicle.subTareas) {
    let sec = 0;
    for (const s of vehicle.subTareas) {
      const d = s.duracionRealSec;
      if (typeof d === "number" && Number.isFinite(d) && d > 0) sec += d;
    }
    if (sec > 0) return Math.max(1, Math.round(sec / 60));
  }
  return 0;
}

/**
 * Minutos de trabajo para el reporte de producción.
 * Unidades/filas medidas ganan a la pared (un vehículo abierto 4 h con
 * 40 min de costura cuenta 40). Vivo sin medida → pared hasta ahora.
 */
export function trabajoMinutosReales(
  vehicle: {
    status?: string;
    tipoReloj?: string;
    tipoFlota?: string;
    aperturaAt?: number;
    cierreAt?: number;
    duracionFinal?: number;
    interrupcionActiva?: boolean;
    desglosadorPausa?: { pausadoAt?: number } | null;
    situacionNestedPause?: { pausedAt?: number } | null;
    subVehiculos?: Array<{ duracionFinal?: number }> | null;
    subTareas?: Array<{ duracionRealSec?: number }> | null;
  },
  now = Date.now()
): number {
  const medido = measuredMinutosDeSubs(vehicle);
  if (medido > 0) return medido;
  if (vehicle.status !== "activo") {
    if (typeof vehicle.duracionFinal === "number" && vehicle.duracionFinal > 0) {
      return Math.max(1, Math.round(vehicle.duracionFinal));
    }
  }
  return wallMinutosReales(vehicle, now);
}

export type TimonVehiculoFuente = {
  id: string;
  titulo?: string;
  status?: string;
  tipoFlota?: string;
  tipoReloj?: string;
  autoVerdad?: boolean;
  destinoCierre?: string | null;
  proyectoId?: string;
  proyectoPeldanoId?: string;
  oleadaPuntoId?: string;
  aperturaAt?: number;
  cierreAt?: number;
  duracionFinal?: number;
  interrupcionActiva?: boolean;
  desglosadorPausa?: { pausadoAt?: number } | null;
  situacionNestedPause?: { pausedAt?: number } | null;
  vehiculoPadreDesglosadorId?: string;
  subVehiculos?: Array<{
    titulo?: string;
    proyectoId?: string;
    duracionFinal?: number;
  }> | null;
  subTareas?: Array<{
    titulo?: string;
    proyectoId?: string;
    duracionRealSec?: number;
    duracionFinal?: number;
  }> | null;
};

function skipsTimonCoverage(v: TimonVehiculoFuente): boolean {
  if (v.autoVerdad) return true;
  const flota = v.tipoFlota;
  return flota === "descanso" || flota === "verdad";
}

/** Dirección (Norte) apunta a peldaño. Presencia no ensucia el timón. */
export function vehiculoEsDireccionTimon(v: TimonVehiculoFuente): boolean {
  return v.destinoCierre === "peldano";
}

export type TimonPertenenciaOpts = {
  proyectoId: string;
  oleadaId?: string;
  puntoId: string;
  /** Inicio del episodio actual. Vehículos cerrados antes no entran. */
  episodioStartedAt?: number;
};

/**
 * Un vehículo entra al timón solo si apunta a ESTE punto.
 * Sin sello de punto, un cierre viejo no se copia al enfoque nuevo
 * (el bug de "Previo a la producción" en busos negros XL).
 * Vivo sin sello: solo si se abrió en esta estancia.
 */
export function vehiculoPerteneceAlTimon(
  v: TimonVehiculoFuente,
  opts: TimonPertenenciaOpts
): boolean {
  if (skipsTimonCoverage(v) || !vehiculoEsDireccionTimon(v)) return false;
  if ((v.proyectoId ?? "").trim() !== opts.proyectoId) return false;
  if (opts.oleadaId && v.proyectoPeldanoId && v.proyectoPeldanoId !== opts.oleadaId) {
    return false;
  }
  const stamped = v.oleadaPuntoId?.trim();
  if (stamped) return stamped === opts.puntoId;

  const started = opts.episodioStartedAt;
  if (v.status !== "activo") {
    if (typeof started === "number" && started > 0) {
      const closed =
        typeof v.cierreAt === "number" && v.cierreAt > 0 ? v.cierreAt : 0;
      const opened =
        typeof v.aperturaAt === "number" && v.aperturaAt > 0 ? v.aperturaAt : 0;
      if (closed > 0 && closed < started) return false;
      if (opened > 0 && opened < started) return false;
      return closed >= started || opened >= started;
    }
    return false;
  }
  if (typeof started === "number" && started > 0) {
    const opened =
      typeof v.aperturaAt === "number" && v.aperturaAt > 0 ? v.aperturaAt : 0;
    if (opened > 0 && opened + 60_000 < started) return false;
  }
  return true;
}

export function vehiculoPerteneceAPresencia(
  v: TimonVehiculoFuente,
  opts?: { proyectoId?: string }
): boolean {
  if (skipsTimonCoverage(v) || vehiculoEsDireccionTimon(v)) return false;
  if (opts?.proyectoId) {
    const pid = (v.proyectoId ?? "").trim();
    if (pid && pid !== opts.proyectoId) return false;
  }
  return wallMinutosReales(v) > 0 || v.status === "activo";
}

function stampFromVehicle(
  v: TimonVehiculoFuente,
  startOffset: number,
  now: number
): TimonVehiculoStamp | null {
  const minutos = trabajoMinutosReales(v, now);
  if (minutos <= 0) return null;
  const horaInicio = horaNumeroDeMinuto(startOffset);
  const horaFin = horaNumeroDeMinuto(startOffset + minutos - 1);
  const tipoOrigen: "tiempo" | "situacion" =
    v.tipoFlota === "situacion" ? "situacion" : "tiempo";
  return {
    vehicleId: v.id,
    titulo: (v.titulo ?? "").trim() || "Vehículo",
    minutos,
    tipoOrigen,
    closedAt:
      typeof v.cierreAt === "number" && v.cierreAt > 0 ? v.cierreAt : now,
    horaInicio,
    horaFin,
  };
}

function rebuildEpisodioDesdeStamps(
  base: Pick<TimonEpisodio, "id" | "puntoId" | "puntoTitulo" | "startedAt">,
  stamps: TimonVehiculoStamp[]
): TimonEpisodio {
  let minutosAcumulados = 0;
  let minutosTiempo = 0;
  const vehiculos: TimonVehiculoStamp[] = [];
  for (const raw of stamps) {
    const horaInicio = horaNumeroDeMinuto(minutosAcumulados);
    const horaFin = horaNumeroDeMinuto(minutosAcumulados + raw.minutos - 1);
    vehiculos.push({ ...raw, horaInicio, horaFin });
    minutosAcumulados += raw.minutos;
    if (raw.tipoOrigen === "tiempo") minutosTiempo += raw.minutos;
  }
  return {
    ...base,
    minutosAcumulados,
    minutosTiempo,
    vehiculos,
  };
}

function stampSigueEnEpisodio(
  stamp: TimonVehiculoStamp,
  live: TimonVehiculoFuente | undefined,
  opts: TimonPertenenciaOpts
): boolean {
  if (!live) return true;
  if (vehiculoPerteneceAlTimon(live, opts)) return true;
  const stamped = live.oleadaPuntoId?.trim();
  if (stamped && stamped !== opts.puntoId) return false;
  if (typeof opts.episodioStartedAt === "number" && opts.episodioStartedAt > 0) {
    const closed =
      (typeof live.cierreAt === "number" && live.cierreAt > 0
        ? live.cierreAt
        : stamp.closedAt) ?? 0;
    if (closed > 0 && closed < opts.episodioStartedAt) return false;
  }
  return false;
}

/**
 * Historia real del timón: solo vehículos de ESTE punto, minutos de trabajo
 * (no pared inflada). Un sello viejo de otro enfoque se descarta.
 */
export function hydrateTimonEpisodio(params: {
  episodio?: TimonEpisodio | null;
  puntoId: string;
  puntoTitulo: string;
  proyectoId: string;
  oleadaId?: string;
  vehicles: TimonVehiculoFuente[];
  now?: number;
}): TimonEpisodio {
  const now = params.now ?? Date.now();
  const base = params.episodio?.puntoId === params.puntoId
    ? params.episodio
    : crearTimonEpisodio(params.puntoId, params.puntoTitulo, now);
  const belongOpts: TimonPertenenciaOpts = {
    proyectoId: params.proyectoId,
    oleadaId: params.oleadaId,
    puntoId: params.puntoId,
    episodioStartedAt: base.startedAt,
  };

  const liveById = new Map<string, TimonVehiculoFuente>();
  for (const v of params.vehicles) liveById.set(v.id, v);

  const byId = new Map<string, TimonVehiculoStamp>();
  for (const s of base.vehiculos) {
    if (!stampSigueEnEpisodio(s, liveById.get(s.vehicleId), belongOpts)) continue;
    byId.set(s.vehicleId, s);
  }

  const matching = params.vehicles.filter(v =>
    vehiculoPerteneceAlTimon(v, belongOpts)
  );
  matching.sort((a, b) => (a.aperturaAt ?? 0) - (b.aperturaAt ?? 0));

  for (const v of matching) {
    const trabajo = trabajoMinutosReales(v, now);
    if (trabajo <= 0) continue;
    const prev = byId.get(v.id);
    if (prev) {
      const nextMin =
        v.status === "activo" ? Math.max(prev.minutos, trabajo) : trabajo;
      if (nextMin !== prev.minutos || (!prev.titulo && v.titulo)) {
        byId.set(v.id, {
          ...prev,
          minutos: nextMin,
          titulo: prev.titulo || v.titulo || prev.titulo,
        });
      }
    } else {
      const stamp = stampFromVehicle(v, 0, now);
      if (stamp) byId.set(v.id, stamp);
    }
  }

  const ordered: TimonVehiculoStamp[] = [];
  const seen = new Set<string>();
  for (const s of base.vehiculos) {
    const next = byId.get(s.vehicleId);
    if (next) {
      ordered.push(next);
      seen.add(s.vehicleId);
    }
  }
  for (const v of matching) {
    if (seen.has(v.id)) continue;
    const next = byId.get(v.id);
    if (next) ordered.push(next);
  }

  return rebuildEpisodioDesdeStamps(base, ordered);
}

/** Presencia: enumeración infinita, nunca sella peldaño. */
export function hydratePresenciaEpisodio(params: {
  episodio?: TimonEpisodio | null;
  proyectoId?: string;
  vehicles: TimonVehiculoFuente[];
  now?: number;
}): TimonEpisodio {
  const now = params.now ?? Date.now();
  const base =
    params.episodio ??
    crearTimonEpisodio("presencia", "Presencia", params.episodio?.startedAt ?? now);
  const matching = params.vehicles.filter(v =>
    vehiculoPerteneceAPresencia(v, { proyectoId: params.proyectoId })
  );
  matching.sort((a, b) => (a.aperturaAt ?? 0) - (b.aperturaAt ?? 0));

  const byId = new Map<string, TimonVehiculoStamp>();
  for (const s of base.vehiculos) byId.set(s.vehicleId, s);

  for (const v of matching) {
    const wall = wallMinutosReales(v, now);
    if (wall <= 0) continue;
    const prev = byId.get(v.id);
    if (prev) {
      if (wall > prev.minutos) byId.set(v.id, { ...prev, minutos: wall });
    } else {
      const stamp = stampFromVehicle(v, 0, now);
      if (stamp) byId.set(v.id, stamp);
    }
  }

  const ordered: TimonVehiculoStamp[] = [];
  const seen = new Set<string>();
  for (const s of base.vehiculos) {
    const next = byId.get(s.vehicleId);
    if (next) {
      ordered.push(next);
      seen.add(s.vehicleId);
    }
  }
  for (const v of matching) {
    if (seen.has(v.id)) continue;
    const next = byId.get(v.id);
    if (next) ordered.push(next);
  }
  return rebuildEpisodioDesdeStamps(
    { ...base, puntoId: "presencia", puntoTitulo: "Presencia" },
    ordered
  );
}
