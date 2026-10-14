/**
 * Huella del desglosador (suma de todas las filas), no de cada vehículo.
 *
 * Diccionario (músculo, no etiqueta negativa):
 * - Decisión: solo la primera lista. Pensar qué vas a hacer vence la inercia;
 *   ahí nace disponibilidad. Lo que se añade después no es decisión.
 * - Atención: cerrar una fila 5 minutos antes del tope de su cupo.
 * - Producción: añadir filas después del lanzamiento, antes de la ventana
 *   de 5 minutos de atención.
 * - Foco: cerrar la última fila del desglosador en el radio de 5 minutos
 *   respecto al final del bloque.
 * - Orden: quitar, reordenar, postergar.
 *
 * Los PS se quedan: son de Jornada. No son un eje de la huella.
 */

export const HUELLA_DECISION_UMBRAL = 3;
/** @deprecated usar HUELLA_DECISION_UMBRAL */
export const HUELLA_ORDEN_UMBRAL = HUELLA_DECISION_UMBRAL;
export const HUELLA_RADIO_MIN = 5;

export const HUELLA_EJES = [
  {
    id: "decision",
    label: "Decisión",
    definicion:
      "La primera lista: pensar qué vas a hacer. Ahí nace disponibilidad. Lo que se añade después es otra habilidad.",
  },
  {
    id: "atencion",
    label: "Atención",
    definicion: "Cerrar una fila 5 minutos antes del tope de su cupo.",
  },
  {
    id: "produccion",
    label: "Producción",
    definicion:
      "Añadir filas después del lanzamiento, antes de los 5 minutos de atención.",
  },
  {
    id: "foco",
    label: "Foco",
    definicion: "Cerrar la última fila en el radio de 5 minutos respecto al final.",
  },
  {
    id: "orden",
    label: "Orden",
    definicion: "Quitar, reordenar y postergar.",
  },
] as const;

export type HuellaEjeId = (typeof HUELLA_EJES)[number]["id"];

export const HUELLA_PESOS: Record<HuellaEjeId, number> = {
  decision: 0.2,
  atencion: 0.2,
  produccion: 0.2,
  foco: 0.2,
  orden: 0.2,
};

export type RingHuellaKind =
  | "reorder"
  | "postergar"
  | "quitar"
  | "sellar"
  | "cupo"
  | "anadir";

export type RingHuellaEjes = {
  decision: number;
  atencion: number;
  produccion: number;
  foco: number;
  orden: number;
};

export type RingHuellaLectura = RingHuellaEjes & {
  huella: number;
  relato: string;
  gestos: number;
  minutosGanados: number;
  vehiculos: number;
  horasBloque: number;
  desglosadores: number;
  anadidas: number;
  atencionCierres: number;
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
  /** Filas añadidas después del lanzamiento (producción). */
  anadidas?: number;
  /** Snapshot sellado al cerrar el bloque. */
  sello?: RingHuellaLectura;
};

