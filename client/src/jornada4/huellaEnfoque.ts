/**
 * Huella del ring / desglosador.
 *
 * Diccionario (músculo que se desarrolla, no etiqueta negativa):
 * - Atención: no montar límites de tiempo.
 * - Orden: listar más de 3 vehículos en el desglosador.
 * - Certeza: editar los minutos.
 * - Ganancia: recuento de vehículos frente a 2–3 horas (los PS pesan poco).
 * - Foco: cerrar el último a tiempo. Quitar, reordenar y postergar son foco.
 */

export const HUELLA_ORDEN_UMBRAL = 3;

export const HUELLA_EJES = [
  { id: "atencion", label: "Atención", definicion: "No montar límites de tiempo." },
  { id: "orden", label: "Orden", definicion: "Listar más de 3 vehículos en el desglosador." },
  { id: "certeza", label: "Certeza", definicion: "Editar los minutos." },
  { id: "ganancia", label: "Ganancia", definicion: "Vehículos del desglosador frente a 2–3 horas." },
  { id: "foco", label: "Foco", definicion: "Cerrar el último a tiempo. Quitar, reordenar y postergar son músculo." },
] as const;

export type HuellaEjeId = (typeof HUELLA_EJES)[number]["id"];

/** Ganancia pesa menos: el valor está en el recuento vs. las horas, no en los PS. */
export const HUELLA_PESOS: Record<HuellaEjeId, number> = {
  atencion: 0.22,
  orden: 0.22,
  certeza: 0.22,
  ganancia: 0.12,
  foco: 0.22,
};

export type RingHuellaKind = "reorder" | "postergar" | "quitar" | "sellar" | "cupo";

export type RingHuellaEjes = {
  atencion: number;
  orden: number;
  certeza: number;
  ganancia: number;
  foco: number;
};

export type RingHuellaLectura = RingHuellaEjes & {
  huella: number;
  relato: string;
  gestos: number;
  minutosGanados: number;
  vehiculos: number;
  horasBloque: number;
};

export type RingHuellaState = {
  launchedAt: number;
  filasLaunch: number;
  minutosLaunch: number;
  tieneMeta: boolean;
  ordenLaunchIds: string[];
  reorders: number;
  postergas: number;
  quitadas: number;
  selladas: number;
  cupoEdits: number;
  /** Snapshot sellado al cerrar el bloque. */
  sello?: RingHuellaLectura;
};

