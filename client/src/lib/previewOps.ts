/**
 * Desbloqueo operativo solo en Deploy Preview de Netlify.
 * El preview no comparte la sesión/cookies de sistemicar.app; sin esto el menú
 * queda sin Jornada y parece “incompleto”.
 *
 * Además: el drawer Collaborate de Netlify intercepta toques en móvil
 * (“no funcionan los clic”). Se fuerza `ntl-drawer-state=hidden` al cargar.
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

/** @returns true si quedó persistido (o ya estaba). */
export function setPreviewOpsUnlocked(on: boolean): boolean {
  if (!isDeployPreviewHost()) return false;
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
    return on ? sessionStorage.getItem(STORAGE_KEY) === "1" : true;
  } catch {
    return false;
  }
}

/**
 * El drawer Collaborate de Netlify tapa botones y come pointer events en móvil.
 * `?ntl-drawer-state=hidden` lo deja fuera (docs Netlify) y persiste en la pestaña.
 * @returns true si está redirigiendo (no montar React aún).
 */
export function hideNetlifyDrawerIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDeployPreviewHost()) return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("ntl-drawer-state") === "hidden") return false;
    url.searchParams.set("ntl-drawer-state", "hidden");
    window.location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
}

/** Entrada a Jornada tras unlock — un solo gesto, drawer ya oculto. */
export function previewPlaneacionHref(): string {
  return "/planeacion?ntl-drawer-state=hidden";
}
