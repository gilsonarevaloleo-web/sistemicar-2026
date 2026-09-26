/**
 * Pestaña Plan — secuencia de la jornada + timeline vertical de cobertura.
 * Sin métricas duplicadas de conciencia (viven en MÉTRICAS).
 */
import { useMemo } from "react";
import { CoberturaHuecosPanel } from "@/components/jornada4/CoberturaHuecosPanel";
import { Jornada4CoberturaTimeline } from "@/components/jornada4/Jornada4CoberturaTimeline";
import { Jornada4SegmentosPanel } from "@/components/jornada4/Jornada4SegmentosPanel";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import type { useJornada4Planilla } from "@/hooks/useJornada4Planilla";
import { collectOpenPuertaWindows } from "@/jornada4/puertaWindowAlerts";
import type { Proyecto } from "@/lib/proyectos";
import type { Vehicle } from "@/lib/persistence";

type PlanillaApi = ReturnType<typeof useJornada4Planilla>;

export type Jornada4PlanTabProps = {
  planilla: PlanillaApi["planilla"];
  plantillasRutina: PlanillaApi["plantillasRutina"];
  segmentoActivo: PlanillaApi["segmentoActivo"];
  busySegId: PlanillaApi["busySegId"];
  onAdd: PlanillaApi["addSegmento"];
  onAbrir: PlanillaApi["activarSegmento"];
  onCerrar: PlanillaApi["cerrarSegmento"];
  onGuardarRutina: PlanillaApi["guardarComoRutina"];
  onCargarRutina: PlanillaApi["cargarRutina"];
  onEliminarRutina: PlanillaApi["eliminarRutina"];
  proyectosHub: Proyecto[];
  vehicles: Vehicle[];
  huecosRefresh: number;
  notifPermission: NotificationPermission | "unsupported";
  onRequestNotifPermission: () => void;
};

export default function Jornada4PlanTab({
  planilla,
  plantillasRutina,
  segmentoActivo,
  busySegId,
  onAdd,
  onAbrir,
  onCerrar,
  onGuardarRutina,
  onCargarRutina,
  onEliminarRutina,
  proyectosHub,
  vehicles,
  huecosRefresh,
  notifPermission,
  onRequestNotifPermission,
}: Jornada4PlanTabProps) {
  const badgeTick = useJornada4Tick(Boolean(planilla?.segmentos?.length));
  const puertaWindows = useMemo(() => {
    void badgeTick;
    if (!planilla?.segmentos?.length) {
      return { abrirIds: new Set<string>(), cerrarIds: new Set<string>() };
    }
    return collectOpenPuertaWindows(planilla.segmentos);
  }, [planilla, badgeTick]);

  return (
    <div role="tabpanel" data-testid="jornada4-panel-plan">
      <Jornada4CoberturaTimeline
        segmentos={planilla?.segmentos ?? []}
        vehicles={vehicles}
      />
      <Jornada4SegmentosPanel
        planilla={planilla}
        plantillasRutina={plantillasRutina}
        segmentoActivo={segmentoActivo}
        busySegId={busySegId}
        onAdd={onAdd}
        onAbrir={onAbrir}
        onCerrar={onCerrar}
        onGuardarRutina={onGuardarRutina}
        onCargarRutina={onCargarRutina}
        onEliminarRutina={onEliminarRutina}
        proyectosHub={proyectosHub}
        ventanaAbrirIds={puertaWindows.abrirIds}
        ventanaCerrarIds={puertaWindows.cerrarIds}
        notifPermission={notifPermission}
        onRequestNotifPermission={onRequestNotifPermission}
        hidePuertasTimeline
      />
      <CoberturaHuecosPanel refreshKey={huecosRefresh} vehicles={vehicles} />
    </div>
  );
}
