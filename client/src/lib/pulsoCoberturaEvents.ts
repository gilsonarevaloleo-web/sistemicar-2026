/** Evento barato: el Pulso pide abrir el lanzador Dual Kernel (sin cómputo). */
export const JORNADA4_OPEN_LAUNCH_EVENT = "sistemicar-jornada4-open-launch";

export function requestJornada4OpenLaunch(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(JORNADA4_OPEN_LAUNCH_EVENT));
}
