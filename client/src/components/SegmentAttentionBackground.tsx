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
import { acquireFlotaStore, getFlotaVehicles, runFlotaMutationLockGuardian, subscribeFlotaStore } from "@/flota/flotaStore";
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
import { isMobilePerfMode, MOBILE_PERF } from "@/lib/mobilePerf";
import { registerVoiceVisibleHandler } from "@/lib/voiceLifecycle";
import { isInterModuleSyncBlocked } from "@/lib/viewTransitionShield";

const TICK_MS_FOREGROUND = 10_000;
const TICK_MS_BACKGROUND = 15_000;
/** Latido visual global — estrictamente 1 s en foreground (segunderos y sonidos). */
const CLOCK_MS_FOREGROUND = 1_000;
const CLOCK_MS_BACKGROUND = 5_000;
/** Deferir primer catch-up para no bloquear apertura de Jornada. */
const INITIAL_TICK_DEFER_MS = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_INITIAL_DEFER_MS : 6_000;
const MIN_TICK_GAP_MS = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_MIN_GAP_MS : 4_000;
const TICK_MS_FOREGROUND_BASE = isMobilePerfMode() ? MOBILE_PERF.ATTENTION_TICK_MS : 10_000;

/**
 * Motor global de segmentos: puertas, entropía y cierres por cruce.
 * Sigue activo en cualquier ruta de la app (no solo /planeacion).
 */
export function SegmentAttentionBackground() {
  const { user } = useAuthContext();
  const planillaRef = useRef<Planilla | null>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const planillaFechaRef = useRef(getJournalDateString());
  const tickingRef = useRef(false);
  const lastTickFinishedAt = useRef(0);
  const hasAccessRef = useRef(false);
  const progressionRef = useRef<UserProgression | null>(null);

  useEffect(() => {
    if (!user) return;

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

    const runTick = async (opts?: { force?: boolean }) => {
      if (isInterModuleSyncBlocked()) return;
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

    const unregisterForce = registerSegmentAttentionForceTick(() => {
      void runTick({ force: true });
    });

    let intervalMs = TICK_MS_FOREGROUND_BASE;
    let intervalId = window.setInterval(() => void runTick(), intervalMs);
    const initialTickId = window.setTimeout(() => void runTick({ force: true }), INITIAL_TICK_DEFER_MS);

    const pulseConcienciaClock = () => {
      runFlotaMutationLockGuardian();
      dispatchConcienciaClockTick();
    };

    let clockMs = CLOCK_MS_FOREGROUND;
    let clockId = window.setInterval(pulseConcienciaClock, clockMs);
    pulseConcienciaClock();

    const resetInterval = () => {
      clearInterval(intervalId);
      intervalMs = isAppInBackground() ? TICK_MS_BACKGROUND : TICK_MS_FOREGROUND_BASE;
      intervalId = window.setInterval(() => void runTick(), intervalMs);

      clearInterval(clockId);
      clockMs = isAppInBackground() ? CLOCK_MS_BACKGROUND : CLOCK_MS_FOREGROUND;
      clockId = window.setInterval(pulseConcienciaClock, clockMs);
      pulseConcienciaClock();
    };

    const unregisterVoiceVisible = registerVoiceVisibleHandler(() => {
      const flushed = flushMissedPuertaVoiceOnVisible();
      if (flushed > 0) {
        console.log(`[Voz] Reproduciendo ${flushed} aviso(s) de segundo plano`);
      }
      resetInterval();
      burstConcienciaClockTick(isMobilePerfMode() ? 1 : 3, isMobilePerfMode() ? 200 : 120);
      void runTick({ force: true });
      if (user) requestGhostReconcileAfterVehicleAction(user.uid);
    });

    return () => {
      unsubProg();
      unsubNotificationState();
      unsubPlanilla();
      unsubFlota();
      releaseFlota();
      unregisterForce();
      unregisterVoiceVisible();
      clearTimeout(initialTickId);
      clearInterval(intervalId);
      clearInterval(clockId);
      cancelAllNotifications();
    };
  }, [user]);

  return null;
}

export { runSegmentAttentionTickNow } from "@/lib/segmentAttentionCycle";
