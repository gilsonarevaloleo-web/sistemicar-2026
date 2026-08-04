/**
 * Pulso de cobertura — UI espejo (sin SVG 24h, sin Framer Motion).
 * Solo se muestra con planificación: sin orden no hay cobertura que medir.
 */
import { memo } from "react";
import { Rocket } from "lucide-react";
import type { PulsoCoberturaModel } from "@/lib/pulsoCoberturaCompute";
import { requestJornada4OpenLaunch } from "@/lib/pulsoCoberturaEvents";

const COLORS = {
  ink: "#f1f5f9",
  muted: "#64748b",
  gold: "#D4AF37",
  conquista: "#8B5CF6",
  entropia: "#FF2A2A",
  track: "rgba(255,255,255,0.08)",
} as const;

export type PulsoCoberturaProps = {
  model: PulsoCoberturaModel;
  /** Si false, oculta el CTA de lanzar. */
  showCta?: boolean;
  onInsistirLanzar?: () => void;
  className?: string;
};

export const PulsoCobertura = memo(function PulsoCobertura({
  model,
  showCta = true,
  onInsistirLanzar,
  className = "",
}: PulsoCoberturaProps) {
  // Sin planificación el pulso no existe: es ruido, no información.
  if (!model.hasPlanificacion) return null;

  const handleCta = () => {
    if (onInsistirLanzar) {
      onInsistirLanzar();
      return;
    }
    requestJornada4OpenLaunch();
  };

  const conquistaW = Math.max(0, Math.min(100, model.coberturaPct));
  const entropiaW = Math.max(0, 100 - conquistaW);

  const hint = model.consciousNow
    ? "Hay vehículo cubriendo conciencia ahora."
    : model.needsLaunch
      ? "Segmento activo sin vehículo — el tiempo planificado se vuelve inconsciente."
      : "Sin cobertura consciente en este instante.";

  return (
    <section
      className={`px-4 pb-3 ${className}`.trim()}
      data-testid="pulso-cobertura"
      aria-label="Pulso de cobertura consciente"
    >
      <div
        className="rounded-xl px-3 py-2.5"
        style={{
          border: `1px solid ${
            model.needsLaunch ? "rgba(255,42,42,0.35)" : "rgba(212,175,55,0.28)"
          }`,
          background:
            "linear-gradient(135deg, rgba(12,12,14,0.95) 0%, rgba(20,16,28,0.9) 100%)",
        }}
      >
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <p
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: COLORS.gold }}
          >
            Pulso · cobertura
          </p>
          {model.segmentoActivoNombre ? (
            <p
              className="text-[9px] truncate max-w-[55%]"
              style={{ color: COLORS.muted }}
              data-testid="pulso-cobertura-segmento"
            >
              {model.segmentoActivoNombre}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: COLORS.conquista }}
            >
              Consciente
            </p>
            <p
              className="text-lg font-black leading-none tabular-nums"
              style={{ color: COLORS.ink }}
              data-testid="pulso-cobertura-conquista"
            >
              {model.conquistaLabel}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: COLORS.entropia }}
            >
              Inconsciente
            </p>
            <p
              className="text-lg font-black leading-none tabular-nums"
              style={{ color: COLORS.ink }}
              data-testid="pulso-cobertura-entropia"
            >
              {model.entropiaLabel}
            </p>
          </div>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full flex"
          style={{ backgroundColor: COLORS.track }}
          role="progressbar"
          aria-valuenow={conquistaW}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Cobertura consciente ${conquistaW}%`}
          data-testid="pulso-cobertura-barra"
        >
          {conquistaW > 0 ? (
            <div
              style={{
                width: `${conquistaW}%`,
                backgroundColor: COLORS.conquista,
              }}
            />
          ) : null}
          {entropiaW > 0 && model.entropiaMin > 0 ? (
            <div
              style={{
                width: `${entropiaW}%`,
                backgroundColor: COLORS.entropia,
                opacity: 0.85,
              }}
            />
          ) : null}
        </div>

        <p
          className="mt-1.5 text-[10px] leading-snug"
          style={{ color: COLORS.muted }}
          data-testid="pulso-cobertura-hint"
        >
          {hint}
        </p>

        {showCta && model.needsLaunch ? (
          <button
            type="button"
            onClick={handleCta}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider touch-manipulation"
            style={{
              backgroundColor: "rgba(255,42,42,0.14)",
              border: "1px solid rgba(255,42,42,0.45)",
              color: "#fecaca",
            }}
            data-testid="pulso-cobertura-cta"
          >
            <Rocket size={12} aria-hidden />
            Lanza un vehículo
          </button>
        ) : null}
      </div>
    </section>
  );
});
