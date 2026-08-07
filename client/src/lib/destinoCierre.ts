/**
 * Destino del cierre consciente.
 * - presencia: alimenta día / disciplina / PS — no ensucia la escalera del Hub.
 * - peldano: sube el proyecto (pasos + peldaños conquistados).
 *
 * Por defecto: presencia. El peldaño es un gesto consciente de importancia.
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
    hint: "Cubrió el día. Estuviste.",
    short: "Día",
  },
  peldano: {
    label: "Peldaño",
    hint: "Esto sube la escalera.",
    short: "Proyecto",
  },
} as const;
