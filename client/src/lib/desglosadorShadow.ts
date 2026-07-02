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

/** Persistencia remota post-lanzamiento — fuera de la ventana crítica 1–3 s. */
export function runShadowTaskAfterLaunch(fn: () => void, delayMs = 3200): void {
  globalThis.setTimeout(() => runShadowTask(fn), delayMs);
}
