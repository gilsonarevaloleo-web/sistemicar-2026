/**
 * Catálogo de Purchase para Meta Pixel.
 * El valor y el content_id deben coincidir con lo que el usuario pagó.
 */

import { PLANIFICACION_SKU_BY_ID } from "./planificacionPricing.ts";
import { UMBRAL_SKU } from "./umbralPricing.ts";
import { ESPEJO_SKU_INICIO, ESPEJO_SKU_RECARGA } from "./espejoPricing.ts";
import { DEPOSITO_SKU_BY_ID } from "./depositoPricing.ts";

export type MetaPurchaseCatalog = {
  content_name: string;
  content_ids: string[];
  value: number;
  currency: "USD";
};

const CATALOG: Record<string, MetaPurchaseCatalog> = {
  planificacion_base: {
    content_name: PLANIFICACION_SKU_BY_ID.planificacion_base.name,
    content_ids: ["planificacion_base"],
    value: PLANIFICACION_SKU_BY_ID.planificacion_base.priceUsd,
    currency: "USD",
  },
  jornada_base: {
    content_name: PLANIFICACION_SKU_BY_ID.planificacion_base.name,
    content_ids: ["planificacion_base"],
    value: PLANIFICACION_SKU_BY_ID.planificacion_base.priceUsd,
    currency: "USD",
  },
  operativo: {
    content_name: PLANIFICACION_SKU_BY_ID.operativo.name,
    content_ids: ["operativo"],
    value: PLANIFICACION_SKU_BY_ID.operativo.priceUsd,
    currency: "USD",
  },
  soberania_dia: {
    content_name: PLANIFICACION_SKU_BY_ID.soberania_dia.name,
    content_ids: ["soberania_dia"],
    value: PLANIFICACION_SKU_BY_ID.soberania_dia.priceUsd,
    currency: "USD",
  },
  umbral: {
    content_name: UMBRAL_SKU.name,
    content_ids: ["umbral"],
    value: UMBRAL_SKU.priceUsd,
    currency: "USD",
  },
  deposito_matricula: {
    content_name: DEPOSITO_SKU_BY_ID.deposito_matricula.name,
    content_ids: ["deposito_matricula"],
    value: DEPOSITO_SKU_BY_ID.deposito_matricula.priceUsd,
    currency: "USD",
  },
  deposito_carrera: {
    content_name: DEPOSITO_SKU_BY_ID.deposito_carrera.name,
    content_ids: ["deposito_carrera"],
    value: DEPOSITO_SKU_BY_ID.deposito_carrera.priceUsd,
    currency: "USD",
  },
  deposito_titulo: {
    content_name: DEPOSITO_SKU_BY_ID.deposito_titulo.name,
    content_ids: ["deposito_titulo"],
    value: DEPOSITO_SKU_BY_ID.deposito_titulo.priceUsd,
    currency: "USD",
  },
  espejo_inicio: {
    content_name: ESPEJO_SKU_INICIO.name,
    content_ids: ["espejo_inicio"],
    value: ESPEJO_SKU_INICIO.priceUsd,
    currency: "USD",
  },
  espejo_recarga: {
    content_name: ESPEJO_SKU_RECARGA.name,
    content_ids: ["espejo_recarga"],
    value: ESPEJO_SKU_RECARGA.priceUsd,
    currency: "USD",
  },
};

export function resolveMetaPurchase(planId: string | null | undefined): MetaPurchaseCatalog | null {
  const id = (planId || "").trim().toLowerCase();
  if (!id) return null;
  return CATALOG[id] ?? null;
}

/** payment_id / collection_id que Mercado Pago pone al volver. */
export function extractMercadoPagoPaymentId(search: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  for (const key of ["payment_id", "collection_id", "preference_id"]) {
    const value = (params.get(key) || "").trim();
    if (value && value !== "null") return value;
  }
  return null;
}
