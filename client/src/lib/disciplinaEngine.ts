import type { SegmentoV5, Vehicle } from "./persistence";
import {
  isWithinSegmentTimeMargin,
  segmentTimeToMinutes,
  segmentWindowMs,
} from "./segmentTime";
import { segmentEffectiveWindowStartMs } from "./segmentVehicleAssign";
import { vehicleActiveAt } from "./puntualidadEngine";

export type PrimerEntradaTipo = {
  tipoFlota?: string;
  tipoReloj?: string;
  titulo?: string;
};

export type SegmentoDisciplina = {
  segmentoId: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  puertaAbiertaAt: number | null;
  puertaManual: boolean;
  primerEntradaAt: number | null;
  primerEntradaTipo: PrimerEntradaTipo;
  deltaDesdeInicioMin: number | null;
  deltaDesdePuertaMin: number | null;
  sinEntrada: boolean;
  montaje: boolean;
  scoreSegmento: number;
  evaluable: boolean;
  enCurso: boolean;
};

export type EstudioTipoVehiculo = {
  tipoFlota: string;
  tipoReloj: string;
  count: number;
};

export type DisciplinaFaseJornada = "pre_jornada" | "en_curso" | "cierre";

export type DisciplinaCobertura = {
  /** Segmentos con primer vehículo consciente (numerador). */
  conEntrada: number;
  /** Denominador del ratio (evaluados, o iniciados si aún no hay evaluables). */
  base: number;
  segmentosTotales: number;
  segmentosEvaluados: number;
  segmentosEnCurso: number;
  segmentosRestantes: number;
  /** null antes del primer segmento iniciado. */
  pct: number | null;
};

export type DisciplinaPuntualidad = {
  /** Promedio de scoreSegmento en la base activa (sin entrada = 0). */
  pct: number | null;
  deltaMedioMin: number | null;
};

export type DisciplinaDia = {
  segmentos: SegmentoDisciplina[];
  /**
   * % del día = suma de (100/N)×puntualidad por entrada del plan.
   * N segmentos ⇒ cada puerta vale 100/N; la tardanza en minutos resta del 100 de esa entrada.
   */
  indiceDisciplina: number;
  faseJornada: DisciplinaFaseJornada;
  cobertura: DisciplinaCobertura;
  puntualidad: DisciplinaPuntualidad;
  /** Hora del primer segmento planificado (pre-jornada). */
  primeraPuertaHora: string | null;
  entradasTotales: number;
  sinEntrada: number;
  deltaMedioDesdeInicioMin: number | null;
  deltaMedioDesdePuertaMin: number | null;
  estudioTipos: EstudioTipoVehiculo[];
  montajes: number;
};

function sortSegmentos(segmentos: SegmentoV5[]): SegmentoV5[] {
  return [...segmentos].sort(
    (a, b) => segmentTimeToMinutes(a.horaInicio) - segmentTimeToMinutes(b.horaInicio)
  );
}

/** Vehículo consciente que cuenta como entrada al trabajo. */
export function isTrabajoConsciente(v: Vehicle): boolean {
  return !v.autoVerdad && v.tipoFlota !== "descanso";
}

function vehiculosEnVentana(
  vehicles: Vehicle[],
  horaInicio: string,
  start: number,
  end: number,
  dayStartMs: number
): Vehicle[] {
  const effectiveStart = segmentEffectiveWindowStartMs(horaInicio, dayStartMs);
  return vehicles.filter(
    v =>
      isTrabajoConsciente(v) &&
      v.aperturaAt != null &&
      v.aperturaAt >= effectiveStart &&
      v.aperturaAt <= end
  );
}

function primerVehiculoPorApertura(vehicles: Vehicle[]): Vehicle | null {
  if (vehicles.length === 0) return null;
  return vehicles.reduce((best, v) =>
    (v.aperturaAt ?? Infinity) < (best.aperturaAt ?? Infinity) ? v : best
  );
}

