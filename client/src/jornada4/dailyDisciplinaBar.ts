/**
 * Barra Disciplina ayer vs hoy — mismo contrato visual que PS del día.
 * Ayer = 100% de referencia; escala hasta 120%.
 */

export const DAILY_DISCIPLINA_BAR_MAX_PCT = 120;
/** Referencia si ayer fue 0% (evita división por cero). */
export const DAILY_DISCIPLINA_REFERENCE_FALLBACK = 50;

export type DailyDisciplinaBarModel = {
  todayPct: number;
  yesterdayPct: number;
  referencePct: number;
  referenceLabel: string;
  fillWidthPct: number;
  marker100WidthPct: number;
  remainingTo100: number;
  pctOfReference: number;
  target120Pct: number;
  remainingTo120: number;
  atOrAbove100: boolean;
  atOrAbove120: boolean;
  statusText: string;
  usingFallbackReference: boolean;
};

export function computeDailyDisciplinaBarModel(
  todayPct: number,
  yesterdayPct: number,
  maxScalePct = DAILY_DISCIPLINA_BAR_MAX_PCT,
  fallbackReference = DAILY_DISCIPLINA_REFERENCE_FALLBACK
): DailyDisciplinaBarModel {
  const safeToday = Math.max(0, Math.round(todayPct));
  const safeYesterday = Math.max(0, Math.round(yesterdayPct));
  const usingFallbackReference = safeYesterday <= 0;
  const referencePct = usingFallbackReference ? fallbackReference : safeYesterday;
  const target120Pct = Math.round(referencePct * (maxScalePct / 100));
  const scaleMax = Math.max(1, target120Pct);
  const fillWidthPct = Math.min(100, (safeToday / scaleMax) * 100);
  const marker100WidthPct = (100 / maxScalePct) * 100;
  const remainingTo100 = Math.max(0, referencePct - safeToday);
  const remainingTo120 = Math.max(0, target120Pct - safeToday);
  const pctOfReference =
    referencePct > 0 ? Math.round((safeToday / referencePct) * 100) : 0;
  const atOrAbove100 = safeToday >= referencePct;
  const atOrAbove120 = safeToday >= target120Pct;

  let statusText: string;
  if (!atOrAbove100) {
    statusText = `Faltan ${remainingTo100}% para tu 100%`;
  } else if (!atOrAbove120) {
    statusText = `${pctOfReference}% de ayer — faltan ${remainingTo120}% para 120%`;
  } else {
    statusText = `${pctOfReference}% — superaste el 120% de ayer`;
  }

  const referenceLabel = usingFallbackReference
    ? `Ayer 0% — referencia ${fallbackReference}% = 100%`
    : `Ayer ${safeYesterday}% = 100% · meta 120% = ${target120Pct}%`;

  return {
    todayPct: safeToday,
    yesterdayPct: safeYesterday,
    referencePct,
    referenceLabel,
    fillWidthPct,
    marker100WidthPct,
    remainingTo100,
    pctOfReference,
    target120Pct,
    remainingTo120,
    atOrAbove100,
    atOrAbove120,
    statusText,
    usingFallbackReference,
  };
}
