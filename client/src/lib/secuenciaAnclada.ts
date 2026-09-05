/**
 * Hábitos de secuencia para Situacional (lista libre y ring).
 * Letra A–F = alternativa anclada (filas + horario).
 * Recuerda; nunca lanza. Kernel puro, sin red ni UI.
 */
import { getClockDayStartMs, parseSegmentTime, segmentTimeToMinutes } from "./segmentTime";

export const SECUENCIA_LETRAS = ["A", "B", "C", "D", "E", "F"] as const;
export type SecuenciaLetra = (typeof SECUENCIA_LETRAS)[number];

export const SECUENCIA_MAX_SLOTS = SECUENCIA_LETRAS.length;
export const SECUENCIA_MAX_FILAS = 12;
export const SECUENCIA_MAX_TITULO = 80;
export const SECUENCIA_MAX_FILA = 60;
export const SECUENCIA_DUE_WINDOW_MIN = 30;

export type SecuenciaModo = "rapido" | "desglose";

export type SecuenciaAnclada = {
  letra: SecuenciaLetra;
  /** Nombre del hábito / misión del ring. Si vacío al anclar, se toma la 1ª fila. */
  titulo: string;
  filas: string[];
  filasProyectoIds: string[];
  modo: SecuenciaModo;
  /** HH:mm Lima; null = sin horario. No es la meta del ring. */
  hora: string | null;
  /** 0=Dom … 6=Sáb; vacío = todos los días. */
  diasActivos: number[];
  ancladaAt: number;
  updatedAt: number;
};

export type SecuenciaAnchorInput = {
  letra: string;
  titulo?: string;
  filas: unknown;
  filasProyectoIds?: unknown;
  modo?: unknown;
  hora?: string | null;
  diasActivos?: unknown;
};

export type UpsertSecuenciaResult =
  | { ok: true; slot: SecuenciaAnclada; slots: SecuenciaAnclada[] }
  | {
      ok: false;
      error: "letra_invalida" | "secuencia_invalida" | "slot_ocupado";
    };

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;

export function normalizeLetter(raw: unknown): SecuenciaLetra | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const t = String(raw).trim().toUpperCase();
  if (t.length !== 1) return null;
  return (SECUENCIA_LETRAS as readonly string[]).includes(t)
    ? (t as SecuenciaLetra)
    : null;
}

/** Solo dispara si el input entero es una letra A–F. "Armado" no cuenta. */
export function detectLetterTrigger(input: string): SecuenciaLetra | null {
  if (typeof input !== "string") return null;
  return normalizeLetter(input);
}

export function sanitizeTitulo(raw: unknown, max = SECUENCIA_MAX_TITULO): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAGS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeHora(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const parsed = parseSegmentTime(raw.trim());
  if (!parsed) return null;
  return `${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}`;
}

function sanitizeDias(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const d of raw) {
    const n = typeof d === "number" ? d : typeof d === "string" ? Number(d) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 6) continue;
    if (!out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

function sanitizeModo(raw: unknown): SecuenciaModo {
  return raw === "desglose" ? "desglose" : "rapido";
}

function sanitizeProyectoId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const id = raw.trim().slice(0, 128);
  if (!id || /[/\\<>]/.test(id)) return "";
  return id;
}

export function sanitizeFilas(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const filas: string[] = [];
  for (const row of raw) {
    if (filas.length >= SECUENCIA_MAX_FILAS) break;
    const titulo =
      typeof row === "string"
        ? sanitizeTitulo(row, SECUENCIA_MAX_FILA)
        : row && typeof row === "object"
          ? sanitizeTitulo((row as { titulo?: unknown }).titulo, SECUENCIA_MAX_FILA)
          : "";
    if (!titulo) continue;
    filas.push(titulo);
  }
  return filas.length > 0 ? filas : null;
}

function sanitizeFilasProyectoIds(raw: unknown, len: number): string[] {
  const src = Array.isArray(raw) ? raw : [];
  return Array.from({ length: len }, (_, i) => sanitizeProyectoId(src[i]));
}

export function buildSecuenciaSlot(
  input: SecuenciaAnchorInput,
  now = Date.now()
): SecuenciaAnclada | null {
  const letra = normalizeLetter(input.letra);
  const filas = sanitizeFilas(input.filas);
  if (!letra || !filas) return null;
  const titulo = sanitizeTitulo(input.titulo) || filas[0]!;
  const ts = Number.isFinite(now) ? Math.floor(now) : Date.now();
  return {
    letra,
    titulo,
    filas,
    filasProyectoIds: sanitizeFilasProyectoIds(input.filasProyectoIds, filas.length),
    modo: sanitizeModo(input.modo),
    hora: sanitizeHora(input.hora),
    diasActivos: sanitizeDias(input.diasActivos),
    ancladaAt: ts,
    updatedAt: ts,
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function normalizeSlot(raw: unknown, now = Date.now()): SecuenciaAnclada | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const filasRaw = Array.isArray(rec.filas)
    ? rec.filas
    : Array.isArray(rec.subs)
      ? rec.subs
      : [];
  const slot = buildSecuenciaSlot(
    {
      letra: typeof rec.letra === "string" ? rec.letra : "",
      titulo: typeof rec.titulo === "string" ? rec.titulo : "",
      filas: filasRaw,
      filasProyectoIds: rec.filasProyectoIds,
      modo: rec.modo,
      hora: rec.hora as string | null | undefined,
      diasActivos: rec.diasActivos,
    },
    now
  );
  if (!slot) return null;
  const ancladaAt =
    typeof rec.ancladaAt === "number" && Number.isFinite(rec.ancladaAt)
      ? rec.ancladaAt
      : 0;
  const updatedAt =
    typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt)
      ? rec.updatedAt
      : ancladaAt;
  return { ...slot, ancladaAt, updatedAt };
}

