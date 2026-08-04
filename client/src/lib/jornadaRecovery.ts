/**
 * Recuperación compartida para Jornada / Planificación atascada.
 *
 * Por defecto: remount suave — limpia caché/voz/guards y recarga la vista
 * SIN archivar rings ni conquista. El park durable permanece para rehidratar.
 *
 * Archivar situación solo con opción explícita de emergencia.
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

export type JornadaRecoveryOpts = {
  /**
   * Solo emergencia explícita («Cerrar ring…»).
   * Nunca activar por conteo de crashes en el botón Reparar.
   */
  archiveSituacion?: boolean;
};

/**
 * Remount suave: limpia lo que congela la UI, preserva desglosadores.
 * No borra park durable ni archiva vehículos.
 */
export function runJornadaSoftRemount(): void {
  try {
    hardResetSpeechSystems(true);
    teardownAllSituacionSessions();
    repairStuckSituacionVehicles();
    // Higiene ligera: no aggressive — no recorta historial de activos.
    emergencyPruneStorage({ aggressive: false });
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
    // NO borrar session park ni durable: rehydrate los necesita tras el reload.
    // NO borrar jornadaBackup: métricas del día.
  } catch {
    /* noop */
  }
  try {
    clearPlaneacionCrashCount();
  } catch {
    /* noop */
  }
  clearJornadaFatalError();
}

/**
 * Recuperación pesada (solo emergencia con archive).
 * Limpia park de sesión y backup; archiva situación si se pide.
 */
export function runJornadaRecovery(opts?: JornadaRecoveryOpts): void {
  if (!opts?.archiveSituacion) {
    runJornadaSoftRemount();
    return;
  }

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
  try {
    forceArchiveSituacionActivos();
  } catch {
    /* noop */
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

/**
 * Reparar Jornada (default): remount suave + reload.
 * archiveSituacion=true solo desde botón de emergencia explícito.
 */
export function repairAndReloadJornada(archiveSituacion = false): void {
  if (archiveSituacion) {
    runJornadaRecovery({ archiveSituacion: true });
  } else {
    runJornadaSoftRemount();
  }
  reloadJornadaHard();
}
