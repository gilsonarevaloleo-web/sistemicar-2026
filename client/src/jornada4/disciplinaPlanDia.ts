/**
 * Disciplina Dual Kernel — % del día según la planificación (segmentos).
 *
 * Regla:
 * - N segmentos ⇒ N entradas ⇒ cada una pesa 100/N.
 * - Puntualidad de la entrada (puerta): max(0, 100 − minutos de tardanza).
 * - Contribución = peso × (puntualidad/100). Se suma al ir abriendo puertas.
 * - Sin entrada / puerta de sistema / ventana perdida ⇒ 0 en ese cupo.
 *
 * Puro wall-clock: sin voz, sin concienciaScheduler, sin disciplinaEngine clásico.
 */
import type { SegmentoV5 } from "@/lib/persistence";
import { getPuertaWindowMs } from "@/lib/segmentAttentionEngine";
import {
  getSegmentCalendarDayStartMs,
  segmentTimeToMinutes,
  segmentWindowMs,
} from "@/lib/segmentTime";

export type DisciplinaEntradaEstado =
  | "pendiente"
  | "en_ventana"
  | "contabilizada";

export type DisciplinaEntrada = {
  segmentoId: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  /** 100 / N (peso de este cupo en el día). */
  pesoPct: number;
  estado: DisciplinaEntradaEstado;
  tieneEntrada: boolean;
  puertaSistema: boolean;
  /** Minutos después de horaInicio al abrir (0 si puntual o temprano). */
  tardanzaMin: number | null;
  /** 0–100 para esta entrada. */
  puntualidadPct: number;
  /** pesoPct × puntualidad/100 — se suma al % del día. */
  contribucionPct: number;
};

export type DisciplinaPlanDia = {
  segmentosTotales: number;
  pesoPorEntrada: number;
  /** Entradas ya cerradas en el marcador (pasó ventana o hay puerta). */
  entradasContabilizadas: number;
  entradasConPuerta: number;
  /** Suma de contribuciones → hacia 100. */
  porcentajeDia: number;
  /** Suma de pesos de cupos contabilizados (techo parcial). */
  potencialHastaAhora: number;
  fase: "sin_plan" | "pre_jornada" | "en_curso" | "cierre";
  entradas: DisciplinaEntrada[];
};

function sortSegmentos(segmentos: SegmentoV5[]): SegmentoV5[] {
  return [...segmentos].sort(
    (a, b) => segmentTimeToMinutes(a.horaInicio) - segmentTimeToMinutes(b.horaInicio)
  );
}

/** Puntualidad: cada minuto de tardanza resta 1 punto del 100. */
export function puntualidadDesdeTardanzaMin(tardanzaMin: number): number {
  if (!Number.isFinite(tardanzaMin) || tardanzaMin <= 0) return 100;
  return Math.max(0, Math.round(100 - tardanzaMin));
}

export function pesoEntradaPct(segmentosTotales: number): number {
  if (segmentosTotales <= 0) return 0;
  // Evitar flotantes raros (3 → 33.333… → redondeo estable a 2 decimales).
  return Math.round((10000 / segmentosTotales)) / 100;
}

/**
 * Calcula disciplina del día a partir del plan (segmentos / puertas).
 */
