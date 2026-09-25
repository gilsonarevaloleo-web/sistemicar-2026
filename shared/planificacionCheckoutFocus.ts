/**
 * Checkout enfocado: un peldaño a la vez.
 * El anuncio y el upsell in-app mandan `?plan=` — /pagos no debe
 * abrir con el stack de $89.97 ni mezclar Umbral/Espejo.
 */

import type { PlanificacionSkuId } from "./planificacionPricing.ts";

export type CheckoutFocus = {
  focusSkuId: PlanificacionSkuId | null;
  hideStacks: boolean;
  collapseLaterPeldanos: boolean;
  hideOtherWorlds: boolean;
  headline: string | null;
  subline: string | null;
};

const EMPTY_FOCUS: CheckoutFocus = {
  focusSkuId: null,
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

  if (plan === "planificacion_base" || (adsBase && !plan)) {
    return {
      focusSkuId: "planificacion_base",
      hideStacks: true,
      collapseLaterPeldanos: true,
      hideOtherWorlds: true,
      headline: "Jornada Base",
      subline:
        "Peldaño 1 · $24.99/mes. Ritmo y Norte se ofrecen después, cuando ya mides unidades.",
    };
  }

  if (plan === "operativo") {
    return {
      focusSkuId: "operativo",
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
      hideStacks: false,
      collapseLaterPeldanos: false,
      hideOtherWorlds: true,
      headline: "Norte",
      subline: "Último peldaño. Crisol + Hub. Ideal con Base y Ritmo.",
    };
  }

  return EMPTY_FOCUS;
}
