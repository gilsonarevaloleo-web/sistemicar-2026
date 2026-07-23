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
 * Tras paint ms0 (CUMPLIDO/FALLADO): cede 2 frames para que el island del
 * cronómetro remonte con startedAt fresco ANTES del merge/disco/Firebase.
 * Sin esto el reloj queda clavado en ~cupo (p. ej. 00:09:59).
 */
export function yieldAfterPaint(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * @deprecated No usar delays fijos post-lanzamiento — clavaban el reloj conquista (4→6→13→28s).
 * Usar `enqueueLaunchPersistWork` / `flushLaunchPersistOnSubClose` (`launchPersistGate.ts`).
 * Constantes conservadas solo por compatibilidad de imports legacy.
 */
export const LAUNCH_SHADOW_DELAY_MS = 28_000;
/** @deprecated Preferir launchPersistGate. */
export const LAUNCH_CENTINELA_ARCHIVE_DELAY_MS = 36_000;

/**
 * @deprecated Preferir launchPersistGate (evento / oculto / cierre), no bomba temporal.
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

/**
 * @deprecated Preferir launchPersistGate (evento / oculto / cierre), no bomba temporal.
 */
export function runShadowTaskAfterLaunch(fn: () => void, delayMs = 0): void {
  if (delayMs <= 0) {
    runShadowTask(fn);
    return;
  }
  runDeferredLaunchTask(() => {
    void Promise.resolve().then(fn);
  }, delayMs);
}
