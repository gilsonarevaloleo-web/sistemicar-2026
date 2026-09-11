/**
 * Buscador del desglosador: listas guardadas + historial unido (no solo el último bloque).
 */
import {
  collectDesglosadorMisionSuggestions,
  resolveDesglosadorHabitualSequence,
  type DesglosadorHistoryEntryLike,
  type DesglosadorMisionSug,
  type DesglosadorSequenceItem,
  type ResolvedDesglosadorSequence,
} from "./desglosadorSequence";
import { readDesglosadorListas } from "./desglosadorListasStore";

const HISTORY_KEY = "sistemicar_vehicle_history";

function readHistory(): DesglosadorHistoryEntryLike[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? (parsed as DesglosadorHistoryEntryLike[]) : [];
  } catch {
    return [];
  }
}

export function getDesglosadorHabitualResolved(
  misionTitulo: string
): ResolvedDesglosadorSequence {
  return resolveDesglosadorHabitualSequence(
    misionTitulo,
    readHistory(),
    readDesglosadorListas()
  );
}

/** Títulos en orden — compatible con el buscador previo. */
export function getDesglosadorHistorico(misionTitulo: string): string[] {
  return getDesglosadorHabitualResolved(misionTitulo).items.map(i => i.titulo);
}

export function getDesglosadorHabitualItems(
  misionTitulo: string
): DesglosadorSequenceItem[] {
  return getDesglosadorHabitualResolved(misionTitulo).items;
}

export function getDesglosadorMisionData(
  query: string,
  limit = 6
): DesglosadorMisionSug[] {
  return collectDesglosadorMisionSuggestions(
    query,
    readHistory(),
    readDesglosadorListas(),
    limit
  );
}

export function getDesglosadorMisionTitles(query: string, limit = 6): string[] {
  return getDesglosadorMisionData(query, limit).map(s => s.titulo);
}
