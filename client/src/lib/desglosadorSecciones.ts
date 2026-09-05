/**
 * Familias (título propio) dentro de un desglosador.
 *
 * Conquista: el reloj sigue plano (una misión, unidades hoja).
 * Enfoque: el ring sigue plano (un bloque, cupo por fila).
 * La familia solo agrupa visualmente cuando un lote no sale del título
 * (ej. «Armado de bolsillos» dentro de «Primera etapa»).
 * No sustituye `detalles` de una fila situacional.
 */

export function normalizeSeccionTitulo(raw?: string | null): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

export type DesgloseSeccionGrupo<T> = {
  /** null = unidades que sí salen del título de la misión. */
  seccion: string | null;
  items: T[];
};

/** Agrupa unidades consecutivas con el mismo título de familia. */
export function groupSubsBySeccion<T extends { seccionTitulo?: string | null }>(
  subs: T[]
): DesgloseSeccionGrupo<T>[] {
  const groups: DesgloseSeccionGrupo<T>[] = [];
  for (const item of subs) {
    const seccion = normalizeSeccionTitulo(item.seccionTitulo);
    const last = groups[groups.length - 1];
    if (last && last.seccion === seccion) {
      last.items.push(item);
    } else {
      groups.push({ seccion, items: [item] });
    }
  }
  return groups;
}

/** Última familia usada — para seguir añadiendo al mismo lote. */
export function lastSeccionTitulo(
  subs: Array<{ seccionTitulo?: string | null }>
): string | null {
  for (let i = subs.length - 1; i >= 0; i--) {
    const t = normalizeSeccionTitulo(subs[i]?.seccionTitulo);
    if (t) return t;
  }
  return null;
}

export function applySeccionTitulo<T extends { seccionTitulo?: string }>(
  item: T,
  raw?: string | null
): T {
  const seccion = normalizeSeccionTitulo(raw);
  if (!seccion) {
    if (item.seccionTitulo == null || item.seccionTitulo === "") return item;
    const next = { ...item };
    delete next.seccionTitulo;
    return next;
  }
  if (item.seccionTitulo === seccion) return item;
  return { ...item, seccionTitulo: seccion };
}
