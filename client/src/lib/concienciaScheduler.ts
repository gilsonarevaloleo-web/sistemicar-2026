/**
 * Coordinador de conciencia (tronco B.3 / brief Capa A).
 * Un productor de pulso UI + cola presupuestada de trabajo sombra
 * (entropía, catch-up, disco) con tope de ms por frame.
 */
import { dispatchConcienciaClockTick } from "@/lib/concienciaClock";
import { isMobilePerfMode } from "@/lib/mobilePerf";

export const SCHEDULER_CLOCK_MS_FOREGROUND = 1_000;
export const SCHEDULER_CLOCK_MS_IDLE = 5_000;
export const SCHEDULER_CLOCK_MS_BACKGROUND = 5_000;

/** Presupuesto por slice en móvil — deja margen para input/paint. */
export const SCHEDULER_FRAME_BUDGET_MS_MOBILE = 6;
/** Presupuesto por slice en desktop. */
export const SCHEDULER_FRAME_BUDGET_MS_DESKTOP = 10;

export type ConcienciaWorkPriority =
  | "high" /** Feedback / teardown shadow inmediato */
  | "segment" /** Ciclo segmentos / entropía */
  | "low"; /** Disco, catch-up timeline, métricas */

const PRIORITY_RANK: Record<ConcienciaWorkPriority, number> = {
  high: 0,
  segment: 1,
  low: 2,
};

export type ConcienciaWork = {
  /** Clave de coalesce: si hay trabajo pendiente con la misma clave, se reemplaza. */
  key: string;
  priority: ConcienciaWorkPriority;
  run: () => void | Promise<void>;
};

type SchedulerListener = () => void;

let uiClockMs = SCHEDULER_CLOCK_MS_FOREGROUND;
let uiIntervalId: ReturnType<typeof setInterval> | null = null;
let notifyCoalesceRaf: number | null = null;
const uiListeners = new Set<SchedulerListener>();

type QueuedWork = ConcienciaWork & { enqueuedAt: number };
let workQueue: QueuedWork[] = [];
let drainScheduled = false;
let drainHandle: { kind: "idle" | "timeout" | "raf"; id: number } | null = null;
let lastDrainMs = 0;
let lastWorkKey: string | null = null;
let drainedCount = 0;
let skippedCoalesceCount = 0;

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
  cancelDrainSchedule();
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

export function getSchedulerFrameBudgetMs(): number {
  return isMobilePerfMode()
    ? SCHEDULER_FRAME_BUDGET_MS_MOBILE
    : SCHEDULER_FRAME_BUDGET_MS_DESKTOP;
}

function sortQueue(): void {
  workQueue.sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return a.enqueuedAt - b.enqueuedAt;
  });
}

function cancelDrainSchedule(): void {
  if (!drainHandle) {
    drainScheduled = false;
    return;
  }
  if (drainHandle.kind === "idle" && typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(drainHandle.id);
  } else if (drainHandle.kind === "raf" && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(drainHandle.id);
  } else {
    clearTimeout(drainHandle.id);
  }
  drainHandle = null;
  drainScheduled = false;
}

function scheduleDrain(): void {
  if (drainScheduled || workQueue.length === 0) return;
  drainScheduled = true;

  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(
      deadline => {
        drainHandle = null;
        drainScheduled = false;
        const budget = Math.max(
          1,
          Math.min(getSchedulerFrameBudgetMs(), deadline.timeRemaining() || getSchedulerFrameBudgetMs())
        );
        drainBudgetedQueue(budget);
      },
      { timeout: 120 }
    );
    drainHandle = { kind: "idle", id };
    return;
  }

  if (typeof requestAnimationFrame !== "undefined") {
    const id = requestAnimationFrame(() => {
      drainHandle = null;
      drainScheduled = false;
      drainBudgetedQueue(getSchedulerFrameBudgetMs());
    });
    drainHandle = { kind: "raf", id };
    return;
  }

  const id = setTimeout(() => {
    drainHandle = null;
    drainScheduled = false;
    drainBudgetedQueue(getSchedulerFrameBudgetMs());
  }, 0) as unknown as number;
  drainHandle = { kind: "timeout", id };
}

/**
 * Encola trabajo sombra bajo presupuesto de frame.
 * Misma `key` → coalesce (último gana). No ejecuta en el tick de React.
 */
export function enqueueConcienciaWork(work: ConcienciaWork): void {
  const existing = workQueue.findIndex(w => w.key === work.key);
  if (existing >= 0) {
    workQueue[existing] = { ...work, enqueuedAt: workQueue[existing].enqueuedAt };
    skippedCoalesceCount += 1;
  } else {
    workQueue.push({ ...work, enqueuedAt: Date.now() });
  }
  sortQueue();
  scheduleDrain();
}

/** Drena hasta agotar presupuesto o cola. Exportado para tests. */
export function drainBudgetedQueue(budgetMs: number): void {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  let spent = 0;

  while (workQueue.length > 0 && spent < budgetMs) {
    const next = workQueue.shift();
    if (!next) break;
    lastWorkKey = next.key;
    try {
      const result = next.run();
      if (result && typeof (result as Promise<void>).then === "function") {
        void (result as Promise<void>).catch(() => {
          /* sombra: no tumbar el scheduler */
        });
      }
    } catch {
      /* sombra: no tumbar el scheduler */
    }
    drainedCount += 1;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    spent = now - start;
  }

  lastDrainMs = spent;
  if (workQueue.length > 0) scheduleDrain();
}

export type ConcienciaSchedulerStats = {
  queueLength: number;
  lastDrainMs: number;
  lastWorkKey: string | null;
  drainedCount: number;
  skippedCoalesceCount: number;
  uiClockMs: number;
  frameBudgetMs: number;
};

export function getConcienciaSchedulerStats(): ConcienciaSchedulerStats {
  return {
    queueLength: workQueue.length,
    lastDrainMs,
    lastWorkKey,
    drainedCount,
    skippedCoalesceCount,
    uiClockMs,
    frameBudgetMs: getSchedulerFrameBudgetMs(),
  };
}

/** Solo tests — vacía cola y contadores. */
export function resetConcienciaSchedulerForTests(): void {
  cancelDrainSchedule();
  workQueue = [];
  lastDrainMs = 0;
  lastWorkKey = null;
  drainedCount = 0;
  skippedCoalesceCount = 0;
  if (uiIntervalId != null) {
    clearInterval(uiIntervalId);
    uiIntervalId = null;
  }
  uiClockMs = SCHEDULER_CLOCK_MS_FOREGROUND;
  if (notifyCoalesceRaf != null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(notifyCoalesceRaf);
    notifyCoalesceRaf = null;
  }
  uiListeners.clear();
}
