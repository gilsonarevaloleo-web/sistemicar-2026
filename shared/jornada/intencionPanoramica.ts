/**
 * Intención Panorámica — sensor de vigilia de La Jornada.
 *
 * Principio de Jornada, no del Depósito. La apertura puntual de la
 * puerta (±5 min = ventana de 10 minutos) no es un registro de tareas:
 * es presencia de terreno en 0ms.
 *
 * El Depósito (Universidad / volcado) no consume estas métricas.
 */

export const INTENCION_PANORAMICA_NOMBRE =
  "Intención Panorámica (Presencia de Terreno en 0ms)";

export const INTENCION_PANORAMICA_CRITERIO =
  "La Intención Panorámica es la capacidad del operador para sostener la visión del mapa completo del día mientras ejecuta la tarea presente. Medir la apertura puntual de la puerta temporal no es un registro de tareas, sino un sensor de vigilia. Si el usuario pierde la ventana de 10 minutos, el diagnóstico de Jornada debe señalar inercia biológica, no falta de tiempo ni mala suerte.";

/** Contador canónico del Crisol: X/Y Puertas de Intención Panorámica. */
export const PUERTAS_INTENCION_PANORAMICA_LABEL =
  "Puertas de Intención Panorámica";

export type MetricasJornadaIntencion = {
  /** Puertas abiertas a tiempo dentro del margen de 10 minutos. */
  puertasConquistadas: number;
  puertasTotales: number;
  /** Ventanas perdidas (sistema / entropía). */
  puertasPerdidas?: number;
};

function asFiniteInt(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

export function isMetricasJornadaIntencion(
  value: unknown,
): value is MetricasJornadaIntencion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    asFiniteInt(o.puertasConquistadas) != null &&
    asFiniteInt(o.puertasTotales) != null
  );
}

export function normalizarMetricasJornada(
  raw: unknown,
): MetricasJornadaIntencion | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const conquistadas = asFiniteInt(
    o.puertasConquistadas ?? o.puertas_conquistadas ?? o.conquistadas,
  );
  const totales = asFiniteInt(
    o.puertasTotales ?? o.puertas_totales ?? o.totales,
  );
  if (conquistadas == null || totales == null) return undefined;
  const perdidas = asFiniteInt(
    o.puertasPerdidas ?? o.puertas_perdidas ?? o.perdidas,
  );
  const metricas: MetricasJornadaIntencion = {
    puertasConquistadas: Math.min(conquistadas, totales),
    puertasTotales: totales,
  };
  if (perdidas != null) metricas.puertasPerdidas = perdidas;
  return metricas;
}

export function formatPuertasIntencionPanoramica(
  conquistadas: number,
  totales: number,
): string {
  if (totales <= 0) return `Sin ${PUERTAS_INTENCION_PANORAMICA_LABEL}`;
  return `${conquistadas}/${totales} ${PUERTAS_INTENCION_PANORAMICA_LABEL}`;
}

export function resumenIntencionPanoramica(
  metricas: MetricasJornadaIntencion,
): {
  conquistada: boolean;
  perdidas: number;
  headline: string;
} {
  const perdidas =
    metricas.puertasPerdidas ??
    Math.max(0, metricas.puertasTotales - metricas.puertasConquistadas);
  return {
    conquistada: metricas.puertasConquistadas > 0 && perdidas === 0,
    perdidas,
    headline: formatPuertasIntencionPanoramica(
      metricas.puertasConquistadas,
      metricas.puertasTotales,
    ),
  };
}
