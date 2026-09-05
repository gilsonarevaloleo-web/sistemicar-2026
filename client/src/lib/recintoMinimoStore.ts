import {
  cerrarRecintoOperador,
  contarRecintos,
  crearRecinto,
  horaSalidaPorDefecto,
  tickRecintos,
  type RecintoAjeno,
  type RecintoConteo,
} from "@shared/recintoMinimo";
import {
  formatLimaTimeHM,
  getJournalDateString,
  getLimaDayStartMs,
  segmentClockMs,
} from "@/lib/segmentTime";

const KEY = "sistemicar_recinto_minimo_v1";

function readAll(): RecintoAjeno[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecintoAjeno[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: RecintoAjeno[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 80)));
  } catch (e) {
    console.error("[recintoMinimo] persist", e);
  }
}

export function loadRecintosTick(nowMs: number = Date.now()): RecintoAjeno[] {
  return persistTick(nowMs);
}

function persistTick(nowMs: number): RecintoAjeno[] {
  const current = readAll();
  const next = tickRecintos(current, nowMs);
  if (next !== current) writeAll(next);
  return next;
}

export function listRecintosDelDia(fecha?: string, nowMs: number = Date.now()): RecintoAjeno[] {
  const day = fecha ?? getJournalDateString(nowMs);
  return persistTick(nowMs).filter((r) => r.fecha === day);
}

export function conteoRecintosDelDia(fecha?: string, nowMs: number = Date.now()): RecintoConteo {
  return contarRecintos(listRecintosDelDia(fecha, nowMs));
}

export function addRecintoMinimo(params: {
  texto: string;
  saleAt?: number;
  saleHm?: string;
  nowMs?: number;
}): RecintoAjeno {
  const nowMs = params.nowMs ?? Date.now();
  const fecha = getJournalDateString(nowMs);
  let saleAt = params.saleAt ?? horaSalidaPorDefecto(nowMs, 60);
  if (params.saleHm) {
    const dayStart = getLimaDayStartMs(nowMs);
    let at = segmentClockMs(params.saleHm, dayStart);
    if (at <= nowMs) at += 24 * 60 * 60 * 1000;
    saleAt = at;
  }
  const recinto = crearRecinto({
    id: `rec_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
    texto: params.texto,
    fecha,
    entraAt: nowMs,
    saleAt,
  });
  const list = persistTick(nowMs);
  writeAll([recinto, ...list]);
  return recinto;
}

export function sacarRecintoOperador(id: string, nowMs: number = Date.now()): RecintoAjeno | null {
  const list = persistTick(nowMs);
  let found: RecintoAjeno | null = null;
  const next = list.map((r) => {
    if (r.id !== id) return r;
    found = cerrarRecintoOperador(r, nowMs);
    return found;
  });
  writeAll(next);
  return found;
}

export function defaultSaleHm(nowMs: number = Date.now()): string {
  return formatLimaTimeHM(horaSalidaPorDefecto(nowMs, 60));
}
