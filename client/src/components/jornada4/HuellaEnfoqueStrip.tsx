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
 * En vivo: solo el relato. Los cinco números son el gancho de cierre.
 */
export function HuellaEnfoqueStrip({ vehicle, nowMs, emphasize = false }: Props) {
  const lectura = computeHuellaEnfoque(vehicle, nowMs);
  return (
    <div
      className={emphasize ? "rounded-xl border px-3 py-2.5 space-y-1.5" : "space-y-0.5"}
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
        className="text-[11px] leading-snug"
        style={{ color: emphasize ? INK : MUTED }}
        data-testid="j4-huella-relato"
      >
        {lectura.relato}
      </p>
      {emphasize ? (
        <>
          <p
            className="text-sm font-black tabular-nums"
            style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
            data-testid="j4-huella-pct"
          >
            {lectura.huella}%
          </p>
          <p className="text-[9px] font-bold tabular-nums" style={{ color: MUTED }}>
            {HUELLA_EJES.map(e => `${e.label} ${lectura[e.id]}`).join(" · ")}
          </p>
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
        </>
      ) : null}
    </div>
  );
}
