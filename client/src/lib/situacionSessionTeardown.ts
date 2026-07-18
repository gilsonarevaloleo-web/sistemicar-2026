/**
 * Teardown imperativo del ring / desglosador situacional.
 * Debe ejecutarse ANTES de modales de victoria y al desmontar VehicleCard.
 * Disco: sombra (no JSON.stringify síncrono en el gesto — Capa B/C).
 */

import {
  cancelAllUbicacionVoice,
  cancelUbicacionVoiceForVehicle,
} from "./ubicacionVoiceReliable";
import { flushLocalVehicles } from "./persistence";
import { voiceEngine } from "./speechQueue";
import {
  listSituacionSessionVehicleIds,
  resetSituacionSessionTeardownGate,
  runSituacionSessionCleanups,
  registerSituacionSessionCleanup,
} from "./situacionSessionRegistry";
import { enqueueConcienciaWork } from "./concienciaScheduler";
import { recordPerfSample } from "./jornadaPerfStats";

export {
  registerSituacionSessionCleanup,
  resetSituacionSessionTeardownGate,
};

function scheduleShadowDiskFlush(): void {
  enqueueConcienciaWork({
    key: "flota-disk-flush",
    priority: "high",
    run: () => {
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      flushLocalVehicles();
      recordPerfSample(
        "situacionTeardown",
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
      );
    },
  });
}

export function teardownSituacionSession(vehicleId: string): void {
  if (!runSituacionSessionCleanups(vehicleId)) return;

  cancelUbicacionVoiceForVehicle(vehicleId);
  scheduleShadowDiskFlush();
}

export function teardownAllSituacionSessions(): void {
  for (const vehicleId of listSituacionSessionVehicleIds()) {
    tornDownIdsResetAndTeardown(vehicleId);
  }
  cancelAllUbicacionVoice();
  voiceEngine.stopChannel("situacion");
  voiceEngine.stopChannel("conquista");
  scheduleShadowDiskFlush();
}

function tornDownIdsResetAndTeardown(vehicleId: string): void {
  resetSituacionSessionTeardownGate(vehicleId);
  teardownSituacionSession(vehicleId);
}
