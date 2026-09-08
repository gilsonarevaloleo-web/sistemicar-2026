/**
 * Entrada comercial Jornada (anuncios Meta → /ventas-jornada → vendedor).
 * Este corte solo acepta Jornada Base (códigos 1 / 2 / 3).
 */

import type { PlanetaId } from "./planetasConfig.ts";
import {
  clampCodigoJornadaBase,
  resolverTriageVendedor,
  type CodigoJornadaBase,
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

/** Dolor del anuncio Base — Código 3 (día sin cierre). */
export const JORNADA_ADS_CODIGO_DEFAULT = 3 as CodigoJornadaBase;

export interface EntradaComercialParsed {
  planeta: "JORNADA";
  codigo: CodigoJornadaBase;
}

export function parseEntradaComercialSearch(
  search: string,
): EntradaComercialParsed | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const planetaRaw = (params.get("planeta") || "").trim().toUpperCase();
  // Este corte: solo Jornada. Espejo/Umbral no saltan las preguntas.
  if (planetaRaw !== "JORNADA") return null;

  const codigoRaw = Number(params.get("codigo"));
  const codigo = Number.isInteger(codigoRaw)
    ? clampCodigoJornadaBase(codigoRaw)
    : JORNADA_ADS_CODIGO_DEFAULT;

  return { planeta: "JORNADA", codigo };
}

/** Fijación determinista para tráfico de anuncio (sin las 2 preguntas). */
export function fijacionDesdeEntradaComercial(
  planeta: PlanetaId = "JORNADA",
  codigo: number = JORNADA_ADS_CODIGO_DEFAULT,
): FijacionVendedor {
  const codigoJ = clampCodigoJornadaBase(codigo);
  return resolverTriageVendedor([
    { planeta: "JORNADA", codigo: codigoJ },
    { planeta: "JORNADA", codigo: codigoJ },
  ]);
}

/** Enlace absoluto de pago Jornada Base (WhatsApp / voz). */
export function enlacePagoJornadaBase(sellerRef?: string | null): string {
  const base = "https://www.sistemicar.app/pagos?plan=planificacion_base";
  if (!sellerRef?.trim()) return base;
  return `${base}&ref=${encodeURIComponent(sellerRef.trim())}`;
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
