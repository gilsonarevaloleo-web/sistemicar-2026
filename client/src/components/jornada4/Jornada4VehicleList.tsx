import { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { isConquistaDesglosador, isSituacionDesglosador } from "@/jornada4/filters";
import { ConquistaCard } from "./ConquistaCard";
import { SituacionCard } from "./SituacionCard";
import { J4_COLORS } from "./Jornada4Shell";

const { MUTED, INK, GOLD } = J4_COLORS;
const BLOOD = "#991b1b";

type Ops = {
  closeConquistaSub: (
    vehicleId: string,
    status: "cumplido" | "fallado",
    cantidad?: number
  ) => Promise<void>;
  closeConquistaCycle: (vehicleId: string) => Promise<void>;
  closeSituacionRow: (
    vehicleId: string,
    subTareaId: string,
    status: "cumplido" | "fallado"
  ) => Promise<void>;
  closeSituacionBlock: (vehicleId: string) => Promise<void>;
  addConquistaSub: (
    vehicleId: string,
    form: { titulo: string; cantidadObjetivo: string; tiempoRecordMinPerUnit?: number }
  ) => Promise<void>;
  addSituacionFila: (vehicleId: string, texto: string) => Promise<void>;
  setSituacionCupo: (
    vehicleId: string,
    subTareaId: string,
    minutos: number | undefined
  ) => Promise<void>;
};

type Props = {
  vehicles: Vehicle[];
  ops: Ops;
};

export function Jornada4VehicleList({ vehicles, ops }: Props) {
  const [open, setOpen] = useState(true);

  if (vehicles.length === 0) {
    return (
      <div
        className="mx-4 p-4 rounded-xl border text-center space-y-1"
        style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)" }}
        data-testid="jornada4-empty"
      >
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
          Sin vehículos activos
        </p>
        <p className="text-[9px]" style={{ color: MUTED }}>
          Lanza uno desde <strong style={{ color: INK }}>La Flota</strong> arriba —
          Conquista o Enfoque.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24" data-testid="jornada4-list">
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "#0a0a0a", borderColor: `${BLOOD}20` }}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full p-4 flex items-center justify-between"
          data-testid="jornada4-activos-toggle"
        >
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: BLOOD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLOOD }}>
              Vehículos activos
            </span>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${BLOOD}20`, color: BLOOD }}
            >
              {vehicles.length} activo{vehicles.length !== 1 ? "s" : ""}
            </span>
          </div>
          {open ? (
            <ChevronUp size={14} style={{ color: MUTED }} />
          ) : (
            <ChevronDown size={14} style={{ color: MUTED }} />
          )}
        </button>

        {open ? (
          <div
            className="px-3 pb-3 space-y-2 border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            {vehicles.map(v => {
              if (isConquistaDesglosador(v)) {
                return (
                <ConquistaCard
                  key={v.id}
                  vehicle={v}
                  onCumplido={cantidad =>
                    void ops.closeConquistaSub(v.id, "cumplido", cantidad)
                  }
                  onFallado={() => void ops.closeConquistaSub(v.id, "fallado")}
                  onCerrarCiclo={() => void ops.closeConquistaCycle(v.id)}
                  onAddSub={form => void ops.addConquistaSub(v.id, form)}
                />
                );
              }
              if (isSituacionDesglosador(v)) {
                return (
                  <SituacionCard
                    key={v.id}
                    vehicle={v}
                    onCumplido={id => void ops.closeSituacionRow(v.id, id, "cumplido")}
                    onFallado={id => void ops.closeSituacionRow(v.id, id, "fallado")}
                    onCerrarBloque={() => void ops.closeSituacionBlock(v.id)}
                    onAddFila={texto => void ops.addSituacionFila(v.id, texto)}
                    onSetCupo={(id, min) => void ops.setSituacionCupo(v.id, id, min)}
                  />
                );
              }
              return null;
            })}
            <p className="pt-1 text-center text-[8px] uppercase tracking-wider" style={{ color: GOLD }}>
              Dual Kernel · sin anillo · sin voz
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
