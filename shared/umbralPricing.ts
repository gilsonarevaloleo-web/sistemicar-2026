/**
 * Umbral v2 — Precio y empaque comercial.
 * Trial: Código 1 gratis. Paywall: Códigos 2–10 + métricas.
 */

import { PLANIFICACION_USD_TO_PEN } from "./planificacionPricing.ts";

export const UMBRAL_PRICE_VERSION = "1.0-umbral";

/** Código máximo permitido sin suscripción Umbral. */
export const UMBRAL_TRIAL_MAX_CODIGO = 1 as const;

export type UmbralSkuId = "umbral";

export interface UmbralSku {
  id: UmbralSkuId;
  name: string;
  shortName: string;
  priceUsd: number;
  pricePen: number;
  unlocks: string[];
  identity: string;
  forWho: string;
  funnelHint: string;
  /** Comisión vendedor 30%. */
  commissionUsd: number;
  checkoutHref: string;
}

function penFromUsd(usd: number): number {
  return Math.round(usd * PLANIFICACION_USD_TO_PEN);
}

function commission(usd: number): number {
  return Math.round(usd * 0.3 * 100) / 100;
}

/** SKU mensual Umbral — ancla $24.99 (mismo peldaño psicológico que Jornada Base). */
export const UMBRAL_SKU: UmbralSku = {
  id: "umbral",
  name: "Umbral",
  shortName: "Umbral",
  priceUsd: 24.99,
  pricePen: penFromUsd(24.99),
  unlocks: [
    "Código 1 gratis (trial con evaluador real)",
    "Códigos 2–10 desbloqueados (Forja + Arena)",
    "Arquetipos de cliente y misión táctica",
    "Panel de métricas diagnósticas",
    "Historial de sesiones y PS de Umbral",
  ],
  identity: "Atravieso umbrales con criterio, no con motivación",
  forWho: "Operadores y vendedores que quieren estándar, no chat",
  funnelHint: "Prueba el Código 1 · paga para seguir",
  commissionUsd: commission(24.99),
  checkoutHref: "/pagos?plan=umbral",
};

/** Consola Forja + Arena (trial C1; paywall 2–10). */
export const UMBRAL_CONSOLE_PATH = "/umbral/v2" as const;

export const UMBRAL_MENU = {
  id: "umbral",
  title: "UMBRAL",
  subtitle: "Donde se encuentran Forja y Arena",
  route: UMBRAL_CONSOLE_PATH,
  color: "#FF6B35",
} as const;

/** Rutas del módulo Umbral (no /umbral-leads). */
export function isUmbralModulePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/umbral" || path.startsWith("/umbral/");
}

export const UMBRAL_CHECKOUT_PLANS = ["umbral"] as const;

/** ¿El código está dentro del trial gratuito? */
export function esCodigoUmbralEnTrial(codigo: number): boolean {
  return Number.isInteger(codigo) && codigo >= 1 && codigo <= UMBRAL_TRIAL_MAX_CODIGO;
}

/** ¿Requiere suscripción Umbral para operar este código? */
export function requierePagoUmbral(codigo: number, hasPaidAccess: boolean): boolean {
  if (hasPaidAccess) return false;
  return !esCodigoUmbralEnTrial(codigo);
}
