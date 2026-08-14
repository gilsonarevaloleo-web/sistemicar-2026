/**
 * Persistencia local de la fijación Código + Planeta (Capa 1).
 * Base para la fase de llamadas (Twilio) más adelante.
 */

import type { FijacionVendedor } from "@shared/vendedor/triageLogic";

const STORAGE_KEY = "sistemicar_vendedor_fijacion";

export function saveFijacionVendedor(fijacion: FijacionVendedor): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fijacion));
    window.dispatchEvent(
      new CustomEvent("vendedor-fijacion-updated", { detail: fijacion }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getFijacionVendedor(): FijacionVendedor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FijacionVendedor;
  } catch {
    return null;
  }
}

export function clearFijacionVendedor(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Añade ?ref= o &ref= al href de checkout/trial. */
export function withSellerRef(href: string, sellerRef: string | null): string {
  if (!sellerRef) return href;
  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}ref=${encodeURIComponent(sellerRef)}`;
}
