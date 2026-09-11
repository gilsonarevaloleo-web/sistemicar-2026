/**
 * Horas enumeradas del timón.
 *
 * El punto de producción acumula vehículos en Hora 1, Hora 2, Hora 3…
 * La conciencia siente el enfoque en horas, no en minutos sueltos.
 * Al cambiar el timón, esa numeración se sella: la estancia se vuelve peldaño
 * (lo ya caminado). El nuevo punto empieza otra vez en Hora 1.
 */

import {
  isContenedorDesglose,
  roundMinFromSec,
  trabajoMinutosDeVehiculo,
  type VehiculoMinutosFuente,
} from "./vehiculoMinutos";
import {
  minutosPausa,
  nombrePausa,
  type VehiculoPausaStamp,
} from "./vehiculoPausa";

export const MINUTOS_POR_HORA = 60;

export type TimonHistoriaKind = "trabajo" | "pausa";

export interface TimonVehiculoStamp {
  vehicleId: string;
  titulo: string;
  minutos: number;
  tipoOrigen: "tiempo" | "situacion";
  closedAt: number;
  /** Cuándo se activó el sub/vehículo — verdad de reloj, no el plan. */
  openedAt?: number;
  /** trabajo = unidad/fila; pausa = presencia del proyecto. */
  kind?: TimonHistoriaKind;
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
  return episodio.vehiculos.some(
    v => v.vehicleId === id || v.vehicleId.startsWith(`${id}:`)
  );
}

