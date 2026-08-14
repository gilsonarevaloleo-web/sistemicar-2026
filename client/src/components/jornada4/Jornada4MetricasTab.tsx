/**
 * Pestaña Métricas — chunk diferido (disciplina + PS + Bóveda/recharts).
 * El tick 1s de disciplina vive aquí (isla), no en el root de sesión.
 */
import { useEffect, useMemo, useState } from "react";
import { Jornada4DailyDisciplinaBar } from "@/components/jornada4/Jornada4DailyDisciplinaBar";
import { Jornada4DailyPsBar } from "@/components/jornada4/Jornada4DailyPsBar";
import { Jornada4DisciplinaCard } from "@/components/jornada4/Jornada4DisciplinaCard";
import { Jornada4Boveda } from "@/components/jornada4/Jornada4Boveda";
import { Jornada4ConcienciaTriadaCard } from "@/components/jornada4/Jornada4ConcienciaTriadaCard";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { useConcienciaTriadaOperador } from "@/hooks/useConcienciaTriadaOperador";
import { computeDisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import { getYesterdayDisciplinaPct } from "@/jornada4/yesterdayDisciplina";
import { getYesterdayDailyPointsTotal } from "@/lib/persistence";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";

export type Jornada4MetricasTabProps = {
  userId: string | undefined;
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  segmentoActivoId?: string | null;
  todayPs: number;
};

export default function Jornada4MetricasTab({
  userId,
  segmentos,
  vehicles,
  segmentoActivoId = null,
  todayPs,
}: Jornada4MetricasTabProps) {
  const [yesterdayPs, setYesterdayPs] = useState(0);
  const [yesterdayDisciplinaPct, setYesterdayDisciplinaPct] = useState(0);
  const disciplinaTick = useJornada4Tick(Boolean(userId));
  const disciplinaModel = useMemo(() => {
    void disciplinaTick;
    return computeDisciplinaPlanDia({ segmentos });
  }, [segmentos, disciplinaTick]);

  const { model: triadaModel, series: triadaSeries } = useConcienciaTriadaOperador({
    userId,
    segmentos,
    vehicles,
    segmentoActivoId,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!userId) {
      setYesterdayPs(0);
      setYesterdayDisciplinaPct(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      void getYesterdayDailyPointsTotal(userId).then(n => {
        if (!cancelled) setYesterdayPs(n);
      });
      void getYesterdayDisciplinaPct(userId).then(n => {
        if (!cancelled) setYesterdayDisciplinaPct(n);
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
      <Jornada4ConcienciaTriadaCard model={triadaModel} series={triadaSeries} />
      <Jornada4DisciplinaCard model={disciplinaModel} />
      <Jornada4DailyDisciplinaBar
        todayPct={disciplinaModel.porcentajeDia}
        yesterdayPct={yesterdayDisciplinaPct}
      />
      <Jornada4DailyPsBar todayPs={todayPs} yesterdayPs={yesterdayPs} />
      <Jornada4Boveda />
    </div>
  );
}
