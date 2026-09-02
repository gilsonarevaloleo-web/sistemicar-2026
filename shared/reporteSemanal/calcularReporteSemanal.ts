/**
 * Motor puro del reporte semanal de virtudes.
 * Sin Firebase, sin Gemini, sin React.
 */

import { calcularMetricasUmbral } from "../umbral/metrics.ts";
import type { SesionUmbral } from "../umbral/sessionTypes.ts";
import type { ModoUmbral } from "../umbral/engineConfig.ts";
import {
  ACCION_MINIMA,
  CENTINELA_TITULO,
  CODIGO_FRICCION,
  MINUTOS_DIA_JORNADA,
  TEXTO_INSUFICIENTE,
  VIRTUD_LABEL,
  VIRTUD_ORDEN_INSTALACION,
  type CalcularReporteSemanalInput,
  type LedgerTerminoSemanal,
  type PatronVeredicto,
  type PlanillaSemanal,
  type RevelacionSemanal,
  type ReporteSemanal,
  type ScoreVirtud,
  type SegmentoSemanal,
  type SelloDiarioSemanal,
  type SesionUmbralSemanal,
  type SnapshotSemanal,
  type VehiculoSemanal,
  type VirtudId,
} from "./types.ts";
import {
  fechaEnVentana,
  formatMinutos,
  getJournalDateString,
  resolveVentanaSemanal,
  segmentEndMs,
  segmentEndMin,
  segmentStartMs,
  type VentanaSemanal,
} from "./ventana.ts";

export {
  resolveVentanaSemanal,
  getJournalDateString,
  ventanaFromMonday,
  monday0500LimaMs,
} from "./ventana.ts";
export type { CalcularReporteSemanalInput, ReporteSemanal, VentanaSemanal } from "./types.ts";

const ALTA_TIE: VirtudId[] = [
  "termino",
  "disciplina",
  "disposicion",
  "integridad",
  "temple",
  "agencia",
];

const BAJA_TIE: VirtudId[] = [
  "termino",
  "agencia",
  "temple",
  "integridad",
  "disposicion",
  "disciplina",
];

export function isInvisibleCentinela(v: VehiculoSemanal): boolean {
  return (
    !!v.autoVerdad &&
    (v.titulo === CENTINELA_TITULO || !!v.excluirDeHistorial)
  );
}