export type HuellaEnfoqueInput = {
  id?: string;
  titulo?: string;
  subTareas?: Array<{
    id: string;
    texto?: string;
    enDesgloseCronometro?: boolean;
    resultadoSituacion?: string;
    completada?: boolean;
    minutosCupo?: number;
    cerradaAt?: number;
    duracionRealSec?: number;
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

export type HuellaHechos = {
  filasLaunch: number;
  anadidas: number;
  reorders: number;
  postergas: number;
  quitadas: number;
  cerradas: number;
  atencionHits: number;
  desglosadores: number;
  focoHits: number;
  focoEnJuego: number;
  minutosGanados: number;
  minutosBloque: number;
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
    anadidas: 0,
  };
}

/** Semilla de fallback si el vehículo nació antes de la huella. */
export function ensureRingHuella(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaState {
  if (vehicle.ringHuella) {
    return { ...vehicle.ringHuella, anadidas: vehicle.ringHuella.anadidas ?? 0 };
  }
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
  const next = { ...current, anadidas: current.anadidas ?? 0 };
  if (kind === "reorder") next.reorders += 1;
  else if (kind === "postergar") next.postergas += 1;
  else if (kind === "quitar") next.quitadas += 1;
  else if (kind === "sellar") next.selladas += 1;
  else if (kind === "anadir") next.anadidas += 1;
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

/** Añadir fila cuenta como producción solo fuera de la ventana de 5 min. */
export function bumpProduccionSiCabe(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaState {
  const state = ensureRingHuella(vehicle, nowMs);
  if (enVentanaAtencion(vehicle, nowMs)) return state;
  return bumpRingHuella(state, "anadir");
}

export function mergeRingHuella(
  a?: RingHuellaState | null,
  b?: RingHuellaState | null
): RingHuellaState | undefined {
  if (!a && !b) return undefined;
  if (!a) return b ? { ...b, anadidas: b.anadidas ?? 0 } : undefined;
  if (!b) return { ...a, anadidas: a.anadidas ?? 0 };
  const aa = { ...a, anadidas: a.anadidas ?? 0 };
  const bb = { ...b, anadidas: b.anadidas ?? 0 };
  const gestureScore = (h: RingHuellaState) =>
    h.reorders +
    h.postergas +
    h.quitadas +
    h.selladas +
    h.cupoEdits +
    (h.anadidas ?? 0) +
    (h.sello ? 20 : 0);
  const richer = gestureScore(aa) >= gestureScore(bb) ? aa : bb;
  const other = richer === aa ? bb : aa;
  const launchedAt =
    aa.launchedAt > 0 && bb.launchedAt > 0
      ? Math.min(aa.launchedAt, bb.launchedAt)
      : aa.launchedAt || bb.launchedAt;
  return {
    launchedAt,
    filasLaunch: Math.max(aa.filasLaunch, bb.filasLaunch),
    minutosLaunch: Math.max(aa.minutosLaunch, bb.minutosLaunch),
    tieneMeta: aa.tieneMeta || bb.tieneMeta,
    ordenLaunchIds:
      richer.ordenLaunchIds.length >= other.ordenLaunchIds.length
        ? richer.ordenLaunchIds
        : other.ordenLaunchIds,
    reorders: Math.max(aa.reorders, bb.reorders),
    postergas: Math.max(aa.postergas, bb.postergas),
    quitadas: Math.max(aa.quitadas, bb.quitadas),
    selladas: Math.max(aa.selladas, bb.selladas),
    cupoEdits: Math.max(aa.cupoEdits, bb.cupoEdits),
    anadidas: Math.max(aa.anadidas, bb.anadidas),
    ...(richer.sello || other.sello ? { sello: richer.sello ?? other.sello } : {}),
  };
}

function isPending(st: { resultadoSituacion?: string; completada?: boolean }): boolean {
  const r = st.resultadoSituacion ?? (st.completada ? "cumplido" : "pendiente");
  return r === "pendiente";
}

function metaBloque(vehicle: HuellaEnfoqueInput): number | undefined {
  return vehicle.situacionCronometro?.horaFinContratoMs ?? vehicle.situacionCronometro?.horaFinMs;
}

export function cerroCincoAntesDelTope(st: {
  minutosCupo?: number;
  duracionRealSec?: number;
  resultadoSituacion?: string;
  completada?: boolean;
}): boolean {
  if (isPending(st)) return false;
  const cupoMin = st.minutosCupo ?? 0;
  if (cupoMin < HUELLA_RADIO_MIN) return false;
  if (st.duracionRealSec == null) return false;
  return st.duracionRealSec <= (cupoMin - HUELLA_RADIO_MIN) * 60;
}

function restanteCupoMs(vehicle: HuellaEnfoqueInput, nowMs: number): number | null {
  const anchor = vehicle.situacionCupoAnchor;
  if (!anchor?.subTareaId) return null;
  const focal = cronRows(vehicle).find(st => st.id === anchor.subTareaId);
  if (!focal || !isPending(focal)) return null;
  const cupoMin = focal.minutosCupo ?? 0;
  if (cupoMin <= 0) return null;
  return cupoMin * 60_000 - (nowMs - anchor.startedAt);
}

/** Ventana de 5 minutos antes del tope del cupo en foco. */
export function enVentanaAtencion(vehicle: HuellaEnfoqueInput, nowMs = Date.now()): boolean {
  const restante = restanteCupoMs(vehicle, nowMs);
  if (restante == null) return false;
  return restante > 0 && restante <= HUELLA_RADIO_MIN * 60_000;
}

function ultimoCerradoEnRadio(vehicle: HuellaEnfoqueInput, nowMs: number): boolean {
  const rows = cronRows(vehicle);
  if (rows.length === 0 || rows.some(isPending)) return false;
  const meta = metaBloque(vehicle);
  if (meta == null) return false;
  const lastAt = rows.reduce((m, r) => Math.max(m, r.cerradaAt ?? 0), 0) || nowMs;
  return Math.abs(lastAt - meta) <= HUELLA_RADIO_MIN * 60_000;
}

function ultimoEnJuegoEnRadio(vehicle: HuellaEnfoqueInput, nowMs: number): boolean {
  const pending = cronRows(vehicle).filter(isPending);
  if (pending.length !== 1) return false;
  const meta = metaBloque(vehicle);
  if (meta == null) return false;
  return Math.abs(nowMs - meta) <= HUELLA_RADIO_MIN * 60_000;
}

function selloVigente(s?: RingHuellaLectura): s is RingHuellaLectura {
  return !!s && typeof s.decision === "number" && typeof s.produccion === "number";
}

export function hechosVacios(): HuellaHechos {
  return {
    filasLaunch: 0,
    anadidas: 0,
    reorders: 0,
    postergas: 0,
    quitadas: 0,
    cerradas: 0,
    atencionHits: 0,
    desglosadores: 0,
    focoHits: 0,
    focoEnJuego: 0,
    minutosGanados: 0,
    minutosBloque: 0,
  };
}

export function sumarHechosHuella(a: HuellaHechos, b: HuellaHechos): HuellaHechos {
  return {
    filasLaunch: a.filasLaunch + b.filasLaunch,
    anadidas: a.anadidas + b.anadidas,
    reorders: a.reorders + b.reorders,
    postergas: a.postergas + b.postergas,
    quitadas: a.quitadas + b.quitadas,
    cerradas: a.cerradas + b.cerradas,
    atencionHits: a.atencionHits + b.atencionHits,
    desglosadores: a.desglosadores + b.desglosadores,
    focoHits: a.focoHits + b.focoHits,
    focoEnJuego: a.focoEnJuego + b.focoEnJuego,
    minutosGanados: a.minutosGanados + b.minutosGanados,
    minutosBloque: a.minutosBloque + b.minutosBloque,
  };
}

export function hechosHuellaDesglosador(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): HuellaHechos {
  const state = ensureRingHuella(vehicle, nowMs);
  const rows = cronRows(vehicle);
  const cerradas = rows.filter(st => !isPending(st));
  const anadidas =
    state.anadidas > 0
      ? state.anadidas
      : Math.max(0, rows.length - state.filasLaunch);
  return {
    filasLaunch: state.filasLaunch,
    anadidas,
    reorders: state.reorders,
    postergas: state.postergas,
    quitadas: state.quitadas,
    cerradas: cerradas.length,
    atencionHits: cerradas.filter(cerroCincoAntesDelTope).length,
    desglosadores: 1,
    focoHits: ultimoCerradoEnRadio(vehicle, nowMs) ? 1 : 0,
    focoEnJuego: ultimoEnJuegoEnRadio(vehicle, nowMs) ? 1 : 0,
    minutosGanados: vehicle.situacionCronometro?.minutosGanadosSesion ?? 0,
    minutosBloque: state.minutosLaunch,
  };
}

function scoreDecision(filasLaunch: number): number {
  // Solo la primera lista. Cruzar 3 abre el músculo; alargar no suma.
  if (filasLaunch <= 1) return 22;
  if (filasLaunch === 2) return 48;
  if (filasLaunch === HUELLA_DECISION_UMBRAL) return 62;
  return 82;
}

function scoreAtencion(hits: number, cerradas: number): number {
  if (cerradas <= 0) return 18;
  return clampPct(24 + (hits / cerradas) * 76);
}

function scoreProduccion(anadidas: number): number {
  if (anadidas <= 0) return 16;
  if (anadidas === 1) return 42;
  if (anadidas === 2) return 58;
  return 74;
}

function scoreFoco(hits: number, enJuego: number): number {
  if (hits > 0) return clampPct(52 + Math.min(3, hits - 1) * 14);
  if (enJuego > 0) return 40;
  return 22;
}

function scoreOrden(reorders: number, postergas: number, quitadas: number): number {
  let n = 22;
  n += Math.min(5, reorders) * 8;
  n += Math.min(4, postergas) * 10;
  n += Math.min(4, quitadas) * 10;
  return clampPct(n);
}

function relatoHuella(h: HuellaHechos): string {
  if (h.focoHits > 0) {
    return h.desglosadores > 1
      ? `Cerraste ${h.focoHits} desglosador${h.focoHits === 1 ? "" : "es"} en el radio de 5 minutos. Foco.`
      : "Cerraste la última fila en el radio de 5 minutos. Foco.";
  }
  if (h.atencionHits > 0) {
    return h.atencionHits === 1
      ? "Cerraste una fila 5 minutos antes del tope. Atención."
      : `Cerraste ${h.atencionHits} filas 5 minutos antes del tope. Atención del desglosador.`;
  }
  if (h.filasLaunch > HUELLA_DECISION_UMBRAL) {
    return "Decidiste qué hacer y desglosaste. Nació disponibilidad.";
  }
  if (h.anadidas > 0) {
    return h.anadidas === 1
      ? "Añadiste después del lanzamiento. Producción."
      : `Añadiste ${h.anadidas} filas después del lanzamiento. Producción.`;
  }
  const gestos: string[] = [];
  if (h.reorders > 0) gestos.push("reordenar");
  if (h.postergas > 0) gestos.push("postergar");
  if (h.quitadas > 0) gestos.push("quitar");
  if (gestos.length > 0) {
    const cabeza = gestos.join(", ");
    return `${cabeza.charAt(0).toUpperCase()}${cabeza.slice(1)}: eso es orden.`;
  }
  if (h.focoEnJuego > 0) {
    return "La última fila está en el radio de 5 minutos. Foco en juego.";
  }
  if (h.filasLaunch > 0) {
    return "La primera lista ya está. Decisión: pensar qué vas a hacer.";
  }
  return "El desglosador deja huella al cerrar el día.";
}

export function computeHuellaFromHechos(h: HuellaHechos): RingHuellaLectura {
  const ejes: RingHuellaEjes = {
    decision: scoreDecision(h.filasLaunch),
    atencion: scoreAtencion(h.atencionHits, h.cerradas),
    produccion: scoreProduccion(h.anadidas),
    foco: scoreFoco(h.focoHits, h.focoEnJuego),
    orden: scoreOrden(h.reorders, h.postergas, h.quitadas),
  };
  const huella = clampPct(
    ejes.decision * HUELLA_PESOS.decision +
      ejes.atencion * HUELLA_PESOS.atencion +
      ejes.produccion * HUELLA_PESOS.produccion +
      ejes.foco * HUELLA_PESOS.foco +
      ejes.orden * HUELLA_PESOS.orden
  );
  return {
    ...ejes,
    huella,
    gestos: h.reorders + h.postergas + h.quitadas,
    minutosGanados: h.minutosGanados,
    vehiculos: h.filasLaunch + h.anadidas,
    horasBloque: h.minutosBloque / 60,
    desglosadores: h.desglosadores,
    anadidas: h.anadidas,
    atencionCierres: h.atencionHits,
    relato: relatoHuella(h),
  };
}

export function computeHuellaEnfoque(
  vehicle: HuellaEnfoqueInput,
  nowMs = Date.now()
): RingHuellaLectura {
  const state = ensureRingHuella(vehicle, nowMs);
  if (selloVigente(state.sello) && vehicle.situacionCronometro?.activo !== true) {
    const s = state.sello;
    return {
      ...s,
      vehiculos: s.vehiculos ?? state.filasLaunch,
      horasBloque: s.horasBloque ?? state.minutosLaunch / 60,
      desglosadores: s.desglosadores ?? 1,
      anadidas: s.anadidas ?? state.anadidas ?? 0,
      atencionCierres: s.atencionCierres ?? 0,
    };
  }
  return computeHuellaFromHechos(hechosHuellaDesglosador(vehicle, nowMs));
}

/** Una lectura para el día o la semana: suma de todos los desglosadores. */
export function computeHuellaPeriodo(
  vehicles: HuellaEnfoqueInput[],
  nowMs = Date.now()
): RingHuellaLectura {
  const hechos = vehicles.reduce(
    (acc, v) => sumarHechosHuella(acc, hechosHuellaDesglosador(v, nowMs)),
    hechosVacios()
  );
  return computeHuellaFromHechos(hechos);
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
    title: lectura.relato,
    description: `${huellaEjesLine(lectura)}. Los PS de Jornada se quedan.`,
  };
}
