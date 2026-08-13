/**
 * Espejo — packs de créditos (pago único).
 * Sin suscripción: el usuario compra limpiezas cuando las necesita.
 */

import { PLANIFICACION_USD_TO_PEN } from "./planificacionPricing.ts";

export const ESPEJO_PRICE_VERSION = "1.0-creditos";

export type EspejoSkuId = "espejo_inicio" | "espejo_recarga";

export interface EspejoSku {
  id: EspejoSkuId;
  name: string;
  shortName: string;
  priceUsd: number;
  pricePen: number;
  credits: number;
  isOneTime: true;
  unlocks: string[];
  identity: string;
  forWho: string;
  funnelHint: string;
  /** Comisión vendedor 30% del pack. */
  commissionUsd: number;
  checkoutHref: string;
}

function penFromUsd(usd: number): number {
  return Math.round(usd * PLANIFICACION_USD_TO_PEN);
}

function commission(usd: number): number {
  return Math.round(usd * 0.3 * 100) / 100;
}

/** Pack entrada — ~2–3 sesiones de limpieza. */
export const ESPEJO_SKU_INICIO: EspejoSku = {
  id: "espejo_inicio",
  name: "Espejo Inicio",
  shortName: "Inicio",
  priceUsd: 9.9,
  pricePen: penFromUsd(9.9),
  credits: 6,
  isOneTime: true,
  unlocks: [
    "6 créditos Espejo (no vencen)",
    "Diagnóstico clínico + protocolo",
    "Pago único — sin suscripción",
    "Ideal para 2–3 limpiezas",
  ],
  identity: "Limpio la carga y sigo",
  forWho: "Entrada emocional — fricción puntual",
  funnelHint: "Empieza con 6 créditos",
  commissionUsd: commission(9.9),
  checkoutHref: "/pagos?plan=espejo_inicio",
};

/** Pack recarga — más créditos, mejor precio unitario. */
export const ESPEJO_SKU_RECARGA: EspejoSku = {
  id: "espejo_recarga",
  name: "Espejo Recarga",
  shortName: "Recarga",
  priceUsd: 19.9,
  pricePen: penFromUsd(19.9),
  credits: 15,
  isOneTime: true,
  unlocks: [
    "15 créditos Espejo (no vencen)",
    "Mejor precio por crédito (~$1.33)",
    "Pago único — sin suscripción",
    "Para quien vuelve cuando hace falta",
  ],
  identity: "Recargo solo cuando duele",
  forWho: "Recarga — ya conoces el Espejo",
  funnelHint: "Más limpiezas, menos por crédito",
  commissionUsd: commission(19.9),
  checkoutHref: "/pagos?plan=espejo_recarga",
};

export const ESPEJO_SKU_BY_ID: Record<EspejoSkuId, EspejoSku> = {
  espejo_inicio: ESPEJO_SKU_INICIO,
  espejo_recarga: ESPEJO_SKU_RECARGA,
};

export const ESPEJO_CHECKOUT_ORDER: readonly EspejoSkuId[] = [
  "espejo_inicio",
  "espejo_recarga",
];

export function isEspejoSkuId(planId: string): planId is EspejoSkuId {
  return planId === "espejo_inicio" || planId === "espejo_recarga";
}

export function espejoCreditsForPlan(planId: string): number | null {
  if (!isEspejoSkuId(planId)) return null;
  return ESPEJO_SKU_BY_ID[planId].credits;
}
