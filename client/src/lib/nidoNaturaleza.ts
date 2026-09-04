/**
 * Naturaleza del nido (Hub).
 *
 * Dirección = rumbo: la conciencia tiene casa.
 * Eso no es lo mismo que crecimiento. Un nido puede ser:
 * - crecimiento (proyecto): oleada, peldaños, escalera
 * - control (centro): deber por circunstancia, no expansión
 * - consciencia: información / darse cuenta — DESCANSO, verdad, registro
 *
 * Los ids internos se conservan (`proyecto`, `centro`) para no romper datos.
 */
import { feedsProyectoHub, type DestinoCierre } from "./destinoCierre";

export type ProyectoEtiqueta = "proyecto" | "centro" | "consciencia";
export type NidoFiltro = "todos" | ProyectoEtiqueta;

export const NIDO_ETIQUETAS: readonly ProyectoEtiqueta[] = [
  "proyecto",
  "centro",
  "consciencia",
] as const;

export const NIDO_NATURALEZA = {
  proyecto: {
    id: "proyecto" as const,
    label: "Crecimiento",
    short: "Crece",
    hint: "Oleada, peldaños, escalera. Lo que eliges expandir.",
    feedsEscalera: true,
    requiereOleada: true,
  },
  centro: {
    id: "centro" as const,
    label: "Control",
    short: "Control",
    hint: "Deber por circunstancia. Cumplir y no arrastrar deuda — no es expansión.",
    feedsEscalera: true,
    requiereOleada: true,
  },
  consciencia: {
    id: "consciencia" as const,
    label: "Darse cuenta",
    short: "Ver",
    hint: "Información y registro. Descanso o verdad: se ve, no se trepa.",
    feedsEscalera: false,
    requiereOleada: false,
  },
} as const;

export function resolveProyectoEtiqueta(raw?: string | null): ProyectoEtiqueta {
  if (raw === "centro" || raw === "consciencia" || raw === "proyecto") return raw;
  return "proyecto";
}

export function nidoNaturaleza(etiqueta?: string | null) {
  return NIDO_NATURALEZA[resolveProyectoEtiqueta(etiqueta)];
}

export function nidoLabel(etiqueta?: string | null): string {
  return nidoNaturaleza(etiqueta).label;
}

export function nidoFeedsEscalera(etiqueta?: string | null): boolean {
  return nidoNaturaleza(etiqueta).feedsEscalera;
}

export function nidoRequiereOleada(etiqueta?: string | null): boolean {
  return nidoNaturaleza(etiqueta).requiereOleada;
}

/** Dirección del día (rumbo) no implica peldaños: DESCANSO no trepa. */
export function feedsEscaleraNido(
  destino: DestinoCierre,
  etiqueta?: string | null
): boolean {
  return feedsProyectoHub(destino) && nidoFeedsEscalera(etiqueta);
}

export function nidoRiesgoEnsuciar(titulo: string, etiqueta?: string | null): string {
  const name = titulo.trim() || "este nido";
  const kind = resolveProyectoEtiqueta(etiqueta);
  if (kind === "consciencia") {
    return `«${name}» registra darse cuenta. No sube peldaños: es información, no escalera.`;
  }
  if (kind === "centro") {
    return `Mandar un vehículo a «${name}» entra al control del deber. Si no es el foco, ensucia el centro.`;
  }
  return `Mandar un vehículo a «${name}» entra a la escalera. Si no es el foco, ensucia el proyecto.`;
}

export function filterNidosPorNaturaleza<T extends { etiqueta?: string | null }>(
  list: T[],
  filtro: NidoFiltro
): T[] {
  if (filtro === "todos") return list;
  return list.filter(p => resolveProyectoEtiqueta(p.etiqueta) === filtro);
}
