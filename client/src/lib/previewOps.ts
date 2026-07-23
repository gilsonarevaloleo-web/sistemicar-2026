/**
 * Desbloqueo operativo solo en Deploy Preview de Netlify.
 * El preview no comparte la sesión/cookies de sistemicar.app; sin esto el menú
 * queda sin Jornada y parece “incompleto”.
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
