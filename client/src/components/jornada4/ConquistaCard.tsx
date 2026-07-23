import { useMemo, useState } from "react";
import { Check, Clock, X as XIcon, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, NARANJA } from "@/components/flota/vehicleCardShared";
import { computeDesglosadorClocks } from "@/lib/desglosadorClock";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  conquistaActiveSub,
  conquistaProgressLabel,
} from "@/jornada4/conquistaKernel";
import { formatHms } from "@/jornada4/format";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const flotaColor = FLOTA_CONFIG.tiempo.color;

type Props = {
  vehicle: Vehicle;
  onCumplido: (cantidad?: number) => void;
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

  const subs = vehicle.subVehiculos ?? [];
  const cycleReady = subs.every(s => s.status === "cumplido" || s.status === "fallado");
  const doneCount = subs.filter(s => s.status === "cumplido" || s.status === "fallado").length;
  const progressPct = subs.length > 0 ? Math.round((doneCount / subs.length) * 100) : 0;

  const [cantidad, setCantidad] = useState("");
  const hasCantidadObj = active?.cantidadObjetivo != null && active.cantidadObjetivo > 0;

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${flotaColor}35` }}
      data-testid={`jornada4-conquista-${vehicle.id}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NARANJA }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}
              >
                {FLOTA_CONFIG.tiempo.label}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Desglosador · {conquistaProgressLabel(vehicle)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: flotaColor }} />
            <span className="text-xs font-black" style={{ color: flotaColor }}>
              PS
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
        {active ? (
          <div
            className="mt-3 p-3 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(249,115,22,0.06)",
              borderColor: flotaColor,
              boxShadow: `0 0 16px ${flotaColor}18`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: flotaColor }}>
                  Unidad activa
                </p>
                <p className="text-sm font-bold mt-0.5 truncate" style={{ color: INK }}>
                  {active.titulo || "Sin título"}
                </p>
                {hasCantidadObj ? (
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    Objetivo {active.cantidadObjetivo} u
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black tabular-nums tracking-tight"
                  style={{ color: flotaColor, fontFamily: "ui-monospace, monospace" }}
                >
                  {formatHms(clocks.subElapsedSec)}
                </p>
                {clocks.subRemainingSec != null ? (
                  <p className="text-[10px] flex items-center justify-end gap-1" style={{ color: MUTED }}>
                    <Clock size={10} /> quedan {formatHms(clocks.subRemainingSec)}
                  </p>
                ) : null}
              </div>
            </div>

            {hasCantidadObj ? (
              <div>
                <label className="text-[8px] font-black uppercase tracking-wider block mb-1" style={{ color: MUTED }}>
                  Cantidad realizada
                </label>
                <input
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder={String(active.cantidadObjetivo)}
                  inputMode="numeric"
                  className="w-full p-2.5 rounded-lg bg-black/50 border text-sm focus:outline-none"
                  style={{ color: INK, borderColor: `${flotaColor}40` }}
                  data-testid="j4-conquista-cantidad"
                />
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
                onClick={() => {
                  const n = cantidad.trim() ? Number(cantidad) : undefined;
                  onCumplido(Number.isFinite(n as number) ? (n as number) : undefined);
                  setCantidad("");
                }}
                data-testid="j4-conquista-cumplido"
              >
                Cumplido
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: "transparent", color: BAD, border: `1px solid ${BAD}60` }}
                onClick={() => {
                  onFallado();
                  setCantidad("");
                }}
                data-testid="j4-conquista-fallado"
              >
                Fallado
              </button>
            </div>
          </div>
        ) : cycleReady ? (
          <div
            className="mt-3 p-4 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(212,175,55,0.05)",
              borderColor: "#D4AF37",
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>
              Ciclo completado
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              Todas las unidades cerradas. Sella el ciclo para liquidar PS.
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider"
              style={{ backgroundColor: "rgba(212,175,55,0.18)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.4)" }}
              onClick={onCerrarCiclo}
              data-testid="j4-conquista-cerrar-ciclo"
            >
              Cerrar ciclo
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            Sin unidad activa.
          </p>
        )}

        {subs.length > 0 ? (
          <div className="space-y-1.5" data-testid={`j4-conquista-subs-${vehicle.id}`}>
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
              Unidades
            </p>
            {subs.map((sv, idx) => {
              const isActive = sv.status === "activo";
              const done = sv.status === "cumplido";
              const fail = sv.status === "fallado";
              return (
                <div
                  key={sv.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border"
                  style={{
                    backgroundColor: isActive ? `${flotaColor}12` : "rgba(255,255,255,0.03)",
                    borderColor: isActive ? `${flotaColor}45` : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{
                      backgroundColor: done
                        ? `${OK}25`
                        : fail
                          ? `${BAD}25`
                          : isActive
                            ? `${flotaColor}25`
                            : "rgba(255,255,255,0.06)",
                      color: done ? OK : fail ? BAD : isActive ? flotaColor : MUTED,
                    }}
                  >
                    {done ? <Check size={10} /> : fail ? <XIcon size={10} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: isActive ? INK : MUTED }}
                    >
                      {sv.titulo || `Unidad ${idx + 1}`}
                    </p>
                  </div>
                  {sv.cantidadObjetivo != null && sv.cantidadObjetivo > 0 ? (
                    <span className="text-[9px] font-mono font-bold" style={{ color: MUTED }}>
                      {sv.cantidadLograda != null
                        ? `${sv.cantidadLograda}/${sv.cantidadObjetivo}`
                        : `${sv.cantidadObjetivo} u`}
                    </span>
                  ) : null}
                  <span
                    className="text-[8px] font-black uppercase"
                    style={{
                      color: done ? OK : fail ? BAD : isActive ? flotaColor : MUTED,
                    }}
                  >
                    {sv.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
