/**
 * Pestaña Plan — chunk diferido (Pulso + huecos + segmentos).
 * No montar en Operar: evita arrastrar ConcienciaEngine/recompute al hot path.
 * Badges ±5 min tickean aquí (isla); toasts de puerta siguen en la sesión.
 */
import { useMemo } from "react";
import { PulsoCobertura } from "@/components/jornada/PulsoCobertura";
import { CoberturaHuecosPanel } from "@/components/jornada4/CoberturaHuecosPanel";
import { Jornada4SegmentosPanel } from "@/components/jornada4/Jornada4SegmentosPanel";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { usePulsoCobertura } from "@/hooks/usePulsoCobertura";
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
  // Solo vive mientras la pestaña Plan está montada — sin intervalo en Operar/Métricas.
  const pulsoModel = usePulsoCobertura({
    segmentos: planilla?.segmentos ?? [],
    vehicles,
    segmentoActivoId: segmentoActivo?.id ?? null,
    enabled: true,
  });

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
      <PulsoCobertura
        model={pulsoModel}
        showCta={Boolean(segmentoActivo)}
        sinSegmentos={(planilla?.segmentos.length ?? 0) === 0}
      />
      <CoberturaHuecosPanel refreshKey={huecosRefresh} />
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
      />
    </div>
  );
}
