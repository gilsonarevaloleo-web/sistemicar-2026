/**
 * Semana operativa: lunes 05:00 Lima → lunes 05:00 Lima (7 días-jornada).
 */

import type { ObjetivoVentana, VentanaSemanal } from "./types.ts";

export const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
}

export function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Medianoche calendario Lima (UTC-5) en epoch ms. */
export function limaMidnightMs(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return Date.UTC(y, m - 1, d, 5, 0, 0);
}

/** Lunes 05:00 Lima de la fecha calendario dada (YYYY-MM-DD). */
export function monday0500LimaMs(mondayYmd: string): number {
  const { y, m, d } = parseYmd(mondayYmd);
  return Date.UTC(y, m - 1, d, 10, 0, 0);
}

export function addCalendarDays(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0) + days * DAY_MS;
  const dt = new Date(utc);
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function getLimaDayStartMs(fromMs: number): number {
  const lima = new Date(fromMs + LIMA_OFFSET_MS);
  const msSinceMidnight =
    lima.getUTCHours() * 3_600_000 +
    lima.getUTCMinutes() * 60_000 +
    lima.getUTCSeconds() * 1000 +
    lima.getUTCMilliseconds();
  return fromMs - msSinceMidnight;
}

export function getJournalDayStartMs(fromMs: number): number {
  const calDayStart = getLimaDayStartMs(fromMs);
  const fiveAm = calDayStart + 5 * 3_600_000;
  return fromMs >= fiveAm ? fiveAm : fiveAm - DAY_MS;
}

export function getJournalDateString(fromMs: number): string {
  const lima = new Date(getJournalDayStartMs(fromMs) + LIMA_OFFSET_MS);
  return formatYmd(lima.getUTCFullYear(), lima.getUTCMonth() + 1, lima.getUTCDate());
}

/** Lunes calendario Lima de la fecha-jornada. */
export function mondayOfJournalDate(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const dow = new Date(utc).getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(ymd, diff);
}

export function isoWeekIdFromMonday(mondayYmd: string): string {
  const { y, m, d } = parseYmd(mondayYmd);
  const mondayUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const thursdayUtc = mondayUtc + 3 * DAY_MS;
  const isoYear = new Date(thursdayUtc).getUTCFullYear();
  const jan4 = Date.UTC(isoYear, 0, 4, 12, 0, 0);
  const jan4Dow = new Date(jan4).getUTCDay();
  const week1Monday = jan4 - (jan4Dow === 0 ? 6 : jan4Dow - 1) * DAY_MS;
  const week = Math.round((mondayUtc - week1Monday) / WEEK_MS) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function ventanaFromMonday(mondayYmd: string): VentanaSemanal {
  const startMs = monday0500LimaMs(mondayYmd);
  const endMs = startMs + WEEK_MS;
  const inicioJournal = mondayYmd;
  const finJournal = addCalendarDays(mondayYmd, 6);
  const fechas: string[] = [];
  for (let i = 0; i < 7; i++) fechas.push(addCalendarDays(mondayYmd, i));
  return {
    semanaId: isoWeekIdFromMonday(mondayYmd),
    startMs,
    endMs,
    inicioJournal,
    finJournal,
    fechas,
  };
}

export function resolveVentanaSemanal(
  nowMs: number,
  objetivo: ObjetivoVentana = "cerrada",
): VentanaSemanal {
  const journal = getJournalDateString(nowMs);
  const mondayActual = mondayOfJournalDate(journal);
  if (objetivo === "actual") return ventanaFromMonday(mondayActual);
  return ventanaFromMonday(addCalendarDays(mondayActual, -7));
}

export function fechaEnVentana(fecha: string, ventana: VentanaSemanal): boolean {
  return fecha >= ventana.inicioJournal && fecha <= ventana.finJournal;
}

/** HH:mm → minutos desde medianoche. */
export function hmToMin(t: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function segmentEndMin(horaInicio: string, horaFin: string): number {
  const a = hmToMin(horaInicio) ?? 0;
  const b = hmToMin(horaFin) ?? 0;
  return b <= a ? b + 1440 : b;
}

export function segmentStartMs(fecha: string, horaInicio: string): number {
  const startMin = hmToMin(horaInicio) ?? 0;
  return limaMidnightMs(fecha) + startMin * 60_000;
}

export function segmentEndMs(
  fecha: string,
  horaInicio: string,
  horaFin: string,
): number {
  return limaMidnightMs(fecha) + segmentEndMin(horaInicio, horaFin) * 60_000;
}

export function formatMinutos(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}
