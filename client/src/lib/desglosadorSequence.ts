/**
 * Reconstruye la secuencia completa de un desglosador a partir del historial.
 *
 * El buscador antiguo tomaba solo la última sesión (hueco ≤ 1 h). Un armado
 * de casaca (~25 ops) partido en bloques del día quedaba recortado.
 * Aquí: ciclo más largo + unión de todos los bloques, sin duplicar títulos.
 */

export const DESGLOSADOR_SESSION_GAP_MS = 60 * 60 * 1000;

export type DesglosadorHistoryEntryLike = {
  titulo: string;
  tipoReloj: string;
  fecha: number;
  totalMin?: number;
  excluirDeHistorial?: boolean;
  subResumen?: Array<{
    titulo: string;
    status?: string;
    cantidadObjetivo?: number;
    cantidadLograda?: number;
    duracionMin?: number;
  }>;
};

export type DesglosadorSequenceItem = {
  titulo: string;
  cantidadObjetivo?: string;
  tiempoRecordMinPerUnit?: number;
  seccionTitulo?: string;
};

export type DesglosadorListaMatch = {
  id: string;
  nombre: string;
  items: DesglosadorSequenceItem[];
};

export type DesglosadorSequenceSource = "lista" | "ciclo" | "historial";

export type ResolvedDesglosadorSequence = {
  source: DesglosadorSequenceSource;
  items: DesglosadorSequenceItem[];
  listaId?: string;
};

