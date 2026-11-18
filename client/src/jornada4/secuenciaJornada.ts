/**
 * Secuencia vertical de la jornada: riel actual + colores de puerta.
 * Presentación pura. No escribe, no toca conciencia.
 */
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";
import {
  computeDisciplinaPlanDia,
  formatTardanzaPuertaLabel,
  puntualidadPuertaKind,
  summarizePuntualidadPuertas,
  type DisciplinaEntrada,
  type PuntualidadPuertaKind,
  type PuntualidadPuertasResumen,
} from "@/jornada4/disciplinaPlanDia";
import { getPuertaWindowMs } from "@/lib/segmentAttentionEngine";
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
  /** Señal de puntualidad de la puerta (a tiempo / tarde / sin entrada…). */
  puntualidadKind: PuntualidadPuertaKind;
  /** «a tiempo», «+12′», «sin entrada», «abrir»; null si aún no se evalúa. */
  puntualidadLabel: string | null;
  /** Aporte de esta puerta al % del día (0 si no contabilizada). */
  contribucionPct: number;
};

export type PanoramaJornada = {
  porcentajeDia: number;
  /** Puntos del día ya perdidos por tardanza o ventanas perdidas. */
  perdidoPct: number;
  resumen: PuntualidadPuertasResumen;
  /** Puertas a tiempo consecutivas, contadas hacia atrás desde la última evaluada. */
  rachaATiempo: number;
  /** Puerta por abrir (en ventana o la siguiente pendiente). */
  proxima: {
    nombre: string;
    horaInicio: string;
    /** Minutos hasta la hora de inicio; negativo si ya pasó. */
    enMin: number;
    enVentana: boolean;
  } | null;
  mensaje: string;
};

export function computeRachaATiempo(entradas: DisciplinaEntrada[]): number {
  let racha = 0;
  for (let i = entradas.length - 1; i >= 0; i -= 1) {
    const kind = puntualidadPuertaKind(entradas[i]!);
    if (kind === "pendiente" || kind === "en_ventana") continue;
    if (kind !== "a_tiempo") break;
    racha += 1;
  }
  return racha;
}

export function buildPanoramaJornada(params: {
  segmentos: SegmentoV5[];
  nowMs?: number;
  dayStartMs?: number;
}): PanoramaJornada | null {
  const nowMs = params.nowMs ?? Date.now();
  const dayStartMs = params.dayStartMs ?? getSegmentCalendarDayStartMs(nowMs);
  const d = computeDisciplinaPlanDia({
    segmentos: params.segmentos,
    nowMs,
    dayStartMs,
  });
  if (d.fase === "sin_plan") return null;

  const resumen = summarizePuntualidadPuertas(d.entradas);
  const rachaATiempo = computeRachaATiempo(d.entradas);
  const perdidoPct = Math.max(0, d.potencialHastaAhora - d.porcentajeDia);

  const sig = d.entradas.find(
    e => e.estado === "en_ventana" || e.estado === "pendiente"
  );
  const proxima = sig
    ? {
        nombre: sig.nombre,
        horaInicio: sig.horaInicio,
        enVentana: sig.estado === "en_ventana",
        enMin: Math.round(
          (getPuertaWindowMs(sig.horaInicio, dayStartMs).segmentStartMs - nowMs) /
            60_000
        ),
      }
    : null;

  let mensaje: string;
  if (proxima?.enVentana) {
    mensaje = `Abre «${proxima.nombre}» ahora: la ventana está viva.`;
  } else if (resumen.sinEntrada + resumen.tardias > 0 && perdidoPct > 0) {
    mensaje = `Llevas ${perdidoPct}% perdido por puertas tardías o sin abrir.`;
  } else if (rachaATiempo > 0) {
    mensaje = `Racha: ${rachaATiempo} ${rachaATiempo === 1 ? "puerta" : "puertas"} a tiempo.`;
  } else {
    mensaje = "Cada puerta abierta a tiempo suma disciplina.";
  }
  if (proxima && !proxima.enVentana) {
    mensaje += ` Próxima: ${proxima.nombre} ${proxima.horaInicio}.`;
  }

  return {
    porcentajeDia: d.porcentajeDia,
    perdidoPct,
    resumen,
    rachaATiempo,
    proxima,
    mensaje,
  };
}

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
    const entrada = entradaBySegId.get(node.segmentoId);
    return {
      ...node,
      puntualidadKind: entrada ? puntualidadPuertaKind(entrada) : "pendiente",
      puntualidadLabel: entrada ? formatTardanzaPuertaLabel(entrada) : null,
      contribucionPct: entrada?.contribucionPct ?? 0,
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
