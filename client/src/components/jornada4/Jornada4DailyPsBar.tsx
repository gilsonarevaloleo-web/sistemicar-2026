import { useMemo } from "react";
import { Zap } from "lucide-react";
import { computeDailyPsBarModel } from "@/lib/dailyPsBar";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, MUTED, GOLD } = J4_COLORS;
const CYAN = "#00FFC3";

type Props = {
  todayPs: number;
  yesterdayPs: number;
};

/**
 * Inyección de Fe — barra PS del día (mismo modelo que Jornada clásica).
 * Solo lectura local + compute puro: sin riesgo de freeze.
 */
export function Jornada4DailyPsBar({ todayPs, yesterdayPs }: Props) {
  const model = useMemo(
    () => computeDailyPsBarModel(todayPs, yesterdayPs),
    [todayPs, yesterdayPs]
  );

  const fillGradient = model.atOrAbove100
    ? `linear-gradient(90deg, ${CYAN}99 0%, ${CYAN} 70%, ${GOLD} 100%)`
    : `linear-gradient(90deg, ${CYAN}55, ${CYAN})`;

  return (
    <section
      className="mx-4 mb-3 rounded-xl border p-3"
      style={{
        backgroundColor: PIZARRA,
        borderColor: `${CYAN}28`,
        boxShadow: `0 0 14px rgba(0,255,195,0.08)`,
      }}
      data-testid="jornada4-daily-ps-bar"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
          style={{ color: MUTED }}
        >
          <Zap size={10} style={{ color: CYAN }} />
          Inyección de Fe · PS del día
        </span>
        <span className="text-sm font-black tabular-nums" style={{ color: CYAN }}>
          {model.todayPs} PS
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
        style={{ color: model.atOrAbove100 ? GOLD : CYAN }}
        data-testid="jornada4-daily-ps-status"
      >
        {model.statusText}
      </p>

      <div
        className="relative h-3 rounded-full overflow-visible mb-1"
        style={{ backgroundColor: "rgba(0,255,195,0.12)" }}
      >
        <div
          className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
          style={{
            left: `${model.marker100WidthPct}%`,
            backgroundColor: model.atOrAbove100 ? `${GOLD}90` : "rgba(255,255,255,0.45)",
            boxShadow: model.atOrAbove100 ? `0 0 6px ${GOLD}80` : "none",
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full z-10 transition-[width] duration-500 ease-out"
          style={{
            width: `${model.fillWidthPct}%`,
            background: fillGradient,
            boxShadow: model.atOrAbove120
              ? `0 0 12px rgba(212,175,55,0.35)`
              : `0 0 8px rgba(0,255,195,0.2)`,
          }}
          data-testid="jornada4-daily-ps-fill"
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
            color: model.atOrAbove100 ? GOLD : "rgba(255,255,255,0.45)",
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
