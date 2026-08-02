import { useMemo } from "react";
import { Scale } from "lucide-react";
import { computeDailyDisciplinaBarModel } from "@/jornada4/dailyDisciplinaBar";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, MUTED, GOLD } = J4_COLORS;
const EMERALD = "#00C851";

type Props = {
  todayPct: number;
  yesterdayPct: number;
};

/**
 * Disciplina ayer vs hoy — espejo de Inyección de Fe (PS), tono oro/esmeralda.
 */
export function Jornada4DailyDisciplinaBar({ todayPct, yesterdayPct }: Props) {
  const model = useMemo(
    () => computeDailyDisciplinaBarModel(todayPct, yesterdayPct),
    [todayPct, yesterdayPct]
  );

  const fillGradient = model.atOrAbove100
    ? `linear-gradient(90deg, ${EMERALD}99 0%, ${EMERALD} 70%, ${GOLD} 100%)`
    : `linear-gradient(90deg, ${GOLD}66, ${GOLD})`;

  return (
    <section
      className="mx-4 mb-3 rounded-xl border p-3"
      style={{
        backgroundColor: PIZARRA,
        borderColor: "rgba(212,175,55,0.28)",
        boxShadow: "0 0 14px rgba(212,175,55,0.06)",
      }}
      data-testid="jornada4-daily-disciplina-bar"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
          style={{ color: MUTED }}
        >
          <Scale size={10} style={{ color: GOLD }} />
          Disciplina · ayer vs hoy
        </span>
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: model.atOrAbove100 ? EMERALD : GOLD }}
        >
          {model.todayPct}%
          <span className="text-[10px] font-bold ml-1.5 opacity-80">
            {model.pctOfReference}%
          </span>
        </span>
      </div>

      <p className="text-[7px] mb-1 leading-snug" style={{ color: MUTED }}>
        {model.referenceLabel}
      </p>

      <p
        className="text-[8px] font-bold mb-1.5 leading-snug"
        style={{ color: model.atOrAbove100 ? EMERALD : GOLD }}
        data-testid="jornada4-daily-disciplina-status"
      >
        {model.statusText}
      </p>

      <div
        className="relative h-3 rounded-full overflow-visible mb-1"
        style={{ backgroundColor: "rgba(212,175,55,0.12)" }}
      >
        <div
          className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
          style={{
            left: `${model.marker100WidthPct}%`,
            backgroundColor: model.atOrAbove100 ? `${EMERALD}90` : "rgba(255,255,255,0.45)",
            boxShadow: model.atOrAbove100 ? `0 0 6px ${EMERALD}80` : "none",
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full z-10 transition-[width] duration-500 ease-out"
          style={{
            width: `${model.fillWidthPct}%`,
            background: fillGradient,
            boxShadow: model.atOrAbove120
              ? `0 0 12px rgba(212,175,55,0.35)`
              : `0 0 8px rgba(212,175,55,0.18)`,
          }}
          data-testid="jornada4-daily-disciplina-fill"
        />
      </div>

      <div className="relative h-3">
        <span className="absolute left-0 top-0 text-[7px]" style={{ color: MUTED }}>
          0
        </span>
        <span
          className="absolute top-0 text-[7px] font-bold -translate-x-1/2"
          style={{
            left: `${model.marker100WidthPct}%`,
            color: model.atOrAbove100 ? EMERALD : "rgba(255,255,255,0.45)",
          }}
        >
          100%
        </span>
        <span className="absolute right-0 top-0 text-[7px]" style={{ color: MUTED }}>
          120%
        </span>
      </div>
    </section>
  );
}
