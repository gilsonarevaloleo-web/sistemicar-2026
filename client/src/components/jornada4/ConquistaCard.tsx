import { useMemo } from "react";
import type { Vehicle } from "@/lib/persistence";
import { computeDesglosadorClocks } from "@/lib/desglosadorClock";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  conquistaActiveSub,
  conquistaProgressLabel,
} from "@/jornada4/conquistaKernel";
import { formatHms } from "@/jornada4/format";
import { J4_COLORS } from "./Jornada4Shell";

const { INK, MUTED, ACCENT } = J4_COLORS;
const OK = "#3d9a6a";
const BAD = "#c45c4a";

type Props = {
  vehicle: Vehicle;
  onCumplido: () => void;
  onFallado: () => void;
  onCerrarCiclo: () => void;
};

export function ConquistaCard({ vehicle, onCumplido, onFallado, onCerrarCiclo }: Props) {
  const active = conquistaActiveSub(vehicle);
  const tick = useJornada4Tick(Boolean(active?.aperturaAt));
  const clocks = useMemo(
    () => computeDesglosadorClocks(Date.now(), vehicle),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wall-clock via tick
    [tick, active?.id, active?.aperturaAt, vehicle.id]
  );

  const cycleReady = (vehicle.subVehiculos ?? []).every(
    s => s.status === "cumplido" || s.status === "fallado"
  );

  return (
    <article
      className="rounded-none px-4 py-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(196,163,90,0.10) 0%, rgba(20,28,22,0.95) 42%, rgba(11,15,12,1) 100%)",
        borderTop: "1px solid rgba(196,163,90,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid={`jornada4-conquista-${vehicle.id}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
            Conquista
          </p>
          <h2
            className="text-lg leading-snug"
            style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {vehicle.titulo}
          </h2>
        </div>
        <span className="text-xs tabular-nums" style={{ color: MUTED }}>
          {conquistaProgressLabel(vehicle)}
        </span>
      </div>

      {active ? (
        <div className="mt-4">
          <p className="text-sm" style={{ color: INK }}>
            {active.titulo || "Unidad activa"}
          </p>
          <p
            className="mt-2 text-3xl tabular-nums tracking-tight"
            style={{ color: ACCENT, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {formatHms(clocks.subElapsedSec)}
          </p>
          {clocks.subRemainingSec != null ? (
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
              Quedan {formatHms(clocks.subRemainingSec)}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: OK, color: "#04140c" }}
              onClick={onCumplido}
              data-testid="j4-conquista-cumplido"
            >
              Cumplido
            </button>
            <button
              type="button"
              className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: "transparent",
                color: BAD,
                border: `1px solid ${BAD}`,
              }}
              onClick={onFallado}
              data-testid="j4-conquista-fallado"
            >
              Fallado
            </button>
          </div>
        </div>
      ) : cycleReady ? (
        <div className="mt-4">
          <p className="text-sm" style={{ color: MUTED }}>
            Todas las unidades cerradas.
          </p>
          <button
            type="button"
            className="mt-3 w-full py-3 text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: ACCENT, color: "#1a1408" }}
            onClick={onCerrarCiclo}
            data-testid="j4-conquista-cerrar-ciclo"
          >
            Cerrar ciclo
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm" style={{ color: MUTED }}>
          Sin unidad activa.
        </p>
      )}
    </article>
  );
}
