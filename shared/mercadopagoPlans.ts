/** Planes de suscripción y API usados por Mercado Pago (servidor Node y función Vercel). */
import {
  PLANIFICACION_CHECKOUT_ORDER,
  PLANIFICACION_SKU_BY_ID,
} from "./planificacionPricing";
import { UMBRAL_SKU } from "./umbralPricing";
import {
  ESPEJO_CHECKOUT_ORDER,
  ESPEJO_SKU_INICIO,
  ESPEJO_SKU_RECARGA,
} from "./espejoPricing";
import {
  DEPOSITO_CHECKOUT_ORDER,
  DEPOSITO_SKU_BY_ID,
} from "./depositoPricing";

export const SUBSCRIPTION_PLANS = {
  /** Espejo — pack créditos entrada (pago único). */
  espejo_inicio: {
    id: ESPEJO_SKU_INICIO.id,
    name: ESPEJO_SKU_INICIO.name,
    price: ESPEJO_SKU_INICIO.priceUsd,
    isOneTime: true as const,
    espejoCredits: ESPEJO_SKU_INICIO.credits,
  },
  /** Espejo — pack créditos recarga (pago único). */
  espejo_recarga: {
    id: ESPEJO_SKU_RECARGA.id,
    name: ESPEJO_SKU_RECARGA.name,
    price: ESPEJO_SKU_RECARGA.priceUsd,
    isOneTime: true as const,
    espejoCredits: ESPEJO_SKU_RECARGA.credits,
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
  /** Universidad — Matrícula (G1 + dictamen) */
  deposito_matricula: {
    id: "deposito_matricula",
    name: DEPOSITO_SKU_BY_ID.deposito_matricula.name,
    price: DEPOSITO_SKU_BY_ID.deposito_matricula.priceUsd,
  },
  /** Universidad — Carrera (G2–G3 + mapa) */
  deposito_carrera: {
    id: "deposito_carrera",
    name: DEPOSITO_SKU_BY_ID.deposito_carrera.name,
    price: DEPOSITO_SKU_BY_ID.deposito_carrera.priceUsd,
  },
  /** Universidad — Título (G4 + criterio) */
  deposito_titulo: {
    id: "deposito_titulo",
    name: DEPOSITO_SKU_BY_ID.deposito_titulo.name,
    price: DEPOSITO_SKU_BY_ID.deposito_titulo.priceUsd,
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

/** Packs Espejo (créditos, pago único) vía /pagos?plan=espejo_inicio|espejo_recarga */
export const ESPEJO_CHECKOUT_PLANS = ESPEJO_CHECKOUT_ORDER;
export type EspejoCheckoutPlanId = (typeof ESPEJO_CHECKOUT_PLANS)[number];

/** Universidad (Depósito) vía /pagos?plan=deposito_matricula|deposito_carrera|deposito_titulo */
export const DEPOSITO_CHECKOUT_PLANS = DEPOSITO_CHECKOUT_ORDER;
export type DepositoCheckoutPlanId = (typeof DEPOSITO_CHECKOUT_PLANS)[number];
