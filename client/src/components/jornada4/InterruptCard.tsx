/**
 * Situación express / interrupción — Cumplido o Incumplido (como Jornada clásica).
 */
import { Check, PauseCircle, X as XIcon } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG } from "@/components/flota/vehicleCardShared";
import { vehicleMissionClosePS } from "@/lib/sovereigntyPointsConfig";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const CYAN = "#00FFC3";
const flotaColor = FLOTA_CONFIG.situacion.color;

type Props = {
  vehicle: Vehicle;
  onCumplido: () => void;
  onIncumplido: () => void;
};

export function InterruptCard({ vehicle, onCumplido, onIncumplido }: Props) {
  const isInterrupt = Boolean(vehicle.vehiculoPadreDesglosadorId);
  const psCumple = vehicleMissionClosePS("cumplido", vehicle.tipoTerminoRapido ?? "situacion");
  const psArch = vehicleMissionClosePS("archivado", vehicle.tipoTerminoRapido ?? "situacion");

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: "#0a0a0a",
        borderColor: isInterrupt ? `${CYAN}45` : `${flotaColor}35`,
        boxShadow: isInterrupt ? `0 0 14px rgba(0,255,195,0.12)` : undefined,
      }}
      data-testid={`jornada4-express-${vehicle.id}`}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          {isInterrupt ? (
            <PauseCircle size={14} style={{ color: CYAN }} className="mt-0.5 shrink-0" />
          ) : (
            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: flotaColor }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: INK }}>
              {vehicle.titulo}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
              {isInterrupt
                ? "Interrupción · cierra para reanudar el desglosador"
                : "Situación express · sin ring"}
            </p>
          </div>
          <span
            className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: isInterrupt ? "rgba(0,255,195,0.12)" : `${flotaColor}20`,
              color: isInterrupt ? CYAN : flotaColor,
            }}
          >
            {isInterrupt ? "Pausa" : FLOTA_CONFIG.situacion.label}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCumplido}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 touch-manipulation"
            style={{
              backgroundColor: `${OK}22`,
              color: OK,
              border: `1px solid ${OK}50`,
            }}
            data-testid={`j4-express-cumplido-${vehicle.id}`}
          >
            <Check size={12} /> Cumplido · +{psCumple} PS
          </button>
          <button
            type="button"
            onClick={onIncumplido}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 touch-manipulation"
            style={{
              backgroundColor: "transparent",
              color: BAD,
              border: `1px solid ${BAD}60`,
            }}
            data-testid={`j4-express-incumplido-${vehicle.id}`}
          >
            <XIcon size={12} /> Incumplido
            {psArch > 0 ? ` · +${psArch} PS` : ""}
          </button>
        </div>
      </div>
    </article>
  );
}
