import { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import {
  isConquistaDesglosador,
  isConquistaRapido,
  isExpressSituacion,
  isSituacionListaLibre,
  isSituacionRing,
} from "@/jornada4/filters";
import type { ReorderDirection } from "@/lib/desglosadorReorder";
import type { DestinoCierre } from "@/lib/destinoCierre";
import { ConquistaCard } from "./ConquistaCard";
import { SituacionCard } from "./SituacionCard";
import { SituacionLibreCard } from "./SituacionLibreCard";
import { RapidoCard } from "./RapidoCard";
import { InterruptCard } from "./InterruptCard";
import { J4_COLORS } from "./Jornada4Shell";
import { J4_UI } from "./jornada4Ui";

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
    status: "cumplido" | "fallado" | "avance"
  ) => Promise<void>;
  closeSituacionBlock: (vehicleId: string) => Promise<void>;
  closeRapidoVehicle: (
    vehicleId: string,
    status: "cumplido" | "archivado",
    cantidad?: number
  ) => Promise<void>;
  closeSituacionLibreFila: (
    vehicleId: string,
    subTareaId: string,
    status: "cumplido" | "fallado" | "avance"
  ) => Promise<void>;
  closeSituacionLibreBloque: (vehicleId: string) => Promise<void>;
  addSituacionLibreFila: (
    vehicleId: string,
    texto: string,
    seccionTitulo?: string
  ) => Promise<void>;
  addConquistaSub: (
    vehicleId: string,
    form: {
      titulo: string;
      cantidadObjetivo: string;
      tiempoRecordMinPerUnit?: number;
      seccionTitulo?: string;
    }
  ) => Promise<void>;
  addConquistaSubs: (
    vehicleId: string,
    forms: Array<{
      titulo: string;
      cantidadObjetivo: string;
      tiempoRecordMinPerUnit?: number;
      seccionTitulo?: string;
    }>
  ) => Promise<void>;
  addSituacionFila: (
    vehicleId: string,
    texto: string,
    seccionTitulo?: string
  ) => Promise<void>;
  setSituacionCupo: (
    vehicleId: string,
    subTareaId: string,
    minutos: number | undefined
  ) => Promise<void>;
  setDestinoCierre: (
    vehicleId: string,
    destino: DestinoCierre,
    proyectoId?: string
  ) => void;
  reorderConquistaSubs: (
    vehicleId: string,
    movedId: string,
    direction: ReorderDirection
  ) => void;
  reorderSituacionFilas: (
    vehicleId: string,
    movedId: string,
    direction: ReorderDirection
  ) => void;
  sustituirSituacionFoco?: (vehicleId: string, newFocusId: string) => void;
  failSituacionDistraccion?: (vehicleId: string) => Promise<void>;
  archiveAncladoPorSegmento?: (vehicleId: string) => Promise<void>;
  pausaInterrupcion: (vehicleId: string, titulo?: string) => Promise<void>;
  labelPausaConquista?: (vehicleId: string, titulo: string) => Promise<void>;
  resumeDesglosador: (parentId: string) => Promise<void>;
  archivePausedConquista?: (vehicleId: string) => Promise<void>;
  postergarFilaEnFoco: (vehicleId: string) => void;
  quitarSituacionFila: (vehicleId: string, subTareaId: string) => void;
  closeExpressVehicle: (
    vehicleId: string,
    status: "cumplido" | "archivado"
  ) => Promise<void>;
};

type Props = {
  vehicles: Vehicle[];
  ops: Ops;
  /** Base: no mencionar ring / lista libre (eso es Ritmo). */
  canSituacion?: boolean;
};

