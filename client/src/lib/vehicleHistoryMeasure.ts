/** Separador al guardar desglosador: `Misión → Unidad`. */
export const HISTORY_MEASURE_ARROW = " → ";

/** Quita prefijo `Día N [...]:` de un subtítulo de unidad. */
export function cleanHistorySubTitulo(t: string): string {
  return t.replace(/^Día\s+\d+\s*\[[^\]]+\]:\s*/i, "").trim();
}

/**
 * Nombre de la medida (unidad) para agrupar récords/gráficos.
 * En `Misión → Unidad` usa la unidad: el prefijo de misión puede cambiar
 * ("Retoque… → Veis" y "Últimas → Veis" → misma medida "Veis").
 */
export function measureTituloFromHistoryTitulo(titulo: string): string {
  const raw = titulo.trim();
  if (!raw) return "";
  const measure = raw.includes(HISTORY_MEASURE_ARROW)
    ? raw.split(HISTORY_MEASURE_ARROW).slice(1).join(HISTORY_MEASURE_ARROW).trim()
    : raw;
  return cleanHistorySubTitulo(measure) || raw;
}

/** Clave estable (lowercase) para agrupar por medida. */
export function measureKeyFromHistoryTitulo(titulo: string): string {
  return measureTituloFromHistoryTitulo(titulo).toLowerCase().trim();
}
