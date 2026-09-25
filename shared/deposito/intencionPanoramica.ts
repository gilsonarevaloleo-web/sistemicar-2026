/**
 * Intención Panorámica — sensor de vigilia de La Jornada.
 *
 * Reemplaza el término genérico «Secuencia de Jornada» en las
 * directivas del evaluador del Depósito v2. La apertura puntual
 * de la puerta (±5 min = ventana de 10 minutos) no es un registro
 * de tareas: es presencia de terreno en 0ms.
 */

export const INTENCION_PANORAMICA_NOMBRE =
  "Intención Panorámica (Presencia de Terreno en 0ms)";

export const INTENCION_PANORAMICA_CRITERIO =
  "La Intención Panorámica es la capacidad del operador para sostener la visión del mapa completo del día mientras ejecuta la tarea presente (G4). Medir la apertura puntual de la puerta temporal no es un registro de tareas, sino un sensor de vigilia. Si el usuario pierde la ventana de 10 minutos, el diagnóstico debe señalar inercia biológica (G1 / atención pegada a la materia), no falta de tiempo ni mala suerte.";

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

/** Directiva permanente del evaluador. Sustituye «Secuencia de Jornada». */
export function bloqueDirectivaIntencionPanoramica(): string {
  return `
═══ ${INTENCION_PANORAMICA_NOMBRE} ═══
Queda prohibido evaluar La Jornada como una «Secuencia de Jornada».
El indicador real de presencia sobre el terreno es la ${INTENCION_PANORAMICA_NOMBRE}.

${INTENCION_PANORAMICA_CRITERIO}

Cuando recibas métricas de La Jornada, la devolución del Maestro DEBE
nombrar la conquista o la pérdida de la Intención Panorámica.
No es un registro de tareas: es el sensor de vigilia.
`.trim();
}

export function bloqueUserMetricasJornada(
  metricas: MetricasJornadaIntencion,
): string {
  const { conquistada, perdidas, headline } =
    resumenIntencionPanoramica(metricas);
  const estado = conquistada
    ? `CONQUISTA: ${headline} abiertas a tiempo dentro del margen de 10 minutos.`
    : perdidas > 0
      ? `PÉRDIDA: ${perdidas} ventana(s) fuera del margen de 10 minutos. ${headline}.`
      : `SIN CONQUISTA AÚN: ${headline}.`;
  return [
    `Métricas de La Jornada — ${INTENCION_PANORAMICA_NOMBRE}:`,
    headline,
    estado,
    "Nombrá la conquista o la pérdida de la Intención Panorámica como el indicador real de presencia sobre el terreno. Si perdió la ventana, es inercia biológica (G1), no falta de tiempo.",
  ].join("\n");
}

export function veredictoIntencionPanoramica(
  metricas: MetricasJornadaIntencion,
): string {
  const { conquistada, perdidas, headline } =
    resumenIntencionPanoramica(metricas);
  if (conquistada) {
    return `Veredicto de terreno: conquistaste la Intención Panorámica (${headline}). Presencia de terreno en 0ms.`;
  }
  if (perdidas > 0) {
    return `Veredicto de terreno: perdiste la Intención Panorámica en ${perdidas} ventana(s) (${headline}). Eso es inercia biológica (G1 / atención pegada a la materia), no falta de tiempo ni mala suerte.`;
  }
  return `Veredicto de terreno: la Intención Panorámica aún no se midió (${headline}).`;
}
