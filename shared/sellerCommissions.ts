import { SUBSCRIPTION_PLANS } from "./mercadopagoPlans";

/** Comisión del vendedor: 30% de cada pago (recurrente en suscripciones; una vez en packs Espejo). */
export const SELLER_COMMISSION_RATE = 0.3;

/** Catálogo actual de /pagos con comisión vendedor. */
export const SELLER_PLAN_IDS = [
  "planificacion_base",
  "soberania_dia",
  "operativo",
  "umbral",
  "espejo_inicio",
  "espejo_recarga",
] as const;

export type SellerPlanId = (typeof SELLER_PLAN_IDS)[number];

export function isSellerPlanId(planId: string): planId is SellerPlanId {
  return (SELLER_PLAN_IDS as readonly string[]).includes(planId);
}

export function sellerCommissionForPlan(planId: string): number | null {
  if (!isSellerPlanId(planId)) return null;
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan || !("price" in plan)) return null;
  return Math.round(plan.price * SELLER_COMMISSION_RATE * 100) / 100;
}

export function sellerPlanLabel(planId: string): string {
  const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
  return plan?.name ?? planId;
}
