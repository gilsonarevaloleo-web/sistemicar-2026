import { safeSetItem } from "./storageHygiene";
import type { DesglosadorSequenceItem } from "./desglosadorSequence";

export const DESGLOSADOR_LISTAS_KEY = "sistemicar_desglosador_listas";
export const MAX_DESGLOSADOR_LISTAS = 50;
export const MAX_DESGLOSADOR_LISTA_ITEMS = 80;

export type DesglosadorListaItem = DesglosadorSequenceItem;

export type DesglosadorListaGuardada = {
  id: string;
  nombre: string;
  items: DesglosadorListaItem[];
  createdAt: number;
  updatedAt: number;
};

function newId(): string {
  return `lista_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function readDesglosadorListas(): DesglosadorListaGuardada[] {
  try {
    const raw = localStorage.getItem(DESGLOSADOR_LISTAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLista)
      .filter((l): l is DesglosadorListaGuardada => l != null);
  } catch {
    return [];
  }
}

function normalizeLista(raw: unknown): DesglosadorListaGuardada | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DesglosadorListaGuardada>;
  const nombre = typeof r.nombre === "string" ? r.nombre.trim() : "";
  if (!nombre) return null;
  const items = Array.isArray(r.items)
    ? r.items
        .map(normalizeItem)
        .filter((i): i is DesglosadorListaItem => i != null)
        .slice(0, MAX_DESGLOSADOR_LISTA_ITEMS)
    : [];
  if (items.length === 0) return null;
  return {
    id: typeof r.id === "string" && r.id.trim() ? r.id : newId(),
    nombre,
    items,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}

function normalizeItem(raw: unknown): DesglosadorListaItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DesglosadorListaItem>;
  const titulo = typeof r.titulo === "string" ? r.titulo.trim() : "";
  if (!titulo) return null;
  const item: DesglosadorListaItem = { titulo };
  if (typeof r.cantidadObjetivo === "string" && r.cantidadObjetivo.trim()) {
    item.cantidadObjetivo = r.cantidadObjetivo.trim();
  }
  if (
    typeof r.tiempoRecordMinPerUnit === "number" &&
    Number.isFinite(r.tiempoRecordMinPerUnit) &&
    r.tiempoRecordMinPerUnit > 0
  ) {
    item.tiempoRecordMinPerUnit = r.tiempoRecordMinPerUnit;
  }
  if (typeof r.seccionTitulo === "string" && r.seccionTitulo.trim()) {
    item.seccionTitulo = r.seccionTitulo.trim();
  }
  return item;
}

function persist(listas: DesglosadorListaGuardada[]): boolean {
  return safeSetItem(DESGLOSADOR_LISTAS_KEY, JSON.stringify(listas));
}

export function writeDesglosadorListas(listas: DesglosadorListaGuardada[]): void {
  persist(listas.slice(0, MAX_DESGLOSADOR_LISTAS));
}

export type SaveDesglosadorListaInput = {
  nombre: string;
  items: DesglosadorListaItem[];
  /** Si hay lista con el mismo nombre, se actualiza. */
  overwriteSameName?: boolean;
};

export type SaveDesglosadorListaResult =
  | { ok: true; lista: DesglosadorListaGuardada; overwritten: boolean }
  | { ok: false; error: string };

export function saveDesglosadorLista(
  input: SaveDesglosadorListaInput
): SaveDesglosadorListaResult {
  const nombre = input.nombre.trim();
  if (nombre.length < 2) {
    return { ok: false, error: "Ponle nombre a la misión para guardar la lista." };
  }
  const items = input.items
    .map(normalizeItem)
    .filter((i): i is DesglosadorListaItem => i != null)
    .slice(0, MAX_DESGLOSADOR_LISTA_ITEMS);
  if (items.length < 2) {
    return {
      ok: false,
      error: "La lista necesita al menos 2 unidades con nombre.",
    };
  }
  const listas = readDesglosadorListas();
  const sameNameIdx = listas.findIndex(
    l => l.nombre.trim().toLowerCase() === nombre.toLowerCase()
  );
  const now = Date.now();
  if (sameNameIdx >= 0) {
    const prev = listas[sameNameIdx]!;
    const next: DesglosadorListaGuardada = {
      ...prev,
      nombre,
      items,
      updatedAt: now,
    };
    listas[sameNameIdx] = next;
    writeDesglosadorListas(listas);
    return { ok: true, lista: next, overwritten: true };
  }
  if (listas.length >= MAX_DESGLOSADOR_LISTAS) {
    return { ok: false, error: "Límite de listas guardadas. Borra una primero." };
  }
  const lista: DesglosadorListaGuardada = {
    id: newId(),
    nombre,
    items,
    createdAt: now,
    updatedAt: now,
  };
  writeDesglosadorListas([lista, ...listas]);
  return { ok: true, lista, overwritten: false };
}

export function deleteDesglosadorLista(id: string): void {
  writeDesglosadorListas(readDesglosadorListas().filter(l => l.id !== id));
}

export function searchDesglosadorListas(
  query: string,
  listas = readDesglosadorListas()
): DesglosadorListaGuardada[] {
  const q = query.toLowerCase().trim();
  const pool = [...listas].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!q) return pool;
  return pool.filter(
    l =>
      l.nombre.toLowerCase().includes(q) ||
      l.items.some(i => i.titulo.toLowerCase().includes(q))
  );
}
