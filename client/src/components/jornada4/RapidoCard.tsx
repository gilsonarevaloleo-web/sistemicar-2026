import { Check, Zap, X as XIcon } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, NARANJA, PLATA } from "@/components/flota/vehicleCardShared";
import { vehicleMissionClosePS } from "@/lib/sovereigntyPointsConfig";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";

type Props = {
  vehicle: Vehicle;
  onCumplir: () => void;
  onArchivar: () => void;
};

/**
 * Vehículo rápido — sin desglose ni ring.
 * Cierre directo Cumplir / Archivar (mismo modelo Express clásico).
 */
export function RapidoCard({ vehicle, onCumplir, onArchivar }: Props) {
  const tipo = vehicle.tipoFlota === "situacion" ? "situacion" : "tiempo";
  const cfg = FLOTA_CONFIG[tipo];
  const accent = tipo === "situacion" ? PLATA : NARANJA;
  const psCumple = vehicleMissionClosePS("cumplido", vehicle.tipoTerminoRapido ?? (tipo === "situacion" ? "situacion" : "hora"));
  const psArch = vehicleMissionClosePS("archivado", vehicle.tipoTerminoRapido ?? (tipo === "situacion" ? "situacion" : "hora"));

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${accent}35` }}
      data-testid={`jornada4-rapido-${vehicle.id}`}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                {cfg.label}
              </span>
              <span
                className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: MUTED }}
              >
                Rápido
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Sin desglose
              {vehicle.criterioDetalle ? ` · ${vehicle.criterioDetalle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: accent }} />
            <span className="text-xs font-black" style={{ color: accent }}>
              +{psCumple} PS
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCumplir}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation flex items-center justify-center gap-1.5"
            style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
            data-testid="j4-rapido-cumplir"
          >
            <Check size={14} /> Cumplir · +{psCumple}
          </button>
          <button
            type="button"
            onClick={onArchivar}
            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation flex items-center justify-center gap-1.5"
            style={{ backgroundColor: `${BAD}14`, color: BAD, border: `1px solid ${BAD}40` }}
            data-testid="j4-rapido-archivar"
          >
            <XIcon size={14} /> Archivar{psArch > 0 ? ` · +${psArch}` : ""}
          </button>
        </div>
      </div>
    </article>
  );
}