export function accrueVehiculoAlTimon(
  episodio: TimonEpisodio,
  input: {
    vehicleId: string;
    titulo: string;
    minutos: number;
    tipoOrigen: "tiempo" | "situacion";
    closedAt?: number;
    openedAt?: number;
    kind?: TimonHistoriaKind;
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
    ...(input.openedAt != null ? { openedAt: input.openedAt } : {}),
    kind: input.kind ?? "trabajo",
    horaInicio,
    horaFin,
  };
  const opened = stamp.openedAt;
  const startedAt =
    opened != null && opened > 0
      ? Math.min(episodio.startedAt, opened)
      : episodio.startedAt;
  return {
    ...episodio,
    startedAt,
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
  const trabajo = episodio.vehiculos.filter(v => v.kind !== "pausa");
  const n = horaEnCurso(episodio.minutosAcumulados);
  const offsets = offsetsDeVehiculos(trabajo);
  const horas: TimonHoraVista[] = [];
  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const minutos = isLast
      ? episodio.minutosAcumulados - (i - 1) * MINUTOS_POR_HORA
      : MINUTOS_POR_HORA;
    const vehiculos = trabajo.filter(
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

export type TimonLedgerRow = {
  vehicleId: string;
  titulo: string;
  minutos: number;
  closedAt: number;
  openedAt?: number;
  kind?: TimonHistoriaKind;
  tipoOrigen: "tiempo" | "situacion";
};

/** Historia del timón: cada sub/vehículo una vez, con su duración real y cuándo se activó. */
export function ledgerVehiculosTimon(
  episodio: TimonEpisodio | null | undefined
): TimonLedgerRow[] {
  if (!episodio) return [];
  return episodio.vehiculos
    .filter(v => v.minutos > 0 && v.kind !== "pausa")
    .map(v => ({
      vehicleId: v.vehicleId,
      titulo: v.titulo,
      minutos: v.minutos,
      closedAt: v.closedAt,
      openedAt: v.openedAt,
      kind: v.kind ?? "trabajo",
      tipoOrigen: v.tipoOrigen,
    }));
}

export function ledgerPausasTimon(
  episodio: TimonEpisodio | null | undefined
): TimonLedgerRow[] {
  if (!episodio) return [];
  return episodio.vehiculos
    .filter(v => v.minutos > 0 && v.kind === "pausa")
    .map(v => ({
      vehicleId: v.vehicleId,
      titulo: v.titulo,
      minutos: v.minutos,
      closedAt: v.closedAt,
      openedAt: v.openedAt,
      kind: "pausa" as const,
      tipoOrigen: v.tipoOrigen,
    }));
}

/** Fecha + hora de un envío de producción, en el reloj Lima (es-PE). */
export function formatCuandoProduccion(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Lanzamiento → fin (o en curso). Verdad del vehículo, no del plan. */
export function formatRangoProduccion(
  openedAt?: number | null,
  closedAt?: number | null,
  live = false
): string {
  if (openedAt && closedAt && !live && openedAt !== closedAt) {
    return `${formatCuandoProduccion(openedAt)} → ${formatCuandoProduccion(closedAt)}`;
  }
  if (openedAt && live) {
    return `${formatCuandoProduccion(openedAt)} → en curso`;
  }
  if (openedAt) return formatCuandoProduccion(openedAt);
  if (closedAt) return formatCuandoProduccion(closedAt);
  return "—";
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

/**
 * Minutos de trabajo para el reporte de producción.
 * Contenedor (Enfoque/Conquista): Σ minutos de cada vehículo interno
 * (fila, unidad, tramo vivo). Hueco sin vehículo → 0, no la pared.
 * Vehículo simple (lista libre, interrupción, rápido): pared propia.
 */
export function trabajoMinutosReales(
  vehicle: VehiculoMinutosFuente & {
    aperturaAt?: number;
    cierreAt?: number;
    duracionFinal?: number;
  },
  now = Date.now()
): number {
  if (isContenedorDesglose(vehicle)) {
    return trabajoMinutosDeVehiculo(vehicle, now);
  }
  const medido = trabajoMinutosDeVehiculo(vehicle, now);
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
  desglosadorPausa?: VehiculoMinutosFuente["desglosadorPausa"];
  situacionNestedPause?: VehiculoMinutosFuente["situacionNestedPause"];
  situacionCronometro?: VehiculoMinutosFuente["situacionCronometro"];
  situacionCupoAnchor?: VehiculoMinutosFuente["situacionCupoAnchor"];
  vehiculoPadreDesglosadorId?: string;
  subVehiculos?: Array<{
    id?: string;
    titulo?: string;
    seccionTitulo?: string;
    proyectoId?: string;
    duracionFinal?: number;
    status?: string;
    aperturaAt?: number;
    cierreAt?: number;
  }> | null;
  subTareas?: Array<{
    id?: string;
    titulo?: string;
    texto?: string;
    seccionTitulo?: string;
    proyectoId?: string;
    duracionRealSec?: number;
    duracionFinal?: number;
    enDesgloseCronometro?: boolean;
    resultadoSituacion?: string;
    cerradaAt?: number;
    creadaAt?: number;
  }> | null;
  pausas?: VehiculoPausaStamp[] | null;
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
 * Vivo sin sello: cuenta si apunta a este proyecto — la verdad es el vehículo,
 * no cuándo se pinchó el punto ni el horario del plan.
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
  // Vivo: la verdad es la activación del vehículo, no cuándo se pinchó el punto.
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

function tipoOrigenDe(v: TimonVehiculoFuente): "tiempo" | "situacion" {
  return v.tipoFlota === "situacion" ? "situacion" : "tiempo";
}

function fallbackTituloVehiculo(v: TimonVehiculoFuente): string {
  return (v.titulo ?? "").trim() || "Vehículo";
}

/** Nombre de la historia: el sub, no el desglosador. */
export function tituloHistoriaSub(
  sub: {
    titulo?: string;
    texto?: string;
    seccionTitulo?: string;
  },
  fallback: string
): string {
  return (
    (sub.titulo ?? "").trim() ||
    (sub.texto ?? "").trim() ||
    (sub.seccionTitulo ?? "").trim() ||
    fallback
  );
}

function stampShell(
  vehicleId: string,
  titulo: string,
  minutos: number,
  tipoOrigen: "tiempo" | "situacion",
  openedAt: number | undefined,
  closedAt: number,
  kind: TimonHistoriaKind = "trabajo"
): TimonVehiculoStamp | null {
  if (minutos <= 0) return null;
  const horaInicio = horaNumeroDeMinuto(0);
  const horaFin = horaNumeroDeMinuto(minutos - 1);
  return {
    vehicleId,
    titulo: titulo.trim() || "Vehículo",
    minutos,
    tipoOrigen,
    openedAt,
    closedAt,
    kind,
    horaInicio,
    horaFin,
  };
}

function minutosSubConquista(
  sub: NonNullable<TimonVehiculoFuente["subVehiculos"]>[number],
  v: TimonVehiculoFuente,
  now: number
): number {
  const closed = sub.duracionFinal;
  if (
    sub.status !== "activo" &&
    sub.status !== "nested_paused" &&
    typeof closed === "number" &&
    closed > 0
  ) {
    return roundMinFromSec(closed);
  }
  if (sub.status === "nested_paused") {
    const pausa = v.desglosadorPausa;
    if (pausa?.elapsedSecSnapshot != null && pausa.elapsedSecSnapshot >= 0) {
      return roundMinFromSec(pausa.elapsedSecSnapshot);
    }
    if (sub.aperturaAt && pausa?.pausadoAt && pausa.pausadoAt > sub.aperturaAt) {
      return roundMinFromSec((pausa.pausadoAt - sub.aperturaAt) / 1000);
    }
  }
  if (sub.status === "activo" && sub.aperturaAt && sub.aperturaAt > 0) {
    if (v.interrupcionActiva && v.desglosadorPausa?.pausadoAt) {
      const z = v.desglosadorPausa.pausadoAt;
      if (z > sub.aperturaAt) return roundMinFromSec((z - sub.aperturaAt) / 1000);
      return 0;
    }
    return roundMinFromSec((now - sub.aperturaAt) / 1000);
  }
  if (typeof closed === "number" && closed > 0) return roundMinFromSec(closed);
  return 0;
}

function minutosFilaEnfoque(
  fila: NonNullable<TimonVehiculoFuente["subTareas"]>[number],
  v: TimonVehiculoFuente,
  now: number
): number {
  const sec =
    typeof fila.duracionRealSec === "number" && fila.duracionRealSec > 0
      ? fila.duracionRealSec
      : typeof fila.duracionFinal === "number" && fila.duracionFinal > 0
        ? fila.duracionFinal
        : 0;
  if (sec > 0) return roundMinFromSec(sec);
  const anchor = v.situacionNestedPause?.situacionCupoAnchor ?? v.situacionCupoAnchor;
  if (!anchor || !fila.id || anchor.subTareaId !== fila.id) return 0;
  const started = anchor.startedAt;
  if (typeof started !== "number" || started <= 0) return 0;
  const pendiente =
    (fila.resultadoSituacion ?? "pendiente") === "pendiente" &&
    !!fila.enDesgloseCronometro;
  if (!pendiente) return 0;
  const z = v.situacionNestedPause?.pausedAt ?? now;
  if (z <= started) return 0;
  return roundMinFromSec((z - started) / 1000);
}

function openedClosedFila(
  fila: NonNullable<TimonVehiculoFuente["subTareas"]>[number],
  v: TimonVehiculoFuente,
  now: number,
  minutos: number
): { openedAt?: number; closedAt: number } {
  const anchor = v.situacionNestedPause?.situacionCupoAnchor ?? v.situacionCupoAnchor;
  const liveStart =
    anchor &&
    fila.id &&
    anchor.subTareaId === fila.id &&
    typeof anchor.startedAt === "number"
      ? anchor.startedAt
      : undefined;
  const closedAt =
    typeof fila.cerradaAt === "number" && fila.cerradaAt > 0
      ? fila.cerradaAt
      : v.status === "activo"
        ? now
        : typeof v.cierreAt === "number" && v.cierreAt > 0
          ? v.cierreAt
          : now;
  const openedAt =
    liveStart ??
    (typeof fila.cerradaAt === "number" && fila.cerradaAt > 0 && minutos > 0
      ? fila.cerradaAt - minutos * 60_000
      : typeof fila.creadaAt === "number" && fila.creadaAt > 0
        ? fila.creadaAt
        : typeof v.aperturaAt === "number" && v.aperturaAt > 0
          ? v.aperturaAt
          : undefined);
  return { openedAt, closedAt };
}

/**
 * Cada sub/fila es una historia. El contenedor (desglosador/ring) no se pinta.
 */
export function stampsHistoriaDesdeVehiculo(
  v: TimonVehiculoFuente,
  now = Date.now()
): TimonVehiculoStamp[] {
  const tipo = tipoOrigenDe(v);
  const fallback = fallbackTituloVehiculo(v);
  const out: TimonVehiculoStamp[] = [];

  if (isContenedorDesglose(v)) {
    const unidades = v.subVehiculos ?? [];
    const filas = v.subTareas ?? [];
    if (v.tipoReloj === "desglosador" || unidades.length > 0) {
      unidades.forEach((sub, idx) => {
        const id = (sub.id ?? "").trim() || `u${idx}`;
        const minutos = minutosSubConquista(sub, v, now);
        if (minutos <= 0) return;
        const openedAt =
          typeof sub.aperturaAt === "number" && sub.aperturaAt > 0
            ? sub.aperturaAt
            : typeof v.aperturaAt === "number" && v.aperturaAt > 0
              ? v.aperturaAt
              : undefined;
        const live = sub.status === "activo" || sub.status === "nested_paused";
        const closedAt =
          typeof sub.cierreAt === "number" && sub.cierreAt > 0
            ? sub.cierreAt
            : live
              ? now
              : typeof v.cierreAt === "number" && v.cierreAt > 0
                ? v.cierreAt
                : now;
        const stamp = stampShell(
          `${v.id}:${id}`,
          tituloHistoriaSub(sub, fallback),
          minutos,
          tipo,
          openedAt,
          closedAt
        );
        if (stamp) out.push(stamp);
      });
    }
    if (filas.length > 0 && (v.tipoFlota === "situacion" || v.tipoReloj !== "desglosador")) {
      filas.forEach((fila, idx) => {
        const id = (fila.id ?? "").trim() || `f${idx}`;
        const minutos = minutosFilaEnfoque(fila, v, now);
        if (minutos <= 0) return;
        const { openedAt, closedAt } = openedClosedFila(fila, v, now, minutos);
        const stamp = stampShell(
          `${v.id}:${id}`,
          tituloHistoriaSub(fila, fallback),
          minutos,
          tipo,
          openedAt,
          closedAt
        );
        if (stamp) out.push(stamp);
      });
    }
    return out;
  }

  const minutos = trabajoMinutosReales(v, now);
  const openedAt =
    typeof v.aperturaAt === "number" && v.aperturaAt > 0 ? v.aperturaAt : undefined;
  const closedAt =
    v.status === "activo"
      ? now
      : typeof v.cierreAt === "number" && v.cierreAt > 0
        ? v.cierreAt
        : now;
  const stamp = stampShell(v.id, fallback, minutos, tipo, openedAt, closedAt);
  return stamp ? [stamp] : [];
}

function titulosDuranteIntervalo(
  parentId: string,
  start: number,
  end: number,
  vehicles: TimonVehiculoFuente[]
): string {
  const names: string[] = [];
  for (const c of vehicles) {
    if (!c || c.id === parentId) continue;
    if (skipsTimonCoverage(c)) continue;
    const a = typeof c.aperturaAt === "number" && c.aperturaAt > 0 ? c.aperturaAt : 0;
    if (!a) continue;
    const z =
      typeof c.cierreAt === "number" && c.cierreAt > a
        ? c.cierreAt
        : c.status === "activo"
          ? end
          : 0;
    if (!z) continue;
    if (a < end && z > start) {
      const t = (c.titulo ?? "").trim();
      if (t && !names.includes(t)) names.push(t);
    }
  }
  return names.join(" · ");
}

function pausasEfectivasDe(
  v: TimonVehiculoFuente,
  now: number
): VehiculoPausaStamp[] {
  const list: VehiculoPausaStamp[] = (v.pausas ?? []).map(p => ({ ...p }));
  const liveAt = v.desglosadorPausa?.pausadoAt ?? v.situacionNestedPause?.pausedAt;
  if (typeof liveAt === "number" && liveAt > 0) {
    const already = list.some(p => p.pausadoAt === liveAt && p.reanudadoAt == null);
    if (!already) list.push({ pausadoAt: liveAt });
  }
  return list.filter(p => minutosPausa(p, now) > 0);
}

export function stampsPausaDesdeVehiculo(
  v: TimonVehiculoFuente,
  vehicles: TimonVehiculoFuente[],
  now = Date.now()
): TimonVehiculoStamp[] {
  const pid = (v.proyectoId ?? "").trim();
  if (!pid) return [];
  const out: TimonVehiculoStamp[] = [];
  for (const p of pausasEfectivasDe(v, now)) {
    const z = p.reanudadoAt != null && p.reanudadoAt > p.pausadoAt ? p.reanudadoAt : now;
    const minutos = minutosPausa(p, now);
    const overlap = titulosDuranteIntervalo(v.id, p.pausadoAt, z, vehicles);
    const titulo = nombrePausa({ titulo: p.titulo || overlap || undefined });
    const stamp = stampShell(
      `${v.id}:pausa:${p.pausadoAt}`,
      titulo,
      minutos,
      "situacion",
      p.pausadoAt,
      z,
      "pausa"
    );
    if (stamp) out.push(stamp);
  }
  return out;
}

function rebuildEpisodioDesdeStamps(
  base: Pick<TimonEpisodio, "id" | "puntoId" | "puntoTitulo" | "startedAt">,
  stamps: TimonVehiculoStamp[]
): TimonEpisodio {
  const trabajo = stamps.filter(s => s.kind !== "pausa");
  let minutosAcumulados = 0;
  let minutosTiempo = 0;
  const vehiculos: TimonVehiculoStamp[] = [];
  for (const raw of trabajo) {
    const horaInicio = horaNumeroDeMinuto(minutosAcumulados);
    const horaFin = horaNumeroDeMinuto(minutosAcumulados + raw.minutos - 1);
    vehiculos.push({ ...raw, horaInicio, horaFin });
    minutosAcumulados += raw.minutos;
    if (raw.tipoOrigen === "tiempo") minutosTiempo += raw.minutos;
  }
  for (const pause of stamps.filter(s => s.kind === "pausa")) {
    vehiculos.push({ ...pause, horaInicio: 0, horaFin: 0 });
  }
  const opened = trabajo
    .map(s => s.openedAt)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const startedAt = opened.length > 0 ? Math.min(...opened) : base.startedAt;
  return {
    ...base,
    startedAt,
    minutosAcumulados,
    minutosTiempo,
    vehiculos,
  };
}

function parentIdDeStamp(vehicleId: string): string {
  const cut = vehicleId.indexOf(":");
  return cut > 0 ? vehicleId.slice(0, cut) : vehicleId;
}

function liveForStamp(
  stampId: string,
  liveById: Map<string, TimonVehiculoFuente>
): TimonVehiculoFuente | undefined {
  return liveById.get(stampId) ?? liveById.get(parentIdDeStamp(stampId));
}

function stampSigueEnEpisodio(
  stamp: TimonVehiculoStamp,
  live: TimonVehiculoFuente | undefined,
  opts: TimonPertenenciaOpts
): boolean {
  if (stamp.kind === "pausa") return false;
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

function mergeHistoriaStamps(
  previous: TimonVehiculoStamp[],
  fresh: TimonVehiculoStamp[]
): TimonVehiculoStamp[] {
  const byId = new Map<string, TimonVehiculoStamp>();
  for (const s of previous) byId.set(s.vehicleId, s);
  const expandedParents = new Set<string>();
  for (const s of fresh) {
    byId.set(s.vehicleId, s);
    const parent = parentIdDeStamp(s.vehicleId);
    if (parent !== s.vehicleId) expandedParents.add(parent);
  }
  for (const parent of expandedParents) byId.delete(parent);
  const ordered = [...byId.values()].filter(s => s.kind !== "pausa");
  ordered.sort((a, b) => {
    const ao = a.openedAt ?? a.closedAt;
    const bo = b.openedAt ?? b.closedAt;
    return ao - bo;
  });
  return ordered;
}

/**
 * Historia real del timón: cada sub de ESTE punto, minutos de trabajo
 * (no pared inflada). Un sello viejo de otro enfoque se descarta.
 * El inicio es la activación del primer sub, no el plan ni el pin.
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

  const kept: TimonVehiculoStamp[] = [];
  for (const s of base.vehiculos) {
    if (!stampSigueEnEpisodio(s, liveForStamp(s.vehicleId, liveById), belongOpts)) {
      continue;
    }
    kept.push(s);
  }

  const matching = params.vehicles.filter(v =>
    vehiculoPerteneceAlTimon(v, belongOpts)
  );
  const fresh: TimonVehiculoStamp[] = [];
  for (const v of matching) {
    fresh.push(...stampsHistoriaDesdeVehiculo(v, now));
  }

  return rebuildEpisodioDesdeStamps(base, mergeHistoriaStamps(kept, fresh));
}

/** Presencia: enumeración infinita, nunca sella peldaño. Incluye pausas del proyecto. */
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

  const byId = new Map<string, TimonVehiculoStamp>();
  for (const s of base.vehiculos) {
    if (s.kind === "pausa") continue;
    byId.set(s.vehicleId, s);
  }

  const fresh: TimonVehiculoStamp[] = [];
  for (const v of matching) {
    fresh.push(...stampsHistoriaDesdeVehiculo(v, now));
  }
  const mergedTrabajo = mergeHistoriaStamps([...byId.values()], fresh);

  const pausas: TimonVehiculoStamp[] = [];
  for (const v of params.vehicles) {
    const pid = (v.proyectoId ?? "").trim();
    if (params.proyectoId) {
      if (pid !== params.proyectoId) continue;
    } else if (pid) {
      continue;
    }
    pausas.push(...stampsPausaDesdeVehiculo(v, params.vehicles, now));
  }
  pausas.sort((a, b) => (a.openedAt ?? a.closedAt) - (b.openedAt ?? b.closedAt));

  return rebuildEpisodioDesdeStamps(
    { ...base, puntoId: "presencia", puntoTitulo: "Presencia" },
    [...mergedTrabajo, ...pausas]
  );
}
