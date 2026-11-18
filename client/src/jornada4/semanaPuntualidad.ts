/**
 * Puntualidad de puertas en los últimos 7 días-jornada (hoy incluido).
 * Los días pasados se recalculan desde la planilla guardada, cerrando el marcador
 * al final de ese día (igual que yesterdayDisciplina).
 */
import {
  computeDisciplinaPlanDia,
  puntualidadPuertaKind,
  type DisciplinaEntrada,
} from "@/jornada4/disciplinaPlanDia";
import { getPlanillaByFecha } from "@/lib/persistence";
import type { SegmentoV5 } from "@/lib/persistence";
import {
  getJournalDateString,
  getJournalDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/segmentTime";

export const SEMANA_DIAS = 7;

export type DiaPuntualidad = {
  fecha: string;
  /** false si ese día no tenía plan guardado. */
  conPlan: boolean;
  porcentajeDia: number;
  aTiempo: number;
  /** Puertas ya evaluadas (a tiempo + tarde + sin entrada). */
  evaluadas: number;
  entradas: DisciplinaEntrada[];
};

export type SemanaPuntualidad = {
  diasConPlan: number;
  disciplinaMediaPct: number | null;
  /** % de puertas evaluadas abiertas a tiempo; null sin datos. */
  puntualidadPct: number | null;
  aTiempo: number;
  evaluadas: number;
  /** Racha más larga de puertas a tiempo seguidas en la semana. */
  mejorRacha: number;
  mejorDia: DiaPuntualidad | null;
  peorDia: DiaPuntualidad | null;
  dias: DiaPuntualidad[];
};

export function buildDiaPuntualidad(
  fecha: string,
  segmentos: SegmentoV5[],
  nowMs: number,
  dayStartMs: number
): DiaPuntualidad {
  if (!segmentos.length) {
    return { fecha, conPlan: false, porcentajeDia: 0, aTiempo: 0, evaluadas: 0, entradas: [] };
  }
  const model = computeDisciplinaPlanDia({ segmentos, nowMs, dayStartMs });
  let aTiempo = 0;
  let evaluadas = 0;
  for (const e of model.entradas) {
    const kind = puntualidadPuertaKind(e);
    if (kind === "pendiente" || kind === "en_ventana") continue;
    evaluadas += 1;
    if (kind === "a_tiempo") aTiempo += 1;
  }
  return {
    fecha,
    conPlan: true,
    porcentajeDia: model.porcentajeDia,
    aTiempo,
    evaluadas,
    entradas: model.entradas,
  };
}

/** `dias` debe venir en orden cronológico (antiguo → reciente). */
export function summarizeSemanaPuntualidad(dias: DiaPuntualidad[]): SemanaPuntualidad {
  const conPlan = dias.filter(d => d.conPlan);
  const aTiempo = conPlan.reduce((a, d) => a + d.aTiempo, 0);
  const evaluadas = conPlan.reduce((a, d) => a + d.evaluadas, 0);

  let mejorRacha = 0;
  let racha = 0;
  for (const d of conPlan) {
    for (const e of d.entradas) {
      const kind = puntualidadPuertaKind(e);
      if (kind === "pendiente" || kind === "en_ventana") continue;
      racha = kind === "a_tiempo" ? racha + 1 : 0;
      if (racha > mejorRacha) mejorRacha = racha;
    }
  }

  let mejorDia: DiaPuntualidad | null = null;
  let peorDia: DiaPuntualidad | null = null;
  for (const d of conPlan) {
    if (!mejorDia || d.porcentajeDia > mejorDia.porcentajeDia) mejorDia = d;
    if (!peorDia || d.porcentajeDia < peorDia.porcentajeDia) peorDia = d;
  }

  return {
    diasConPlan: conPlan.length,
    disciplinaMediaPct: conPlan.length
      ? Math.round(conPlan.reduce((a, d) => a + d.porcentajeDia, 0) / conPlan.length)
      : null,
    puntualidadPct: evaluadas > 0 ? Math.round((aTiempo / evaluadas) * 100) : null,
    aTiempo,
    evaluadas,
    mejorRacha,
    mejorDia,
    peorDia,
    dias,
  };
}

/** Hoy se calcula en vivo con `segmentosHoy`; los 6 días previos desde la planilla guardada. */
export async function getSemanaPuntualidad(
  userId: string,
  segmentosHoy: SegmentoV5[],
  nowMs: number = Date.now()
): Promise<SemanaPuntualidad> {
  const todayStart = getJournalDayStartMs(nowMs);
  const dias: DiaPuntualidad[] = [];
  for (let back = SEMANA_DIAS - 1; back >= 0; back -= 1) {
    const startMs = todayStart - back * 86400000;
    const fecha = getJournalDateString(startMs);
    const dayStartMs = getSegmentCalendarDayStartMs(startMs);
    if (back === 0) {
      dias.push(buildDiaPuntualidad(fecha, segmentosHoy, nowMs, dayStartMs));
      continue;
    }
    const planilla = await getPlanillaByFecha(userId, fecha);
    dias.push(
      buildDiaPuntualidad(fecha, planilla?.segmentos ?? [], startMs + 86400000 - 1, dayStartMs)
    );
  }
  return summarizeSemanaPuntualidad(dias);
}
