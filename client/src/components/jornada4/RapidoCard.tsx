import { useState } from "react";
import { Check, Zap, X as XIcon } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, NARANJA } from "@/components/flota/vehicleCardShared";
import { vehicleMissionClosePS } from "@/lib/sovereigntyPointsConfig";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const GOLD = "#D4AF37";

type Props = {
  vehicle: Vehicle;
  onCumplir: (cantidad?: number) => void;
  onArchivar: () => void;
};

/**
 * Conquista rápida — tarea independiente (= título).
 * Se mide por unidades; no hay secuencia ni subs.
 */
export function RapidoCard({ vehicle, onCumplir, onArchivar }: Props) {
  const cfg = FLOTA_CONFIG.tiempo;
  const accent = NARANJA;
  const objetivo = vehicle.cantidadObjetivo;
  const hasObj = objetivo != null && objetivo > 0;
  const [cantidad, setCantidad] = useState(hasObj ? String(objetivo) : "");
  const psCumple = vehicleMissionClosePS(
    "cumplido",
    vehicle.tipoTerminoRapido ?? "hora"
  );
  const psArch = vehicleMissionClosePS(
    "archivado",
    vehicle.tipoTerminoRapido ?? "hora"
  );
  const record =
    vehicle.tiempoElegido ?? vehicle.recordSugerido ?? vehicle.mejorTiempoPorUnidad;

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
                Independiente
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Sin secuencia
              {hasObj ? ` · obj ${objetivo} u` : ""}
              {record != null && record > 0 ? ` · ${Number(record).toFixed(1)} MIN/U` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: accent }} />
            <span className="text-xs font-black" style={{ color: accent }}>
              +{psCumple} PS
            </span>
          </div>
        </div>

        {hasObj ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className="text-[9px] font-black uppercase tracking-wider block mb-1"
                style={{ color: MUTED }}
              >
                Cantidad hecha
              </label>
              <input
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                inputMode="numeric"
                className="w-full p-2.5 rounded-xl bg-black/50 border-2 text-center font-mono font-black text-base focus:outline-none"
                style={{ color: INK, borderColor: cantidad ? accent : "rgba(255,255,255,0.12)" }}
                data-testid="j4-rapido-cantidad"
              />
            </div>
            <div className="flex items-end">
              <p className="text-[9px] leading-snug pb-2" style={{ color: GOLD }}>
                El nombre de la tarea es la misión — no hay subs ni orden.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const n = Number(cantidad);
              onCumplir(Number.isFinite(n) && n > 0 ? n : undefined);
            }}
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
