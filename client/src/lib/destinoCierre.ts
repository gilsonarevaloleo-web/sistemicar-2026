/**
 * Destino del cierre consciente.
 * - presencia: cubre el día / disciplina / PS — no ensucia la escalera del Hub.
 * - peldano: Dirección (Norte / rumbo). La conciencia tiene casa.
 *
 * Dirección ≠ crecimiento. Un nido de darse cuenta (p. ej. DESCANSO) puede
 * recibir rumbo sin escribir peldaños. La escalera la decide `feedsEscaleraNido`.
 *
 * Por defecto: presencia. Dirección no se reclama con un clic de ego.
 */
export type DestinoCierre = "presencia" | "peldano";

export const DESTINO_CIERRE_DEFAULT: DestinoCierre = "presencia";

export function resolveDestinoCierre(
  vehicleDestino?: DestinoCierre | null,
  override?: DestinoCierre | null
): DestinoCierre {
  return override ?? vehicleDestino ?? DESTINO_CIERRE_DEFAULT;
}

/**
 * Rumbo del día (triada Dirección). No implica peldaños:
 * un nido de consciencia recibe Dirección y no trepa.
 */
export function feedsProyectoHub(destino: DestinoCierre): boolean {
  return destino === "peldano";
}

/** Chip activo: el toque pinta el proyecto antes de que el vehículo confirme `proyectoId`. */
export function resolveProyectoChipId(
  optimisticPid?: string | null,
  proyectoId?: string | null,
  fallbackId?: string | null
): string {
  return (optimisticPid || proyectoId || fallbackId || "").trim();
}

export const DESTINO_CIERRE_COPY = {
  presencia: {
    label: "Presencia",
    hint: "Cubrió el día. Estuviste. No toca el proyecto.",
    short: "Día",
  },
  peldano: {
    label: "Dirección",
    hint: "Rumbo a un nido. Crecimiento y control piden oleada y punto; darse cuenta se registra sin peldaños.",
    short: "Norte",
  },
} as const;
