import { useState } from "react";
import { Info } from "lucide-react";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PIZARRA = "#0a0a0a";
const INK = "#f1f5f9";
const MUTED = "#a3a3a3";
const ACCENT = "#c4a35a";
const GOLD = "#D4AF37";

type Props = {
  statusLine?: string;
  dualCount?: number;
  dailyPS?: number;
};

/** Shell Dual Kernel — Compact App Bar (una línea) para liberar above-the-fold. */
export function Jornada4Shell({ statusLine, dualCount = 0, dailyPS = 0 }: Props) {
  const [showHint, setShowHint] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 px-3 py-2 sm:px-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.92) 100%)",
        borderBottom: "1px solid rgba(212,175,55,0.18)",
        backdropFilter: "blur(10px)",
      }}
      data-testid="jornada4-shell"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-h-[36px]">
          <span
            className="px-1.5 py-0.5 text-[8px] font-black tracking-wider rounded shrink-0"
            style={{ backgroundColor: GOLD, color: "#0a0a0a" }}
            data-testid="jornada4-badge"
          >
            V4
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1
                className="text-[13px] sm:text-sm font-black leading-none truncate"
                style={{ color: INK }}
              >
                La Flota Dual Kernel
              </h1>
              <button
                type="button"
                aria-label="Qué es Dual Kernel"
                aria-expanded={showHint}
                onClick={() => setShowHint(v => !v)}
                className="p-0.5 rounded touch-manipulation shrink-0"
                style={{ color: MUTED }}
                data-testid="jornada4-shell-hint"
              >
                <Info size={12} />
              </button>
            </div>
            <p
              className="text-[8px] font-black uppercase tracking-[0.18em] truncate mt-0.5"
              style={{ color: GOLD }}
            >
              {JORNADA_MODULE.titleUpper}
            </p>
          </div>
          <div
            className="flex items-center gap-2 text-[10px] shrink-0 tabular-nums"
            style={{ color: MUTED }}
          >
            <span>
              <strong style={{ color: INK }}>{dualCount}</strong>
              <span className="ml-0.5 opacity-70">act</span>
            </span>
            <span aria-hidden style={{ opacity: 0.35 }}>
              ·
            </span>
            <span>
              <strong style={{ color: GOLD }}>{dailyPS}</strong>
              <span className="ml-0.5 opacity-70">PS</span>
            </span>
          </div>
        </div>

        {showHint ? (
          <p
            className="mt-1.5 text-[10px] leading-snug"
            style={{ color: MUTED }}
            data-testid="jornada4-shell-hint-body"
          >
            Conquista y Enfoque operables — sin descanso, verdad, anillo ni voz.
            {statusLine ? (
              <>
                {" "}
                <span style={{ color: "rgba(241,245,249,0.55)" }}>{statusLine}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export const J4_COLORS = { PIZARRA, INK, MUTED, ACCENT, GOLD } as const;
