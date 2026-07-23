import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPerfSummary,
  isPerfDebugEnabled,
  subscribePerfStats,
} from "@/lib/jornadaPerfStats";
import { getConcienciaSchedulerStats } from "@/lib/concienciaScheduler";
import { getLocalVehiclesWriteStats } from "@/lib/persistence";
import { hasPendingDebouncedWrite } from "@/lib/vehicleLocalStorageDebounce";
import { shouldRunMobileSurvival } from "@/lib/mobilePerf";

export { isPerfDebugEnabled };

function subscribe(cb: () => void): () => void {
  return subscribePerfStats(cb);
}

function getSnapshot() {
  return getPerfSummary();
}

function getServerSnapshot() {
  return {};
}

/** Panel ?debug=perf — presupuesto main thread / disco / scheduler (brief Capa E). */
export function PerfDebugPanel() {
  const summary = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const sched = getConcienciaSchedulerStats();
  const disk = getLocalVehiclesWriteStats();
  void tick;

  let fleetBytes = 0;
  try {
    fleetBytes = (localStorage.getItem("sistemicar_vehicles") || "").length;
  } catch {
    fleetBytes = -1;
  }

  return (
    <div
      data-testid="perf-debug-panel"
      className="fixed bottom-2 left-2 z-[300] max-w-[min(100vw-1rem,22rem)] rounded border border-amber-700/50 bg-black/90 p-2 font-mono text-[10px] text-amber-100 shadow-lg"
    >
      <div className="mb-1 font-bold uppercase tracking-wider text-amber-400">
        debug=perf · hilo principal
      </div>
      <div>survival: {shouldRunMobileSurvival() ? "ON" : "off"}</div>
      <div>
        clock: {sched.uiClockMs}ms · budget: {sched.frameBudgetMs}ms · q: {sched.queueLength}
      </div>
      <div>
        drain last: {sched.lastDrainMs.toFixed(1)}ms · drained: {sched.drainedCount} · coalesce:{" "}
        {sched.skippedCoalesceCount}
      </div>
      <div>last work: {sched.lastWorkKey ?? "—"}</div>
      <div>
        disk writes: {disk.writeCount} · skips: {disk.skipCount} · pending:{" "}
        {hasPendingDebouncedWrite() ? "yes" : "no"}
      </div>
      <div>fleet bytes: {fleetBytes >= 0 ? fleetBytes : "?"}</div>
      {Object.keys(summary).length > 0 && (
        <div className="mt-1 border-t border-amber-800/60 pt-1">
          {(
            Object.entries(summary) as Array<
              [string, { count: number; lastMs: number; maxMs: number; avgMs: number }]
            >
          ).map(([name, s]) => (
            <div key={name}>
              {name}: n={s.count} last={s.lastMs} max={s.maxMs} avg={s.avgMs}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
