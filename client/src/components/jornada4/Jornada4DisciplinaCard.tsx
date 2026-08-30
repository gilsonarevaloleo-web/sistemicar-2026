import { Target } from "lucide-react";
import type { DisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import {
  formatDisciplinaPlanHeadline,
  formatDisciplinaPlanSub,
} from "@/jornada4/disciplinaPlanDia";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
const EMERALD = "#00C851";
const BLOOD = "#FF2A2A";

type Props = {
  model: DisciplinaPlanDia;
  /** Premios de cierre consciente en la última franja (puntos de %). */
  bonoCierrePct?: number;
  cierresConscientes?: number;
};

/**
 * Disciplina del día = planificación (N segmentos → 100/N c/u ± tardanza).
 */
export function Jornada4DisciplinaCard({
  model,
  bonoCierrePct = 0,
  cierresConscientes = 0,
}: Props) {
  const headline = formatDisciplinaPlanHeadline(model);
  const sub = formatDisciplinaPlanSub(model);
  const fill = Math.min(100, Math.max(0, model.porcentajeDia));
  const bono = Math.max(0, bonoCierrePct);

  return (
    <section
      className="mx-4 mb-3 rounded-xl border p-3 space-y-2.5"
      style={{
        backgroundColor: PIZARRA,
        borderColor: "rgba(212,175,55,0.28)",
        boxShadow: "0 0 14px rgba(212,175,55,0.06)",
      }}
      data-testid="jornada4-disciplina"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: MUTED }}
          >
            <Target size={10} style={{ color: GOLD }} />
            Disciplina · plan del día
          </p>
          <p
            className="text-2xl font-black tabular-nums mt-0.5"
            style={{ color: fill >= 70 ? EMERALD : fill > 0 ? GOLD : INK }}
            data-testid="jornada4-disciplina-pct"
          >
            {headline}
          </p>
          <p className="text-[9px] mt-0.5 leading-snug" style={{ color: MUTED }}>
            {sub}
          </p>
        </div>
        {model.segmentosTotales > 0 ? (
          <div
            className="shrink-0 text-right px-2 py-1.5 rounded-lg border"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <p className="text-[8px] uppercase" style={{ color: MUTED }}>
              Peso
            </p>
            <p className="text-sm font-black tabular-nums" style={{ color: GOLD }}>
              {model.pesoPorEntrada}%
            </p>
            <p className="text-[7px]" style={{ color: MUTED }}>
              × {model.segmentosTotales}
            </p>
          </div>
        ) : null}
      </div>

      {model.segmentosTotales > 0 ? (
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${fill}%`,
              background:
                fill >= 70
                  ? `linear-gradient(90deg, ${EMERALD}88, ${EMERALD})`
                  : `linear-gradient(90deg, ${GOLD}66, ${GOLD})`,
            }}
            data-testid="jornada4-disciplina-bar"
          />
        </div>
      ) : null}

      {model.entradas.length > 0 ? (
        <div className="space-y-1" data-testid="jornada4-disciplina-rows">
          {model.entradas.map((e, idx) => {
            const muted =
              e.estado === "pendiente" || e.estado === "en_ventana";
            const bad = e.estado === "contabilizada" && e.contribucionPct <= 0;
            const color = muted ? MUTED : bad ? BLOOD : EMERALD;
            return (
              <div
                key={e.segmentoId}
                className="flex items-center gap-2 text-[9px]"
                data-testid={`jornada4-disciplina-row-${e.segmentoId}`}
              >
                <span
                  className="w-4 text-center font-black tabular-nums shrink-0"
                  style={{ color: MUTED }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 truncate font-semibold" style={{ color: INK }}>
                  {e.nombre}
                </span>
                <span className="font-mono tabular-nums shrink-0" style={{ color: MUTED }}>
                  {e.horaInicio}
                </span>
                <span
                  className="w-[4.5rem] text-right font-black tabular-nums shrink-0"
                  style={{ color }}
                >
                  {e.estado === "pendiente"
                    ? `· ${e.pesoPct}%`
                    : e.estado === "en_ventana"
                      ? "abrir"
                      : e.tieneEntrada
                        ? `+${e.contribucionPct}% · ${e.puntualidadPct}`
                        : `0 · perdida`}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {bono > 0 ? (
        <p
          className="text-[8px] leading-snug"
          style={{ color: GOLD }}
          data-testid="jornada4-disciplina-caracter"
        >
          +{bono}% carácter · {cierresConscientes} cierre
          {cierresConscientes === 1 ? "" : "s"} consciente
          {cierresConscientes === 1 ? "" : "s"} al término del plan.
        </p>
      ) : null}

      <p className="text-[7px] leading-snug" style={{ color: MUTED }}>
        100% ÷ {model.segmentosTotales || "N"} entradas. Cada minuto de tardanza resta del
        100 de esa puerta. Los cortes sin vehículo son huecos de cobertura, no de este marcador.
        Cerrar a mano en la última hora suma disciplina; el cierre del sistema no.
      </p>
    </section>
  );
}
