/**
 * Destino del cierre consciente.
 * - presencia: cubre el día / disciplina / PS — no ensucia la escalera del Hub.
 * - peldano: Dirección (Norte / rumbo). La conciencia tiene casa.
 *
 * Todo nido mide producción. La escalera la decide el destino
 * (`feedsEscaleraNido` = rumbo a casa). La lectura del número —darse cuenta,
 * crecimiento, deber— vive en el operador.
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
 * Rumbo del día (triada Dirección): el cierre apunta a un nido.
 * La escalera se sella al lanzar si hay oleada y punto.
 */
export function feedsProyectoHub(destino: DestinoCierre): boolean {
  return destino === "peldano";
}

/**
 * Stamp mínimo para saber si el vehículo tiene casa (nido / punto / peldaño).
 * No importa Vehicle entero — evita ciclo con persistence.
 */
export type VehicleRumboStamp = {
  destinoCierre?: DestinoCierre | null;
  proyectoId?: string | null;
  oleadaPuntoId?: string | null;
  proyectoPeldanoId?: string | null;
};

/**
 * Dirección del día (triada / gasto): rumbo con casa.
 * Un `peldano` sin nido ni punto es presencia extraída — no mancha Dirección.
 * El Hub sigue usando `feedsProyectoHub(destino)`: la escalera se sella al lanzar.
 */
export function vehicleCuentaComoDireccion(vehicle: VehicleRumboStamp): boolean {
  if (!feedsProyectoHub(resolveDestinoCierre(vehicle.destinoCierre))) return false;
  return Boolean(
    vehicle.proyectoId?.trim() ||
      vehicle.oleadaPuntoId?.trim() ||
      vehicle.proyectoPeldanoId?.trim()
  );
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
    hint: "Cubrió el día. Estuviste. No toca el proyecto. Nombrar el vehículo instala el piloto (21 días).",
    short: "Día",
  },
  peldano: {
    label: "Dirección",
    hint: "Rumbo a un nido. Pide oleada y un punto de producción con nombre — el bloque que se mide.",
    short: "Norte",
  },
} as const;