export function uniqueTitlesInOrder(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of titles) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function groupHistorySessions<T extends { fecha: number }>(
  entries: T[],
  gapMs = DESGLOSADOR_SESSION_GAP_MS
): T[][] {
  const sorted = [...entries].sort((a, b) => a.fecha - b.fecha);
  const sessions: T[][] = [];
  let current: T[] = [];
  for (const entry of sorted) {
    if (current.length === 0) {
      current.push(entry);
      continue;
    }
    const prev = current[current.length - 1]!;
    if (entry.fecha - prev.fecha <= gapMs) {
      current.push(entry);
    } else {
      sessions.push(current);
      current = [entry];
    }
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

/**
 * Une todos los bloques del día en el orden en que aparecieron.
 * No se queda con el último hueco de 1 h: un armado de 25 ops partido
 * en tandas entra entero, sin repetir títulos.
 */
export function mergeSessionSequences(sessions: string[][]): string[] {
  return uniqueTitlesInOrder(sessions.flat());
}

export function itemsFromTitles(titles: string[]): DesglosadorSequenceItem[] {
  return uniqueTitlesInOrder(titles).map(titulo => ({ titulo }));
}

function itemsFromCycleResumen(
  resumen: NonNullable<DesglosadorHistoryEntryLike["subResumen"]>
): DesglosadorSequenceItem[] {
  const seen = new Set<string>();
  const items: DesglosadorSequenceItem[] = [];
  for (const row of resumen) {
    const titulo = (row.titulo ?? "").trim();
    if (!titulo) continue;
    const key = titulo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cant =
      row.cantidadObjetivo != null && row.cantidadObjetivo > 0
        ? String(row.cantidadObjetivo)
        : undefined;
    items.push({
      titulo,
      ...(cant ? { cantidadObjetivo: cant } : {}),
    });
  }
  return items;
}

function longestCycleItems(
  misionTitulo: string,
  history: DesglosadorHistoryEntryLike[]
): DesglosadorSequenceItem[] {
  const key = misionTitulo.trim().toLowerCase();
  if (!key) return [];
  let best: DesglosadorSequenceItem[] = [];
  for (const h of history) {
    if (h.tipoReloj !== "desglosador_ciclo") continue;
    if (h.titulo.trim().toLowerCase() !== key) continue;
    if (!Array.isArray(h.subResumen) || h.subResumen.length === 0) continue;
    const items = itemsFromCycleResumen(h.subResumen);
    if (items.length > best.length) best = items;
  }
  return best;
}

function subTituloIfMission(
  fullTitulo: string,
  misionTitulo: string
): string | null {
  const arrow = " → ";
  const idx = fullTitulo.indexOf(arrow);
  if (idx < 0) return null;
  const parent = fullTitulo.slice(0, idx).trim();
  if (parent.toLowerCase() !== misionTitulo.trim().toLowerCase()) return null;
  return fullTitulo.slice(idx + arrow.length).trim() || null;
}

function mergedHistorialItems(
  misionTitulo: string,
  history: DesglosadorHistoryEntryLike[]
): DesglosadorSequenceItem[] {
  const mission = misionTitulo.trim();
  if (!mission) return [];
  const matching = history.filter(
    h => h.tipoReloj === "desglosador" && !h.excluirDeHistorial
  );
  const withSubs = matching
    .map(h => {
      const sub = subTituloIfMission(h.titulo, mission);
      return sub ? { ...h, sub } : null;
    })
    .filter((h): h is DesglosadorHistoryEntryLike & { sub: string } => h != null);
  if (withSubs.length === 0) return [];
  const sessions = groupHistorySessions(withSubs).map(session =>
    session.map(e => e.sub).filter(Boolean)
  );
  return itemsFromTitles(mergeSessionSequences(sessions));
}

function bestListaForMission(
  misionTitulo: string,
  listas: DesglosadorListaMatch[]
): DesglosadorListaMatch | null {
  const key = misionTitulo.trim().toLowerCase();
  if (!key) return null;
  const exact = listas.find(
    l => l.nombre.trim().toLowerCase() === key && l.items.length > 0
  );
  if (exact) return exact;
  const partial = listas
    .filter(
      l => l.items.length > 0 && l.nombre.trim().toLowerCase().includes(key)
    )
    .sort((a, b) => b.items.length - a.items.length);
  return partial[0] ?? null;
}

export function resolveDesglosadorHabitualSequence(
  misionTitulo: string,
  history: DesglosadorHistoryEntryLike[],
  listas: DesglosadorListaMatch[] = []
): ResolvedDesglosadorSequence {
  const lista = bestListaForMission(misionTitulo, listas);
  if (lista) {
    return {
      source: "lista",
      items: lista.items.filter(i => i.titulo.trim()),
      listaId: lista.id,
    };
  }
  const cycle = longestCycleItems(misionTitulo, history);
  const historial = mergedHistorialItems(misionTitulo, history);
  if (cycle.length >= historial.length && cycle.length > 0) {
    return { source: "ciclo", items: cycle };
  }
  return { source: "historial", items: historial };
}

export function pickSequenceItems<T>(
  items: T[],
  selected: boolean[]
): T[] {
  return items.filter((_, i) => selected[i] === true);
}

export function defaultSelection(length: number, selected = true): boolean[] {
  return Array.from({ length }, () => selected);
}

export type DesglosadorMisionSug = {
  titulo: string;
  subs: Array<{ nombre: string; duracionMin: number | null }>;
  source: DesglosadorSequenceSource;
  listaId?: string;
};

export function collectDesglosadorMisionSuggestions(
  query: string,
  history: DesglosadorHistoryEntryLike[],
  listas: DesglosadorListaMatch[],
  limit = 6
): DesglosadorMisionSug[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const out: DesglosadorMisionSug[] = [];
  const seen = new Set<string>();

  const matchingListas = [...listas]
    .filter(
      l =>
        l.items.length > 0 &&
        (l.nombre.trim().toLowerCase().includes(q) ||
          l.items.some(i => i.titulo.toLowerCase().includes(q)))
    )
    .sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.nombre.localeCompare(b.nombre);
    });

  for (const lista of matchingListas) {
    const key = lista.nombre.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      titulo: lista.nombre.trim(),
      source: "lista",
      listaId: lista.id,
      subs: lista.items.map(i => ({ nombre: i.titulo, duracionMin: null })),
    });
    if (out.length >= limit) return out;
  }

  const parentTitles: string[] = [];
  history
    .filter(
      h =>
        (h.tipoReloj === "desglosador" && h.titulo.includes(" → ")) ||
        h.tipoReloj === "desglosador_ciclo"
    )
    .sort((a, b) => b.fecha - a.fecha)
    .forEach(h => {
      const parent =
        h.tipoReloj === "desglosador_ciclo"
          ? h.titulo.trim()
          : h.titulo.split(" → ")[0]?.trim();
      if (!parent || !parent.toLowerCase().includes(q)) return;
      const key = parent.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      parentTitles.push(parent);
    });

  for (const titulo of parentTitles) {
    if (out.length >= limit) break;
    const resolved = resolveDesglosadorHabitualSequence(titulo, history, listas);
    out.push({
      titulo,
      source: resolved.source,
      listaId: resolved.listaId,
      subs: resolved.items.map(i => ({ nombre: i.titulo, duracionMin: null })),
    });
  }
  return out;
}
