/**
 * Desbloqueo operativo solo en Deploy Preview de Netlify.
 * El preview no comparte la sesión/cookies de sistemicar.app; sin esto el menú
 * queda sin Jornada y ModuleRoute redirige a /pagos.
 *
 * Atajo: ?preview_ops=1 desbloquea al cargar (App + menú) y abre Jornada.
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

export function setPreviewOpsUnlocked(on: boolean): void {
  if (!isDeployPreviewHost()) return;
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent("sistemicar-preview-ops", { detail: { on } }));
  } catch {
    /* noop */
  }
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

/** Entrada dura a Jornada (evita que wouter + ModuleRoute fallen en silencio). */
export function goPreviewJornada(hard = true): void {
  setPreviewOpsUnlocked(true);
  if (typeof window === "undefined") return;
  if (hard) {
    window.location.assign("/planeacion");
    return;
  }
  window.location.href = "/planeacion";
}
