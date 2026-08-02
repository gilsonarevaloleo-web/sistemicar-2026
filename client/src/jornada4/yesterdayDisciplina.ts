/**
 * Disciplina del día-jornada anterior (recompute desde planilla guardada).
 * Sin schema nuevo: lee planilla de ayer y cierra el marcador al final de ese día.
 */
import { computeDisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import { getPlanillaByFecha } from "@/lib/persistence";
import {
  getJournalDateString,
  getJournalDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/segmentTime";

/** % disciplina final del día-jornada anterior; 0 si no hay planilla. */
export async function getYesterdayDisciplinaPct(userId: string): Promise<number> {
  const todayJournalStartMs = getJournalDayStartMs();
  const yesterdayJournalStartMs = todayJournalStartMs - 86400000;
  const fecha = getJournalDateString(yesterdayJournalStartMs);
  const planilla = await getPlanillaByFecha(userId, fecha);
  if (!planilla?.segmentos?.length) return 0;

  const model = computeDisciplinaPlanDia({
    segmentos: planilla.segmentos,
    dayStartMs: getSegmentCalendarDayStartMs(yesterdayJournalStartMs),
    nowMs: todayJournalStartMs - 1,
  });
  return model.porcentajeDia;
}
