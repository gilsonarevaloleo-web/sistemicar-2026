/**
 * Motor de agrupación de la Bóveda de récords.
 * Agrupa por medida (unidad tras " → "), no por el prefijo de misión.
 */
import type { VehicleHistoryEntry } from "@/lib/persistence";
import {
  measureKeyFromHistoryTitulo,
  measureTituloFromHistoryTitulo,
} from "@/lib/vehicleHistoryMeasure";

export type BovedaVoltaje = "Máximo" | "Alto" | "Medio" | "Bajo";

export type BovedaRecordView = {
  titulo: string;
  bestMinPerUnit: number;
  bestTotalMin: number;
  bestDate: number;
  count: number;
  improvementPct: number;
  voltaje: BovedaVoltaje;
  firstMinPerUnit: number;
};

export function computeImprovementPct(firstMinPerUnit: number, bestMinPerUnit: number): number {
  if (!Number.isFinite(firstMinPerUnit) || firstMinPerUnit <= 0) return 0;
  if (!Number.isFinite(bestMinPerUnit) || bestMinPerUnit <= 0) return 0;
  return Math.round(((firstMinPerUnit - bestMinPerUnit) / firstMinPerUnit) * 1000) / 10;
}

export function voltajeFromImprovement(improvement: number): BovedaVoltaje {
  if (improvement >= 30) return "Máximo";
  if (improvement >= 15) return "Alto";
  if (improvement >= 5) return "Medio";
  return "Bajo";
}

const VOLTAJE_RANK: Record<BovedaVoltaje, number> = {
  Bajo: 0,
  Medio: 1,
  Alto: 2,
  Máximo: 3,
};

export function computeBovedaRecordsFromHistory(
  history: VehicleHistoryEntry[]
): BovedaRecordView[] {
  if (!history.length) return [];

  const grouped = new Map<string, VehicleHistoryEntry[]>();
  for (const h of history) {
    if (!h?.titulo || !Number.isFinite(h.minPerUnit) || h.minPerUnit <= 0) continue;
    // Agrupa por medida (unidad tras " → "), no por el prefijo de misión.
    const key = measureKeyFromHistoryTitulo(h.titulo);
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push(h);
    grouped.set(key, list);
  }

  const records: BovedaRecordView[] = [];

  for (const entries of Array.from(grouped.values())) {
    if (!entries.length) continue;
    const sortedByPerf = [...entries].sort((a, b) => a.minPerUnit - b.minPerUnit);
    const best = sortedByPerf[0]!;
    const chronological = [...entries].sort((a, b) => a.fecha - b.fecha);
    const first = chronological[0]!;
    const improvement =
      chronological.length >= 2
        ? computeImprovementPct(first.minPerUnit, best.minPerUnit)
        : 0;

    records.push({
      titulo: measureTituloFromHistoryTitulo(entries[0]!.titulo),
      bestMinPerUnit: best.minPerUnit,
      bestTotalMin: best.totalMin,
      bestDate: best.fecha,
      count: entries.length,
      improvementPct: improvement,
      voltaje: voltajeFromImprovement(improvement),
      firstMinPerUnit: first.minPerUnit,
    });
  }

  return records.sort((a, b) => b.bestDate - a.bestDate);
}

/** Voltaje agregado de la jornada: el tier más alto entre todos los récords. */
export function computeJornadaVoltaje(records: BovedaRecordView[]): BovedaVoltaje {
  if (!records.length) return "Bajo";
  let best: BovedaVoltaje = "Bajo";
  for (const r of records) {
    if (VOLTAJE_RANK[r.voltaje] > VOLTAJE_RANK[best]) best = r.voltaje;
  }
  return best;
}
