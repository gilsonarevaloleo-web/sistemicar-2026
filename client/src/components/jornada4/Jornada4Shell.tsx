import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PIZARRA = "#0b0f0c";
const INK = "#e8efe6";
const MUTED = "#7a8a7c";
const ACCENT = "#c4a35a";

type Props = {
  statusLine?: string;
  dualCount?: number;
  dailyPS?: number;
};

/** Shell Dual Kernel — sin tabs de métricas/anillo. */
export function Jornada4Shell({ statusLine, dualCount = 0, dailyPS = 0 }: Props) {
  return (
    <header
      className="sticky top-0 z-30 px-4 pt-4 pb-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(11,15,12,0.96) 0%, rgba(11,15,12,0.88) 100%)",
        borderBottom: "1px solid rgba(196,163,90,0.18)",
        backdropFilter: "blur(10px)",
      }}
      data-testid="jornada4-shell"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: ACCENT, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {JORNADA_MODULE.titleUpper}
          </p>
          <span
            className="px-2 py-0.5 text-[10px] font-bold tracking-wider"
            style={{ backgroundColor: ACCENT, color: "#1a1408" }}
            data-testid="jornada4-badge"
          >
            V4
          </span>
        </div>
        <h1
          className="mt-1 text-2xl leading-tight"
          style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Dual Kernel
        </h1>
        <p className="mt-1 text-xs" style={{ color: MUTED }}>
          Solo 2 desglosadores: Conquista y Situacional (+ puntos)
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          Sin descanso · sin verdad · sin anillo · sin voz
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
          <span>
            Activos V4 <strong style={{ color: INK }}>{dualCount}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>
            PS hoy <strong style={{ color: ACCENT }}>{dailyPS}</strong>
          </span>
        </div>
        {statusLine ? (
          <p className="mt-2 text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
            {statusLine}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export const J4_COLORS = { PIZARRA, INK, MUTED, ACCENT } as const;
