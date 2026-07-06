/**
 * Coordinador mínimo de pulso (tronco B.3) — un productor, prioridades, coalesce por frame.
 */
import { dispatchConcienciaClockTick } from "@/lib/concienciaClock";

export const SCHEDULER_CLOCK_MS_FOREGROUND = 1_000;
export const SCHEDULER_CLOCK_MS_IDLE = 5_000;
export const SCHEDULER_CLOCK_MS_BACKGROUND = 5_000;

type SchedulerListener = () => void;

let uiClockMs = SCHEDULER_CLOCK_MS_FOREGROUND;
let uiIntervalId: ReturnType<typeof setInterval> | null = null;
let notifyCoalesceRaf: number | null = null;
const uiListeners = new Set<SchedulerListener>();

function pulseUiClock(): void {
  dispatchConcienciaClockTick();
  uiListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

function restartUiInterval(): void {
  if (uiIntervalId != null) clearInterval(uiIntervalId);
  uiIntervalId = setInterval(pulseUiClock, uiClockMs);
  pulseUiClock();
}

/** Retune cadencia del pulso UI (1s trabajo vivo / 5s reposo o background). */
export function setSchedulerUiClockMs(ms: number): void {
  if (ms === uiClockMs) return;
  uiClockMs = ms;
  restartUiInterval();
}

export function getSchedulerUiClockMs(): number {
  return uiClockMs;
}

/** Arranca el productor único de ticks UI (idempotente). */
export function ensureConcienciaSchedulerStarted(): void {
  if (uiIntervalId != null) return;
  restartUiInterval();
}

export function stopConcienciaScheduler(): void {
  if (uiIntervalId != null) clearInterval(uiIntervalId);
  uiIntervalId = null;
}

export function subscribeSchedulerUiClock(listener: SchedulerListener): () => void {
  ensureConcienciaSchedulerStarted();
  uiListeners.add(listener);
  return () => uiListeners.delete(listener);
}

/** Coalesce múltiples notifies en el mismo frame (store, lanzamiento). */
export function scheduleCoalescedNotify(notify: () => void): void {
  if (typeof requestAnimationFrame === "undefined") {
    notify();
    return;
  }
  if (notifyCoalesceRaf != null) return;
  notifyCoalesceRaf = requestAnimationFrame(() => {
    notifyCoalesceRaf = null;
    notify();
  });
}
