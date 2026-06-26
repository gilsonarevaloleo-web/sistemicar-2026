/** Reloj físico del dispositivo — inmune a drift de setInterval bajo CPU throttling. */
export function hardwareClockNow(): number {
  return Date.now();
}

/** Convierte minutos de cupo/objetivo a milisegundos (unidad canónica del ring). */
export function durationMinutesToMs(targetDurationMinutes: number): number {
  return Math.max(0, targetDurationMinutes) * 60 * 1000;
}

/** Milisegundos transcurridos desde una marca absoluta (p. ej. startedAt del ring). */
export function hardwareElapsedMs(startedAt: number, now = hardwareClockNow()): number {
  return Math.max(0, now - startedAt);
}

/** Restante en ms con escudo de contención — nunca negativo en pantalla. */
export function computeSafeRemainingMs(
  startedAt: number,
  targetDurationMinutes: number,
  now = hardwareClockNow()
): number {
  const durationInMs = durationMinutesToMs(targetDurationMinutes);
  const remainingMs = durationInMs - hardwareElapsedMs(startedAt, now);
  return Math.max(0, remainingMs);
}

/** Segundos restantes (piso) desde minutos de cupo y marca absoluta. */
export function computeSafeRemainingSec(
  startedAt: number,
  targetDurationMinutes: number,
  now = hardwareClockNow()
): number {
  return Math.floor(computeSafeRemainingMs(startedAt, targetDurationMinutes, now) / 1000);
}

/** Segundos transcurridos desde marca absoluta. */
export function hardwareElapsedSec(startedAt: number, now = hardwareClockNow()): number {
  return Math.floor(hardwareElapsedMs(startedAt, now) / 1000);
}
