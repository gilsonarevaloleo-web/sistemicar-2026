/**
 * Recuperación compartida para Jornada / Planificación atascada.
 */
import { resetAnilloViewModeStorage } from "@/lib/anilloViewMode";
import { clearPlaneacionCache } from "@/lib/planeacionCache";
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
import { clearJornadaFatalError } from "@/lib/jornadaFatalError";
import { jornadaBackupStorageKey } from "@/services/jornadaBackup";

const PARKED_ACTIVES_KEY = "sistemicar_parked_actives";

export function runJornadaRecovery(opts?: { archiveSituacion?: boolean }): void {
  try {
    hardResetSpeechSystems(true);
    teardownAllSituacionSessions();
    repairStuckSituacionVehicles();
    emergencyPruneStorage({ aggressive: true });
    resetAnilloViewModeStorage();
    flushLocalVehicles();
    clearPlaneacionCache();
    cancelPuntoCeroStepVoice();
    cancelJornadaRemountGuard();
    try {
      localStorage.removeItem("planeacion_cache_v2");
    } catch {
      /* noop */
    }
    try {
      sessionStorage.removeItem(PARKED_ACTIVES_KEY);
    } catch {
      /* noop */
    }
    try {
      localStorage.removeItem(jornadaBackupStorageKey());
    } catch {
      /* noop */
    }
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
  clearJornadaFatalError();
}

export function reloadJornadaHard(): void {
  const url = new URL(window.location.href);
  url.pathname = "/jornada-v4";
  url.searchParams.set("_jr", String(Date.now()));
  window.location.replace(url.toString());
}

export function repairAndReloadJornada(archiveSituacion = false): void {
  runJornadaRecovery({ archiveSituacion });
  reloadJornadaHard();
}
