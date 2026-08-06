/** Evento barato: el Pulso pide abrir el lanzador Dual Kernel (sin cómputo). */
export const JORNADA4_OPEN_LAUNCH_EVENT = "sistemicar-jornada4-open-launch";

export type Jornada4OpenLaunchDetail = {
  tipoFlota?: "tiempo" | "situacion";
  proyectoId?: string;
  peldanoId?: string;
  /** Prefiere desglose al abrir desde Hub. */
  modo?: "rapido" | "desglose";
};

export function requestJornada4OpenLaunch(detail?: Jornada4OpenLaunchDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(JORNADA4_OPEN_LAUNCH_EVENT, { detail: detail ?? {} })
  );
}
