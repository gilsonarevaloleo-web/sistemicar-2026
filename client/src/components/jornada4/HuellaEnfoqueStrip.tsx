import { computeHuellaEnfoque } from "@/jornada4/huellaEnfoque";
import { RING_COPY } from "@/lib/ringEnfoqueReal";
import type { Vehicle } from "@/lib/persistence";
import { HuellaCincoPuntos } from "./HuellaCincoPuntos";

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
 * En vivo: solo el relato. Al cierre: los cinco puntos, cada uno con su escala.
 */
export function HuellaEnfoqueStrip({ vehicle, nowMs, emphasize = false }: Props) {
  const lectura = computeHuellaEnfoque(vehicle, nowMs);
  return (
    <div
      className={emphasize ? "rounded-xl border px-3 py-3 space-y-2.5" : "space-y-0.5"}
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
      <p
        className="text-[8px] font-black uppercase tracking-widest"
        style={{ color: emphasize ? GOLD : VIOLET }}
        title={RING_COPY.huellaHint}
      >
        {emphasize ? "Huella del desglosador" : "Huella"}
      </p>
      <p
        className="text-[12px] leading-snug font-semibold"
        style={{ color: emphasize ? INK : MUTED }}
        data-testid="j4-huella-relato"
      >
        {lectura.relato}
      </p>
      {emphasize ? (
        <>
          <p
            className="text-2xl font-black tabular-nums tracking-tight"
            style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
            data-testid="j4-huella-pct"
          >
            {lectura.huella}
            <span className="text-[11px] font-bold ml-0.5 opacity-70">%</span>
          </p>
          <HuellaCincoPuntos lectura={lectura} />
          <p className="text-[9px] leading-snug" style={{ color: MUTED }}>
            Atención y Foco se marcan en el radio de 5 minutos. El resto se escala.
          </p>
        </>
      ) : null}
    </div>
  );
}
