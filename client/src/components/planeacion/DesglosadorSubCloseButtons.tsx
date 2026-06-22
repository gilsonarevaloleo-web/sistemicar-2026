import { useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { validateSubCloseCantidad } from "@/lib/desglosadorClock";
import type { SubVehiculo } from "@/lib/persistence";

export type DesglosadorSubClosePayload = {
  vehicleId: string;
  subId: string;
  status: "cumplido" | "fallado";
  duracionSec?: number;
};

type Props = {
  vehicleId: string;
  activeSub: SubVehiculo;
  cantidadRealizada: string;
  blockedByInterrupt: boolean;
  onCloseSub: (payload: DesglosadorSubClosePayload) => void;
  onWarDrum?: () => void;
};

export function DesglosadorSubCloseButtons({
  vehicleId,
  activeSub,
  cantidadRealizada,
  blockedByInterrupt,
  onCloseSub,
  onWarDrum,
}: Props) {
  const cumplidoOk = validateSubCloseCantidad(activeSub, cantidadRealizada, "cumplido").ok;
  const falladoOk = validateSubCloseCantidad(activeSub, cantidadRealizada, "fallado").ok;
  const needsCantidad = Boolean(activeSub.cantidadObjetivo && activeSub.cantidadObjetivo > 0);

  const handleCumplido = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (blockedByInterrupt || !cumplidoOk) return;
      onWarDrum?.();
      const now = Date.now();
      const duracionSec = activeSub.aperturaAt
        ? Math.floor((now - activeSub.aperturaAt) / 1000)
        : undefined;
      onCloseSub({
        vehicleId,
        subId: activeSub.id,
        status: "cumplido",
        duracionSec,
      });
    },
    [activeSub.aperturaAt, activeSub.id, blockedByInterrupt, cumplidoOk, onCloseSub, onWarDrum, vehicleId]
  );

  const handleFallado = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (blockedByInterrupt || !falladoOk) return;
      onWarDrum?.();
      const now = Date.now();
      const duracionSec = activeSub.aperturaAt
        ? Math.floor((now - activeSub.aperturaAt) / 1000)
        : undefined;
      onCloseSub({
        vehicleId,
        subId: activeSub.id,
        status: "fallado",
        duracionSec,
      });
    },
    [activeSub.aperturaAt, activeSub.id, blockedByInterrupt, falladoOk, onCloseSub, onWarDrum, vehicleId]
  );

  return (
    <div className="space-y-1.5">
      {needsCantidad && (!cumplidoOk || !falladoOk) && (
        <p className="text-[8px] text-center font-bold uppercase tracking-wider" style={{ color: "#f97316" }}>
          Registra cant. lograda para cerrar
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCumplido}
          disabled={blockedByInterrupt || !cumplidoOk}
          className="py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
          style={{ backgroundColor: "rgba(0,200,81,0.15)", color: "#00C851", border: "1px solid rgba(0,200,81,0.3)" }}
          data-testid={`button-sub-cumplido-${activeSub.id}`}
        >
          <CheckCircle2 size={12} /> Cumplido
        </button>
        <button
          type="button"
          onClick={handleFallado}
          disabled={blockedByInterrupt || !falladoOk}
          className="py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
          data-testid={`button-sub-fallado-${activeSub.id}`}
        >
          <XCircle size={12} /> Fallado
        </button>
      </div>
    </div>
  );
}
