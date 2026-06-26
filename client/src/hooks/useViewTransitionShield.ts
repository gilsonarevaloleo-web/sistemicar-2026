import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  isInterModuleSyncBlocked,
  isViewTransitionBlocked,
  onViewTransitionShieldReleased,
} from "@/lib/viewTransitionShield";

function subscribeShield(cb: () => void): () => void {
  return onViewTransitionShieldReleased(cb);
}

function getShieldSnapshot(): boolean {
  return isViewTransitionBlocked();
}

/**
 * Escudo de montaje / transición — ref síncrono + estado React.
 * Usar en Espejo, Alquimia, Umbral, Planificación para suspender efectos cruzados.
 */
export function useViewTransitionShield() {
  const isViewTransitioningRef = useRef(isViewTransitionBlocked());
  const transitioning = useSyncExternalStore(subscribeShield, getShieldSnapshot, () => false);

  useEffect(() => {
    isViewTransitioningRef.current = isInterModuleSyncBlocked();
    const sync = () => {
      isViewTransitioningRef.current = isInterModuleSyncBlocked();
    };
    const unsub = onViewTransitionShieldReleased(sync);
    const poll = window.setInterval(sync, 100);
    return () => {
      unsub();
      window.clearInterval(poll);
    };
  }, [transitioning]);

  return {
    isViewTransitioningRef,
    isTransitioning: transitioning,
    isSyncBlocked: isInterModuleSyncBlocked,
  };
}
