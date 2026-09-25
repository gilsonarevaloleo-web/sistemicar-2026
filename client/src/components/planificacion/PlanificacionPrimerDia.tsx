import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ListChecks, MessageCircle, GraduationCap } from "lucide-react";
import {
  buildPrimerDiaSummaryForDoctor,
  computePrimerDiaAutoComplete,
  getPrimerDiaItems,
  loadChecklistState,
  saveChecklistState,
  type PlanificacionPlanProfile,
  type PrimerDiaCheckKey,
} from "@/lib/planificacionOnboarding";
import type { Vehicle } from "@/lib/persistence";

const GOLD = "#D4AF37";
const BLOOD = "#FF3131";

type Props = {
  uid: string;
  profile: PlanificacionPlanProfile;
  dayStartMs: number;
  segmentos: Array<{ estado?: string }>;
  vehicles: Vehicle[];
  onOpenTutorial: () => void;
  onAskDoctor?: (prompt: string) => void;
};

export function PlanificacionPrimerDia({
  uid,
  profile,
  dayStartMs,
  segmentos,
  vehicles,
  onOpenTutorial,
  onAskDoctor,
}: Props) {
  const items = useMemo(() => getPrimerDiaItems(profile), [profile]);
  const auto = useMemo(
    () => computePrimerDiaAutoComplete({ dayStartMs, segmentos, vehicles }),
    [dayStartMs, segmentos, vehicles]
  );

  const [manual, setManual] = useState<Record<string, boolean>>(() => loadChecklistState(uid));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setManual(loadChecklistState(uid));
  }, [uid]);

  const toggle = (key: PrimerDiaCheckKey) => {
    const next = { ...manual, [key]: !manual[key] };
    setManual(next);
    saveChecklistState(uid, next);
  };

  const doneCount = items.filter(it => manual[it.key] || auto[it.key]).length;
  const allDone = doneCount >= items.length;

  if (allDone && collapsed) {
    return null;
  }

  const summary = buildPrimerDiaSummaryForDoctor(items, manual, auto);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: `${GOLD}35`, backgroundColor: `${GOLD}06` }}
      data-testid="panel-primer-dia-planificacion"
    >
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ListChecks size={16} style={{ color: GOLD }} />
          <div>
            <p className="text-xs font-black text-white uppercase tracking-wide">Tu primer día</p>
            <p className="text-[10px] text-slate-500">
              {doneCount}/{items.length} pasos · checklist de arranque
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold" style={{ color: GOLD }}>
          {collapsed ? "Ver" : "Ocultar"}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5">
          {items.map(it => {
            const done = Boolean(manual[it.key] || auto[it.key]);
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => toggle(it.key)}
                className="w-full flex items-start gap-2 text-left rounded-lg px-2 py-2 hover:bg-white/5 transition-colors"
                data-testid={`checklist-primer-dia-${it.key}`}
              >
                {done ? (
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <Circle size={16} className="flex-shrink-0 mt-0.5 text-slate-600" />
                )}
                <div>
                  <p className={`text-[11px] font-bold ${done ? "text-slate-500 line-through" : "text-white"}`}>
                    {it.label}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{it.hint}</p>
                  {auto[it.key] && !manual[it.key] && (
                    <p className="text-[9px] text-emerald-500/80 mt-0.5">Detectado en tu actividad de hoy</p>
                  )}
                </div>
              </button>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-slate-300"
              data-testid="btn-reopen-tutorial"
            >
              <GraduationCap size={12} />
              Ver tutorial
            </button>
            {onAskDoctor ? (
              <button
                type="button"
                onClick={() =>
                  onAskDoctor(
                    `Estoy en mi primer día de Planificación. Mi checklist:\n${summary}\n¿Qué hago ahora?`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: BLOOD }}
                data-testid="btn-primer-dia-ask-doctor"
              >
                <MessageCircle size={12} />
                Preguntar al Doctor
              </button>
            ) : null}
          </div>

          {allDone && (
            <p className="text-[10px] text-emerald-400/90 pt-1 text-center">
              Primer día completado. Sigue cerrando segmentos y vehículos cada jornada.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
