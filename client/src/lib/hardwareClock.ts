/** Reloj físico del dispositivo — inmune a drift de setInterval bajo CPU throttling. */
export function hardwareClockNow(): number {
  return Date.now();
}

/** Milisegundos transcurridos desde una marca absoluta (p. ej. startedAt del ring). */
export function hardwareElapsedMs(startedAt: number, now = hardwareClockNow()): number {
  return Math.max(0, now - startedAt);
}

/** Segundos transcurridos desde marca absoluta. */
export function hardwareElapsedSec(startedAt: number, now = hardwareClockNow()): number {
  return Math.floor(hardwareElapsedMs(startedAt, now) / 1000);
}
