/**
 * Facebook / Meta Pixel — registro, pago y embudo Jornada Base.
 * El snippet vive en client/index.html (ID 1066497298319685).
 *
 * Conversiones que Meta usa para ubicar audiencias:
 *   CompleteRegistration → usuario que se registra (Google)
 *   Purchase             → usuario que paga (vuelta de Mercado Pago)
 */

import {
  extractMercadoPagoPaymentId,
  resolveMetaPurchase,
} from "@shared/metaPurchaseCatalog";

export const META_PIXEL_ID = "1066497298319685";

type FbqFn = (...args: unknown[]) => void;

function getFbq(): FbqFn | null {
  if (typeof window === "undefined") return null;
  const fbq = (window as { fbq?: FbqFn }).fbq;
  return typeof fbq === "function" ? fbq : null;
}

export function isMetaPixelReady(): boolean {
  return getFbq() != null;
}

export function trackMeta(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
): boolean {
  const fbq = getFbq();
  if (!fbq) return false;
  if (options?.eventID) {
    fbq("track", event, params ?? {}, { eventID: options.eventID });
  } else if (params) {
    fbq("track", event, params);
  } else {
    fbq("track", event);
  }
  return true;
}

function consumeOnce(key: string, store: "local" | "session"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const storage = store === "local" ? window.localStorage : window.sessionStorage;
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

let lastIdentifiedEmail: string | null = null;

/**
 * Advanced Matching: el email (y uid) le permiten a Meta emparejar
 * al que se registra con el que paga y buscar públicos parecidos.
 */
export function identifyMetaUser(opts: {
  email?: string | null;
  name?: string | null;
  uid?: string | null;
}): boolean {
  const fbq = getFbq();
  const em = (opts.email || "").trim().toLowerCase();
  if (!fbq || !em) return false;
  if (lastIdentifiedEmail === em) return false;
  const parts = (opts.name || "").trim().split(/\s+/).filter(Boolean);
  fbq("init", META_PIXEL_ID, {
    em,
    external_id: opts.uid || undefined,
    fn: parts[0] || undefined,
    ln: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  });
  lastIdentifiedEmail = em;
  return true;
}

export function jornadaBasePixelPayload() {
  return {
    content_name: "Jornada Base",
    content_ids: ["planificacion_base"],
    content_category: "Jornada",
    value: 24.99,
    currency: "USD",
  };
}

export function trackJornadaViewContent(): boolean {
  return trackMeta("ViewContent", jornadaBasePixelPayload());
}

export function trackJornadaLead(source: string): boolean {
  return trackMeta("Lead", {
    ...jornadaBasePixelPayload(),
    content_category: "Prospecto",
    source,
  });
}

export function trackJornadaInitiateCheckout(): boolean {
  return trackMeta("InitiateCheckout", {
    ...jornadaBasePixelPayload(),
    num_items: 1,
  });
}

export function trackJornadaStartTrial(): boolean {
  return trackMeta("StartTrial", {
    ...jornadaBasePixelPayload(),
    predicted_ltv: 24.99,
  });
}

/** Usuario que crea cuenta (Google). Una vez por uid en este navegador. */
export function trackCompleteRegistration(opts: {
  uid?: string | null;
  email?: string | null;
  name?: string | null;
  method?: string;
}): boolean {
  const id = (opts.uid || opts.email || "").trim().toLowerCase();
  if (!id) return false;
  if (opts.email) identifyMetaUser(opts);
  const key = `meta_complete_reg_${id}`;
  if (!consumeOnce(key, "local")) return false;
  return trackMeta(
    "CompleteRegistration",
    {
      content_name: "SISTEMICAR",
      status: true,
      method: opts.method || "google",
    },
    { eventID: key }
  );
}

/**
 * Usuario que paga. Disparar en /pagos?status=success (vuelta de MP),
 * no solo en /gracias-compra. Deduplica por payment_id.
 */
export function trackPaidPurchase(opts: {
  planId?: string | null;
  paymentId?: string | null;
  search?: string | null;
  email?: string | null;
  name?: string | null;
  uid?: string | null;
}): boolean {
  const catalog = resolveMetaPurchase(opts.planId);
  if (!catalog) return false;
  if (opts.email) identifyMetaUser(opts);
  const paymentId =
    (opts.paymentId || "").trim() ||
    extractMercadoPagoPaymentId(opts.search || "") ||
    "";
  const key = `meta_purchase_${catalog.content_ids[0]}_${paymentId || "session"}`;
  if (!consumeOnce(key, "session")) return false;
  return trackMeta(
    "Purchase",
    {
      ...catalog,
      content_category: "Premium Module",
    },
    { eventID: paymentId || key }
  );
}

/** @deprecated Usar trackPaidPurchase con planId */
export function trackPurchase(params: {
  content_name: string;
  value: number;
  currency?: string;
  content_ids?: string[];
}): boolean {
  const planId = params.content_ids?.[0];
  if (planId && resolveMetaPurchase(planId)) {
    return trackPaidPurchase({ planId });
  }
  return trackMeta("Purchase", {
    currency: params.currency ?? "USD",
    content_name: params.content_name,
    value: params.value,
    content_ids: params.content_ids,
    content_category: "Premium Module",
  });
}

export { resolveMetaPurchase, extractMercadoPagoPaymentId };
