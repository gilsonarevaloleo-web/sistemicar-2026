/**
 * Tick DOM para segunderos sin re-render de React.
 * Suscripción al reloj global + watchdog local si el evento deja de llegar.
 */
import { useEffect, useRef } from "react";
import { CONCIENCIA_CLOCK_TICK_EVENT } from "@/lib/concienciaClock";

const DOM_CLOCK_WATCHDOG_MS = 1500;
const DOM_CLOCK_POLL_MS = 1000;

/**
 * Invoca `onTick` en cada pulso del reloj global (diferido con setTimeout 0).
 * Si no hay tick en 1500ms, el watchdog fuerza un pulso de respaldo.
 */
export function useDomConcienciaClock(onTick: () => void, enabled = true): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let deferId: ReturnType<typeof setTimeout> | null = null;
    let watchdogId: ReturnType<typeof setInterval> | null = null;
    let lastTickAt = Date.now();

    const safeTick = () => {
      if (!mounted) return;
      lastTickAt = Date.now();
      onTickRef.current();
    };

    const scheduleTick = () => {
      if (!mounted) return;
      if (deferId != null) globalThis.clearTimeout(deferId);
      deferId = globalThis.setTimeout(() => {
        deferId = null;
        safeTick();
      }, 0);
    };

    const onClock = () => scheduleTick();

    watchdogId = globalThis.setInterval(() => {
      if (!mounted) return;
      if (Date.now() - lastTickAt >= DOM_CLOCK_WATCHDOG_MS) {
        safeTick();
      }
    }, DOM_CLOCK_POLL_MS);

    window.addEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
    scheduleTick();

    return () => {
      mounted = false;
      window.removeEventListener(CONCIENCIA_CLOCK_TICK_EVENT, onClock);
      if (deferId != null) globalThis.clearTimeout(deferId);
      if (watchdogId != null) globalThis.clearInterval(watchdogId);
    };
  }, [enabled]);
}