export function isCierreContable(v: VehiculoSemanal): boolean {
  return (
    typeof v.cierreAt === "number" &&
    Number.isFinite(v.cierreAt) &&
    v.cierreAt > 0 &&
    !isInvisibleCentinela(v)
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function roundScore(n: number): number {
  return Math.round(n);
}

function lastSegment(segmentos: SegmentoSemanal[]): SegmentoSemanal | null {
  if (segmentos.length === 0) return null;
  let last = segmentos[0]!;
  let lastEnd = segmentEndMin(last.horaInicio, last.horaFin);
  for (let i = 1; i < segmentos.length; i++) {
    const s = segmentos[i]!;
    const end = segmentEndMin(s.horaInicio, s.horaFin);
    if (end > lastEnd) {
      last = s;
      lastEnd = end;
    }
  }
  return last;
}

export function isCierreConscienteAlTermino(
  v: VehiculoSemanal,
  lastStartMs: number,
  planEndMs: number,
): boolean {
  if (v.cierreManual === false) return false;
  if (!isCierreContable(v)) return false;
  if (v.status === "activo") return false;
  const at = v.cierreAt!;
  return at >= lastStartMs && at <= planEndMs + 60_000;
}

function vehiculosDeFecha(
  vehiculos: VehiculoSemanal[],
  fecha: string,
): VehiculoSemanal[] {
  return vehiculos.filter(
    (v) => isCierreContable(v) && getJournalDateString(v.cierreAt!) === fecha,
  );
}

interface DiaVista {
  fecha: string;
  planilla: PlanillaSemanal | null;
  snapshot: SnapshotSemanal | null;
  sello: SelloDiarioSemanal | null;
  ledger: LedgerTerminoSemanal | null;
  revelacion: RevelacionSemanal | null;
  vehiculos: VehiculoSemanal[];
}

function buildDias(
  ventana: VentanaSemanal,
  input: CalcularReporteSemanalInput,
): DiaVista[] {
  const planillas = (input.planillas ?? []).filter((p) =>
    fechaEnVentana(p.fecha, ventana),
  );
  const snapshots = (input.snapshots ?? []).filter((s) =>
    fechaEnVentana(s.fecha, ventana),
  );
  const sellos = (input.sellos ?? []).filter((s) =>
    fechaEnVentana(s.fecha, ventana),
  );
  const ledgers = (input.ledgersTermino ?? []).filter((l) =>
    fechaEnVentana(l.fecha, ventana),
  );
  const revelaciones = (input.revelaciones ?? []).filter((r) =>
    fechaEnVentana(r.fecha, ventana),
  );
  const vehiculos = (input.vehiculos ?? []).filter((v) => {
    if (!isCierreContable(v)) return false;
    return fechaEnVentana(getJournalDateString(v.cierreAt!), ventana);
  });

  return ventana.fechas.map((fecha) => ({
    fecha,
    planilla: planillas.find((p) => p.fecha === fecha) ?? null,
    snapshot: snapshots.find((s) => s.fecha === fecha) ?? null,
    sello: sellos.find((s) => s.fecha === fecha) ?? null,
    ledger: ledgers.find((l) => l.fecha === fecha) ?? null,
    revelacion: revelaciones.find((r) => r.fecha === fecha) ?? null,
    vehiculos: vehiculosDeFecha(vehiculos, fecha),
  }));
}

function minutosPlanDia(d: DiaVista): number | null {
  if (d.revelacion && Number.isFinite(d.revelacion.minutosPlan)) {
    return Math.max(0, d.revelacion.minutosPlan);
  }
  if (d.sello && typeof d.sello.jornadaPlanMin === "number") {
    return Math.max(0, d.sello.jornadaPlanMin);
  }
  return null;
}

function segmentosDia(d: DiaVista): SegmentoSemanal[] {
  if (d.planilla && d.planilla.segmentos.length > 0) return d.planilla.segmentos;
  if (d.snapshot?.segmentos && d.snapshot.segmentos.length > 0) {
    return d.snapshot.segmentos
      .filter((s) => s.horaInicio && s.horaFin)
      .map((s) => ({
        horaInicio: s.horaInicio!,
        horaFin: s.horaFin!,
        estado: (s.estado as SegmentoSemanal["estado"]) ?? undefined,
      }));
  }
  return [];
}

function diaConAnillo(d: DiaVista): boolean {
  const segs = d.planilla?.segmentos.length ?? 0;
  const min = minutosPlanDia(d);
  return segs >= 3 || (min != null && min >= 180);
}

function diaConDatoDisposicion(d: DiaVista): boolean {
  return (
    (d.planilla != null && d.planilla.segmentos.length > 0) ||
    minutosPlanDia(d) != null
  );
}

function puertaAbiertaOperador(seg: SegmentoSemanal): boolean {
  if (seg.activadoAt == null) return false;
  if (seg.puertaSistema === true) return false;
  return seg.puertaTiming != null || seg.puertaManual === true;
}

function segmentoEvaluable(
  fecha: string,
  seg: SegmentoSemanal,
  nowMs: number,
  semanaCerrada: boolean,
): boolean {
  if (semanaCerrada) return true;
  return segmentEndMs(fecha, seg.horaInicio, seg.horaFin) <= nowMs;
}

function umbralElegible(dias: DiaVista[], semanaCerrada: boolean, nowMs: number): boolean {
  const diasAncla = dias.filter((d) => {
    const segs = segmentosDia(d);
    const hayPuerta = segs.some((s) => {
      if (!segmentoEvaluable(d.fecha, s, nowMs, semanaCerrada)) return false;
      if (s.estado === "cerrado_manual") return true;
      return puertaAbiertaOperador(s) || (s.activadoAt != null && s.puertaSistema !== true);
    });
    const snapPuerta =
      (d.snapshot?.segmentosCerradosManual ?? 0) > 0 ||
      (d.planilla?.atencionSnapshot?.puertasAbiertas ?? 0) > 0 ||
      (d.snapshot?.atencionSnapshot?.puertasAbiertas ?? 0) > 0;
    return hayPuerta || snapPuerta;
  }).length;
  if (diasAncla >= 3) return true;

  const cierres = dias.reduce((n, d) => n + d.vehiculos.length, 0);
  if (cierres >= 5) return true;

  const sellos = dias.filter((d) => d.sello?.selloEmitido === true).length;
  if (sellos >= 2) return true;

  const anillos = dias.filter((d) => (d.planilla?.segmentos.length ?? 0) >= 3).length;
  if (anillos >= 3) return true;

  return false;
}

function scoreDisposicion(dias: DiaVista[]): ScoreVirtud {
  const conDato = dias.filter(diaConDatoDisposicion);
  if (conDato.length === 0) {
    return {
      id: "disposicion",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }
  const conAnillo = dias.filter(diaConAnillo).length;
  const coberturas = conDato.map((d) => {
    const min = minutosPlanDia(d);
    if (min != null) return clamp(min / MINUTOS_DIA_JORNADA, 0, 1);
    const n = d.planilla?.segmentos.length ?? 0;
    return clamp(n / 6, 0, 1);
  });
  const mediaCob = coberturas.reduce((a, b) => a + b, 0) / coberturas.length;
  const score = roundScore(100 * (0.6 * (conAnillo / 7) + 0.4 * mediaCob));
  const mediaMin = mediaCob * MINUTOS_DIA_JORNADA;
  return {
    id: "disposicion",
    score,
    delta: null,
    evidencia: {
      hechos: [
        `Anillo plantado ${conAnillo} de 7 días · cobertura media ${formatMinutos(mediaMin)}`,
      ],
      numerador: conAnillo,
      denominador: 7,
    },
  };
}

function scoreDisciplina(
  dias: DiaVista[],
  nowMs: number,
  semanaCerrada: boolean,
): ScoreVirtud {
  let evaluables = 0;
  let abiertas = 0;
  let cerradas = 0;
  let perdidas = 0;
  let usoPlanilla = false;

  for (const d of dias) {
    const segs = d.planilla?.segmentos ?? [];
    if (segs.length > 0) {
      usoPlanilla = true;
      for (const s of segs) {
        if (!segmentoEvaluable(d.fecha, s, nowMs, semanaCerrada)) continue;
        evaluables += 1;
        if (puertaAbiertaOperador(s)) abiertas += 1;
        if (s.estado === "cerrado_manual") cerradas += 1;
        if (
          s.puertaSistema === true ||
          (s.estado === "entropia" && s.estado !== "cerrado_manual")
        ) {
          perdidas += 1;
        }
      }
    }
  }

  if (!usoPlanilla) {
    let tot = 0;
    let cer = 0;
    let abi = 0;
    for (const d of dias) {
      const t = d.snapshot?.segmentosTotales ?? 0;
      if (t <= 0) continue;
      tot += t;
      cer += d.snapshot?.segmentosCerradosManual ?? 0;
      abi +=
        d.snapshot?.atencionSnapshot?.puertasAbiertas ??
        d.planilla?.atencionSnapshot?.puertasAbiertas ??
        0;
    }
    if (tot <= 0) {
      return {
        id: "disciplina",
        score: null,
        delta: null,
        evidencia: { hechos: [] },
      };
    }
    evaluables = tot;
    cerradas = cer;
    abiertas = abi;
    perdidas = Math.max(0, tot - cer);
  }

  if (evaluables <= 0) {
    return {
      id: "disciplina",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }

  const score = roundScore(
    100 * (0.5 * (abiertas / evaluables) + 0.5 * (cerradas / evaluables)),
  );
  return {
    id: "disciplina",
    score,
    delta: null,
    evidencia: {
      hechos: [
        `${abiertas} puertas abiertas a tiempo · ${cerradas} cierres conscientes · ${perdidas} perdidas`,
      ],
      numerador: cerradas,
      denominador: evaluables,
    },
  };
}

function scoreTermino(dias: DiaVista[], vehiculos: VehiculoSemanal[]): ScoreVirtud {
  let posibles = 0;
  let conscientes = 0;

  for (const d of dias) {
    const segs = segmentosDia(d);
    const last = lastSegment(segs);
    const ledgerHit = (d.ledger?.n ?? 0) > 0;
    const resoluble = last != null || ledgerHit;
    if (!resoluble) continue;
    posibles += 1;

    const lastManual = last?.estado === "cerrado_manual";
    let vehiculoTermino = false;
    if (last) {
      const start = segmentStartMs(d.fecha, last.horaInicio);
      const end = segmentEndMs(d.fecha, last.horaInicio, last.horaFin);
      vehiculoTermino = vehiculos.some((v) =>
        isCierreConscienteAlTermino(v, start, end),
      );
    }
    if (lastManual || vehiculoTermino || ledgerHit) conscientes += 1;
  }

  if (posibles <= 0) {
    return {
      id: "termino",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }

  return {
    id: "termino",
    score: roundScore((100 * conscientes) / posibles),
    delta: null,
    evidencia: {
      hechos: [`Puerta del Término cerrada ${conscientes} de ${posibles} noches`],
      numerador: conscientes,
      denominador: posibles,
    },
  };
}

function scoreIntegridad(vehiculos: VehiculoSemanal[]): ScoreVirtud {
  const cerrados = vehiculos.filter(isCierreContable);
  if (cerrados.length === 0) {
    return {
      id: "integridad",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }
  const manuales = cerrados.filter((v) => v.cierreManual !== false).length;
  return {
    id: "integridad",
    score: roundScore((100 * manuales) / cerrados.length),
    delta: null,
    evidencia: {
      hechos: [`${manuales} de ${cerrados.length} vehículos cerrados a mano`],
      numerador: manuales,
      denominador: cerrados.length,
    },
  };
}

function tieneReto(v: VehiculoSemanal): boolean {
  const ejes = v.ejes;
  if (!ejes) return false;
  return Object.values(ejes).some((e) => e?.trifecta === "reto");
}

function esCumplido(v: VehiculoSemanal): boolean {
  return v.status === "cumplido" || v.status === "archivado";
}

function scoreTemple(vehiculos: VehiculoSemanal[]): ScoreVirtud {
  const cerrados = vehiculos.filter(isCierreContable);
  if (cerrados.length === 0) {
    return {
      id: "temple",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }

  type Rama = { w: number; v: number };
  const ramas: Rama[] = [];
  const templeN = cerrados.filter((v) => v.bonoTemple === true).length;
  ramas.push({ w: 0.4, v: templeN / cerrados.length });

  const cumplidos = cerrados.filter(esCumplido);
  const retoN = cumplidos.filter(tieneReto).length;
  if (cumplidos.length > 0) {
    ramas.push({ w: 0.4, v: retoN / cumplidos.length });
  }

  const oscuraN = cerrados.filter((v) => v.energiaOscura === true).length;
  ramas.push({ w: 0.2, v: 1 - oscuraN / cerrados.length });

  const wSum = ramas.reduce((a, r) => a + r.w, 0);
  const mix = ramas.reduce((a, r) => a + r.v * r.w, 0) / wSum;

  return {
    id: "temple",
    score: roundScore(100 * mix),
    delta: null,
    evidencia: {
      hechos: [
        `${templeN} lanzamientos con bono temple · ${retoN} misiones reto · ${oscuraN} energía oscura`,
      ],
      numerador: templeN,
      denominador: cerrados.length,
    },
  };
}

function diaConEvidenciaCierreOPuerta(d: DiaVista): boolean {
  if (d.vehiculos.length > 0) return true;
  const segs = segmentosDia(d);
  if (segs.some((s) => s.estado === "cerrado_manual" || puertaAbiertaOperador(s))) {
    return true;
  }
  return (d.snapshot?.segmentosCerradosManual ?? 0) > 0;
}

function scoreAgencia(dias: DiaVista[]): ScoreVirtud {
  const hayDecisionesCampo = dias.some(
    (d) => typeof d.snapshot?.decisionesDelDia === "number",
  );
  let decisiones = 0;
  if (hayDecisionesCampo) {
    decisiones = dias.reduce(
      (n, d) => n + (d.snapshot?.decisionesDelDia ?? 0),
      0,
    );
  } else {
    decisiones = dias.reduce((n, d) => n + d.vehiculos.length, 0);
  }

  const diasEv = dias.filter(diaConEvidenciaCierreOPuerta).length;
  if (decisiones <= 0 && diasEv <= 0) {
    return {
      id: "agencia",
      score: null,
      delta: null,
      evidencia: { hechos: [] },
    };
  }

  const media = decisiones / Math.max(diasEv, 1);
  const score = clamp(roundScore((100 * media) / 8), 0, 100);
  const diasTxt = Math.max(diasEv, 1);
  return {
    id: "agencia",
    score,
    delta: null,
    evidencia: {
      hechos: [
        `${decisiones} decisiones en ${diasTxt} días (${media.toFixed(1)}/día)`,
      ],
      numerador: decisiones,
      denominador: diasTxt,
    },
  };
}

function pickAlta(scores: ScoreVirtud[]): VirtudId | null {
  const medibles = scores.filter((s) => s.score != null);
  if (medibles.length === 0) return null;
  const max = Math.max(...medibles.map((s) => s.score!));
  const tied = medibles.filter((s) => s.score === max).map((s) => s.id);
  return ALTA_TIE.find((id) => tied.includes(id)) ?? tied[0] ?? null;
}

function pickBaja(scores: ScoreVirtud[]): VirtudId | null {
  const medibles = scores.filter((s) => s.score != null);
  if (medibles.length === 0) return null;
  const realMin = Math.min(...medibles.map((s) => s.score!));
  const termino = medibles.find((s) => s.id === "termino");
  if (termino?.score != null && termino.score <= realMin + 1) {
    return "termino";
  }
  const tied = medibles.filter((s) => s.score === realMin).map((s) => s.id);
  return BAJA_TIE.find((id) => tied.includes(id)) ?? tied[0] ?? null;
}

function applyDeltas(
  virtudes: ScoreVirtud[],
  previo: ReporteSemanal | null | undefined,
): ScoreVirtud[] {
  if (!previo) return virtudes;
  return virtudes.map((v) => {
    const old = previo.virtudes.find((p) => p.id === v.id);
    if (v.score == null || old?.score == null) return v;
    return { ...v, delta: v.score - old.score };
  });
}

function byId(virtudes: ScoreVirtud[], id: VirtudId): ScoreVirtud | undefined {
  return virtudes.find((v) => v.id === id);
}

function buildVeredicto(
  estado: ReporteSemanal["estado"],
  virtudes: ScoreVirtud[],
  alta: VirtudId | null,
  baja: VirtudId | null,
  previo: ReporteSemanal | null | undefined,
): ReporteSemanal["veredicto"] {
  if (estado === "INSUFICIENTE") {
    return {
      patron: "insuficiente",
      tension: TEXTO_INSUFICIENTE,
      evidencia: [],
      mandato: TEXTO_INSUFICIENTE,
    };
  }

  const score = (id: VirtudId) => byId(virtudes, id)?.score ?? null;
  const medibles = virtudes.filter((v) => v.score != null);
  const termino = score("termino");
  const disciplina = score("disciplina");
  const agencia = score("agencia");
  const integridad = score("integridad");
  const disposicion = score("disposicion");

  let patron: PatronVeredicto = "default";
  let tension = alta && baja
    ? `Esta semana tu ${VIRTUD_LABEL[alta]} estuvo por encima de tu ${VIRTUD_LABEL[baja]}.`
    : "Esta semana el espejo no encontró barras medibles.";

  if (
    termino != null &&
    termino <= 30 &&
    ((disciplina != null && disciplina >= 60) ||
      (agencia != null && agencia >= 60) ||
      (integridad != null && integridad >= 60))
  ) {
    patron = "carga";
    tension = "Ejecutaste. El ciclo no se cerró. La noche heredó lastre.";
  } else if (
    disposicion != null &&
    disposicion <= 30 &&
    ((disciplina != null && disciplina >= 50) ||
      (agencia != null && agencia >= 50))
  ) {
    patron = "sin_ley";
    tension =
      "Hubo ejecución sin anillo. La energía no fue convocada: apareció a ratos.";
  } else if (
    disciplina != null &&
    disciplina <= 30 &&
    agencia != null &&
    agencia >= 60
  ) {
    patron = "puerta_hueca";
    tension = "Actuaste sin ancla. La tarea existió; el tiempo no tuvo dueño.";
  } else if (
    alta &&
    baja &&
    (score(alta) ?? 0) >= 70 &&
    (score(baja) ?? 100) <= 40
  ) {
    patron = "desequilibrio";
    tension = `Esta semana tu ${VIRTUD_LABEL[alta]} cargó el peso; tu ${VIRTUD_LABEL[baja]} no apareció.`;
  } else if (medibles.length > 0 && medibles.every((v) => (v.score ?? 0) < 40)) {
    patron = "piso";
    tension = "Esta semana no faltó intención: faltó cierre.";
  } else if (medibles.length > 0 && medibles.every((v) => (v.score ?? 0) >= 70)) {
    patron = "techo";
    tension =
      "Esta semana el ciclo se cerró. El mandato es no bajar el estándar.";
  } else if (baja && previo) {
    const actual = score(baja);
    const old = previo.virtudes.find((p) => p.id === baja)?.score;
    if (actual != null && old != null && Math.abs(actual - old) >= 15) {
      patron = "delta";
      const verbo = actual > old ? "subió" : "bajó";
      tension = `Tu ${VIRTUD_LABEL[baja]} ${verbo} ${Math.abs(actual - old)} puntos respecto de la semana anterior.`;
    }
  }

  const hechos: string[] = [];
  const prefer = [baja, alta, "termino", "disciplina", "disposicion"] as const;
  for (const id of prefer) {
    if (!id) continue;
    const v = byId(virtudes, id);
    for (const h of v?.evidencia.hechos ?? []) {
      if (!hechos.includes(h)) hechos.push(h);
    }
    if (hechos.length >= 4) break;
  }
  for (const v of virtudes) {
    if (hechos.length >= 4) break;
    for (const h of v.evidencia.hechos) {
      if (!hechos.includes(h)) hechos.push(h);
    }
  }

  const mandatoVirtud: VirtudId = baja ?? "disposicion";

  return {
    patron,
    tension,
    evidencia: hechos.slice(0, 4),
    mandato: ACCION_MINIMA[mandatoVirtud],
  };
}

function umbralCuelloFromSesiones(
  sesiones: SesionUmbralSemanal[] | undefined,
  ventana: VentanaSemanal,
): { codigo: number; intentos: number } | null {
  if (!sesiones || sesiones.length === 0) return null;
  const inWindow = sesiones.filter((s) => {
    const t = Date.parse(s.createdAt);
    if (!Number.isFinite(t)) return false;
    return fechaEnVentana(getJournalDateString(t), ventana);
  });
  if (inWindow.length === 0) return null;

  const mapped = inWindow.map((s) => {
    const modo = (s.modo === "EXTERNO_VENTAS"
      ? "EXTERNO_VENTAS"
      : "INTERNO_HABILIDAD") as ModoUmbral;
    const sesion: SesionUmbral = {
      id: "tmp",
      userId: "tmp",
      modo,
      estado: "COMPLETADO",
      codigoActual: 1,
      intentosTotales: s.intentosTotales,
      historialCodigos: s.historialCodigos.map((h) => ({
        codigo: h.codigo,
        intentos: h.intentos,
        respuestaAprobada: "",
        feedbackGemini: "",
        psGanados: 0,
        fechaAprobacion: s.createdAt,
      })),
      intentosCodigoActual: s.intentosCodigoActual ?? 0,
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    };
    return sesion;
  });

  const m = calcularMetricasUmbral(mapped);
  if (!m.cuelloBotella) return null;
  return { codigo: m.cuelloBotella.codigo, intentos: m.cuelloBotella.intentos };
}

function emptyVirtudes(): ScoreVirtud[] {
  return VIRTUD_ORDEN_INSTALACION.map((id) => ({
    id,
    score: null,
    delta: null,
    evidencia: { hechos: [] },
  }));
}

export function calcularReporteSemanal(
  input: CalcularReporteSemanalInput,
): ReporteSemanal {
  const objetivo = input.objetivo ?? "cerrada";
  const ventana = resolveVentanaSemanal(input.nowMs, objetivo);
  const semanaCerrada = objetivo === "cerrada" || input.nowMs >= ventana.endMs;
  const dias = buildDias(ventana, input);
  const vehiculos = dias.flatMap((d) => d.vehiculos);
  const elegible = umbralElegible(dias, semanaCerrada, input.nowMs);

  let estado: ReporteSemanal["estado"];
  if (!semanaCerrada) estado = "EN_CURSO";
  else if (!elegible) estado = "INSUFICIENTE";
  else estado = "SELLADO";

  const psSemana = dias.reduce(
    (n, d) => n + (d.snapshot?.psDesglose?.total ?? 0),
    0,
  );

  if (estado === "INSUFICIENTE") {
    return {
      semanaId: ventana.semanaId,
      estado,
      ventana: {
        inicioJournal: ventana.inicioJournal,
        finJournal: ventana.finJournal,
      },
      virtudes: emptyVirtudes(),
      virtudAlta: null,
      virtudBaja: null,
      codigoFriccion: null,
      umbralCuello: umbralCuelloFromSesiones(input.sesionesUmbral, ventana),
      psSemana,
      veredicto: {
        patron: "insuficiente",
        tension: TEXTO_INSUFICIENTE,
        evidencia: [],
        mandato: TEXTO_INSUFICIENTE,
      },
      selladoAt: null,
    };
  }

  let virtudes: ScoreVirtud[] = [
    scoreDisposicion(dias),
    scoreDisciplina(dias, input.nowMs, semanaCerrada),
    scoreIntegridad(vehiculos),
    scoreTemple(vehiculos),
    scoreAgencia(dias),
    scoreTermino(dias, vehiculos),
  ];
  virtudes = VIRTUD_ORDEN_INSTALACION.map(
    (id) => virtudes.find((v) => v.id === id)!,
  );
  virtudes = applyDeltas(virtudes, input.reportePrevio);

  const virtudAlta = pickAlta(virtudes);
  const virtudBaja = pickBaja(virtudes);
  const veredicto = buildVeredicto(
    estado,
    virtudes,
    virtudAlta,
    virtudBaja,
    input.reportePrevio,
  );

  const mandatoEsTermino =
    veredicto.mandato === ACCION_MINIMA.termino || virtudBaja === "termino";
  const friccionId: VirtudId | null = mandatoEsTermino
    ? "termino"
    : virtudBaja;

  return {
    semanaId: ventana.semanaId,
    estado,
    ventana: {
      inicioJournal: ventana.inicioJournal,
      finJournal: ventana.finJournal,
    },
    virtudes,
    virtudAlta,
    virtudBaja,
    codigoFriccion: friccionId
      ? {
          codigo: CODIGO_FRICCION[friccionId],
          virtud: friccionId,
          accionMinima: ACCION_MINIMA[friccionId],
        }
      : null,
    umbralCuello: umbralCuelloFromSesiones(input.sesionesUmbral, ventana),
    psSemana,
    veredicto,
    selladoAt: estado === "SELLADO" ? input.nowMs : null,
  };
}
