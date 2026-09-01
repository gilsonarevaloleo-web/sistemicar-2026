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

export interface TimonHoraVista {
  numero: number;
  minutos: number;
  vehiculos: TimonVehiculoStamp[];
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

export function horasDeEpisodio(episodio: TimonEpisodio): TimonHoraVista[] {
  if (episodio.minutosAcumulados <= 0) {
    return [
      {
        numero: 1,
        minutos: 0,
        vehiculos: [],
        completa: false,
      },
    ];
  }
  const n = horaEnCurso(episodio.minutosAcumulados);
  const horas: TimonHoraVista[] = [];
  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const minutos = isLast
      ? episodio.minutosAcumulados - (i - 1) * MINUTOS_POR_HORA
      : MINUTOS_POR_HORA;
    const vehiculos = episodio.vehiculos.filter(
      v => v.horaInicio <= i && i <= v.horaFin
    );
    horas.push({
      numero: i,
      minutos,
      vehiculos,
      completa: minutos >= MINUTOS_POR_HORA,
    });
  }
  return horas;
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
 * No usa unidades ni duracionFinal si hay reloj de pared.
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

export type TimonVehiculoFuente = {
  id: string;
  titulo?: string;
  status?: string;
  tipoFlota?: string;
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

export function vehiculoPerteneceAlTimon(
  v: TimonVehiculoFuente,
  opts: { proyectoId: string; oleadaId?: string; puntoId: string }
): boolean {
  if (skipsTimonCoverage(v) || !vehiculoEsDireccionTimon(v)) return false;
  if ((v.proyectoId ?? "").trim() !== opts.proyectoId) return false;
  const stamped = v.oleadaPuntoId?.trim();
  if (stamped) return stamped === opts.puntoId;
  if (opts.oleadaId && v.proyectoPeldanoId && v.proyectoPeldanoId !== opts.oleadaId) {
    return false;
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
  const minutos = wallMinutosReales(v, now);
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

/**
 * Historia real del timón: pared de cada vehículo de dirección en este punto,
 * vivos incluidos. Si el sello guardado es menor que la pared, gana la pared.
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

  const byId = new Map<string, TimonVehiculoStamp>();
  for (const s of base.vehiculos) {
    byId.set(s.vehicleId, s);
  }

  const matching = params.vehicles.filter(v =>
    vehiculoPerteneceAlTimon(v, {
      proyectoId: params.proyectoId,
      oleadaId: params.oleadaId,
      puntoId: params.puntoId,
    })
  );
  matching.sort((a, b) => (a.aperturaAt ?? 0) - (b.aperturaAt ?? 0));

  for (const v of matching) {
    const wall = wallMinutosReales(v, now);
    if (wall <= 0) continue;
    const prev = byId.get(v.id);
    if (prev) {
      if (wall > prev.minutos) {
        byId.set(v.id, { ...prev, minutos: wall, titulo: prev.titulo || v.titulo || prev.titulo });
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
