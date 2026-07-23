import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PIZARRA = "#0a0a0a";
const INK = "#f1f5f9";
const MUTED = "#64748b";
const ACCENT = "#c4a35a";
const GOLD = "#D4AF37";

type Props = {
  statusLine?: string;
  dualCount?: number;
  dailyPS?: number;
};

/** Shell Dual Kernel — lectura de Jornada clásica, sin tabs de anillo. */
export function Jornada4Shell({ statusLine, dualCount = 0, dailyPS = 0 }: Props) {
  return (
    <header
      className="sticky top-0 z-30 px-4 pt-4 pb-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.92) 100%)",
        borderBottom: "1px solid rgba(212,175,55,0.22)",
        backdropFilter: "blur(10px)",
      }}
      data-testid="jornada4-shell"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <p
            className="text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            {JORNADA_MODULE.titleUpper}
          </p>
          <span
            className="px-2 py-0.5 text-[9px] font-black tracking-wider rounded"
            style={{ backgroundColor: GOLD, color: "#0a0a0a" }}
            data-testid="jornada4-badge"
          >
            V4
          </span>
        </div>
        <h1 className="mt-1 text-xl font-black leading-tight" style={{ color: INK }}>
          La Flota · Dual Kernel
        </h1>
        <p className="mt-1 text-[11px] leading-snug" style={{ color: MUTED }}>
          Conquista y Enfoque operables — sin descanso, verdad, anillo ni voz
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
          <span>
            Activos <strong style={{ color: INK }}>{dualCount}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>
            PS hoy <strong style={{ color: GOLD }}>{dailyPS}</strong>
          </span>
        </div>
        {statusLine ? (
          <p className="mt-2 text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
            {statusLine}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export const J4_COLORS = { PIZARRA, INK, MUTED, ACCENT, GOLD } as const;
