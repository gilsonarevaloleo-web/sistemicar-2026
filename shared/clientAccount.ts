/**
 * La cuenta del cliente NO se crea al pagar (Yape / PayPal / MP).
 * Se crea en /acceso al pulsar «Continuar con Google» con el mismo correo del pago.
 */

export const CLIENT_ACCESO_PATH = "/acceso";
export const CLIENT_ACCESO_PUBLIC_URL = "https://sistemicar.app/acceso";

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  planificacion_base: "Jornada Base",
  operativo: "Ritmo del día",
  soberania_dia: "Norte",
  umbral: "Umbral",
};

export function displayNameForPlan(planId: string): string {
  return PLAN_DISPLAY_NAMES[planId] || planId;
}

/** Evita open-redirects en ?next= de /acceso. */
export function safePostLoginPath(raw: string | null | undefined, fallback = "/menu"): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

export function accesoUrlWithNext(nextPath?: string): string {
  const next = nextPath ? safePostLoginPath(nextPath) : "";
  if (!next || next === "/menu") return CLIENT_ACCESO_PATH;
  return `${CLIENT_ACCESO_PATH}?next=${encodeURIComponent(next)}`;
}

export function buildGrantDeliveryId(
  source: string,
  reference?: string,
  nowMs = Date.now(),
): string {
  const src = (source.trim().toLowerCase() || "manual").replace(/[^a-z0-9_-]/g, "");
  const ref = reference?.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  if (ref) return `${src}:${ref}`;
  return `${src}:${nowMs}`;
}

export function buildClientAccountWhatsapp(email: string, planName: string): string {
  const e = email.trim().toLowerCase();
  return [
    `Hola, tu pago de ${planName} ya está registrado.`,
    ``,
    `Para crear tu cuenta y entrar:`,
    `1. Abre ${CLIENT_ACCESO_PUBLIC_URL}`,
    `2. Pulsa «Continuar con Google»`,
    `3. Usa EXACTAMENTE este correo: ${e}`,
    ``,
    `Si entras con otro Gmail, el sistema no te encuentra.`,
  ].join("\n");
}

export function moduleGrantAdminMessage(opts: {
  email: string;
  planId: string;
  granted: boolean;
  pending: boolean;
}): string {
  const planName = displayNameForPlan(opts.planId);
  const email = opts.email.trim().toLowerCase();
  if (opts.granted) {
    return `Módulo ${planName} activado para ${email}.`;
  }
  if (opts.pending) {
    return `Pago de ${planName} registrado para ${email}. Aún no tiene cuenta: debe entrar en ${CLIENT_ACCESO_PUBLIC_URL} con Google usando ese mismo correo. Al entrar, el plan se activa solo.`;
  }
  return `No se pudo activar ${planName} para ${email}.`;
}