/** Deduplica por letra (gana el más reciente). Máx 6. */
export function normalizeBank(raw: unknown, now = Date.now()): SecuenciaAnclada[] {
  const list = Array.isArray(raw)
    ? raw
    : asRecord(raw) && Array.isArray((raw as { slots?: unknown }).slots)
      ? (raw as { slots: unknown[] }).slots
      : [];
  const byLetra = new Map<SecuenciaLetra, SecuenciaAnclada>();
  for (const item of list) {
    const slot = normalizeSlot(item, now);
    if (!slot) continue;
    const prev = byLetra.get(slot.letra);
    if (!prev || slot.updatedAt >= prev.updatedAt) byLetra.set(slot.letra, slot);
  }
  return SECUENCIA_LETRAS.map(l => byLetra.get(l)).filter(
    (s): s is SecuenciaAnclada => Boolean(s)
  );
}

export function nextFreeLetter(slots: SecuenciaAnclada[]): SecuenciaLetra | null {
  const used = new Set(slots.map(s => s.letra));
  return SECUENCIA_LETRAS.find(l => !used.has(l)) ?? null;
}

export function recallSecuencia(
  slots: SecuenciaAnclada[],
  letra: string
): SecuenciaAnclada | null {
  const key = normalizeLetter(letra);
  if (!key) return null;
  return slots.find(s => s.letra === key) ?? null;
}

export function upsertSecuenciaAnclada(
  slots: SecuenciaAnclada[],
  input: SecuenciaAnchorInput,
  opts: { overwrite?: boolean; now?: number } = {}
): UpsertSecuenciaResult {
  const now = opts.now ?? Date.now();
  const built = buildSecuenciaSlot(input, now);
  if (!built) {
    const letra = normalizeLetter(input.letra);
    return { ok: false, error: letra ? "secuencia_invalida" : "letra_invalida" };
  }
  const existing = slots.find(s => s.letra === built.letra);
  if (existing && opts.overwrite !== true) {
    return { ok: false, error: "slot_ocupado" };
  }
  const slot: SecuenciaAnclada = existing
    ? { ...built, ancladaAt: existing.ancladaAt, updatedAt: now }
    : built;
  const rest = slots.filter(s => s.letra !== slot.letra);
  const next = normalizeBank([...rest, slot], now);
  return { ok: true, slot, slots: next };
}

export function deleteSecuenciaAnclada(
  slots: SecuenciaAnclada[],
  letra: string
): SecuenciaAnclada[] {
  const key = normalizeLetter(letra);
  if (!key) return normalizeBank(slots);
  return slots.filter(s => s.letra !== key);
}

function limaWeekday(nowMs: number): number {
  const lima = new Date(nowMs - 5 * 60 * 60 * 1000);
  return lima.getUTCDay();
}

export function isSecuenciaDue(
  slot: SecuenciaAnclada,
  nowMs: number,
  windowMin = SECUENCIA_DUE_WINDOW_MIN
): boolean {
  if (!slot.hora) return false;
  if (slot.diasActivos.length > 0 && !slot.diasActivos.includes(limaWeekday(nowMs))) {
    return false;
  }
  const target = segmentTimeToMinutes(slot.hora);
  const start = getClockDayStartMs(nowMs);
  const nowMin = Math.floor((nowMs - start) / 60_000);
  const delta = Math.min(
    Math.abs(nowMin - target),
    24 * 60 - Math.abs(nowMin - target)
  );
  return delta <= windowMin;
}

export function suggestDueLetter(
  slots: SecuenciaAnclada[],
  nowMs: number,
  windowMin = SECUENCIA_DUE_WINDOW_MIN
): SecuenciaLetra | null {
  const due = slots.filter(s => isSecuenciaDue(s, nowMs, windowMin));
  if (due.length === 0) return null;
  const start = getClockDayStartMs(nowMs);
  const nowMin = Math.floor((nowMs - start) / 60_000);
  due.sort((a, b) => {
    const da = Math.abs(segmentTimeToMinutes(a.hora!) - nowMin);
    const db = Math.abs(segmentTimeToMinutes(b.hora!) - nowMin);
    return da - db;
  });
  return due[0]!.letra;
}

export function isEmptySituacionDraft(titulo: string, filas: string[]): boolean {
  if (sanitizeTitulo(titulo).length > 0) return false;
  return !filas.some(f => sanitizeTitulo(f, SECUENCIA_MAX_FILA).length > 0);
}

export function shouldAutoFillDue(
  draftEmpty: boolean,
  due: SecuenciaLetra | null
): due is SecuenciaLetra {
  return draftEmpty && due != null;
}
