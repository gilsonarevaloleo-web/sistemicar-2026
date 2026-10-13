/**
 * Pulso del nido.
 *
 * La figura es el cuerpo: paquetes de envíos revelan miembros.
 * El pulso es el tiempo vivo: días desde que el nido existe, horas reales
 * enviadas al timón, y cuándo fue el último envío.
 *
 * No se mezclan. Presencia cubre el día y no cuenta. La pausa tampoco.
 * El contraste (20 días · 10 h · última hace 2 días) hace atractivo producir.
 */
import { getJournalDayStartMs } from "./segmentTime";
import { formatDuracionTimon } from "./timonHoras";
import { minutosFromSegundos } from "./rutaMinutosSituacionProyecto";
import type { DestinoGasto } from "./gastoTiempo";

const MS_MIN = 60_000;
const MS_HORA = 3_600_000;
const MS_DIA = 86_400_000;
const CURSO_WINDOW_MS = 90_000;

export type PulsoVehiculoLike = {
  vehicleId?: string;
  minutos?: number;
  tipoOrigen?: "tiempo" | "situacion";
  closedAt?: number;
  openedAt?: number;
  kind?: "trabajo" | "pausa";
};

export type PulsoTimonLike = {
  vehiculos?: PulsoVehiculoLike[] | null;
  startedAt?: number;
};

export type PulsoPeldanoLike = {
  id?: string;
  vehicleId?: string;
  estado?: string;
  cerradoAt?: number;
  updatedAt?: number;
  timonEpisodio?: PulsoTimonLike | null;
  timonCerrados?: PulsoTimonLike[] | null;
  resumen?: {
    duracionMin?: number;
    timon?: PulsoTimonLike | null;
  } | null;
};

export type PulsoGastoLike = {
  sellos?: Array<{
    vid?: string;
    dest?: DestinoGasto | string;
    sec?: number;
    a?: number;
    z?: number;
  }> | null;
};

export type PulsoStamp = {
  vehicleId: string;
  minutos: number;
  at: number;
};

export type NidoPulso = {
  diasDesdeInicio: number;
  minutosEnfoquePuro: number;
  ultimaProduccionAt: number | null;
  enCurso: boolean;
  stale: boolean;
  copyDias: string;
  copyEnfoque: string;
  copyUltima: string;
  copy: string;
  copyCompact: string;
};

function isPausa(v: PulsoVehiculoLike): boolean {
  return v.kind === "pausa";
}

function stampAt(v: PulsoVehiculoLike): number {
  const closed = typeof v.closedAt === "number" && v.closedAt > 0 ? v.closedAt : 0;
  const opened = typeof v.openedAt === "number" && v.openedAt > 0 ? v.openedAt : 0;
  return closed || opened;
}

function pushTimonStamps(
  map: Map<string, PulsoStamp>,
  timon: PulsoTimonLike | null | undefined
): void {
  if (!timon?.vehiculos) return;
  for (const v of timon.vehiculos) {
    if (isPausa(v)) continue;
    const id = v.vehicleId?.trim();
    const minutos = typeof v.minutos === "number" && Number.isFinite(v.minutos) ? v.minutos : 0;
    const at = stampAt(v);
    if (!id || map.has(id) || minutos <= 0) continue;
    map.set(id, { vehicleId: id, minutos: Math.round(minutos), at });
  }
}

function peldanoTieneTimon(pel: PulsoPeldanoLike): boolean {
  if (pel.timonEpisodio?.vehiculos && pel.timonEpisodio.vehiculos.length > 0) return true;
  if (pel.timonCerrados?.some(t => (t.vehiculos?.length ?? 0) > 0)) return true;
  if (pel.resumen?.timon?.vehiculos && pel.resumen.timon.vehiculos.length > 0) return true;
  return false;
}

/**
 * Recoge envíos de Dirección con minutos y reloj.
 * Presencia se ignora a propósito: cubre el día, no el pulso.
 */
export function collectPulsoStamps(input: {
  peldanos?: PulsoPeldanoLike[] | null;
  liveTimon?: PulsoTimonLike | null;
  gasto?: PulsoGastoLike | null;
  presenciaEpisodio?: PulsoTimonLike | null;
}): PulsoStamp[] {
  const map = new Map<string, PulsoStamp>();
  pushTimonStamps(map, input.liveTimon);
  for (const pel of input.peldanos ?? []) {
    pushTimonStamps(map, pel.timonEpisodio);
    for (const cerrado of pel.timonCerrados ?? []) {
      pushTimonStamps(map, cerrado);
    }
    pushTimonStamps(map, pel.resumen?.timon);
    if (peldanoTieneTimon(pel)) continue;
    const min = pel.resumen?.duracionMin;
    if (pel.estado !== "conquistado" || typeof min !== "number" || min <= 0) continue;
    const id = (pel.vehicleId ?? pel.id ?? "").trim();
    if (!id || map.has(id)) continue;
    const at =
      typeof pel.cerradoAt === "number" && pel.cerradoAt > 0
        ? pel.cerradoAt
        : typeof pel.updatedAt === "number" && pel.updatedAt > 0
          ? pel.updatedAt
          : 0;
    map.set(id, { vehicleId: id, minutos: Math.round(min), at });
  }
  for (const sello of input.gasto?.sellos ?? []) {
    if (sello.dest !== "direccion") continue;
    const id = sello.vid?.trim();
    if (!id || map.has(id)) continue;
    const minutos = minutosFromSegundos(sello.sec);
    if (minutos <= 0) continue;
    const at =
      typeof sello.z === "number" && sello.z > 0
        ? sello.z
        : typeof sello.a === "number" && sello.a > 0
          ? sello.a
          : 0;
    map.set(id, { vehicleId: id, minutos, at });
  }
  void input.presenciaEpisodio;
  return [...map.values()];
}

