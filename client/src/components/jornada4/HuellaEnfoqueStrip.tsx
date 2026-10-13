import { computeHuellaEnfoque, HUELLA_EJES } from "@/jornada4/huellaEnfoque";
import { RING_COPY } from "@/lib/ringEnfoqueReal";
import type { Vehicle } from "@/lib/persistence";

const INK = "#f1f5f9";
const MUTED = "#64748b";
const GOLD = "#D4AF37";
const VIOLET = "#8B5CF6";

type Props = {
  vehicle: Vehicle;
  nowMs: number;
  /** Destaca el relato (cierre de bloque). */
  emphasize?: boolean;
};

/**
 * Lectura viva de la coreografía del ring: no pide tareas extra.
 */
export function HuellaEnfoqueStrip({ vehicle, nowMs, emphasize = false }: Props) {
  const lectura = computeHuellaEnfoque(vehicle, nowMs);
  return (
    <div
      className={emphasize ? "rounded-xl border px-3 py-2.5 space-y-1.5" : "space-y-1"}
      style={
        emphasize
          ? {
              backgroundColor: "rgba(212,175,55,0.07)",
              borderColor: `${GOLD}55`,
            }
          : undefined
      }
      data-testid="j4-huella-enfoque"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="text-[8px] font-black uppercase tracking-widest"
          style={{ color: emphasize ? GOLD : VIOLET }}
          title={RING_COPY.huellaHint}
        >
          Huella de enfoque
        </p>
        <p
          className="text-sm font-black tabular-nums"
          style={{ color: emphasize ? GOLD : INK, fontFamily: "ui-monospace, monospace" }}
          data-testid="j4-huella-pct"
        >
          {lectura.huella}%
        </p>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {HUELLA_EJES.map(eje => (
          <span
            key={eje.id}
            className="text-[9px] font-bold tabular-nums"
            style={{ color: MUTED }}
            title={eje.definicion}
            data-testid={`j4-huella-eje-${eje.id}`}
          >
            {eje.label}{" "}
            <span style={{ color: INK }}>{lectura[eje.id]}</span>
          </span>
        ))}
      </div>
      <p className="text-[10px] leading-snug" style={{ color: emphasize ? INK : MUTED }}>
        {lectura.relato}
      </p>
      {emphasize ? (
        <ul className="space-y-0.5 pt-1">
          {HUELLA_EJES.map(eje => (
            <li key={eje.id} className="text-[9px] leading-snug" style={{ color: MUTED }}>
              <span className="font-bold" style={{ color: INK }}>
                {eje.label}.
              </span>{" "}
              {eje.definicion}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
