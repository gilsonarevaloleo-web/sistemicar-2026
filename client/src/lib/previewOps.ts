/**
 * Desbloqueo operativo solo en Deploy Preview de Netlify.
 * El preview no comparte la sesión/cookies de sistemicar.app; sin esto el menú
 * queda sin Jornada y ModuleRoute redirige a /pagos.
 *
 * Atajo: ?preview_ops=1 desbloquea al cargar (App + menú) y abre Jornada.
 * Además: el drawer Collaborate de Netlify intercepta toques en móvil
 * (“no funcionan los clic”). Se fuerza `ntl-drawer-state=hidden` al cargar.
 */

const STORAGE_KEY = "sistemicar_preview_ops_v1";

export function isDeployPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith(".netlify.app") && host.includes("deploy-preview");
}

function readUnlockFlag(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* noop */
  }
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* noop */
  }
  return false;
}

export function isPreviewOpsUnlocked(): boolean {
  if (!isDeployPreviewHost()) return false;
  return readUnlockFlag();
}

/** @returns true si quedó persistido (o ya estaba). */
export function setPreviewOpsUnlocked(on: boolean): boolean {
  if (!isDeployPreviewHost()) return false;
  let ok = false;
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
    ok = on ? sessionStorage.getItem(STORAGE_KEY) === "1" : true;
  } catch {
    ok = false;
  }
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
    if (!ok) ok = on ? localStorage.getItem(STORAGE_KEY) === "1" : true;
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent("sistemicar-preview-ops", { detail: { on } }));
  } catch {
    /* noop */
  }
  return ok;
}

/**
 * Consume ?preview_ops=1|true|on.
 * @returns true si desbloqueó en esta llamada.
 */
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

/**
 * Entrada a Jornada tras unlock — soft navigate (wouter), no location.assign.
 * Full reload remonta motores globales + parse del chunk Dual Kernel y congela móvil.
 */
export function previewPlaneacionHref(): string {
  return "/jornada-v4";
}

/** Entrada dura a Jornada (fallback si soft navigate falla). */
export function goPreviewJornada(hard = true): void {
  setPreviewOpsUnlocked(true);
  if (typeof window === "undefined") return;
  if (hard) {
    window.location.assign("/jornada-v4");
    return;
  }
  window.location.href = "/jornada-v4";
}
