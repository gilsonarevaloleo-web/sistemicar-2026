/**
 * Un nido mide producción.
 *
 * `etiqueta` se conserva en datos (`proyecto` | `centro` | `consciencia`) para
 * no romper documentos viejos. Ya no decide oleada, punto, escalera ni figura.
 * La lectura —darse cuenta, crecimiento, deber— vive en el operador.
 */
import { feedsProyectoHub, type DestinoCierre } from "./destinoCierre";

export type ProyectoEtiqueta = "proyecto" | "centro" | "consciencia";
export type NidoFiltro = "todos" | ProyectoEtiqueta;

export const NIDO_ETIQUETAS: readonly ProyectoEtiqueta[] = [
  "proyecto",
  "centro",
  "consciencia",
] as const;

export function resolveProyectoEtiqueta(raw?: string | null): ProyectoEtiqueta {
  if (raw === "centro" || raw === "consciencia" || raw === "proyecto") return raw;
  return "proyecto";
}

/** Todo nido alimenta la escalera cuando el cierre es Dirección. */
export function nidoFeedsEscalera(_etiqueta?: string | null): boolean {
  return true;
}

/** Todo nido pide oleada y punto de producción para abrir Dirección. */
export function nidoRequiereOleada(_etiqueta?: string | null): boolean {
  return true;
}

export function feedsEscaleraNido(
  destino: DestinoCierre,
  _etiqueta?: string | null
): boolean {
  return feedsProyectoHub(destino);
}

export function nidoRiesgoEnsuciar(titulo: string, _etiqueta?: string | null): string {
  const name = titulo.trim() || "este nido";
  return `Mandar un vehículo a «${name}» entra a la escalera. Si no es el foco, ensucia el proyecto.`;
}

/** Agrupa por etiqueta guardada. El Hub ya no filtra con esto. */
export function filterNidosPorNaturaleza<T extends { etiqueta?: string | null }>(
  list: T[],
  filtro: NidoFiltro
): T[] {
  if (filtro === "todos") return list;
  return list.filter(p => resolveProyectoEtiqueta(p.etiqueta) === filtro);
}
