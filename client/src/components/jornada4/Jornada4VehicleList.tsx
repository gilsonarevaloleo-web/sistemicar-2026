import type { Vehicle } from "@/lib/persistence";
import { isConquistaDesglosador, isSituacionDesglosador } from "@/jornada4/filters";
import { ConquistaCard } from "./ConquistaCard";
import { SituacionCard } from "./SituacionCard";
import { J4_COLORS } from "./Jornada4Shell";

const { MUTED } = J4_COLORS;

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
};

type Props = {
  vehicles: Vehicle[];
  ops: Ops;
};

export function Jornada4VehicleList({ vehicles, ops }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="px-4 py-10 text-center" data-testid="jornada4-empty">
        <p className="text-sm" style={{ color: MUTED }}>
          No hay desglosadores Dual Kernel activos.
        </p>
        <p className="mt-2 text-xs" style={{ color: MUTED }}>
          Lanza Conquista (reloj desglosador) o Situacional desde Jornada / V3;
          aquí solo se operan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24" data-testid="jornada4-list">
      {vehicles.map(v => {
        if (isConquistaDesglosador(v)) {
          return (
            <ConquistaCard
              key={v.id}
              vehicle={v}
              onCumplido={() => void ops.closeConquistaSub(v.id, "cumplido")}
              onFallado={() => void ops.closeConquistaSub(v.id, "fallado")}
              onCerrarCiclo={() => void ops.closeConquistaCycle(v.id)}
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
            />
          );
        }
        return null;
      })}
    </div>
  );
}
