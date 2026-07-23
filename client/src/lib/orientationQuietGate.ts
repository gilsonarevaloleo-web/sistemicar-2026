/**
 * Ventana quieta ante rotación / resize brusco en móvil.
 *
 * Al girar el celular Chrome Android a menudo dispara visibility/pagehide + resize.
 * Si en ese instante hay 2 desglosadores midiendo, un flush síncrono de flota +
 * burst de reloj satura el hilo principal → pantalla negra / UI congelada.
 *
 * Este gate NO cancela trabajo crítico (Cumplido, cierre); solo aplaza flushes
 * oportunistas y bursts durante ~ORIENTATION_QUIET_MS.
 */

export const ORIENTATION_QUIET_MS = 1_200;
export const ORIENTATION_RESIZE_DELTA_PX = 80;

let quietUntilMs = 0;
let installed = false;
let lastW = 0;
let lastH = 0;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<(quiet: boolean) => void>();

function notify(quiet: boolean): void {
  listeners.forEach(fn => {
    try {
      fn(quiet);
    } catch {
      /* noop */
    }
  });
}

function forceCheapLayoutRecovery(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    // Fuerza un paint barato: backdrop-filter + fixed bottom nav en Android
    // a veces deja capas negras tras rotar hasta el próximo reflow.
    const y = window.scrollY;
    window.scrollTo(0, y === 0 ? 1 : y - 1);
    window.scrollTo(0, y);
    document.documentElement.style.transform = "translateZ(0)";
    window.requestAnimationFrame(() => {
      document.documentElement.style.transform = "";
    });
  } catch {
    /* noop */
  }
}

function enterQuiet(reason: string): void {
  const now = Date.now();
  const wasQuiet = now < quietUntilMs;
  quietUntilMs = Math.max(quietUntilMs, now + ORIENTATION_QUIET_MS);
  if (!wasQuiet) {
    if (typeof console !== "undefined") {
      console.info(`[orientationQuiet] enter (${reason}) ${ORIENTATION_QUIET_MS}ms`);
    }
    notify(true);
    forceCheapLayoutRecovery();
  }
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      if (Date.now() >= quietUntilMs) notify(false);
    }, ORIENTATION_QUIET_MS + 30);
  }
}

function onOrientation(): void {
  enterQuiet("orientationchange");
}

function onResize(): void {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (lastW === 0 && lastH === 0) {
    lastW = w;
    lastH = h;
    return;
  }
  const dw = Math.abs(w - lastW);
  const dh = Math.abs(h - lastH);
  lastW = w;
  lastH = h;
  // Solo cambios grandes (rotar / teclado a pantalla completa), no scrollbars.
  if (dw < ORIENTATION_RESIZE_DELTA_PX && dh < ORIENTATION_RESIZE_DELTA_PX) return;
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    enterQuiet("resize");
  }, 50);
}

/** Idempotente — instalar desde bootstrap de Jornada / App. */
export function installOrientationQuietGate(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;
  lastW = window.innerWidth;
  lastH = window.innerHeight;
  window.addEventListener("orientationchange", onOrientation);
  window.addEventListener("resize", onResize);
  return () => {
    installed = false;
    window.removeEventListener("orientationchange", onOrientation);
    window.removeEventListener("resize", onResize);
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
  };
}

export function isOrientationQuiet(): boolean {
  return Date.now() < quietUntilMs;
}

/** Ms restantes de quiet (0 si no hay). */
export function getOrientationQuietRemainingMs(): number {
  return Math.max(0, quietUntilMs - Date.now());
}

/**
 * Ejecuta ahora, o aplaza hasta salir de la ventana quieta.
 * Útil para flush de disco en visibilitychange durante rotación.
 */
export function runWhenOrientationSettled(fn: () => void, maxWaitMs = 2_000): void {
  if (!isOrientationQuiet()) {
    fn();
    return;
  }
  const wait = Math.min(getOrientationQuietRemainingMs() + 40, maxWaitMs);
  if (typeof window === "undefined") {
    // Tests / SSR: no aplazar con timer real.
    fn();
    return;
  }
  window.setTimeout(() => {
    try {
      fn();
    } catch {
      /* noop */
    }
  }, wait);
}

export function subscribeOrientationQuiet(listener: (quiet: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Solo tests. */
export function resetOrientationQuietGateForTests(): void {
  quietUntilMs = 0;
  installed = false;
  lastW = 0;
  lastH = 0;
  if (resizeTimer) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  listeners.clear();
}

/** Solo tests. */
export function enterOrientationQuietForTests(ms = ORIENTATION_QUIET_MS): void {
  quietUntilMs = Date.now() + ms;
}
