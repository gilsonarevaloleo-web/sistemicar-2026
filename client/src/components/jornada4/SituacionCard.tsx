import { useMemo } from "react";
import { Check, Flag, X as XIcon, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, PLATA } from "@/components/flota/vehicleCardShared";
import { computeSituacionTimerUi } from "@/lib/situacionTimerUi";
import { situacionFilaCronometroPendiente } from "@/lib/situacionCupoDistrib";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  situacionPendingCronRows,
  situacionProgressLabel,
} from "@/jornada4/situacionKernel";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const flotaColor = FLOTA_CONFIG.situacion.color;

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
  const focus = pending.find(st => st.id === focusId) ?? pending[0] ?? null;

  const tick = useJornada4Tick(true);
  const timer = useMemo(
    () => computeSituacionTimerUi(vehicle, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, vehicle]
  );

  const rows = vehicle.subTareas ?? [];
  const bloqueListo = pending.length === 0 && rows.length > 0;
  const doneCount = rows.filter(r => !situacionFilaCronometroPendiente(r)).length;
  const progressPct = rows.length > 0 ? Math.round((doneCount / rows.length) * 100) : 0;

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${flotaColor}35` }}
      data-testid={`jornada4-situacion-${vehicle.id}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATA }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}
              >
                {FLOTA_CONFIG.situacion.label}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Ring · {situacionProgressLabel(vehicle)}
              {vehicle.criterioDetalle ? ` · ${vehicle.criterioDetalle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: flotaColor }} />
            <span className="text-xs font-black" style={{ color: flotaColor }}>
              3-7 PS
            </span>
          </div>
        </div>

        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              backgroundColor: flotaColor,
              boxShadow: `0 0 6px ${flotaColor}80`,
            }}
          />
        </div>
      </div>

      <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {timer.visible ? (
          <div className="mt-3 text-center">
            <p
              className="text-3xl font-black tabular-nums tracking-tight"
              style={{
                color: timer.expired ? BAD : flotaColor,
                fontFamily: "ui-monospace, monospace",
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
          <div
            className="p-3 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(148,163,184,0.08)",
              borderColor: flotaColor,
              boxShadow: `0 0 16px ${flotaColor}18`,
            }}
          >
            <div className="flex items-center gap-2">
              <Flag size={12} style={{ color: flotaColor }} />
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: flotaColor }}>
                Fila en foco
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: INK }}>
              {focus.texto}
            </p>
            {(focus.minutosCupo ?? 0) > 0 ? (
              <p className="text-[11px]" style={{ color: MUTED }}>
                Cupo {focus.minutosCupo} min
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
                onClick={() => onCumplido(focus.id)}
                data-testid="j4-situacion-cumplido"
              >
                Cumplido
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: "transparent", color: BAD, border: `1px solid ${BAD}60` }}
                onClick={() => onFallado(focus.id)}
                data-testid="j4-situacion-fallado"
              >
                Fallado
              </button>
            </div>
          </div>
        ) : bloqueListo ? (
          <div
            className="mt-3 p-4 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(212,175,55,0.05)",
              borderColor: "#D4AF37",
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>
              Ring sin filas pendientes
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: "rgba(212,175,55,0.18)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.4)",
              }}
              onClick={onCerrarBloque}
              data-testid="j4-situacion-cerrar-bloque"
            >
              Cerrar bloque
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            Ring sin filas. Lanza de nuevo con filas, o cierra el bloque.
          </p>
        )}

        {rows.length > 0 ? (
          <div className="space-y-1.5" data-testid={`j4-situacion-rows-${vehicle.id}`}>
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
              Filas del ring
            </p>
            {rows.map((row, idx) => {
              const isPending = situacionFilaCronometroPendiente(row);
              const isFocus = focus?.id === row.id;
              const resultado = row.resultadoSituacion ?? (row.completada ? "cumplido" : "pendiente");
              const done = resultado === "cumplido";
              const fail = resultado === "fallado";
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border"
                  style={{
                    backgroundColor: isFocus ? `${flotaColor}14` : "rgba(255,255,255,0.03)",
                    borderColor: isFocus ? `${flotaColor}45` : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{
                      backgroundColor: done
                        ? `${OK}25`
                        : fail
                          ? `${BAD}25`
                          : isFocus
                            ? `${flotaColor}25`
                            : "rgba(255,255,255,0.06)",
                      color: done ? OK : fail ? BAD : isFocus ? flotaColor : MUTED,
                    }}
                  >
                    {done ? <Check size={10} /> : fail ? <XIcon size={10} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: isFocus || isPending ? INK : MUTED }}
                    >
                      {row.texto || `Fila ${idx + 1}`}
                    </p>
                  </div>
                  {(row.minutosCupo ?? 0) > 0 ? (
                    <span className="text-[9px] font-mono font-bold" style={{ color: MUTED }}>
                      {row.minutosCupo}m
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {rows.length > 0 && !focus && !bloqueListo ? (
          <button
            type="button"
            className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider"
            style={{ color: MUTED, border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={onCerrarBloque}
            data-testid="j4-situacion-cerrar-bloque-alt"
          >
            Cerrar bloque
          </button>
        ) : null}
      </div>
    </article>
  );
}
