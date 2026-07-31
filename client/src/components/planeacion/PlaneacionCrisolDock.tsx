import { memo, useCallback } from "react";
import ImanPensamientosDock from "@/components/ImanPensamientosDock";
import type { ReservaTacticaRuta, SituacionReservaItem } from "@/lib/situacionReserva";
import type { ImanProyectoOpcion } from "@/lib/imanPensamientos";

const CRISOL_COLORS = {
  plata: "#94a3b8",
  cyan: "#00FFC3",
  gold: "#D4AF37",
} as const;

export interface PlaneacionCrisolDockProps {
  items: SituacionReservaItem[];
  proyectos: ImanProyectoOpcion[];
  defaultProyectoId?: string;
  onQuickAdd: (texto: string, ruta: ReservaTacticaRuta, proyectoId?: string) => void | Promise<void>;
  onEnviarUnidad: (reservaId: string) => void | Promise<void>;
  onEnviarSeleccion: (reservaIds: string[]) => void | Promise<void>;
  onAbrirNido?: (nidoId: string) => void | Promise<void>;
  onDelete: (reservaId: string) => void | Promise<void>;
  onRutaChange: (reservaId: string, ruta: ReservaTacticaRuta) => void | Promise<void>;
  /** Deja el dock usable sobre el Foco unidad de conquista. */
  elevateAboveUnitFocus?: boolean;
  dockBottomPx?: number;
  panoramaHeadline?: string;
  panoramaSubline?: string;
  panoramaMantra?: string;
}

function PlaneacionCrisolDockInner({
  items,
  proyectos,
  defaultProyectoId = "",
  onQuickAdd,
  onEnviarUnidad,
  onEnviarSeleccion,
  onAbrirNido,
  onDelete,
  onRutaChange,
  elevateAboveUnitFocus = false,
  dockBottomPx,
  panoramaHeadline,
  panoramaSubline,
  panoramaMantra,
}: PlaneacionCrisolDockProps) {
  const handleQuickAdd = useCallback(
    (texto: string, ruta: ReservaTacticaRuta, proyectoId?: string) =>
      onQuickAdd(texto, ruta, proyectoId),
    [onQuickAdd]
  );

  return (
    <ImanPensamientosDock
      items={items}
      proyectos={proyectos}
      defaultProyectoId={defaultProyectoId}
      onQuickAdd={handleQuickAdd}
      onEnviarUnidad={onEnviarUnidad}
      onEnviarSeleccion={onEnviarSeleccion}
      onAbrirNido={onAbrirNido}
      onDelete={onDelete}
      onRutaChange={onRutaChange}
      colors={CRISOL_COLORS}
      elevateAboveUnitFocus={elevateAboveUnitFocus}
      dockBottomPx={dockBottomPx}
      panoramaHeadline={panoramaHeadline}
      panoramaSubline={panoramaSubline}
      panoramaMantra={panoramaMantra}
    />
  );
}

const PlaneacionCrisolDock = memo(PlaneacionCrisolDockInner);
export default PlaneacionCrisolDock;
