/**
 * Cortafuegos global de transición entre módulos (Jornada, Espejo, Alquimia, Umbral…).
 * Bloquea sync cruzada y ráfagas Firebase durante el asentamiento del montaje.
 */
import { isJornadaViewMounting } from "@/lib/jornadaRemount";

export const VIEW_TRANSITION_SHIELD_MS = 500;

let transitionUntilMs = 0;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
const releaseListeners = new Set<() => void>();

function notifyReleased(): void {
  releaseListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

/** Activa el escudo síncronamente — llamar antes de cambiar de ruta. */
export function beginViewTransition(): void {
  transitionUntilMs = Date.now() + VIEW_TRANSITION_SHIELD_MS;
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    transitionUntilMs = 0;
    notifyReleased();
  }, VIEW_TRANSITION_SHIELD_MS);
}

export function isViewTransitionBlocked(): boolean {
  return Date.now() < transitionUntilMs;
}

export function msUntilViewTransitionAllowed(): number {
  return Math.max(0, transitionUntilMs - Date.now());
}

/** Sync cruzada intermodular suspendida (transición global o montaje Jornada). */
export function isInterModuleSyncBlocked(): boolean {
  return isViewTransitionBlocked() || isJornadaViewMounting();
}

export function onViewTransitionShieldReleased(listener: () => void): () => void {
  releaseListeners.add(listener);
  return () => releaseListeners.delete(listener);
}

/** Solo tests. */
export function resetViewTransitionShieldForTests(): void {
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = null;
  transitionUntilMs = 0;
  releaseListeners.clear();
}
