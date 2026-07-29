import { J4_COLORS } from "./Jornada4Shell";

const { MUTED, GOLD } = J4_COLORS;

type Props = {
  step: string;
  title: string;
  hint?: string;
  testId?: string;
};

/** Etiqueta de zona — orden visual de la sesión Dual Kernel. */
export function Jornada4SectionLabel({ step, title, hint, testId }: Props) {
  return (
    <div className="px-4 pt-3 pb-1.5" data-testid={testId}>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[9px] font-black tabular-nums"
          style={{ color: GOLD }}
        >
          {step}
        </span>
        <p
          className="text-[10px] font-black uppercase tracking-[0.16em]"
          style={{ color: MUTED }}
        >
          {title}
        </p>
      </div>
      {hint ? (
        <p className="mt-0.5 text-[9px] leading-snug" style={{ color: MUTED }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