function detectMontajeInvasores(
  vehicles: Vehicle[],
  segmento: SegmentoV5,
  start: number,
  evalAt: number
): Vehicle[] {
  const ts = Math.max(start, evalAt);
  return vehicles.filter(
    v =>
      v.tipoFlota === "situacion" &&
      !v.autoVerdad &&
      v.aperturaAt != null &&
      v.aperturaAt < start &&
      vehicleActiveAt(v, ts) &&
      v.segmentoOrigen !== segmento.nombre
  );
}

function detectMontajeCruce(vehicles: Vehicle[], segmento: SegmentoV5): Vehicle[] {
  return vehicles.filter(
    v =>
      v.tipoFlota === "situacion" &&
      (v.segmentosCruzados ?? 0) > 0 &&
      (v.segmentoMontadoId === segmento.id ||
        v.segmentoMontadoNombre === segmento.nombre)
  );
}

function computeScoreSegmento(
  sinEntrada: boolean,
  deltaDesdeInicioMin: number | null,
  _duracionMin: number
): number {
  if (sinEntrada || deltaDesdeInicioMin == null) return 0;
  // Cada minuto de tardanza resta 1 del 100 (20 min → 80, 30 → 70).
  return Math.max(0, Math.round(100 - deltaDesdeInicioMin));
}

function tipoKey(v: Vehicle): string {
  return `${v.tipoFlota ?? "otro"}|${v.tipoReloj ?? "-"}`;
}