export function Jornada4VehicleList({
  vehicles,
  ops,
  canSituacion = true,
}: Props) {
  const [open, setOpen] = useState(true);

  if (vehicles.length === 0) {
    return (
      <div
        className={`mx-3 sm:mx-4 ${J4_UI.card} text-center space-y-1`}
        data-testid="jornada4-empty"
      >
        <p className={J4_UI.label}>
          Aún no hay un bloque en curso
        </p>
        <p className="text-[11px] leading-snug" style={{ color: MUTED }}>
          {canSituacion ? (
            <>
              Toca <strong style={{ color: INK }}>Conquista</strong> para
              unidades, o <strong style={{ color: INK }}>Enfoque</strong> para
              imprevistos.
            </>
          ) : (
            <>
              Toca <strong style={{ color: INK }}>Conquista</strong>, pon
              unidades y cierra cumplido o fallado. Eso es operar hoy.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24" data-testid="jornada4-list">
      <div
        className={`${J4_UI.cardCompact} overflow-hidden`}
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
                    onDestinoChange={(destino, proyectoId) =>
                      ops.setDestinoCierre(v.id, destino, proyectoId)
                    }
                    onAddSub={form => void ops.addConquistaSub(v.id, form)}
                    onAddSubs={forms => void ops.addConquistaSubs(v.id, forms)}
                    onPausaInterrupcion={titulo => void ops.pausaInterrupcion(v.id, titulo)}
                    onLabelPausa={
                      ops.labelPausaConquista
                        ? titulo => void ops.labelPausaConquista!(v.id, titulo)
                        : undefined
                    }
                    onResumeDesglosador={() => void ops.resumeDesglosador(v.id)}
                    onArchivarPausa={
                      ops.archivePausedConquista
                        ? () => void ops.archivePausedConquista!(v.id)
                        : undefined
                    }
                    onReorderSubs={(movedId, direction) =>
                      ops.reorderConquistaSubs(v.id, movedId, direction)
                    }
                  />
                );
              }
              if (isExpressSituacion(v)) {
                return (
                  <InterruptCard
                    key={v.id}
                    vehicle={v}
                    onCumplido={() => void ops.closeExpressVehicle(v.id, "cumplido")}
                    onIncumplido={() => void ops.closeExpressVehicle(v.id, "archivado")}
                  />
                );
              }
              if (isSituacionRing(v)) {
                return (
                  <SituacionCard
                    key={v.id}
                    vehicle={v}
                    onCumplido={id => void ops.closeSituacionRow(v.id, id, "cumplido")}
                    onAvance={id => void ops.closeSituacionRow(v.id, id, "avance")}
                    onFallado={id => void ops.closeSituacionRow(v.id, id, "fallado")}
                    onCerrarBloque={() => void ops.closeSituacionBlock(v.id)}
                    onDestinoChange={(destino, proyectoId) =>
                      ops.setDestinoCierre(v.id, destino, proyectoId)
                    }
                    onAddFila={(texto, seccion) =>
                      void ops.addSituacionFila(v.id, texto, seccion)
                    }
                    onSetCupo={(id, min) => void ops.setSituacionCupo(v.id, id, min)}
                    onReorderFilas={(movedId, direction) =>
                      ops.reorderSituacionFilas(v.id, movedId, direction)
                    }
                    onSustituirFoco={
                      ops.sustituirSituacionFoco
                        ? id => ops.sustituirSituacionFoco!(v.id, id)
                        : undefined
                    }
                    onPostergarFoco={() => ops.postergarFilaEnFoco(v.id)}
                    onQuitarFila={id => ops.quitarSituacionFila(v.id, id)}
                  />
                );
              }
              if (isSituacionListaLibre(v)) {
                return (
                  <SituacionLibreCard
                    key={v.id}
                    vehicle={v}
                    onCumplido={id => void ops.closeSituacionLibreFila(v.id, id, "cumplido")}
                    onAvance={id => void ops.closeSituacionLibreFila(v.id, id, "avance")}
                    onFallado={id => void ops.closeSituacionLibreFila(v.id, id, "fallado")}
                    onCerrar={() => void ops.closeSituacionLibreBloque(v.id)}
                    onDestinoChange={(destino, proyectoId) =>
                      ops.setDestinoCierre(v.id, destino, proyectoId)
                    }
                    onAddFila={(texto, seccion) =>
                      void ops.addSituacionLibreFila(v.id, texto, seccion)
                    }
                  />
                );
              }
              if (isConquistaRapido(v)) {
                return (
                  <RapidoCard
                    key={v.id}
                    vehicle={v}
                    onCumplir={cant => void ops.closeRapidoVehicle(v.id, "cumplido", cant)}
                    onArchivar={() => void ops.closeRapidoVehicle(v.id, "archivado")}
                  />
                );
              }
              return null;
            })}
            <p className="pt-1 text-center text-[8px] uppercase tracking-wider" style={{ color: GOLD }}>
              Dual Kernel · pausa · postergar · quitar cola · reorden · conquista · ring
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
