/**
 * Checkout enfocado: un peldaño a la vez.
 * El anuncio y el upsell in-app mandan `?plan=` — /pagos no debe
 * abrir con el stack de $89.97 ni mezclar mundos.
 */

import type { PlanificacionSkuId } from "./planificacionPricing.ts";
import type { DepositoSkuId } from "./depositoPricing.ts";
import { SKU_MATRICULA } from "./depositoPricing.ts";
import { CARTA_CIERRE, formatUsdMes, CARTA_PRECIO_BASE_USD } from "./jornadaCartaVenta.ts";

export type CheckoutWorld = "jornada" | "deposito" | "open";

export type CheckoutFocusSkuId = PlanificacionSkuId | DepositoSkuId;

export type CheckoutFocus = {
  focusSkuId: CheckoutFocusSkuId | null;
  world: CheckoutWorld;
  hideStacks: boolean;
  collapseLaterPeldanos: boolean;
  hideOtherWorlds: boolean;
  headline: string | null;
  subline: string | null;
};

const EMPTY_FOCUS: CheckoutFocus = {
  focusSkuId: null,
  world: "open",
  hideStacks: false,
  collapseLaterPeldanos: false,
  hideOtherWorlds: false,
  headline: null,
  subline: null,
};

export function resolveCheckoutFocus(search: string): CheckoutFocus {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const plan = (params.get("plan") || "").trim();
  const campaign = (params.get("utm_campaign") || "").trim().toLowerCase();
  const adsBase = campaign === "jornada_base";
  const adsDeposito =
    campaign === "deposito_matricula" || campaign === "universidad_matricula";

  if (plan === "planificacion_base" || (adsBase && !plan)) {
    return {
      focusSkuId: "planificacion_base",
      world: "jornada",
      hideStacks: true,
      collapseLaterPeldanos: true,
      hideOtherWorlds: true,
      headline: "Jornada Base",
      subline: `Peldaño 1 · ${formatUsdMes(CARTA_PRECIO_BASE_USD)}. ${CARTA_CIERRE}`,
    };
  }

  if (plan === "operativo") {
    return {
      focusSkuId: "operativo",
      world: "jornada",
      hideStacks: true,
      collapseLaterPeldanos: true,
      hideOtherWorlds: true,
      headline: "Ritmo del día",
      subline: "Peldaño 2. Requiere Jornada Base. Norte viene después.",
    };
  }

  if (plan === "soberania_dia") {
    return {
      focusSkuId: "soberania_dia",
      world: "jornada",
      hideStacks: false,
      collapseLaterPeldanos: false,
      hideOtherWorlds: true,
      headline: "Norte",
      subline: "Último peldaño. Crisol + Hub. Ideal con Base y Ritmo.",
    };
  }

  if (plan === "deposito_matricula" || (adsDeposito && !plan)) {
    return {
      focusSkuId: "deposito_matricula",
      world: "deposito",
      hideStacks: true,
      collapseLaterPeldanos: true,
      hideOtherWorlds: true,
      headline: SKU_MATRICULA.name,
      subline:
        "Peldaño 1 · 1 volcado G1 gratis. Carrera y Título se ofrecen después, cuando ya volcaste el ojo.",
    };
  }

  if (plan === "deposito_carrera") {
    return {
      focusSkuId: "deposito_carrera",
      world: "deposito",
      hideStacks: true,
      collapseLaterPeldanos: true,
      hideOtherWorlds: true,
      headline: "Universidad Carrera",
      subline: "Peldaño 2. Requiere Matrícula. Título viene después.",
    };
  }

  if (plan === "deposito_titulo") {
    return {
      focusSkuId: "deposito_titulo",
      world: "deposito",
      hideStacks: false,
      collapseLaterPeldanos: false,
      hideOtherWorlds: true,
      headline: "Universidad Título",
      subline: "Último peldaño. Criterio Vivo + G4. Ideal con Matrícula y Carrera.",
    };
  }

  return EMPTY_FOCUS;
}
