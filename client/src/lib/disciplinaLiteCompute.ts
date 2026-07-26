/**
 * Disciplina lite — proyección UI del índice de entrada al trabajo.
 * Usa computeDisciplinaDia (puro). Prohibido en ms0 de gestos Dual Kernel.
 */
import {
  computeDisciplinaDia,
  describeSegmentoDisciplina,
  formatDisciplinaSubheadline,
  formatDisciplinaValorPrincipal,
  type DisciplinaFaseJornada,
  type SegmentoDisciplina,
} from "@/lib/disciplinaEngine";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";

export type DisciplinaLiteModel = {
  indice: number;
  valorPrincipal: string;
  subheadline: string;
  fase: DisciplinaFaseJornada;
  coberturaPct: number | null;
  puntualidadPct: number | null;
  deltaMedioMin: number | null;
  /** Segmento en curso / activo — entrada relativa. */
  segmentoActivoId: string | null;
  segmentoActivoNombre: string | null;
  segmentoHint: string | null;
  /** True si el bloque activo/en curso aún no tiene entrada consciente. */
  needsEntrada: boolean;
  sinSegmentos: boolean;
  computedAt: number;
};

export function buildDisciplinaLiteInputSig(
  segmentos: SegmentoV5[],
  vehicles: Vehicle[],
  segmentoActivoId: string | null
): string {
  const segPart = segmentos
    .map(
      s =>
        `${s.id}:${s.estado}:${s.horaInicio}:${s.horaFin}:${s.activadoAt ?? ""}:${s.cerradoAt ?? ""}`
    )
    .join("|");
  let active = 0;
  let aperturaBits = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v.status === "activo" || v.aperturaAt != null) {
      active += 1;
      aperturaBits ^= (v.aperturaAt ?? 0) & 0xffff;
    }
  }
  return `${segPart}::${vehicles.length}:${active}:${aperturaBits}::${segmentoActivoId ?? ""}`;
}

function resolveFocusSegment(
  segmentos: SegmentoV5[],
  perSeg: SegmentoDisciplina[],
  segmentoActivoId: string | null
): SegmentoDisciplina | null {
  if (segmentoActivoId) {
    const byId = perSeg.find(s => s.segmentoId === segmentoActivoId);
    if (byId) return byId;
  }
  const enCurso = perSeg.find(s => s.enCurso);
  if (enCurso) return enCurso;
  const activo = segmentos.find(s => s.estado === "activo");
  if (activo) return perSeg.find(s => s.segmentoId === activo.id) ?? null;
  return null;
}

/**
 * Cálculo puro. Solo desde idle / cache — nunca en handlers ms0.
 */
export function computeDisciplinaLite(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  now?: number;
}): DisciplinaLiteModel {
  const now = params.now ?? Date.now();
  const segmentos = Array.isArray(params.segmentos) ? params.segmentos : [];
  const vehicles = Array.isArray(params.vehicles) ? params.vehicles : [];
  const segmentoActivoId = params.segmentoActivoId ?? null;
  const dayStartMs = getSegmentCalendarDayStartMs(now);

  if (segmentos.length === 0) {
    return {
      ...EMPTY_DISCIPLINA_LITE,
      sinSegmentos: true,
      valorPrincipal: "—",
      subheadline: "Crea un segmento para medir la entrada al trabajo",
      computedAt: now,
    };
  }

  const dia = computeDisciplinaDia({
    segmentos,
    vehicles,
    dayStartMs,
    nowMs: now,
  });

  const focus = resolveFocusSegment(segmentos, dia.segmentos, segmentoActivoId);
  const needsEntrada = Boolean(
    focus && focus.primerEntradaAt == null && (focus.enCurso || !focus.evaluable)
  );

  return {
    indice: dia.indiceDisciplina,
    valorPrincipal: formatDisciplinaValorPrincipal(dia),
    subheadline: formatDisciplinaSubheadline(dia),
    fase: dia.faseJornada,
    coberturaPct: dia.cobertura.pct,
    puntualidadPct: dia.puntualidad.pct,
    deltaMedioMin: dia.puntualidad.deltaMedioMin,
    segmentoActivoId: focus?.segmentoId ?? segmentoActivoId,
    segmentoActivoNombre: focus?.nombre ?? null,
    segmentoHint: focus ? describeSegmentoDisciplina(focus) : null,
    needsEntrada,
    sinSegmentos: false,
    computedAt: now,
  };
}

export const EMPTY_DISCIPLINA_LITE: DisciplinaLiteModel = {
  indice: 0,
  valorPrincipal: "—",
  subheadline: "",
  fase: "pre_jornada",
  coberturaPct: null,
  puntualidadPct: null,
  deltaMedioMin: null,
  segmentoActivoId: null,
  segmentoActivoNombre: null,
  segmentoHint: null,
  needsEntrada: false,
  sinSegmentos: true,
  computedAt: 0,
};
