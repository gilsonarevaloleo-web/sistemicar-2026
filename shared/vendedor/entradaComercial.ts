/**
 * Entrada comercial Jornada (anuncios Meta → /ventas-jornada → vendedor).
 * Fija planeta JORNADA para que el vendedor algoritmo no re-triage a Espejo/Umbral.
 */

import type { CodigoNumero } from "../umbral/engineConfig.ts";
import { isPlanetaId, type PlanetaId } from "./planetasConfig.ts";
import {
  resolverTriageVendedor,
  type FijacionVendedor,
} from "./triageLogic.ts";

/** Landing pública del anuncio Base. */
export const VENTAS_JORNADA_PATH = "/ventas-jornada";

/** URL exacta para pegar en Meta (única campaña de este corte). */
export const VENTAS_JORNADA_AD_URL =
  "https://sistemicar.app/ventas-jornada?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base";

/** Vendedor con planeta y código del anuncio (día sin cierre = Código 3). */
export const VENDEDOR_JORNADA_ADS_HREF = "/vendedor?planeta=JORNADA&codigo=3";

export const PAGOS_JORNADA_BASE_HREF = "/pagos?plan=planificacion_base";

/** Dolor del anuncio Base — Código 3 (fuga de tiempo / sin cierre). */
export const JORNADA_ADS_CODIGO_DEFAULT = 3 as CodigoNumero;

export interface EntradaComercialParsed {
  planeta: PlanetaId;
  codigo: CodigoNumero;
}

export function parseEntradaComercialSearch(
  search: string,
): EntradaComercialParsed | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const planetaRaw = (params.get("planeta") || "").trim().toUpperCase();
  if (!isPlanetaId(planetaRaw)) return null;

  const codigoRaw = Number(params.get("codigo"));
  const codigo = (
    Number.isInteger(codigoRaw) && codigoRaw >= 1 && codigoRaw <= 10
      ? codigoRaw
      : planetaRaw === "JORNADA"
        ? JORNADA_ADS_CODIGO_DEFAULT
        : 1
  ) as CodigoNumero;

  return { planeta: planetaRaw, codigo };
}

/** Fijación determinista para tráfico de anuncio (sin las 2 preguntas). */
export function fijacionDesdeEntradaComercial(
  planeta: PlanetaId,
  codigo: CodigoNumero = JORNADA_ADS_CODIGO_DEFAULT,
): FijacionVendedor {
  return resolverTriageVendedor([
    { planeta, codigo },
    { planeta, codigo },
  ]);
}

/** Copia ?ref= y utm_* de la URL actual a un href interno. */
export function withTrackedQuery(
  href: string,
  search: string,
): string {
  const current = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const url = new URL(href, "https://sistemicar.app");
  for (const key of [
    "ref",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]) {
    const value = current.get(key);
    if (value && !url.searchParams.get(key)) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}