function buildEstudioTipos(vehicles: Vehicle[], segmentos: SegmentoV5[], dayStartMs: number): EstudioTipoVehiculo[] {
  const map = new Map<string, number>();
  for (const seg of segmentos) {
    const { start, end } = segmentWindowMs(seg.horaInicio, seg.horaFin, dayStartMs);
    for (const v of vehiculosEnVentana(vehicles, seg.horaInicio, start, end, dayStartMs)) {
      const key = tipoKey(v);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([key, count]) => {
      const [tipoFlota, tipoReloj] = key.split("|");
      return { tipoFlota, tipoReloj, count };
    })
    .sort((a, b) => b.count - a.count);
}

/** Disciplina del día: minutos hasta entrar al trabajo y score por segmento. */
export function computeDisciplinaDia(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  dayStartMs: number;
  nowMs?: number;
}): DisciplinaDia {
  const { segmentos, vehicles, dayStartMs, nowMs = Date.now() } = params;
  const ordered = sortSegmentos(segmentos);

  const segmentosOut: SegmentoDisciplina[] = ordered.map(seg => {
    const { start, end, durationMin } = segmentWindowMs(
      seg.horaInicio,
      seg.horaFin,
      dayStartMs
    );
    const evaluable = nowMs >= end;
    const enCurso = nowMs >= start && nowMs < end;

    const puertaAbiertaAt =
      seg.activadoAt != null &&
      (seg.estado === "activo" ||
        seg.estado === "cerrado_manual" ||
        seg.estado === "entropia")
        ? seg.activadoAt
        : null;

    const puertaManual =
      puertaAbiertaAt != null &&
      isWithinSegmentTimeMargin(
        puertaAbiertaAt,
        seg.horaInicio,
        seg.horaFin,
        "inicio",
        5,
        dayStartMs
      );

    const enVentana = vehiculosEnVentana(vehicles, seg.horaInicio, start, end, dayStartMs);
    const primer = primerVehiculoPorApertura(enVentana);
    const primerEntradaAt = primer?.aperturaAt ?? null;

    // Entrada del plan = puerta abierta; si no hay, primer vehículo consciente.
    const entradaPlanAt = puertaAbiertaAt ?? primerEntradaAt;

    const deltaDesdeInicioMin =
      entradaPlanAt != null
        ? Math.max(0, Math.round((entradaPlanAt - start) / 60000))
        : null;

    const deltaDesdePuertaMin =
      primerEntradaAt != null && puertaAbiertaAt != null
        ? Math.max(0, Math.round((primerEntradaAt - puertaAbiertaAt) / 60000))
        : null;

    const sinEntrada = evaluable && entradaPlanAt == null;

    const invasores =
      nowMs >= start ? detectMontajeInvasores(vehicles, seg, start, nowMs) : [];
    const cruce = detectMontajeCruce(vehicles, seg);
    const montaje = invasores.length > 0 || cruce.length > 0;

    const scoreSegmento = computeScoreSegmento(
      sinEntrada,
      deltaDesdeInicioMin,
      durationMin
    );

    return {
      segmentoId: seg.id,
      nombre: seg.nombre,
      horaInicio: seg.horaInicio,
      horaFin: seg.horaFin,
      puertaAbiertaAt,
      puertaManual,
      primerEntradaAt: entradaPlanAt,
      primerEntradaTipo: puertaAbiertaAt
        ? { tipoFlota: "puerta", tipoReloj: "plan", titulo: seg.nombre }
        : primer
          ? {
              tipoFlota: primer.tipoFlota,
              tipoReloj: primer.tipoReloj,
              titulo: primer.titulo,
            }
          : {},
      deltaDesdeInicioMin,
      deltaDesdePuertaMin,
      sinEntrada,
      montaje,
      scoreSegmento,
      evaluable,
      enCurso,
    };
  });

  const evaluables = segmentosOut.filter(s => s.evaluable);
  const enCursoList = segmentosOut.filter(s => s.enCurso);
  const iniciados = segmentosOut.filter(s => s.evaluable || s.enCurso);
  const conEntrada = segmentosOut.filter(s => s.primerEntradaAt != null);
  const sinEntradaCount = segmentosOut.filter(s => s.sinEntrada).length;
  const montajes = segmentosOut.filter(s => s.montaje).length;
  const segmentosTotales = segmentosOut.length;
  const segmentosRestantes = segmentosOut.filter(s => !s.evaluable && !s.enCurso).length;

  const faseJornada: DisciplinaFaseJornada =
    segmentosTotales === 0 || iniciados.length === 0
      ? "pre_jornada"
      : evaluables.length >= segmentosTotales
        ? "cierre"
        : "en_curso";

  const coberturaBase = evaluables.length > 0 ? evaluables : iniciados;
  const coberturaConEntrada =
    evaluables.length > 0
      ? evaluables.filter(s => !s.sinEntrada).length
      : iniciados.filter(s => s.primerEntradaAt != null).length;
  const coberturaPct =
    coberturaBase.length > 0
      ? Math.round((coberturaConEntrada / coberturaBase.length) * 100)
      : null;

  const puntualidadBase = evaluables.length > 0 ? evaluables : conEntrada;
  const puntualidadPct =
    puntualidadBase.length > 0
      ? Math.round(
          puntualidadBase.reduce((acc, s) => acc + s.scoreSegmento, 0) / puntualidadBase.length
        )
      : null;

  const deltasInicio = conEntrada
    .map(s => s.deltaDesdeInicioMin)
    .filter((d): d is number => d != null);
  const deltasPuerta = conEntrada
    .map(s => s.deltaDesdePuertaMin)
    .filter((d): d is number => d != null);

  const deltaMedioDesdeInicioMin =
    deltasInicio.length > 0
      ? Math.round(deltasInicio.reduce((a, b) => a + b, 0) / deltasInicio.length)
      : null;

  const deltaMedioDesdePuertaMin =
    deltasPuerta.length > 0
      ? Math.round(deltasPuerta.reduce((a, b) => a + b, 0) / deltasPuerta.length)
      : null;

  const cobertura: DisciplinaCobertura = {
    conEntrada: coberturaConEntrada,
    base: coberturaBase.length,
    segmentosTotales,
    segmentosEvaluados: evaluables.length,
    segmentosEnCurso: enCursoList.length,
    segmentosRestantes,
    pct: coberturaPct,
  };

  const puntualidad: DisciplinaPuntualidad = {
    pct: puntualidadPct,
    deltaMedioMin: deltaMedioDesdeInicioMin,
  };

  // Índice = suma de (100/N) × puntualidad_i. Cada cupo del plan aporta su peso.
  const indiceDisciplina = computeIndiceDisciplinaPlan(segmentosOut, segmentosTotales);

  return {
    segmentos: segmentosOut,
    indiceDisciplina,
    faseJornada,
    cobertura,
    puntualidad,
    primeraPuertaHora: ordered[0]?.horaInicio ?? null,
    entradasTotales: conEntrada.length,
    sinEntrada: sinEntradaCount,
    deltaMedioDesdeInicioMin,
    deltaMedioDesdePuertaMin,
    estudioTipos: buildEstudioTipos(vehicles, ordered, dayStartMs),
    montajes,
  };
}