/** Días-jornada Lima (05:00) entre el nacimiento del nido y ahora. */
export function diasJornadaDesde(startedAt: number, now = Date.now()): number {
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;
  const a = getJournalDayStartMs(startedAt);
  const b = getJournalDayStartMs(now);
  return Math.max(0, Math.round((b - a) / MS_DIA));
}

export function formatDiasDesdeInicio(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
}

export function formatEnfoquePuro(minutos: number, compact = false): string {
  const m = Math.max(0, Math.round(minutos));
  const dur = m <= 0 ? "0 min" : formatDuracionTimon(m);
  return compact ? dur : `${dur} de enfoque`;
}

export function formatHaceProduccion(
  at: number | null,
  now = Date.now(),
  enCurso = false
): string {
  if (enCurso) return "en curso";
  if (!at || at <= 0) return "aún no";
  const dt = Math.max(0, now - at);
  if (dt < 45_000) return "ahora";
  if (dt < MS_HORA) {
    const min = Math.max(1, Math.round(dt / MS_MIN));
    return min === 1 ? "hace 1 min" : `hace ${min} min`;
  }
  if (dt < MS_DIA) {
    const h = Math.max(1, Math.round(dt / MS_HORA));
    return h === 1 ? "hace 1 h" : `hace ${h} h`;
  }
  const d = Math.max(1, Math.round(dt / MS_DIA));
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

function liveEnCurso(liveTimon: PulsoTimonLike | null | undefined, now: number): boolean {
  if (!liveTimon?.vehiculos) return false;
  return liveTimon.vehiculos.some(v => {
    if (isPausa(v)) return false;
    const minutos = typeof v.minutos === "number" ? v.minutos : 0;
    if (minutos <= 0) return false;
    const at = stampAt(v);
    return at > 0 && now - at <= CURSO_WINDOW_MS;
  });
}

export function computeNidoPulso(input: {
  createdAt?: number | null;
  stamps: PulsoStamp[];
  liveTimon?: PulsoTimonLike | null;
  now?: number;
}): NidoPulso {
  const now = input.now ?? Date.now();
  const diasDesdeInicio = diasJornadaDesde(input.createdAt ?? 0, now);
  let minutosEnfoquePuro = 0;
  let ultimaProduccionAt: number | null = null;
  for (const s of input.stamps) {
    minutosEnfoquePuro += Math.max(0, s.minutos);
    if (s.at > 0 && (ultimaProduccionAt == null || s.at > ultimaProduccionAt)) {
      ultimaProduccionAt = s.at;
    }
  }
  const enCurso = liveEnCurso(input.liveTimon, now);
  const stale =
    !enCurso &&
    ((ultimaProduccionAt != null && now - ultimaProduccionAt >= 2 * MS_DIA) ||
      (ultimaProduccionAt == null && diasDesdeInicio >= 2));
  const copyDias = formatDiasDesdeInicio(diasDesdeInicio);
  const copyEnfoque = formatEnfoquePuro(minutosEnfoquePuro);
  const copyUltima = formatHaceProduccion(ultimaProduccionAt, now, enCurso);
  const ultimaLabel =
    copyUltima === "aún no"
      ? "aún no"
      : copyUltima === "en curso" || copyUltima === "ahora"
        ? copyUltima
        : `última ${copyUltima}`;
  return {
    diasDesdeInicio,
    minutosEnfoquePuro,
    ultimaProduccionAt,
    enCurso,
    stale,
    copyDias,
    copyEnfoque,
    copyUltima,
    copy: `${copyDias} · ${copyEnfoque} · ${ultimaLabel}`,
    copyCompact: `${copyDias} · ${formatEnfoquePuro(minutosEnfoquePuro, true)} · ${copyUltima}`,
  };
}

export function computePulsoDesdeNido(input: {
  createdAt?: number | null;
  peldanos?: PulsoPeldanoLike[] | null;
  liveTimon?: PulsoTimonLike | null;
  gasto?: PulsoGastoLike | null;
  presenciaEpisodio?: PulsoTimonLike | null;
  now?: number;
}): NidoPulso {
  const stamps = collectPulsoStamps(input);
  return computeNidoPulso({
    createdAt: input.createdAt,
    stamps,
    liveTimon: input.liveTimon,
    now: input.now,
  });
}
