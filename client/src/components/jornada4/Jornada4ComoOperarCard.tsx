import { CheckCircle2, CircleDot, Rocket } from "lucide-react";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";

const { GOLD, INK, MUTED } = J4_COLORS;

const STEPS = [
  {
    n: "1",
    title: "Toca Conquista",
    hint: "No Enfoque. Conquista mide unidades.",
  },
  {
    n: "2",
    title: "Nombra y pon unidades",
    hint: "Ej: llamadas · 8. Sin nombre no hay freno.",
  },
  {
    n: "3",
    title: "Cierra cumplido o fallado",
    hint: "Ahí aparecen los PS. Ocupado no cuenta.",
  },
] as const;

type Props = {
  hasRitmo?: boolean;
  onLaunchConquista?: () => void;
  onOpenTutorial?: () => void;
};

/**
 * Guía de 3 toques para el primer operador Base.
 * Vive en Operar, no en un FAQ.
 */
export function Jornada4ComoOperarCard({
  hasRitmo = false,
  onLaunchConquista,
  onOpenTutorial,
}: Props) {
  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-3`}
      data-testid="jornada4-como-operar"
    >
      <p className={`${J4_UI.label} flex items-center gap-1`}>
        <CircleDot size={10} style={{ color: GOLD }} />
        Cómo operar hoy
      </p>
      <p className="text-[12px] leading-snug" style={{ color: INK }}>
        Un bloque. Unidades. Cierre. Eso es Jornada Base.
      </p>
      <ol className="space-y-2">
        {STEPS.map(step => (
          <li key={step.n} className="flex items-start gap-2">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
            >
              {step.n}
            </span>
            <div>
              <p className="text-[12px] font-bold" style={{ color: INK }}>
                {step.title}
              </p>
              <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
                {step.hint}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {!hasRitmo ? (
        <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
          Enfoque (imprevistos) y Plan (segmentos) son Ritmo. Se ofrecen
          cuando ya hayas cerrado una Conquista.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {onLaunchConquista ? (
          <button
            type="button"
            onClick={onLaunchConquista}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-black uppercase tracking-wider"
            style={{ backgroundColor: GOLD, color: "#0A0A0A" }}
            data-testid="jornada4-como-operar-lanzar"
          >
            <Rocket size={12} />
            Lanzar Conquista
          </button>
        ) : null}
        {onOpenTutorial ? (
          <button
            type="button"
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px]"
            style={{ color: MUTED }}
            data-testid="jornada4-como-operar-tutorial"
          >
            <CheckCircle2 size={12} />
            Ver tutorial
          </button>
        ) : null}
      </div>
    </section>
  );
}