/**
 * Disciplina del plan: 100% ÷ N segmentos.
 * Cada entrada contabilizada aporta (100/N)×(puntualidad/100).
 * Se suma al avanzar el día (2ª puntual suma; 1ª tardía ya restó).
 */
function computeIndiceDisciplinaPlan(
  segmentos: SegmentoDisciplina[],
  total: number
): number {
  if (total <= 0) return 0;
  const peso = 100 / total;
  let sum = 0;
  for (const s of segmentos) {
    // Cupos futuros (no iniciados) no suman aún.
    if (!s.evaluable && !s.enCurso) continue;
    // En curso sin entrada: aún no cierra el cupo.
    if (s.enCurso && s.primerEntradaAt == null) continue;
    const score = s.sinEntrada ? 0 : s.scoreSegmento;
    sum += peso * (score / 100);
  }
  return Math.round(sum);
}

/** @deprecated Preferir computeIndiceDisciplinaPlan (peso por segmento del día). */
function computeIndiceDisciplinaCompuesto(
  coberturaPct: number | null,
  puntualidadPct: number | null
): number {
  if (coberturaPct == null && puntualidadPct == null) return 0;
  if (coberturaPct == null) return Math.round(puntualidadPct!);
  if (puntualidadPct == null) return Math.round(coberturaPct);
  return Math.round(0.5 * coberturaPct + 0.5 * puntualidadPct);
}

// Mantener export interno usable en tests legacy si hace falta.
void computeIndiceDisciplinaCompuesto;

/** Valor principal para UI — % del plan (100÷N × puntualidad acumulada). */
export function formatDisciplinaValorPrincipal(d: DisciplinaDia): string {
  if (d.faseJornada === "pre_jornada") {
    const n = d.cobertura.segmentosTotales;
    if (n > 0 && d.primeraPuertaHora) {
      return `${n} seg · ${d.primeraPuertaHora}`;
    }
    return n > 0 ? `${n} segmentos` : "—";
  }
  return `${d.indiceDisciplina}%`;
}

export function formatDisciplinaSubheadline(d: DisciplinaDia): string {
  if (d.faseJornada === "pre_jornada") {
    return "Jornada abierta — la entrada se mide puerta a puerta";
  }
  const parts: string[] = [];
  if (d.cobertura.pct != null) parts.push(`${d.cobertura.pct}% cobertura`);
  if (d.puntualidad.pct != null) parts.push(`puntualidad ${d.puntualidad.pct}`);
  if (d.cobertura.segmentosRestantes > 0) {
    parts.push(`${d.cobertura.segmentosRestantes} restante${d.cobertura.segmentosRestantes !== 1 ? "s" : ""}`);
  }
  if (d.indiceDisciplina > 0) parts.push(`índice ${d.indiceDisciplina}`);
  return parts.length > 0 ? parts.join(" · ") : "Acumulando entradas al trabajo";
}

