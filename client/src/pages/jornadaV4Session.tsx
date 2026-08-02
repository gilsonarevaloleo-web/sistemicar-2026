/**
 * Sesión Dual Kernel — segmentos + proyectos + alertas puerta + PS + flota + Crisol.
 * UI móvil en pestañas (Operar / Plan / Métricas).
 * Plan y Métricas van en chunks lazy; Operar queda liviano (sin Pulso/recharts).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import {
  Jornada4MobileNav,
  type Jornada4MobileTab,
} from "@/components/jornada4/Jornada4MobileNav";
import { Jornada4LaunchPanel } from "@/components/jornada4/Jornada4LaunchPanel";
import { Jornada4VehicleList } from "@/components/jornada4/Jornada4VehicleList";
import PlaneacionCrisolDock from "@/components/planeacion/PlaneacionCrisolDock";
import { useJornada4Core } from "@/hooks/useJornada4Core";
import { useJornada4Crisol } from "@/hooks/useJornada4Crisol";
import { useJornada4Ops } from "@/hooks/useJornada4Ops";
import { useJornada4Planilla } from "@/hooks/useJornada4Planilla";
import { useJornada4PuertaAlerts } from "@/hooks/useJornada4PuertaAlerts";
import { useJornada4SegmentAttention } from "@/hooks/useJornada4SegmentAttention";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  executeJornada4Launch,
  type Jornada4LaunchForm,
} from "@/jornada4/executeJornada4Launch";
import { reconcileCoberturaHuecos } from "@/jornada4/coberturaHuecosLog";
import { ensureJornada4NotificationPermission } from "@/jornada4/puertaWindowAlerts";
import { unlockPuertaAudio } from "@/jornada4/puertaChime";
import { computePuertaPanorama } from "@/jornada4/segmentAttentionJ4";
import { usePlanificacionEntitlements } from "@/hooks/usePlanificacionEntitlements";

const Jornada4PlanTab = lazy(() => import("@/components/jornada4/Jornada4PlanTab"));
const Jornada4MetricasTab = lazy(
  () => import("@/components/jornada4/Jornada4MetricasTab")
);

function TabChunkFallback({ label }: { label: string }) {
  return (
    <div
      className="mx-4 my-6 rounded-xl border px-3 py-4 text-center text-[11px] uppercase tracking-widest"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        color: "#64748b",
        backgroundColor: "rgba(0,0,0,0.25)",
      }}
      data-testid="jornada4-tab-fallback"
    >
      {label}
    </div>
  );
}

export default function JornadaV4Session() {
  const { user } = useAuthContext();
  const entitlements = usePlanificacionEntitlements();
  const core = useJornada4Core();
  const lastLaunchRef = useRef<{ key: string; at: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<Jornada4MobileTab>("operar");
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
  // Toasts de puerta en sombra (sin tick UI en el root). Badges viven en PlanTab.
  useJornada4PuertaAlerts(planillaApi.planilla, Boolean(user), false);
  // Atención siempre activa: auto-apertura/entropía deben correr también en Operar.
  useJornada4SegmentAttention({
    userId: user?.uid,
    planilla: planillaApi.planilla,
    busySegId: planillaApi.busySegId,
    enabled: Boolean(user),
  });
  const ops = useJornada4Ops({
    userId: user?.uid,
    vehiclesRef: core.vehiclesRef,
    setVehicles: core.setVehicles,
    safeAwardPS: core.safeAwardPS,
    segmentoActivo: planillaApi.segmentoActivo,
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

  // Un gesto desbloquea AudioContext (móvil) para que el timbre de puerta suene.
  useEffect(() => {
    const unlock = () => {
      void unlockPuertaAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Prefetch Plan/Métricas en idle — primer cambio de pestaña sin cold parse.
  useEffect(() => {
    let cancelled = false;
    const prefetch = () => {
      if (cancelled) return;
      void import("@/components/jornada4/Jornada4PlanTab");
      void import("@/components/jornada4/Jornada4MetricasTab");
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(prefetch, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(prefetch, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

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

  const handleLaunch = useCallback(
    async (form: Jornada4LaunchForm) => {
      if (!user) return null;
      if (form.tipoFlota === "situacion" && !entitlements.hasRitmo) {
        window.location.href = "/pagos?plan=operativo";
        return null;
      }
      const id = await executeJornada4Launch({
        userId: user.uid,
        form,
        vehiclesRef: core.vehiclesRef,
        setVehicles: core.setVehicles,
        setExpandedId: core.setExpandedId,
        planilla: planillaApi.planilla,
        segmentoActivo: planillaApi.segmentoActivo,
        resolverProyectoId: entitlements.hasNorte
          ? resolverProyectoId
          : () => undefined,
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
    [
      user,
      core,
      planillaApi.planilla,
      planillaApi.segmentoActivo,
      resolverProyectoId,
      bumpHuecos,
      entitlements.hasRitmo,
      entitlements.hasNorte,
    ]
  );

  const wrapClose = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
      async (...args: A) => {
        await fn(...args);
        bumpHuecos();
      },
    [bumpHuecos]
  );

  const opsWithHuecos = useMemo(
    () => ({
      ...ops,
      closeConquistaCycle: wrapClose(ops.closeConquistaCycle),
      closeSituacionBlock: wrapClose(ops.closeSituacionBlock),
      closeRapidoVehicle: wrapClose(ops.closeRapidoVehicle),
      closeSituacionLibreFila: wrapClose(ops.closeSituacionLibreFila),
      closeSituacionLibreBloque: wrapClose(ops.closeSituacionLibreBloque),
      closeExpressVehicle: wrapClose(ops.closeExpressVehicle),
    }),
    [ops, wrapClose]
  );

  const puertaPanorama = useMemo(
    () => computePuertaPanorama(planillaApi.planilla?.segmentos ?? []),
    [planillaApi.planilla]
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
                  ? proyectoVinculadoActivo && entitlements.hasNorte
                    ? `${planillaApi.segmentoActivo.nombre} · ${proyectoVinculadoActivo.titulo}`
                    : planillaApi.segmentoActivo.nombre
                  : null
              }
              proyectosHub={entitlements.hasNorte ? proyectosHub : []}
              defaultProyectoId={
                entitlements.hasNorte
                  ? planillaApi.segmentoActivo?.proyectoVinculadoId ?? null
                  : null
              }
              canSituacion={entitlements.hasRitmo}
              canProyectos={entitlements.hasNorte}
            />
            <Jornada4VehicleList vehicles={core.dualVehicles} ops={opsWithHuecos} />
          </div>
        ) : null}

        {mobileTab === "plan" ? (
          <>
            {!entitlements.hasRitmo ? (
              <div role="tabpanel" data-testid="jornada4-panel-plan">
                <div
                  className="mx-3 mb-3 sm:mx-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10"
                  data-testid="jornada4-ritmo-upsell"
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    Ritmo del día
                  </p>
                  <p className="text-sm text-slate-200 mt-1 leading-snug">
                    Segmentos y Situacional ordenan el día. Base ya te da Conquista (unidades).
                  </p>
                  <a
                    href="/pagos?plan=operativo"
                    className="inline-flex mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-300 underline"
                  >
                    Activar Ritmo →
                  </a>
                </div>
              </div>
            ) : (
              <Suspense fallback={<TabChunkFallback label="Cargando plan…" />}>
                <Jornada4PlanTab
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
                  proyectosHub={entitlements.hasNorte ? proyectosHub : []}
                  vehicles={core.vehicles}
                  huecosRefresh={huecosRefresh}
                  notifPermission={notifPermission}
                  onRequestNotifPermission={() => {
                    void unlockPuertaAudio();
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
              </Suspense>
            )}
            {!entitlements.hasNorte ? (
              <div
                className="mx-3 mt-2 sm:mx-4 p-4 rounded-xl border border-sky-500/30 bg-sky-500/10"
                data-testid="jornada4-norte-upsell"
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                  Norte
                </p>
                <p className="text-sm text-slate-200 mt-1 leading-snug">
                  Crisol + Hub Proyectos: el peldaño de alto valor para quien ya cierra el día.
                </p>
                <a
                  href="/pagos?plan=soberania_dia"
                  className="inline-flex mt-3 text-[10px] font-black uppercase tracking-wider text-sky-300 underline"
                >
                  Activar Norte →
                </a>
              </div>
            ) : null}
          </>
        ) : null}

        {mobileTab === "metricas" ? (
          <Suspense fallback={<TabChunkFallback label="Cargando métricas…" />}>
            <Jornada4MetricasTab
              userId={user?.uid}
              segmentos={planillaApi.planilla?.segmentos ?? []}
              todayPs={core.dailyPS}
            />
          </Suspense>
        ) : null}
      </div>

      {entitlements.hasNorte ? (
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
          panoramaHeadline={
            puertaPanorama.total > 0 ? puertaPanorama.headline : undefined
          }
          panoramaSubline={
            puertaPanorama.total > 0 ? puertaPanorama.subline : undefined
          }
          panoramaMantra={
            puertaPanorama.total > 0 ? puertaPanorama.mantra : undefined
          }
        />
      ) : null}
    </div>
  );
}
