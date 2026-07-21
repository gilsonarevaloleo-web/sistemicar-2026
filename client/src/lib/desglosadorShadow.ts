/** Ejecuta trabajo pesado fuera del tick de React (sombra de baja prioridad). */
export function runShadowTask(fn: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    // timeout alto: evita colisión con tick #2 del reloj global (~2000 ms idle cap).
    requestIdleCallback(fn, { timeout: 8000 });
  } else {
    setTimeout(fn, 0);
  }
}

export function runShadowTaskAsync(fn: () => void | Promise<void>): void {
  runShadowTask(() => {
    void fn();
  });
}

/**
 * Post-lanzamiento: lejos del paint/expand y del cluster ~12s
 * (métricas heavy mobile timeout, centinela retro, voice safety).
 * El clavo a ~13s era sombra@12s + addDoc remap/stringify — ahora persist quiet + más lejos.
 */
export const LAUNCH_SHADOW_DELAY_MS = 28_000;
/** Archivo de centinelas: después del persist remoto, no en el mismo golpe. */
export const LAUNCH_CENTINELA_ARCHIVE_DELAY_MS = 36_000;

/**
 * Tarea diferida de lanzamiento — SOLO setTimeout (sin requestIdleCallback).
 * El idle con timeout forzado puede disparar justo cuando el hilo ya está saturado.
 */
export function runDeferredLaunchTask(fn: () => void, delayMs: number): void {
  globalThis.setTimeout(() => {
    try {
      fn();
    } catch (e) {
      console.warn("[runDeferredLaunchTask]", e);
    }
  }, delayMs);
}

/** Persistencia remota post-lanzamiento — fuera de la ventana crítica de UI. */
export function runShadowTaskAfterLaunch(fn: () => void, delayMs = LAUNCH_SHADOW_DELAY_MS): void {
  runDeferredLaunchTask(() => {
    void Promise.resolve().then(fn);
  }, delayMs);
}
