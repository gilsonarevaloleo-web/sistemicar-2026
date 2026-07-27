/**
 * Sesión Dual Kernel — orden de zonas:
 * 01 Operar → 02 Cobertura → 03 Plan → 04 Métricas
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import { Jornada4SectionLabel } from "@/components/jornada4/Jornada4SectionLabel";
import { Jornada4DailyPsBar } from "@/components/jornada4/Jornada4DailyPsBar";
import { Jornada4SegmentosPanel } from "@/components/jornada4/Jornada4SegmentosPanel";
import { Jornada4LaunchPanel } from "@/components/jornada4/Jornada4LaunchPanel";
import { Jornada4Boveda } from "@/components/jornada4/Jornada4Boveda";
import { Jornada4VehicleList } from "@/components/jornada4/Jornada4VehicleList";
import { CoberturaHuecosPanel } from "@/components/jornada4/CoberturaHuecosPanel";
import { PulsoCobertura } from "@/components/jornada/PulsoCobertura";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { useJornada4Ops } from "@/hooks/useJornada4Ops";
import { useJornada4Planilla } from "@/hooks/useJornada4Planilla";
import { useJornada4PuertaAlerts } from "@/hooks/useJornada4PuertaAlerts";
import { usePulsoCobertura } from "@/hooks/usePulsoCobertura";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  executeJornada4Launch,
  type Jornada4LaunchForm,
} from "@/jornada4/executeJornada4Launch";
import { reconcileCoberturaHuecos } from "@/jornada4/coberturaHuecosLog";
import { ensureJornada4NotificationPermission } from "@/jornada4/puertaWindowAlerts";
import { getYesterdayDailyPointsTotal } from "@/lib/persistence";

export default function JornadaV4Session() {
  const { user } = useAuthContext();
  const core = useJornada4Core();
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);
  const [yesterdayPs, setYesterdayPs] = useState(0);
  const [huecosRefresh, setHuecosRefresh] = useState(0);
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

  const pulsoModel = usePulsoCobertura({
    segmentos: planillaApi.planilla?.segmentos ?? [],
    vehicles: core.vehicles,
    segmentoActivoId: planillaApi.segmentoActivo?.id ?? null,
    enabled: Boolean(user && planillaApi.planilla),
  });

  const bumpHuecos = useCallback(() => {
    setHuecosRefresh(n => n + 1);
  }, []);

  // Una sola reconciliación al montar (idle): abre hueco si ya estás sin cobertura.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      try {
        reconcileCoberturaHuecos({ vehicles: core.vehiclesRef.current });
        bumpHuecos();
      } catch {
        /* non-fatal */
      }
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(run, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // solo boot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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
      const id = await executeJornada4Launch({
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
      if (id) bumpHuecos();
      return id;
    },
    [user, core, planillaApi.planilla, planillaApi.segmentoActivo, resolverProyectoId, bumpHuecos]
  );

  const wrapClose = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
      async (...args: A) => {
        await fn(...args);
        bumpHuecos();
      },
    [bumpHuecos]
  );

  const opsWithHuecos = {
    ...ops,
    closeConquistaCycle: wrapClose(ops.closeConquistaCycle),
    closeSituacionBlock: wrapClose(ops.closeSituacionBlock),
    closeRapidoVehicle: wrapClose(ops.closeRapidoVehicle),
    closeSituacionLibreBloque: wrapClose(ops.closeSituacionLibreBloque),
  };

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
      className="min-h-screen pb-28"
      style={{ backgroundColor: "#0a0a0a" }}
      data-testid="jornada4-session"
    >
      <Jornada4Shell
        dualCount={core.dualCount}
        dailyPS={core.dailyPS}
        statusLine={statusLine}
      />
      <div className="max-w-lg mx-auto pt-1">
        {/* 01 · OPERAR — lo que estás haciendo ahora */}
        <Jornada4SectionLabel
          step="01"
          title="Operar"
          hint="Vehículos activos y lanzamiento"
          testId="jornada4-zone-operar"
        />
        <Jornada4VehicleList vehicles={core.dualVehicles} ops={opsWithHuecos} />
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

        {/* 02 · COBERTURA — urgencia + revisión de huecos */}
        <Jornada4SectionLabel
          step="02"
          title="Cobertura"
          hint="Pulso del día y cuándo se perdió tiempo"
          testId="jornada4-zone-cobertura"
        />
        <PulsoCobertura
          model={pulsoModel}
          showCta={Boolean(planillaApi.segmentoActivo)}
          sinSegmentos={(planillaApi.planilla?.segmentos.length ?? 0) === 0}
        />
        <CoberturaHuecosPanel refreshKey={huecosRefresh} />

        {/* 03 · PLAN — segmentos del día */}
        <Jornada4SectionLabel
          step="03"
          title="Plan"
          hint="Segmentos del día y puertas"
          testId="jornada4-zone-plan"
        />
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

        {/* 04 · MÉTRICAS — PS y bóveda */}
        <Jornada4SectionLabel
          step="04"
          title="Métricas"
          hint="PS del día y récords"
          testId="jornada4-zone-metricas"
        />
        <Jornada4DailyPsBar todayPs={core.dailyPS} yesterdayPs={yesterdayPs} />
        <Jornada4Boveda />
      </div>
    </div>
  );
}
