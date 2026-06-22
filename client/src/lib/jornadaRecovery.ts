/**
 * Recuperación compartida para Jornada / Planificación atascada.
 */
import { resetAnilloViewModeStorage } from "@/lib/anilloViewMode";
import { invalidatePlaneacionHeavyMetricsCache } from "@/lib/planeacionCache";
import { emergencyPruneStorage } from "@/lib/storageHygiene";
import {
  clearPlaneacionCrashCount,
  forceArchiveSituacionActivos,
  repairStuckSituacionVehicles,
} from "@/lib/situacionRepair";
import { flushLocalVehicles } from "@/lib/persistence";
import { teardownAllSituacionSessions } from "@/lib/situacionSessionTeardown";
import { hardResetSpeechSystems } from "@/lib/speechRecovery";
import { cancelPuntoCeroStepVoice } from "@/lib/puntoCeroStepVoice";
import { cancelJornadaRemountGuard } from "@/lib/jornadaRemount";

export function runJornadaRecovery(opts?: { archiveSituacion?: boolean }): void {
  try {
    hardResetSpeechSystems(true);
    teardownAllSituacionSessions();
    repairStuckSituacionVehicles();
    emergencyPruneStorage({ aggressive: true });
    resetAnilloViewModeStorage();
    flushLocalVehicles();
    invalidatePlaneacionHeavyMetricsCache();
    cancelPuntoCeroStepVoice();
    cancelJornadaRemountGuard();
  } catch {
    /* noop */
  }
  if (opts?.archiveSituacion) {
    try {
      forceArchiveSituacionActivos();
    } catch {
      /* noop */
    }
  }
  try {
    clearPlaneacionCrashCount();
  } catch {
    /* noop */
  }
}

export function reloadJornadaHard(): void {
  const url = new URL(window.location.href);
  url.pathname = "/planeacion";
  url.searchParams.set("_jr", String(Date.now()));
  window.location.replace(url.toString());
}

export function repairAndReloadJornada(archiveSituacion = false): void {
  runJornadaRecovery({ archiveSituacion });
  reloadJornadaHard();
}