export function describeSegmentoDisciplina(sd: SegmentoDisciplina): string {
  if (sd.sinEntrada) return "Sin entrada al trabajo en este ciclo";
  if (sd.primerEntradaAt == null && sd.enCurso) return "Ciclo en curso — aún sin entrada";
  if (sd.primerEntradaAt == null) return "En curso";
  const tipo = sd.primerEntradaTipo.tipoReloj ?? sd.primerEntradaTipo.tipoFlota ?? "vehículo";
  const desdeInicio =
    sd.deltaDesdeInicioMin != null ? `+${sd.deltaDesdeInicioMin} min desde inicio` : "";
  const desdePuerta =
    sd.deltaDesdePuertaMin != null ? `+${sd.deltaDesdePuertaMin} min desde puerta` : "";
  const partes = [desdeInicio, desdePuerta, tipo].filter(Boolean);
  if (sd.montaje) partes.push("montaje situacional");
  return partes.join(" · ");
}

export function disciplinaBadgeLabel(sd: SegmentoDisciplina): string | null {
  if (sd.montaje && sd.enCurso) return "M!";
  if (sd.sinEntrada) return "—";
  if (sd.deltaDesdeInicioMin != null) return `+${sd.deltaDesdeInicioMin}`;
  if (sd.enCurso) return "…";
  return null;
}

export function formatEstudioTipoChip(e: EstudioTipoVehiculo): string {
  const label =
    e.tipoReloj && e.tipoReloj !== "-"
      ? e.tipoReloj
      : e.tipoFlota;
  return `${label} · ${e.count}`;
}

export function computeDisciplinaCompare(
  yesterday: DisciplinaDia | null | undefined,
  today: DisciplinaDia
): { headline: string; motivacion: string; deltaIndice: number | null } {
  const hasYesterday = yesterday != null && yesterday.indiceDisciplina > 0;
  const deltaIndice = hasYesterday
    ? today.indiceDisciplina - yesterday!.indiceDisciplina
    : null;

  let headline: string;
  if (today.faseJornada === "pre_jornada") {
    headline = formatDisciplinaValorPrincipal(today);
  } else if (today.cobertura.base > 0) {
    headline = `${today.cobertura.conEntrada}/${today.cobertura.base} segmentos con entrada`;
    if (today.indiceDisciplina > 0) headline += ` · índice ${today.indiceDisciplina}`;
  } else {
    headline = `Índice ${today.indiceDisciplina} · ${today.entradasTotales} entradas al trabajo`;
  }

  let motivacion: string;
  if (today.faseJornada === "pre_jornada") {
    motivacion = formatDisciplinaSubheadline(today);
  } else if (today.deltaMedioDesdeInicioMin != null) {
    motivacion = `Δ medio +${today.deltaMedioDesdeInicioMin} min al primer vehículo · ${formatDisciplinaSubheadline(today)}`;
  } else {
    motivacion = formatDisciplinaSubheadline(today);
  }

  if (deltaIndice != null && deltaIndice > 0) {
    motivacion += ` · +${deltaIndice} vs ayer.`;
  } else if (deltaIndice != null && deltaIndice < 0) {
    motivacion += ` · ${deltaIndice} vs ayer.`;
  }

  return { headline, motivacion, deltaIndice };
}

export type DisciplinaSeriePoint = {
  fecha: string;
  indiceDisciplina: number;
  label: string;
};

/** Serie para gráfico de línea (snapshots + hoy en vivo). */
export function buildDisciplinaSerie(
  snapshots: Array<{ fecha: string; disciplina?: DisciplinaDia }>,
  todayLive?: DisciplinaDia,
  todayFecha?: string
): DisciplinaSeriePoint[] {
  const byFecha = new Map<string, number>();
  for (const s of snapshots) {
    if (s.disciplina != null) {
      byFecha.set(s.fecha, s.disciplina.indiceDisciplina);
    }
  }
  if (todayLive && todayFecha) {
    byFecha.set(todayFecha, todayLive.indiceDisciplina);
  }
  return Array.from(byFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, indiceDisciplina]) => ({
      fecha,
      indiceDisciplina,
      label: fecha.slice(5).replace("-", "/"),
    }));
}