export function computeDisciplinaPlanDia(params: {
  segmentos: SegmentoV5[];
  nowMs?: number;
  dayStartMs?: number;
}): DisciplinaPlanDia {
  const nowMs = params.nowMs ?? Date.now();
  const dayStartMs =
    params.dayStartMs ?? getSegmentCalendarDayStartMs(nowMs);
  const ordered = sortSegmentos(params.segmentos);
  const n = ordered.length;
  const peso = pesoEntradaPct(n);

  if (n === 0) {
    return {
      segmentosTotales: 0,
      pesoPorEntrada: 0,
      entradasContabilizadas: 0,
      entradasConPuerta: 0,
      porcentajeDia: 0,
      potencialHastaAhora: 0,
      fase: "sin_plan",
      entradas: [],
    };
  }

  const entradas: DisciplinaEntrada[] = ordered.map(seg => {
    const { segmentStartMs, windowStartMs, windowEndMs } = getPuertaWindowMs(
      seg.horaInicio,
      dayStartMs
    );
    const { end } = segmentWindowMs(seg.horaInicio, seg.horaFin, dayStartMs);
    const sistema = seg.puertaSistema === true;
    const activadoAt =
      seg.activadoAt != null &&
      (seg.estado === "activo" ||
        seg.estado === "cerrado_manual" ||
        seg.estado === "entropia")
        ? seg.activadoAt
        : null;

    const ventanaPerdida = nowMs > windowEndMs;
    const segmentoTerminado = nowMs >= end;
    const enVentanaAhora =
      nowMs >= windowStartMs && nowMs <= windowEndMs && activadoAt == null && !sistema;

    let estado: DisciplinaEntradaEstado = "pendiente";
    let tieneEntrada = false;
    let tardanzaMin: number | null = null;
    let puntualidadPct = 0;

    if (activadoAt != null && !sistema) {
      tieneEntrada = true;
      tardanzaMin = Math.max(0, Math.round((activadoAt - segmentStartMs) / 60_000));
      puntualidadPct = puntualidadDesdeTardanzaMin(tardanzaMin);
      estado = "contabilizada";
    } else if (sistema || ventanaPerdida || segmentoTerminado) {
      // Cupo perdido o puerta de sistema: 0 %
      tieneEntrada = false;
      tardanzaMin = null;
      puntualidadPct = 0;
      estado = "contabilizada";
    } else if (enVentanaAhora) {
      estado = "en_ventana";
      puntualidadPct = 0;
    } else {
      estado = "pendiente";
      puntualidadPct = 0;
    }

    const contribucionPct =
      estado === "contabilizada"
        ? Math.round(peso * (puntualidadPct / 100) * 100) / 100
        : 0;

    return {
      segmentoId: seg.id,
      nombre: seg.nombre,
      horaInicio: seg.horaInicio,
      horaFin: seg.horaFin,
      pesoPct: peso,
      estado,
      tieneEntrada,
      puertaSistema: sistema,
      tardanzaMin,
      puntualidadPct: estado === "contabilizada" ? puntualidadPct : 0,
      contribucionPct,
    };
  });

  const contabilizadas = entradas.filter(e => e.estado === "contabilizada");
  const porcentajeDia = Math.round(
    contabilizadas.reduce((acc, e) => acc + e.contribucionPct, 0)
  );
  const potencialHastaAhora = Math.round(
    contabilizadas.reduce((acc, e) => acc + e.pesoPct, 0)
  );
  const primeraStart = getPuertaWindowMs(ordered[0]!.horaInicio, dayStartMs).windowStartMs;
  const todasContabilizadas = contabilizadas.length === n;

  let fase: DisciplinaPlanDia["fase"] = "en_curso";
  if (nowMs < primeraStart && contabilizadas.length === 0) fase = "pre_jornada";
  else if (todasContabilizadas) fase = "cierre";

  return {
    segmentosTotales: n,
    pesoPorEntrada: peso,
    entradasContabilizadas: contabilizadas.length,
    entradasConPuerta: entradas.filter(e => e.tieneEntrada).length,
    porcentajeDia,
    potencialHastaAhora,
    fase,
    entradas,
  };
}

export function formatDisciplinaPlanHeadline(d: DisciplinaPlanDia): string {
  if (d.fase === "sin_plan") return "Sin plan del día";
  if (d.fase === "pre_jornada") {
    return `${d.segmentosTotales} seg · ${d.pesoPorEntrada}% c/u`;
  }
  return `${d.porcentajeDia}%`;
}

export function formatDisciplinaPlanSub(d: DisciplinaPlanDia): string {
  if (d.fase === "sin_plan") {
    return "Programa segmentos: 100% ÷ N entradas";
  }
  if (d.fase === "pre_jornada") {
    return `Cada puerta vale ${d.pesoPorEntrada}% · la tardanza resta minutos del 100`;
  }
  const parts = [
    `${d.entradasConPuerta}/${d.segmentosTotales} puertas`,
    `peso ${d.pesoPorEntrada}%`,
  ];
  if (d.potencialHastaAhora > 0 && d.potencialHastaAhora < 100) {
    parts.push(`de ${d.potencialHastaAhora}% posibles`);
  }
  return parts.join(" · ");
}
