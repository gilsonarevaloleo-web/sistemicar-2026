/**
 * Facebook / Meta Pixel — prospectos y embudo Jornada Base.
 * El snippet vive en client/index.html (ID 1066497298319685).
 */

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
  params?: Record<string, unknown>
): boolean {
  const fbq = getFbq();
  if (!fbq) return false;
  if (params) fbq("track", event, params);
  else fbq("track", event);
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

export function trackPurchase(params: {
  content_name: string;
  value: number;
  currency?: string;
  content_ids?: string[];
}): boolean {
  return trackMeta("Purchase", {
    currency: params.currency ?? "USD",
    content_name: params.content_name,
    value: params.value,
    content_ids: params.content_ids,
    content_category: "Premium Module",
  });
}
