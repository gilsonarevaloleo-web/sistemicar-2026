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
 * @deprecated No usar delays fijos post-lanzamiento — clavaban el reloj conquista (4→6→13→28s).
 * Usar `enqueueLaunchPersistWork` / `flushLaunchPersistOnSubClose` (`launchPersistGate.ts`).
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
 * @deprecated Preferir launchPersistGate (evento / idle), no bomba temporal.
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
