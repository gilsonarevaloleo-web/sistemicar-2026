/** Suprime TTS de fila en foco tras sellar directo en ring (el usuario ya leyó el texto). */

const suppressUntilByVehicle = new Map<string, number>();

export function suppressSituacionFilaVoiceAfterSellar(vehicleId: string, ms = 2_500): void {
  suppressUntilByVehicle.set(vehicleId, Date.now() + ms);
}

export function isSituacionFilaVoiceSuppressed(vehicleId: string): boolean {
  const until = suppressUntilByVehicle.get(vehicleId);
  if (until == null) return false;
  if (Date.now() >= until) {
    suppressUntilByVehicle.delete(vehicleId);
    return false;
  }
  return true;
}

/** Solo tests. */
export function resetRingSellarVoiceSuppressForTests(): void {
  suppressUntilByVehicle.clear();
}
