import { useEffect, useRef } from "react";
import { useAuthContext } from "@/App";
import {
  getPlanillaHoy,
  hasPlanificacionBaseAccess,
  subscribeToPlanilla,
  subscribeToProgression,
  type Planilla,
  type UserProgression,
  type Vehicle,
} from "@/lib/persistence";
import { acquireFlotaStore, getFlotaVehicles, subscribeFlotaStore } from "@/flota/flotaStore";
import { requestGhostReconcileAfterVehicleAction } from "@/lib/ghostReconcileScheduler";
import { getJournalDateString } from "@/lib/segmentTime";
import {
  clearCruceWarnedIds,
  dispatchSegmentAttentionTick,
  dispatchSegmentDayRollover,
  registerSegmentAttentionForceTick,
  runSegmentAttentionCycle,
} from "@/lib/segmentAttentionCycle";
import {
  flushMissedPuertaVoiceOnVisible,
  isAppInBackground,
} from "@/lib/backgroundAttentionAlerts";
import {
  cancelAllNotifications,
  scheduleCrossEntropyNotifications,
  scheduleSegmentNotifications,
} from "@/lib/notifications";
import { registerNotificationStateProvider } from "@/lib/notificationState";
import { dispatchConcienciaClockTick, burstConcienciaClockTick } from "@/lib/concienciaClock";
import {
  enqueueConcienciaWork,
  ensureConcienciaSchedulerStarted,
  setSchedulerUiClockMs,
  stopConcienciaScheduler,
} from "@/lib/concienciaScheduler";
import { isMobilePerfMode, MOBILE_PERF, shouldRunMobileSurvival } from "@/lib/mobilePerf";
import { registerVoiceVisibleHandler } from "@/lib/voiceLifecycle";
import { isInterModuleSyncBlocked } from "@/lib/viewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { isProyectosHubPath } from "@/lib/jornadaBrand";
import { useLocation } from "wouter";

const TICK_MS_FOREGROUND = 10_000;
const TICK_MS_BACKGROUND = 15_000;
/** Latido visual global — estrictamente 1 s en foreground (segunderos y sonidos). */
const CLOCK_MS_FOREGROUND = 1_000;
const CLOCK_MS_BACKGROUND = 5_000;
/** Reposo foreground (sin vehículos activos): puntero/segunderos no aportan → latido lento. */
const CLOCK_MS_IDLE = 5_000;
/** Deferir primer catch-up para no bloquear apertura de Jornada. */
const INITIAL_TICK_DEFER_MS = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_INITIAL_DEFER_MS : 6_000;
const MIN_TICK_GAP_MS = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_MIN_GAP_MS : 4_000;
const TICK_MS_FOREGROUND_BASE = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_TICK_MS : 10_000;
const SEGMENT_WORK_KEY = "segment-attention-cycle";

/**
 * Motor global de segmentos: puertas, entropía y cierres por cruce.
 * Activo en casi toda la app — **pausado en Dual Kernel (`/jornada-v4`)**.
 */
