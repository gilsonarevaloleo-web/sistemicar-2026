/**
 * Pestaña Métricas — chunk diferido (disciplina + PS + Bóveda/recharts).
 * El tick 1s de disciplina vive aquí (isla), no en el root de sesión.
 */
import { useEffect, useMemo, useState } from "react";
import { Jornada4DailyPsBar } from "@/components/jornada4/Jornada4DailyPsBar";
import { Jornada4DisciplinaCard } from "@/components/jornada4/Jornada4DisciplinaCard";
import { Jornada4Boveda } from "@/components/jornada4/Jornada4Boveda";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { computeDisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import { getYesterdayDailyPointsTotal } from "@/lib/persistence";
import type { SegmentoV5 } from "@/lib/persistence";

export type Jornada4MetricasTabProps = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  todayPs: number;
};

export default function Jornada4MetricasTab({
  userId,
  segmentos,
  todayPs,
}: Jornada4MetricasTabProps) {
  const [yesterdayPs, setYesterdayPs] = useState(0);
  const disciplinaTick = useJornada4Tick(Boolean(userId));
  const disciplinaModel = useMemo(() => {
    void disciplinaTick;
    return computeDisciplinaPlanDia({ segmentos });
  }, [segmentos, disciplinaTick]);

  useEffect(() => {
    if (!userId) {
      setYesterdayPs(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      void getYesterdayDailyPointsTotal(userId).then(n => {
        if (!cancelled) setYesterdayPs(n);
      });
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(load, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(load, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [userId]);

  return (
    <div role="tabpanel" data-testid="jornada4-panel-metricas" className="space-y-1">
      <Jornada4DisciplinaCard model={disciplinaModel} />
      <Jornada4DailyPsBar todayPs={todayPs} yesterdayPs={yesterdayPs} />
      <Jornada4Boveda />
    </div>
  );
}
