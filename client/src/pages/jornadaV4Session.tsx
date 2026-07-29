/**
 * Sesión Dual Kernel — segmentos + proyectos + alertas puerta + PS + flota + Crisol.
 * UI móvil en pestañas (Operar / Plan / Métricas) — sin cambiar hooks ni timers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import {
  Jornada4MobileNav,
  type Jornada4MobileTab,
} from "@/components/jornada4/Jornada4MobileNav";
import { Jornada4DailyPsBar } from "@/components/jornada4/Jornada4DailyPsBar";
import { Jornada4SegmentosPanel } from "@/components/jornada4/Jornada4SegmentosPanel";
import { Jornada4LaunchPanel } from "@/components/jornada4/Jornada4LaunchPanel";
import { Jornada4Boveda } from "@/components/jornada4/Jornada4Boveda";
import { Jornada4VehicleList } from "@/components/jornada4/Jornada4VehicleList";
import PlaneacionCrisolDock from "@/components/planeacion/PlaneacionCrisolDock";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { useJornada4Crisol } from "@/hooks/useJornada4Crisol";
import { useJornada4Ops } from "@/hooks/useJornada4Ops";
import { useJornada4Planilla } from "@/hooks/useJornada4Planilla";
import { useJornada4PuertaAlerts } from "@/hooks/useJornada4PuertaAlerts";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  executeJornada4Launch,
  type Jornada4LaunchForm,
} from "@/jornada4/executeJornada4Launch";
import { ensureJornada4NotificationPermission } from "@/jornada4/puertaWindowAlerts";
import { getYesterdayDailyPointsTotal } from "@/lib/persistence";

export default function JornadaV4Session() {
  const { user } = useAuthContext();
  const core = useJornada4Core();
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<Jornada4MobileTab>("operar");
  const [yesterdayPs, setYesterdayPs] = useState(0);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const planillaApi = useJornada4Planilla({
    userId: user?.uid,
    safeAwardPS: core.safeAwardPS,
  });
  const { proyectosHub, proyectoVinculadoActivo, resolverProyectoId } =
    useSegmentoProyectoVinculo(user?.uid, planillaApi.segmentoActivo);
  const puertaWindows = useJornada4PuertaAlerts(planillaApi.planilla, Boolean(user));
  const ops = useJornada4Ops({
    userId: user?.uid,
    vehiclesRef: core.vehiclesRef,
    setVehicles: core.setVehicles,
    safeAwardPS: core.safeAwardPS,
  });
  const crisol = useJornada4Crisol({
    userId: user?.uid,
    vehiclesRef: core.vehiclesRef,
    setVehicles: core.setVehicles,
    expandedId: core.expandedId,
    setExpandedId: core.setExpandedId,
    segmentoActivo: planillaApi.segmentoActivo,
    proyectosHub,
  });

  useEffect(() => {
    if (!user?.uid) {
      setYesterdayPs(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      void getYesterdayDailyPointsTotal(user.uid).then(n => {
        if (!cancelled) setYesterdayPs(n);
      });
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(load, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(load, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user?.uid]);

  const handleLaunch = useCallback(
    async (form: Jornada4LaunchForm) => {
      if (!user) return null;
      return executeJornada4Launch({
        userId: user.uid,
        form,
        vehiclesRef: core.vehiclesRef,
        setVehicles: core.setVehicles,
        setExpandedId: core.setExpandedId,
        planilla: planillaApi.planilla,
        segmentoActivo: planillaApi.segmentoActivo,
        resolverProyectoId,
        applyCentinelaArchiveLocally: core.applyCentinelaArchiveLocally,
        safeAwardPS: core.safeAwardPS,
        recordVehiculoInicio: core.recordVehiculoInicio,
        scrollFlotaActivosIntoView: core.scrollFlotaActivosIntoView,
        optimisticVehiclesRef: core.optimisticVehiclesRef,
        ghostReconcileRef: core.ghostReconcileRef,
        lastLaunchRef,
      });
    },
    [user, core, planillaApi.planilla, planillaApi.segmentoActivo, resolverProyectoId]
  );

  const statusLine = planillaApi.segmentoActivo
    ? [
        `Segmento · ${planillaApi.segmentoActivo.nombre}`,
        `${planillaApi.segmentoActivo.horaInicio}–${planillaApi.segmentoActivo.horaFin}`,
        proyectoVinculadoActivo
          ? `Proyecto · ${proyectoVinculadoActivo.titulo}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "La Flota Dual Kernel · Conquista + Enfoque";

  return (
    <div
      className="min-h-screen pb-40"
      style={{ backgroundColor: "#0a0a0a" }}
      data-testid="jornada4-session"
    >
      <Jornada4Shell
        dualCount={core.dualCount}
        dailyPS={core.dailyPS}
        statusLine={statusLine}
      />
      <Jornada4MobileNav value={mobileTab} onChange={setMobileTab} />
      <div className="max-w-lg mx-auto pt-2">
        {mobileTab === "operar" ? (
          <div role="tabpanel" data-testid="jornada4-panel-operar">
            <Jornada4LaunchPanel
              onLaunch={handleLaunch}
              segmentoHoraFin={planillaApi.segmentoActivo?.horaFin ?? null}
              segmentoActivoNombre={
                planillaApi.segmentoActivo
                  ? proyectoVinculadoActivo
                    ? `${planillaApi.segmentoActivo.nombre} · ${proyectoVinculadoActivo.titulo}`
                    : planillaApi.segmentoActivo.nombre
                  : null
              }
            />
            <Jornada4VehicleList vehicles={core.dualVehicles} ops={ops} />
          </div>
        ) : null}

        {mobileTab === "plan" ? (
          <div role="tabpanel" data-testid="jornada4-panel-plan">
            <Jornada4SegmentosPanel
              planilla={planillaApi.planilla}
              plantillasRutina={planillaApi.plantillasRutina}
              segmentoActivo={planillaApi.segmentoActivo}
              busySegId={planillaApi.busySegId}
              onAdd={planillaApi.addSegmento}
              onAbrir={planillaApi.activarSegmento}
              onCerrar={planillaApi.cerrarSegmento}
              onGuardarRutina={planillaApi.guardarComoRutina}
              onCargarRutina={planillaApi.cargarRutina}
              onEliminarRutina={planillaApi.eliminarRutina}
              proyectosHub={proyectosHub}
              ventanaAbrirIds={puertaWindows.abrirIds}
              ventanaCerrarIds={puertaWindows.cerrarIds}
              notifPermission={notifPermission}
              onRequestNotifPermission={() => {
                void ensureJornada4NotificationPermission().then(ok => {
                  setNotifPermission(
                    typeof Notification === "undefined"
                      ? "unsupported"
                      : ok
                        ? "granted"
                        : Notification.permission
                  );
                });
              }}
            />
          </div>
        ) : null}

        {mobileTab === "metricas" ? (
          <div role="tabpanel" data-testid="jornada4-panel-metricas" className="space-y-1">
            <Jornada4DailyPsBar todayPs={core.dailyPS} yesterdayPs={yesterdayPs} />
            <Jornada4Boveda />
          </div>
        ) : null}
      </div>

      <PlaneacionCrisolDock
        items={crisol.reservaActivas}
        proyectos={crisol.imanProyectos}
        defaultProyectoId={planillaApi.segmentoActivo?.proyectoVinculadoId ?? ""}
        onQuickAdd={crisol.handleReservaTacticaQuickAdd}
        onEnviarUnidad={crisol.handleEnviarReservaASituacion}
        onEnviarSeleccion={crisol.handleEnviarReservasSeleccionadas}
        onAbrirNido={crisol.handleAbrirNidoEnSituacion}
        onDelete={crisol.handleReservaEliminar}
        onRutaChange={crisol.handleReservaRutaChange}
        elevateAboveUnitFocus
      />
    </div>
  );
}