export function SegmentAttentionBackground() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  // Quiet en Dual Kernel + soft-start al salir (evita freeze Jornada→Espejo).
  const dualKernelQuiet = useDualKernelMotorsQuiet();
  const onHubProyectos = isProyectosHubPath(location);
  const onHubProyectosRef = useRef(onHubProyectos);
  onHubProyectosRef.current = onHubProyectos;
  const planillaRef = useRef<Planilla | null>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const planillaFechaRef = useRef(getJournalDateString());
  const tickingRef = useRef(false);
  const lastTickFinishedAt = useRef(0);
  const hasAccessRef = useRef(false);
  const progressionRef = useRef<UserProgression | null>(null);

  useEffect(() => {
    if (!user || dualKernelQuiet) return;

    const unsubProg = subscribeToProgression(
      user.uid,
      p => {
        progressionRef.current = p;
        hasAccessRef.current = hasPlanificacionBaseAccess(
          p?.subscriptionPlan,
          user.email,
          p?.rank,
          p?.activeModules
        );
      },
      e => console.error("[SegmentAttentionBackground] progression", e)
    );

    // Preview unlock: hasPlanificacionBaseAccess pasa a true vía sessionStorage
    // sin nuevo snapshot de progression. No forzar tick aquí — INITIAL_TICK_DEFER
    // y el intervalo siguen; solo sincronizar el flag tras el primer paint.
    const syncPreviewAccessId = window.setTimeout(() => {
      if (!progressionRef.current) {
        hasAccessRef.current = hasPlanificacionBaseAccess(
          null,
          user.email,
          null,
          null
        );
        return;
      }
      const p = progressionRef.current;
      hasAccessRef.current = hasPlanificacionBaseAccess(
        p?.subscriptionPlan,
        user.email,
        p?.rank,
        p?.activeModules
      );
    }, INITIAL_TICK_DEFER_MS);

    const unsubNotificationState = registerNotificationStateProvider(() => {
      if (!planillaRef.current) return null;
      return {
        segmentos: planillaRef.current.segmentos,
        vehicles: vehiclesRef.current,
      };
    });

    void getPlanillaHoy(user.uid).then(p => {
      planillaRef.current = p;
      planillaFechaRef.current = p.fecha;
      if (hasAccessRef.current) {
        scheduleSegmentNotifications(p.segmentos);
        scheduleCrossEntropyNotifications(p.segmentos, vehiclesRef.current);
      }
    });

    const unsubPlanilla = subscribeToPlanilla(
      user.uid,
      planillaFechaRef.current,
      p => {
        planillaRef.current = p;
        if (hasAccessRef.current) {
          scheduleSegmentNotifications(p.segmentos);
          scheduleCrossEntropyNotifications(p.segmentos, vehiclesRef.current);
        }
      },
      e => console.error("[SegmentAttentionBackground] planilla", e)
    );

    const releaseFlota = acquireFlotaStore(user.uid);
    vehiclesRef.current = getFlotaVehicles();
    const unsubFlota = subscribeFlotaStore(() => {
      vehiclesRef.current = getFlotaVehicles();
      if (planillaRef.current && hasAccessRef.current) {
        scheduleCrossEntropyNotifications(planillaRef.current.segmentos, vehiclesRef.current);
      }
    });

    const executeSegmentCycle = async (opts?: { force?: boolean }) => {
      if (isInterModuleSyncBlocked()) return;
      if (shouldRunMobileSurvival()) {
        dispatchConcienciaClockTick();
        return;
      }
      if (!hasAccessRef.current || tickingRef.current) return;
      const planilla = planillaRef.current;
      if (!planilla) return;
      const now = Date.now();
      if (!opts?.force && now - lastTickFinishedAt.current < MIN_TICK_GAP_MS) return;

      tickingRef.current = true;
      try {
        const result = await runSegmentAttentionCycle(user.uid, {
          planilla,
          vehicles: vehiclesRef.current,
        });
        if (result.planilla) planillaRef.current = result.planilla;
        if (result.vehicles) vehiclesRef.current = result.vehicles;
        if (result.dayRolloverFecha) {
          planillaFechaRef.current = result.dayRolloverFecha;
          dispatchSegmentDayRollover(result.dayRolloverFecha);
        }
        if (result.changed) {
          dispatchSegmentAttentionTick();
        }
        dispatchConcienciaClockTick();
      } catch (e) {
        console.error("[SegmentAttentionBackground] tick", e);
      } finally {
        tickingRef.current = false;
        lastTickFinishedAt.current = Date.now();
      }
    };

    /** Intervalo solo encola; el scheduler drena con presupuesto de frame (Capa A). */
    const pendingForceRef = { current: false };
    const scheduleTick = (opts?: { force?: boolean }) => {
      if (opts?.force) pendingForceRef.current = true;
      enqueueConcienciaWork({
        key: SEGMENT_WORK_KEY,
        priority: "segment",
        run: () => {
          const force = pendingForceRef.current;
          pendingForceRef.current = false;
          return executeSegmentCycle({ force });
        },
      });
    };

    const unregisterForce = registerSegmentAttentionForceTick(() => {
      scheduleTick({ force: true });
    });

    let intervalMs = TICK_MS_FOREGROUND_BASE;
    let intervalId = window.setInterval(() => scheduleTick(), intervalMs);
    const initialTickId = window.setTimeout(() => scheduleTick({ force: true }), INITIAL_TICK_DEFER_MS);

    // B1: el latido de 1 s solo aporta con trabajo vivo (segunderos/puntero de
    // sesión activa). En reposo (sin vehículos activos) baja a cadencia lenta,
    // recortando re-renders globales sin afectar puertas/entropía, que van por
    // el ciclo de runTick (intervalId), independiente de este reloj visual.
    // En Hub Proyectos tampoco hace falta el latido 1 s: el ring sigue en
    // flotaStore pero no hay segunderos visibles — el 1 s clavaba el detalle.
    const computeClockMs = () => {
      if (isAppInBackground()) return CLOCK_MS_BACKGROUND;
      if (onHubProyectosRef.current) return CLOCK_MS_IDLE;
      const hasLiveWork = vehiclesRef.current.some(v => v.status === "activo");
      return hasLiveWork ? CLOCK_MS_FOREGROUND : CLOCK_MS_IDLE;
    };

    ensureConcienciaSchedulerStarted();
    const retuneClock = () => {
      setSchedulerUiClockMs(computeClockMs());
      dispatchConcienciaClockTick();
    };
    retuneClock();

    const unsubFlotaClock = subscribeFlotaStore(() => retuneClock());

    const resetInterval = () => {
      clearInterval(intervalId);
      intervalMs = isAppInBackground() ? TICK_MS_BACKGROUND : TICK_MS_FOREGROUND_BASE;
      intervalId = window.setInterval(() => scheduleTick(), intervalMs);
      retuneClock();
    };

    const unregisterVoiceVisible = registerVoiceVisibleHandler(() => {
      const flushed = flushMissedPuertaVoiceOnVisible();
      if (flushed > 0) {
        console.log(`[Voz] Reproduciendo ${flushed} aviso(s) de segundo plano`);
      }
      resetInterval();
      burstConcienciaClockTick(isMobilePerfMode() ? 1 : 3, isMobilePerfMode() ? 200 : 120);
      scheduleTick({ force: true });
      if (user) requestGhostReconcileAfterVehicleAction(user.uid);
    });

    return () => {
      unsubProg();
      unsubNotificationState();
      unsubPlanilla();
      unsubFlota();
      unsubFlotaClock();
      releaseFlota();
      unregisterForce();
      unregisterVoiceVisible();
      clearTimeout(syncPreviewAccessId);
      clearTimeout(initialTickId);
      clearInterval(intervalId);
      stopConcienciaScheduler();
      cancelAllNotifications();
    };
  }, [user, dualKernelQuiet, onHubProyectos]);

  return null;
}

export { runSegmentAttentionTickNow } from "@/lib/segmentAttentionCycle";
