import { useMemo } from "react";
import type { Vehicle } from "@/lib/persistence";
import { computeSituacionTimerUi } from "@/lib/situacionTimerUi";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  situacionPendingCronRows,
  situacionProgressLabel,
} from "@/jornada4/situacionKernel";
import { J4_COLORS } from "./Jornada4Shell";

const { INK, MUTED, ACCENT } = J4_COLORS;
const OK = "#3d9a6a";
const BAD = "#c45c4a";
const CYAN = "#5aa7a0";

type Props = {
  vehicle: Vehicle;
  onCumplido: (subTareaId: string) => void;
  onFallado: (subTareaId: string) => void;
  onCerrarBloque: () => void;
};

export function SituacionCard({
  vehicle,
  onCumplido,
  onFallado,
  onCerrarBloque,
}: Props) {
  const pending = situacionPendingCronRows(vehicle);
  const focusId = vehicle.situacionCupoAnchor?.subTareaId;
  const focus =
    pending.find(st => st.id === focusId) ?? pending[0] ?? null;

  const tick = useJornada4Tick(true);
  const timer = useMemo(
    () => computeSituacionTimerUi(vehicle, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, vehicle]
  );

  const bloqueListo = pending.length === 0;

  return (
    <article
      className="rounded-none px-4 py-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(90,167,160,0.12) 0%, rgba(14,22,24,0.96) 45%, rgba(11,15,12,1) 100%)",
        borderTop: "1px solid rgba(90,167,160,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid={`jornada4-situacion-${vehicle.id}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: CYAN }}>
            Situacional
          </p>
          <h2
            className="text-lg leading-snug"
            style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {vehicle.titulo}
          </h2>
        </div>
        <span className="text-xs tabular-nums" style={{ color: MUTED }}>
          {situacionProgressLabel(vehicle)}
        </span>
      </div>

      {timer.visible ? (
        <div className="mt-4">
          <p
            className="text-3xl tabular-nums tracking-tight"
            style={{
              color: timer.expired ? BAD : CYAN,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {timer.display}
          </p>
          {timer.targetLabel ? (
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
              Meta {timer.targetLabel}
              {timer.debt ? ` · deuda ${timer.debt}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {focus ? (
        <div className="mt-4">
          <p className="text-sm" style={{ color: INK }}>
            {focus.texto}
          </p>
          {(focus.minutosCupo ?? 0) > 0 ? (
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
              Cupo {focus.minutosCupo} min
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: OK, color: "#04140c" }}
              onClick={() => onCumplido(focus.id)}
              data-testid="j4-situacion-cumplido"
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
              onClick={() => onFallado(focus.id)}
              data-testid="j4-situacion-fallado"
            >
              Fallado
            </button>
          </div>
        </div>
      ) : bloqueListo ? (
        <div className="mt-4">
          <p className="text-sm" style={{ color: MUTED }}>
            Ring sin filas pendientes.
          </p>
          <button
            type="button"
            className="mt-3 w-full py-3 text-xs font-semibold uppercase tracking-wider"
            style={{ backgroundColor: ACCENT, color: "#1a1408" }}
            onClick={onCerrarBloque}
            data-testid="j4-situacion-cerrar-bloque"
          >
            Cerrar bloque
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm" style={{ color: MUTED }}>
          Sin filas en el ring. Abre el ring desde Jornada clásica o V3 por ahora.
        </p>
      )}
    </article>
  );
}
