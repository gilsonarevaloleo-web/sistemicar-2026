/**
 * Destino del cierre consciente.
 * - presencia: cubre el día / disciplina / PS — no ensucia la escalera del Hub.
 * - peldano: Dirección (Norte). Solo si el proyecto tiene oleada + punto de producción.
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

/** Solo "peldano" escribe en Hub (pasos / escalera). */
export function feedsProyectoHub(destino: DestinoCierre): boolean {
  return destino === "peldano";
}

export const DESTINO_CIERRE_COPY = {
  presencia: {
    label: "Presencia",
    hint: "Cubrió el día. Estuviste. No toca el proyecto.",
    short: "Día",
  },
  peldano: {
    label: "Dirección",
    hint: "Oleada + punto de producción. Los envíos se amontonan ahí.",
    short: "Norte",
  },
} as const;
