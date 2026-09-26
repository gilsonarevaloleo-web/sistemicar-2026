/**
 * Secuencia vertical de la jornada: riel actual + colores de puerta.
 * Presentación pura. No escribe, no toca conciencia.
 */
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";
import { computeDisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import {
  buildCoberturaTimeline,
  COBERTURA_KIND_LABEL,
  type CoberturaTimelineKind,
  type CoberturaTimelineNode,
} from "@/jornada4/coberturaTimeline";
import {
  PUERTA_TIMELINE_KIND_LABEL,
  resolvePuertaTimelineVisual,
  type PuertaTimelineKind,
  type PuertaTimelineVisual,
} from "@/jornada4/puertaTimelineVisual";

export type SecuenciaJornadaNode = CoberturaTimelineNode & {
  puerta: PuertaTimelineVisual;
  puertaKind: PuertaTimelineKind;
  statusLabel: string;
};

export function formatSecuenciaStatusLabel(
  puertaKind: PuertaTimelineKind,
  coberturaKind: CoberturaTimelineKind,
  detail?: string
): string {
  const puerta = PUERTA_TIMELINE_KIND_LABEL[puertaKind];
  const cover = COBERTURA_KIND_LABEL[coberturaKind];
  if (puertaKind === "pendiente" && coberturaKind === "pendiente") {
    return detail ? `${cover} · ${detail}` : cover;
  }
  const parts = [puerta, cover];
  if (detail) parts.push(detail);
  return parts.join(" · ");
}

export function buildSecuenciaJornadaNodes(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  nowMs?: number;
  dayStartMs?: number;
}): SecuenciaJornadaNode[] {
  const nowMs = params.nowMs ?? Date.now();
  const dayStartMs = params.dayStartMs ?? getSegmentCalendarDayStartMs(nowMs);
  const disciplina = computeDisciplinaPlanDia({
    segmentos: params.segmentos,
    nowMs,
    dayStartMs,
  });
  const entradaBySegId = new Map(
    disciplina.entradas.map(e => [e.segmentoId, e] as const)
  );
  const segById = new Map(params.segmentos.map(s => [s.id, s] as const));
  const cover = buildCoberturaTimeline({
    segmentos: params.segmentos,
    vehicles: params.vehicles,
  });

  return cover.map(node => {
    const seg = segById.get(node.segmentoId);
    const visual = resolvePuertaTimelineVisual({
      seg: seg ?? { estado: "pendiente" },
      entrada: entradaBySegId.get(node.segmentoId),
    });
    return {
      ...node,
      puerta: visual,
      puertaKind: visual.kind,
      statusLabel: formatSecuenciaStatusLabel(
        visual.kind,
        node.kind,
        node.detail
      ),
    };
  });
}
