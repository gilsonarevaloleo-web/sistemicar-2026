/**
 * Calendario retrospectivo de pasos dados.
 * Agrupa pasos YA EJECUTADOS por horizonte temporal (día, semana, mes, año).
 * NO es un planificador — no propone metas futuras ni fechas objetivo.
 */
import type { ProyectoPasoEjecutado } from "./proyectos";

export type CalendarHorizon = "dia" | "semana" | "mes" | "anio";

export interface PasoBucket {
  /** Etiqueta legible: "Lun 28 Jul", "Sem 4 · Jul 2026", "Jul 2026", "2026". */
  label: string;
  startMs: number;
  endMs: number;
  cumplido: number;
  avance: number;
  fallado: number;
  total: number;
  /** Hasta 3 títulos de pasos recientes para preview. */
  recientes: string[];
}

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function startOfDayMs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMs(ts: number): number {
  const d = new Date(ts);
  // Week starts Monday
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonthMs(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfYearMs(ts: number): number {
  const d = new Date(ts);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketKeyForHorizon(ts: number, horizon: CalendarHorizon): number {
  switch (horizon) {
    case "dia":    return startOfDayMs(ts);
    case "semana": return startOfWeekMs(ts);
    case "mes":    return startOfMonthMs(ts);
    case "anio":   return startOfYearMs(ts);
  }
}

function endMsForBucket(startMs: number, horizon: CalendarHorizon): number {
  const d = new Date(startMs);
  switch (horizon) {
    case "dia":    d.setDate(d.getDate() + 1); break;
    case "semana": d.setDate(d.getDate() + 7); break;
    case "mes":    d.setMonth(d.getMonth() + 1); break;
    case "anio":   d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.getTime() - 1;
}

function labelForBucket(startMs: number, horizon: CalendarHorizon): string {
  const d = new Date(startMs);
  switch (horizon) {
    case "dia": {
      const diaNombre = DIAS_ES[d.getDay()];
      return `${diaNombre} ${d.getDate()} ${MESES_ES[d.getMonth()]}`;
    }
    case "semana": {
      const end = new Date(endMsForBucket(startMs, "semana"));
      const mesInicio = MESES_ES[d.getMonth()];
      const mesFin = MESES_ES[end.getMonth()];
      if (mesInicio === mesFin) {
        return `${d.getDate()}–${end.getDate()} ${mesInicio} ${d.getFullYear()}`;
      }
      return `${d.getDate()} ${mesInicio} – ${end.getDate()} ${mesFin} ${end.getFullYear()}`;
    }
    case "mes":
      return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
    case "anio":
      return `${d.getFullYear()}`;
  }
}

/**
 * Agrupa pasos ejecutados por horizonte temporal.
 * Solo incluye pasos con timestamp (ts). Ordena del más reciente al más antiguo.
 */
export function groupPasosDados(
  pasos: ProyectoPasoEjecutado[],
  horizon: CalendarHorizon
): PasoBucket[] {
  const bucketMap = new Map<number, PasoBucket>();

  for (const paso of pasos) {
    const ts = paso.ts ?? paso.pasoEjecutadoNumero;
    if (!ts || typeof ts !== "number") continue;

    const bucketStart = bucketKeyForHorizon(ts, horizon);
    let bucket = bucketMap.get(bucketStart);
    if (!bucket) {
      bucket = {
        label: labelForBucket(bucketStart, horizon),
        startMs: bucketStart,
        endMs: endMsForBucket(bucketStart, horizon),
        cumplido: 0,
        avance: 0,
        fallado: 0,
        total: 0,
        recientes: [],
      };
      bucketMap.set(bucketStart, bucket);
    }

    bucket.total += 1;
    if (paso.status === "cumplido") bucket.cumplido += 1;
    else if (paso.status === "avance") bucket.avance += 1;
    else if (paso.status === "fallado") bucket.fallado += 1;

    if (bucket.recientes.length < 3 && paso.texto) {
      bucket.recientes.push(paso.texto);
    }
  }

  return Array.from(bucketMap.values()).sort((a, b) => b.startMs - a.startMs);
}

/**
 * Devuelve el resumen total de pasos por status.
 */
export function resumePasosDados(pasos: ProyectoPasoEjecutado[]): {
  cumplido: number;
  avance: number;
  fallado: number;
  total: number;
} {
  let cumplido = 0, avance = 0, fallado = 0;
  for (const p of pasos) {
    if (p.status === "cumplido") cumplido++;
    else if (p.status === "avance") avance++;
    else if (p.status === "fallado") fallado++;
  }
  return { cumplido, avance, fallado, total: pasos.length };
}
