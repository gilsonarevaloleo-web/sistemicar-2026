/**
 * Tick local de Jornada 4 — wall-clock, sin concienciaScheduler.
 * En background el browser throttlea el interval; la UI recalcula con Date.now().
 */

type Listener = () => void;

let listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;

const FG_MS = 1000;
const BG_MS = 5000;

function tickMs(): number {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return BG_MS;
  }
  return FG_MS;
}

function restartInterval(): void {
  if (intervalId != null) clearInterval(intervalId);
  intervalId = null;
  if (listeners.size === 0) return;
  intervalId = setInterval(() => {
    listeners.forEach(fn => {
      try {
        fn();
      } catch {
        /* ignore listener errors */
      }
    });
  }, tickMs());
}

function ensureVisibilityHook(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    restartInterval();
    // Un paint inmediato al volver: los islands leen Date.now().
    listeners.forEach(fn => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  });
}

/** Suscribe un island al tick J4. Devuelve unsubscribe. */
export function subscribeJornada4Tick(listener: Listener): () => void {
  ensureVisibilityHook();
  listeners.add(listener);
  if (listeners.size === 1) restartInterval();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

let burstRaf: number | null = null;

function flushBurst(): void {
  burstRaf = null;
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Forzar un tick (p. ej. tras paint ms0 de cierre / inyección Crisol).
 * Coalescido en rAF: varios paints en el mismo frame → un solo fan-out.
 */
export function burstJornada4Tick(): void {
  if (typeof requestAnimationFrame !== "function") {
    flushBurst();
    return;
  }
  if (burstRaf != null) return;
  burstRaf = requestAnimationFrame(flushBurst);
}
