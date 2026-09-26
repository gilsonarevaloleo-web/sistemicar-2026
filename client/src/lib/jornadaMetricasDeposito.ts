/**
 * Lectura local de puertas de Intención Panorámica (Jornada).
 * No alimenta al Depósito: el volcado no consume estas métricas.
 */
import {
  normalizarMetricasJornada,
  type MetricasJornadaIntencion,
} from "@shared/jornada/intencionPanoramica";
import { getJournalDateString } from "./segmentTime";

const PLANILLA_LOCAL_KEY = "sistemicar_planilla_v5";

type SegmentoLite = {
  estado?: string;
  puertaSistema?: boolean;
};

/**
 * Cuenta puertas abiertas a tiempo (margen de 10 minutos) vs total.
 * Misma lógica numérica que computePuertaPanorama: consciente = abierta
 * o cerrada a mano (no sistema).
 */
export function metricasIntencionFromSegmentos(
  segmentos: readonly SegmentoLite[],
): MetricasJornadaIntencion | undefined {
  if (segmentos.length === 0) return undefined;
  let conquistadas = 0;
  let perdidas = 0;
  for (const seg of segmentos) {
    if (seg.estado === "pendiente") continue;
    if (seg.estado === "activo") {
      if (seg.puertaSistema) perdidas += 1;
      else conquistadas += 1;
      continue;
    }
    if (seg.estado === "cerrado_manual") {
      conquistadas += 1;
      continue;
    }
    if (seg.estado === "entropia") {
      perdidas += 1;
    }
  }
  return {
    puertasConquistadas: conquistadas,
    puertasTotales: segmentos.length,
    puertasPerdidas: perdidas,
  };
}

export function leerMetricasJornadaLocal(): MetricasJornadaIntencion | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const fecha = getJournalDateString();
    const raw = localStorage.getItem(`${PLANILLA_LOCAL_KEY}_${fecha}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { segmentos?: SegmentoLite[] };
    return normalizarMetricasJornada(
      metricasIntencionFromSegmentos(parsed.segmentos ?? []),
    );
  } catch {
    return undefined;
  }
}
