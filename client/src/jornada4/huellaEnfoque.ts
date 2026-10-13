/**
 * Huella del ring de enfoque.
 *
 * La coreografía viva (reordenar, postergar, recortar, ganar minutos)
 * ya ocurre. Este módulo la nombra y la puntúa sin pedirle al operador
 * que invente tareas extra en el desglosador.
 *
 * Puro: sin tick, sin ConcienciaEngine, sin voz.
 */

export const HUELLA_EJES = [
  { id: "atencion", label: "Atención" },
  { id: "orden", label: "Orden" },
  { id: "certeza", label: "Certeza" },
  { id: "ganancia", label: "Ganancia" },
  { id: "foco", label: "Foco" },
] as const;

export type HuellaEjeId = (typeof HUELLA_EJES)[number]["id"];

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

/** Espejo local de minutosGanadosEnVivoFoco — sin acoplar el motor a SubTarea. */
function liveGananciaMin(vehicle: HuellaEnfoqueInput, nowMs: number): number {
  const anchor = vehicle.situacionCupoAnchor;
  if (!anchor?.subTareaId) return 0;
  const focal = cronRows(vehicle).find(st => st.id === anchor.subTareaId);
  if (!focal || !isPending(focal)) return 0;
  const cupoMin = focal.minutosCupo ?? 0;
  if (cupoMin <= 0) return 0;
  const elapsedMs = Math.max(0, nowMs - anchor.startedAt);
  if (elapsedMs < 60_000) return 0;
  return Math.max(0, cupoMin - Math.ceil(elapsedMs / 60_000));
}

function relatoHuella(args: {
  gestos: number;
  reorders: number;
  postergas: number;
  quitadas: number;
  selladas: number;
  minutosGanados: number;
  closed: number;
  huella: number;
}): string {
  const {
    gestos,
    reorders,
    postergas,
    quitadas,
    selladas,
    minutosGanados,
    closed,
    huella,
  } = args;

  if (selladas >= 3) {
    return "Sellaste filas en vivo: eso roba el foco. La huella premia recortar y reordenar, no nombrar de más.";
  }
  if (gestos > 0 && minutosGanados > 0) {
    const partes: string[] = [];
    if (reorders > 0) partes.push(`reordenaste ${reorders}`);
    if (postergas > 0) partes.push(`postergaste ${postergas}`);
    if (quitadas > 0) partes.push(`recortaste ${quitadas}`);
    const cabeza = partes.join(", ");
    return `${cabeza.charAt(0).toUpperCase()}${cabeza.slice(1)} y ganaste ${minutosGanados} min. El ring te entrenó.`;
  }
  if (quitadas > 0) {
    return `Quitaste ${quitadas} ${quitadas === 1 ? "fila" : "filas"}: el foco se quedó nítido.`;
  }
  if (minutosGanados > 0) {
    return `Ganaste ${minutosGanados} min sin inventar tareas extra. Eso es el ring.`;
  }
  if (gestos > 0) {
    return "Esa coreografía —ordenar, postergar, recortar— es el valor del ring. Ya está contando.";
  }
  if (closed > 0) {
    return "Ejecutaste el orden que sellaste. Certeza alta: no hizo falta nombrar más.";
  }
  if (huella >= 55) {
    return "Planificar, reordenar y recortar es el entrenamiento. Ya está contando.";
  }
  return "El ring no es lista vacía: cada gesto de orden es huella.";
}

export function computeHuellaEnfoque(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaLectura {
  const state = ensureRingHuella(vehicle, nowMs);
  if (state.sello && vehicle.situacionCronometro?.activo !== true) {
    return state.sello;
  }

  const rows = cronRows(vehicle);
  const closedRows = rows.filter(st => !isPending(st));
  const cumplidos = closedRows.filter(st => st.resultadoSituacion === "cumplido").length;
  const fallados = closedRows.filter(st => st.resultadoSituacion === "fallado").length;
  const avances = closedRows.filter(st => st.resultadoSituacion === "avance").length;
  const closed = closedRows.length;

  const minutosGanados =
    (vehicle.situacionCronometro?.minutosGanadosSesion ?? 0) + liveGananciaMin(vehicle, nowMs);

  const reorders = state.reorders;
  const postergas = state.postergas;
  const quitadas = state.quitadas;
  const selladas = state.selladas;
  const cupoEdits = state.cupoEdits;
  const gestos = reorders + postergas + quitadas;

  const anchor = vehicle.situacionCupoAnchor;
  const focal = anchor ? rows.find(st => st.id === anchor.subTareaId) : undefined;
  const holdingFocus = Boolean(focal && isPending(focal));
  const cupoFocal = focal?.minutosCupo ?? 0;
  const elapsedMin =
    holdingFocus && anchor
      ? Math.max(0, (nowMs - anchor.startedAt) / 60_000)
      : 0;
  const focusElapsedRatio =
    holdingFocus && cupoFocal > 0 ? Math.min(1, elapsedMin / cupoFocal) : 0;

  const closedN = Math.max(1, cumplidos + fallados + avances);
  const closeQuality = (cumplidos * 100 + avances * 55 + fallados * 15) / closedN;
  let atencion = closed > 0 ? 28 + closeQuality * 0.52 : 42;
  atencion += Math.min(3, quitadas) * 7;
  atencion -= Math.min(4, selladas) * 9;
  if (holdingFocus) atencion += 8;

  const filas = Math.max(state.filasLaunch, rows.length);
  let orden = filas <= 1 ? 55 : 50;
  if (filas > 1) {
    orden += Math.min(3, reorders) * 10;
    orden += Math.min(2, postergas) * 8;
    orden += Math.min(2, quitadas) * 6;
    const cap = Math.max(4, filas * 2);
    if (reorders > cap) orden -= Math.min(25, (reorders - cap) * 5);
  }

  let certeza = 22;
  if (state.tieneMeta) certeza += 26;
  if (state.filasLaunch >= 1) certeza += 16;
  if (state.filasLaunch >= 2) certeza += 20;
  if (state.minutosLaunch >= 10) certeza += 12;
  certeza -= Math.min(3, cupoEdits) * 7;
  certeza -= Math.min(3, selladas) * 8;

  const ganancia = minutosGanados <= 0 ? 18 : 22 + minutosGanados * 6;

  let foco = 48;
  if (holdingFocus) foco += 14;
  foco += Math.min(20, focusElapsedRatio * 20);
  foco += Math.min(2, postergas) * 6;
  foco -= Math.min(3, selladas) * 11;
  if (selladas === 0 && closed >= 1) foco += 8;
  if (vehicle.situacionCronometro?.modoEntrenamiento) foco += 4;

  const ejes: RingHuellaEjes = {
    atencion: clampPct(atencion),
    orden: clampPct(orden),
    certeza: clampPct(certeza),
    ganancia: clampPct(ganancia),
    foco: clampPct(foco),
  };
  const huella = clampPct(
    (ejes.atencion + ejes.orden + ejes.certeza + ejes.ganancia + ejes.foco) / 5
  );

  return {
    ...ejes,
    huella,
    gestos,
    minutosGanados,
    relato: relatoHuella({
      gestos,
      reorders,
      postergas,
      quitadas,
      selladas,
      minutosGanados,
      closed,
      huella,
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
