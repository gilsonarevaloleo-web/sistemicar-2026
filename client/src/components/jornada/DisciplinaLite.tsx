/**
 * Disciplina lite — UI espejo (índice + cobertura/puntualidad + hint de entrada).
 * Sin Framer Motion; CTA reutiliza el evento del Pulso al launcher.
 */
import { memo } from "react";
import { Rocket } from "lucide-react";
import type { DisciplinaLiteModel } from "@/lib/disciplinaLiteCompute";
import { requestJornada4OpenLaunch } from "@/lib/pulsoCoberturaEvents";

const COLORS = {
  ink: "#f1f5f9",
  muted: "#64748b",
  gold: "#D4AF37",
  cyan: "#00FFC3",
  warn: "#f97316",
  track: "rgba(255,255,255,0.08)",
} as const;

export type DisciplinaLiteProps = {
  model: DisciplinaLiteModel;
  showCta?: boolean;
  onInsistirLanzar?: () => void;
  className?: string;
};

export const DisciplinaLite = memo(function DisciplinaLite({
  model,
  showCta = true,
  onInsistirLanzar,
  className = "",
}: DisciplinaLiteProps) {
  const handleCta = () => {
    if (onInsistirLanzar) {
      onInsistirLanzar();
      return;
    }
    requestJornada4OpenLaunch();
  };

  const barPct = Math.max(0, Math.min(100, model.indice));
  const border =
    model.needsEntrada ? "rgba(249,115,22,0.4)" : "rgba(0,255,195,0.22)";

  return (
    <section
      className={`px-4 pb-3 ${className}`.trim()}
      data-testid="disciplina-lite"
      aria-label="Disciplina de entrada al trabajo"
    >
      <div
        className="rounded-xl px-3 py-2.5"
        style={{
          border: `1px solid ${border}`,
          background:
            "linear-gradient(135deg, rgba(10,14,16,0.96) 0%, rgba(12,22,24,0.9) 100%)",
        }}
      >
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <p
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: COLORS.cyan }}
          >
            Disciplina · entrada
          </p>
          {model.segmentoActivoNombre ? (
            <p
              className="text-[9px] truncate max-w-[55%]"
              style={{ color: COLORS.muted }}
              data-testid="disciplina-lite-segmento"
            >
              {model.segmentoActivoNombre}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: COLORS.muted }}
            >
              Índice
            </p>
            <p
              className="text-lg font-black leading-none tabular-nums"
              style={{ color: COLORS.ink }}
              data-testid="disciplina-lite-indice"
            >
              {model.sinSegmentos ? "—" : model.valorPrincipal}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p
              className="text-[10px] tabular-nums"
              style={{ color: COLORS.ink }}
              data-testid="disciplina-lite-cobertura"
            >
              Cobertura{" "}
              <strong style={{ color: COLORS.cyan }}>
                {model.coberturaPct != null ? `${model.coberturaPct}%` : "—"}
              </strong>
            </p>
            <p
              className="text-[10px] tabular-nums"
              style={{ color: COLORS.ink }}
              data-testid="disciplina-lite-puntualidad"
            >
              Puntualidad{" "}
              <strong style={{ color: COLORS.gold }}>
                {model.puntualidadPct != null ? `${model.puntualidadPct}` : "—"}
              </strong>
              {model.deltaMedioMin != null ? (
                <span style={{ color: COLORS.muted }}> · +{model.deltaMedioMin} min</span>
              ) : null}
            </p>
          </div>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: COLORS.track }}
          role="progressbar"
          aria-valuenow={barPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Índice disciplina ${barPct}`}
          data-testid="disciplina-lite-barra"
        >
          {barPct > 0 ? (
            <div
              style={{
                width: `${barPct}%`,
                height: "100%",
                backgroundColor: COLORS.cyan,
              }}
            />
          ) : null}
        </div>

        <p
          className="mt-1.5 text-[10px] leading-snug"
          style={{ color: COLORS.muted }}
          data-testid="disciplina-lite-hint"
        >
          {model.sinSegmentos
            ? model.subheadline
            : model.segmentoHint ?? model.subheadline}
        </p>

        {showCta && model.needsEntrada ? (
          <button
            type="button"
            onClick={handleCta}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider touch-manipulation"
            style={{
              backgroundColor: "rgba(249,115,22,0.14)",
              border: "1px solid rgba(249,115,22,0.45)",
              color: "#fdba74",
            }}
            data-testid="disciplina-lite-cta"
          >
            <Rocket size={12} aria-hidden />
            Entra al trabajo — lanza
          </button>
        ) : null}
      </div>
    </section>
  );
});
