/**
 * Desbloqueo operativo solo en Deploy Preview de Netlify.
 * El preview no comparte la sesión/cookies de sistemicar.app; sin esto el menú
 * queda sin Jornada y parece “incompleto”.
 *
 * Atajo: ?preview_ops=1 en la URL desbloquea al cargar (útil para PRs de voz/jornada).
 */

const STORAGE_KEY = "sistemicar_preview_ops_v1";

export function isDeployPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith(".netlify.app") && host.includes("deploy-preview");
}

export function isPreviewOpsUnlocked(): boolean {
  if (!isDeployPreviewHost()) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPreviewOpsUnlocked(on: boolean): void {
  if (!isDeployPreviewHost()) return;
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Si la URL trae ?preview_ops=1 (o true), desbloquea ops de preview. */
export function consumePreviewOpsQueryUnlock(): boolean {
  if (!isDeployPreviewHost() || typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("preview_ops") || "").toLowerCase();
    if (raw !== "1" && raw !== "true" && raw !== "on") return false;
    setPreviewOpsUnlocked(true);
    params.delete("preview_ops");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
    return true;
  } catch {
    return false;
  }
}