export type HuellaEnfoqueInput = {
  subTareas?: Array<{
    id: string;
    texto?: string;
    enDesgloseCronometro?: boolean;
    resultadoSituacion?: string;
    completada?: boolean;
    minutosCupo?: number;
    cerradaAt?: number;
  }>;
  situacionCronometro?: {
    activo?: boolean;
    minutosGanadosSesion?: number;
    horaFinContratoMs?: number;
    horaFinMs?: number;
    bloqueInicioAt?: number;
    modoEntrenamiento?: boolean;
  } | null;
  situacionCupoAnchor?: { subTareaId: string; startedAt: number } | null;
  ringHuella?: RingHuellaState;
  aperturaAt?: number;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function cronRows(input: HuellaEnfoqueInput) {
  return (input.subTareas ?? []).filter(st => st.enDesgloseCronometro);
}

export function seedRingHuella(opts: {
  launchedAt: number;
  filasLaunch: number;
  minutosLaunch: number;
  tieneMeta: boolean;
  ordenLaunchIds: string[];
}): RingHuellaState {
  return {
    launchedAt: opts.launchedAt,
    filasLaunch: Math.max(0, opts.filasLaunch),
    minutosLaunch: Math.max(0, Math.round(opts.minutosLaunch)),
    tieneMeta: opts.tieneMeta,
    ordenLaunchIds: [...opts.ordenLaunchIds],
    reorders: 0,
    postergas: 0,
    quitadas: 0,
    selladas: 0,
    cupoEdits: 0,
  };
}

/** Semilla de fallback si el vehículo nació antes de la huella. */
export function ensureRingHuella(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaState {
  if (vehicle.ringHuella) return vehicle.ringHuella;
  const rows = cronRows(vehicle);
  const sc = vehicle.situacionCronometro;
  const start = sc?.bloqueInicioAt ?? vehicle.aperturaAt ?? nowMs;
  const fin = sc?.horaFinContratoMs ?? sc?.horaFinMs;
  const minutosFromMeta =
    fin != null && fin > start ? Math.max(1, Math.round((fin - start) / 60_000)) : 0;
  const minutosCupo = rows.reduce((s, st) => s + (st.minutosCupo ?? 0), 0);
  return seedRingHuella({
    launchedAt: start,
    filasLaunch: rows.length,
    minutosLaunch: minutosFromMeta || minutosCupo,
    tieneMeta: fin != null,
    ordenLaunchIds: rows.map(st => st.id),
  });
}

export function bumpRingHuella(
  current: RingHuellaState,
  kind: RingHuellaKind
): RingHuellaState {
  const next = { ...current };
  if (kind === "reorder") next.reorders += 1;
  else if (kind === "postergar") next.postergas += 1;
  else if (kind === "quitar") next.quitadas += 1;
  else if (kind === "sellar") next.selladas += 1;
  else next.cupoEdits += 1;
  return next;
}

export function bumpRingHuellaOnVehicle(
  vehicle: HuellaEnfoqueInput,
  kind: RingHuellaKind,
  nowMs = Date.now()
): RingHuellaState {
  return bumpRingHuella(ensureRingHuella(vehicle, nowMs), kind);
}

export function mergeRingHuella(
  a?: RingHuellaState | null,
  b?: RingHuellaState | null
): RingHuellaState | undefined {
  if (!a && !b) return undefined;
  if (!a) return b ?? undefined;
  if (!b) return a;
  const gestureScore = (h: RingHuellaState) =>
    h.reorders + h.postergas + h.quitadas + h.selladas + h.cupoEdits + (h.sello ? 20 : 0);
  const richer = gestureScore(a) >= gestureScore(b) ? a : b;
  const other = richer === a ? b : a;
  const launchedAt =
    a.launchedAt > 0 && b.launchedAt > 0
      ? Math.min(a.launchedAt, b.launchedAt)
      : a.launchedAt || b.launchedAt;
  return {
    launchedAt,
    filasLaunch: Math.max(a.filasLaunch, b.filasLaunch),
    minutosLaunch: Math.max(a.minutosLaunch, b.minutosLaunch),
    tieneMeta: a.tieneMeta || b.tieneMeta,
    ordenLaunchIds:
      richer.ordenLaunchIds.length >= other.ordenLaunchIds.length
        ? richer.ordenLaunchIds
        : other.ordenLaunchIds,
    reorders: Math.max(a.reorders, b.reorders),
    postergas: Math.max(a.postergas, b.postergas),
    quitadas: Math.max(a.quitadas, b.quitadas),
    selladas: Math.max(a.selladas, b.selladas),
    cupoEdits: Math.max(a.cupoEdits, b.cupoEdits),
    ...(richer.sello || other.sello ? { sello: richer.sello ?? other.sello } : {}),
  };
}

function isPending(st: { resultadoSituacion?: string; completada?: boolean }): boolean {
  const r = st.resultadoSituacion ?? (st.completada ? "cumplido" : "pendiente");
  return r === "pendiente";
}

function nVehiculosDesglosador(state: RingHuellaState, rowCount: number): number {
  return Math.max(state.filasLaunch, rowCount, state.filasLaunch + state.selladas);
}

function cerroUltimoATiempo(vehicle: HuellaEnfoqueInput, nowMs: number): boolean {
  const rows = cronRows(vehicle);
  if (rows.length === 0) return false;
  if (rows.some(isPending)) return false;
  const meta =
    vehicle.situacionCronometro?.horaFinContratoMs ?? vehicle.situacionCronometro?.horaFinMs;
  if (meta == null) return false;
  const lastAt = rows.reduce((m, r) => Math.max(m, r.cerradaAt ?? 0), 0) || nowMs;
  return lastAt <= meta;
}

function ultimoEnJuegoATiempo(vehicle: HuellaEnfoqueInput, nowMs: number): boolean {
  const pending = cronRows(vehicle).filter(isPending);
  if (pending.length !== 1) return false;
  const meta =
    vehicle.situacionCronometro?.horaFinContratoMs ?? vehicle.situacionCronometro?.horaFinMs;
  if (meta == null) return false;
  return nowMs <= meta;
}

function scoreAtencion(quitadas: number, selladas: number, tieneMeta: boolean): number {
  // Músculo: no montar límites. Quitar = el tiempo no se monta en el foco.
  let n = 28;
  n += Math.min(5, quitadas) * 12;
  if (tieneMeta && selladas === 0) n += 24;
  return clampPct(n);
}

function scoreOrden(nVeh: number): number {
  if (nVeh <= 1) return 18;
  if (nVeh === 2) return 38;
  if (nVeh === HUELLA_ORDEN_UMBRAL) return 58;
  return clampPct(78 + Math.min(22, (nVeh - 4) * 7));
}

function scoreCerteza(cupoEdits: number): number {
  return clampPct(24 + Math.min(8, cupoEdits) * 10);
}

function scoreGanancia(nVeh: number, minutosBloque: number, minutosGanados: number): number {
  const horas = minutosBloque / 60;
  let n = 16;
  n += Math.min(36, Math.max(0, nVeh) * 7);
  if (horas >= 2 && horas <= 3.5) n += 28;
  else if (horas >= 1.5) n += 16;
  else if (horas >= 1) n += 8;
  if (horas >= 1) n += Math.min(14, (nVeh / horas) * 4);
  n += Math.min(6, Math.round(minutosGanados / 5));
  return clampPct(n);
}

function scoreFoco(opts: {
  reorders: number;
  postergas: number;
  quitadas: number;
  cerroUltimoATiempo: boolean;
  ultimoEnJuegoATiempo: boolean;
}): number {
  let n = 22;
  n += Math.min(5, opts.reorders) * 8;
  n += Math.min(4, opts.postergas) * 10;
  n += Math.min(4, opts.quitadas) * 10;
  if (opts.cerroUltimoATiempo) n += 28;
  else if (opts.ultimoEnJuegoATiempo) n += 12;
  return clampPct(n);
}

function relatoHuella(args: {
  nVeh: number;
  horas: number;
  cupoEdits: number;
  reorders: number;
  postergas: number;
  quitadas: number;
  selladas: number;
  cerroUltimoATiempo: boolean;
}): string {
  const {
    nVeh,
    horas,
    cupoEdits,
    reorders,
    postergas,
    quitadas,
    selladas,
    cerroUltimoATiempo,
  } = args;
  if (cerroUltimoATiempo) {
    return "Cerraste el último a tiempo. Foco: el músculo ya está.";
  }
  if (nVeh > HUELLA_ORDEN_UMBRAL) {
    return `Listaste ${nVeh} vehículos en el desglosador. Orden.`;
  }
  if (cupoEdits > 0) {
    return cupoEdits === 1
      ? "Editaste los minutos. Certeza en desarrollo."
      : `Editaste los minutos ${cupoEdits} veces. Certeza en desarrollo.`;
  }
  const focoGestos: string[] = [];
  if (reorders > 0) focoGestos.push("reordenar");
  if (postergas > 0) focoGestos.push("postergar");
  if (quitadas > 0) focoGestos.push("quitar");
  if (focoGestos.length > 0) {
    const cabeza = focoGestos.join(", ");
    return `${cabeza.charAt(0).toUpperCase()}${cabeza.slice(1)}: eso es foco. No hay etiqueta negativa — es músculo.`;
  }
  if (horas >= 2 && nVeh >= 4) {
    const h = horas >= 10 ? Math.round(horas) : Math.round(horas * 10) / 10;
    return `${nVeh} vehículos en ${h} h. Esa es la ganancia del desglosador.`;
  }
  if (quitadas > 0 && selladas === 0) {
    return "El tiempo no se montó en el foco. Atención.";
  }
  return "El desglosador entrena músculo: atención, orden, certeza, foco.";
}

export function computeHuellaEnfoque(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaLectura {
  const state = ensureRingHuella(vehicle, nowMs);
  if (state.sello && vehicle.situacionCronometro?.activo !== true) {
    const s = state.sello;
    return {
      ...s,
      vehiculos: s.vehiculos ?? state.filasLaunch,
      horasBloque: s.horasBloque ?? state.minutosLaunch / 60,
    };
  }

  const rows = cronRows(vehicle);
  const nVeh = nVehiculosDesglosador(state, rows.length);
  const minutosBloque = state.minutosLaunch;
  const horasBloque = minutosBloque / 60;
  const minutosGanados = vehicle.situacionCronometro?.minutosGanadosSesion ?? 0;
  const ultimoCerrado = cerroUltimoATiempo(vehicle, nowMs);
  const ultimoEnJuego = ultimoEnJuegoATiempo(vehicle, nowMs);

  const ejes: RingHuellaEjes = {
    atencion: scoreAtencion(state.quitadas, state.selladas, state.tieneMeta),
    orden: scoreOrden(nVeh),
    certeza: scoreCerteza(state.cupoEdits),
    ganancia: scoreGanancia(nVeh, minutosBloque, minutosGanados),
    foco: scoreFoco({
      reorders: state.reorders,
      postergas: state.postergas,
      quitadas: state.quitadas,
      cerroUltimoATiempo: ultimoCerrado,
      ultimoEnJuegoATiempo: ultimoEnJuego,
    }),
  };
  const huella = clampPct(
    ejes.atencion * HUELLA_PESOS.atencion +
      ejes.orden * HUELLA_PESOS.orden +
      ejes.certeza * HUELLA_PESOS.certeza +
      ejes.ganancia * HUELLA_PESOS.ganancia +
      ejes.foco * HUELLA_PESOS.foco
  );
  const gestos = state.reorders + state.postergas + state.quitadas;

  return {
    ...ejes,
    huella,
    gestos,
    minutosGanados,
    vehiculos: nVeh,
    horasBloque,
    relato: relatoHuella({
      nVeh,
      horas: horasBloque,
      cupoEdits: state.cupoEdits,
      reorders: state.reorders,
      postergas: state.postergas,
      quitadas: state.quitadas,
      selladas: state.selladas,
      cerroUltimoATiempo: ultimoCerrado,
    }),
  };
}

export function sellRingHuella(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaState {
  const state = ensureRingHuella(vehicle, nowMs);
  return { ...state, sello: computeHuellaEnfoque({ ...vehicle, ringHuella: state }, nowMs) };
}

export function huellaEjesLine(lectura: RingHuellaLectura): string {
  return HUELLA_EJES.map(e => `${e.label} ${lectura[e.id]}`).join(" · ");
}

export function huellaCierreCopy(lectura: RingHuellaLectura): {
  title: string;
  description: string;
} {
  return {
    title: `Huella ${lectura.huella}%`,
    description: `${lectura.relato} ${huellaEjesLine(lectura)}.`,
  };
}
