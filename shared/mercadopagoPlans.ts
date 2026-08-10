/** Planes de suscripción y API usados por Mercado Pago (servidor Node y función Vercel). */
import {
  PLANIFICACION_CHECKOUT_ORDER,
  PLANIFICACION_SKU_BY_ID,
} from "./planificacionPricing";
import { UMBRAL_SKU } from "./umbralPricing";

export const SUBSCRIPTION_PLANS = {
  /**
   * Legacy — Espejo v1 ($17). Ya no se vende en checkout.
   * Se conserva para webhooks / créditos de compras antiguas.
   */
  "corazon-sabio": {
    id: "corazon-sabio",
    name: "El Corazón Sabio™",
    price: 17,
    isOneTime: true,
    espejoCredits: 10,
    legacy: true,
  },
  "soberania-mental": { id: "soberania-mental", name: "Soberanía Mental", price: 9.99, legacy: true },
  /** Jornada Base — vehículos + PS + Conquista */
  planificacion_base: {
    id: "planificacion_base",
    name: PLANIFICACION_SKU_BY_ID.planificacion_base.name,
    price: PLANIFICACION_SKU_BY_ID.planificacion_base.priceUsd,
  },
  /** Norte — Crisol + Hub (id legacy soberania_dia) */
  soberania_dia: {
    id: "soberania_dia",
    name: PLANIFICACION_SKU_BY_ID.soberania_dia.name,
    price: PLANIFICACION_SKU_BY_ID.soberania_dia.priceUsd,
  },
  /** Ritmo del día — segmentos + Situacional (id legacy operativo) */
  operativo: {
    id: "operativo",
    name: PLANIFICACION_SKU_BY_ID.operativo.name,
    price: PLANIFICACION_SKU_BY_ID.operativo.priceUsd,
  },
  /** Umbral v2 — Forja + Arena (trial Código 1 gratis) */
  umbral: {
    id: "umbral",
    name: UMBRAL_SKU.name,
    price: UMBRAL_SKU.priceUsd,
  },
  /** Legacy — grandfather / webhooks antiguos (no checkout UI) */
  arquitecto: { id: "arquitecto", name: "Arquitecto", price: 24.99, legacy: true },
  soberano_operativo: { id: "soberano_operativo", name: "Soberano Operativo", price: 34.99, legacy: true },
  soberano: { id: "soberano", name: "Soberano", price: 49.99, legacy: true },
  "api-starter": {
    id: "api-starter",
    name: "API Starter",
    price: 29,
    monthlyCallLimit: 500,
    daysValid: 30,
  },
  "api-pro": {
    id: "api-pro",
    name: "API Pro",
    price: 99,
    monthlyCallLimit: 5000,
    daysValid: 30,
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

/** Planes visibles en checkout de Planificación (mensual) — orden psicológico. */
export const PLANIFICACION_CHECKOUT_PLANS = PLANIFICACION_CHECKOUT_ORDER;

export type PlanificacionCheckoutPlanId = (typeof PLANIFICACION_CHECKOUT_PLANS)[number];

/** Planes Umbral seleccionables vía /pagos?plan=umbral */
export const UMBRAL_CHECKOUT_PLANS = ["umbral"] as const;
export type UmbralCheckoutPlanId = (typeof UMBRAL_CHECKOUT_PLANS)[number];
