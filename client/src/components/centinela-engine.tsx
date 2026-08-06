import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/App";
import {
  getLocalVehicles,
  reconcileGhostActiveVehicles,
  reconcileStaleCentinelaInFirestore,
  subscribeToPlanilla,
  subscribeToVehicles,
  updateVehicle,
  updateVehicleStatus,
  type Planilla,
  type Vehicle,
} from "@/lib/persistence";
import { getJournalDateString, getJournalDayStartMs } from "@/lib/segmentTime";
import {
  activateCentinelaVehicle,
  archiveActiveCentinelasWhenBlocked,
  CENTINELA_DELAY_MS,
  computeCentinelaUiState,
  emitCentinelaUi,
  getCentinelaSegmentGate,
  isCentinelaBlockedByVehicles,
  isCentinelaSuppressed,
  materializeRetroactiveCentinelas,
  maybeReleaseStaleSuppression,
  resetCentinelaTimerState,
} from "@/lib/centinelaEngine";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { isProyectosHubPath } from "@/lib/jornadaBrand";
import { useLocation } from "wouter";

const CENTINELA_MAX_AGE_MS = 8 * 3600 * 1000;
/** En Hub Proyectos el tick UI 1 s pelea con abrir detalles — bajar a 5 s. */
const CENTINELA_UI_MS_DEFAULT = 1_000;
const CENTINELA_UI_MS_HUB = 5_000;

/** Motor global del Centinela — pausado en Dual Kernel (`/jornada-v4`). */
export function CentinelaEngine() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  // Quiet en Dual Kernel + soft-start al salir (evita freeze Jornada→Espejo).
  const dualKernelQuiet = useDualKernelMotorsQuiet();
  const onHubProyectos = isProyectosHubPath(location);
  const [planillaFecha, setPlanillaFecha] = useState(() => getJournalDateString());
  const vehiclesRef = useRef<Vehicle[]>([]);
  const planillaRef = useRef<Planilla | null>(null);
  const noVehicleSince = useRef(0);
  const lastCheck = useRef(0);
  const forceCheckRef = useRef<(() => void) | null>(null);
  const retroMaterializing = useRef(false);
  const lastRetroMaterializeAt = useRef(0);

  useEffect(() => {
    if (dualKernelQuiet) return;
    const tick = () => {
      const f = getJournalDateString();
      setPlanillaFecha(prev => (prev !== f ? f : prev));
    };
    const interval = setInterval(tick, 60_000);
    tick();
    return () => clearInterval(interval);
  }, [dualKernelQuiet]);

  useEffect(() => {
    if (!user || dualKernelQuiet) return;

    const fecha = planillaFecha;
    const unsubPlanilla = subscribeToPlanilla(
      user.uid,
      fecha,
      p => {
        planillaRef.current = p;
      },
      e => console.error("[CentinelaEngine] planilla:", e)
    );

    const unsubVehicles = subscribeToVehicles(
      user.uid,
      data => {
        vehiclesRef.current = data;
      },
      e => console.error("[CentinelaEngine] vehicles:", e)
    );

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    maybeReleaseStaleSuppression();

    const runRetroMaterialize = async () => {
      if (!planillaRef.current?.segmentos?.length) return;
      if (retroMaterializing.current) return;
      const now = Date.now();
      if (now - lastRetroMaterializeAt.current < 120_000) return;
      retroMaterializing.current = true;
      try {
        const ids = await materializeRetroactiveCentinelas(
          user.uid,
          planillaRef.current,
          vehiclesRef.current,
          now
        );
        if (ids.length > 0) {
          lastRetroMaterializeAt.current = now;
          console.log("[Centinela] Retro materializados:", ids.join(", "));
        }
      } finally {
        retroMaterializing.current = false;
      }
    };

    const resetTimer = () => {
      noVehicleSince.current = 0;
      resetCentinelaTimerState();
    };

    const checkExpiredCentinela = async () => {
      const activeCentinela = vehiclesRef.current.find(v => v.autoVerdad && v.status === "activo");
      if (activeCentinela?.aperturaAt) {
        const dayStartMs = getJournalDayStartMs();
        const age = Date.now() - activeCentinela.aperturaAt;
        const isExpired =
          activeCentinela.aperturaAt < dayStartMs || age > CENTINELA_MAX_AGE_MS;
        if (isExpired) {
          const dur = Math.round(age / 60000);
          try {
            await updateVehicle(user.uid, activeCentinela.id, {
              cierreAt: Date.now(),
              duracionFinal: dur,
            });
            await updateVehicleStatus(user.uid, activeCentinela.id, "archivado");
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("SISTEMICAR - Centinela Cerrado", {
                body: `Sesi├│n anterior cerrada autom├íticamente. Duraci├│n registrada: ${dur} min.`,
                icon: "/favicon.ico",
                silent: false,
              });
            }
            console.log("[Centinela] Auto-cerrado. Duraci├│n:", dur, "min");
          } catch (e) {
            console.error("[Centinela autoclose]", e);
          }
        }
      }
      await reconcileStaleCentinelaInFirestore(user.uid);
    };

    const tickUi = async () => {
      const now = Date.now();
      const vehicles = vehiclesRef.current;

      if (isCentinelaBlockedByVehicles(vehicles)) {
        const closed = await archiveActiveCentinelasWhenBlocked(user.uid, vehicles);
        if (closed.length > 0) {
          console.log("[Centinela] Archivados por trabajo consciente:", closed.join(", "));
        }
        resetTimer();
      }

      const { ui, since } = computeCentinelaUiState(
        planillaRef.current,
        vehicles,
        now,
        noVehicleSince.current
      );
      noVehicleSince.current = since;
      emitCentinelaUi(ui);
    };

    const checkActivate = async () => {
      if (isCentinelaSuppressed()) return;

      const now = Date.now();
      if (now - lastCheck.current < 5000) return;
      lastCheck.current = now;

      const vehicles = vehiclesRef.current;
      const gate = getCentinelaSegmentGate(planillaRef.current, now);
      if (!gate.allowed) {
        resetTimer();
        return;
      }

      if (isCentinelaBlockedByVehicles(vehicles)) {
        await archiveActiveCentinelasWhenBlocked(user.uid, vehicles);
        resetTimer();
        return;
      }

      if (vehicles.some(v => v.autoVerdad && v.status === "activo")) return;

      const { closedIds, hasActiveRemote } = await reconcileStaleCentinelaInFirestore(user.uid);
      if (closedIds.length > 0) {
        console.log("[Centinela] Limpiados obsoletos:", closedIds.join(", "));
      }
      const ghostClosed = await reconcileGhostActiveVehicles(user.uid);
      if (ghostClosed.length > 0) {
        console.log("[Centinela] Ghost activos cerrados:", ghostClosed.join(", "));
      }

      if (hasActiveRemote) {
        const localCentinela = vehiclesRef.current.some(v => v.autoVerdad && v.status === "activo");
        if (!localCentinela) {
          emitCentinelaUi({
            esperaSec: 0,
            blockReason: "Centinela activo en la nube ÔÇö sincronizandoÔÇª",
          });
          console.log("[Centinela] Remote activo sin sync local ÔÇö esperando");
          return;
        }
        console.log("[Centinela] Ya hay uno activo en la nube ÔÇö esperando sync local");
        return;
      }

      const { since } = computeCentinelaUiState(
        planillaRef.current,
        vehiclesRef.current,
        now,
        noVehicleSince.current
      );
      noVehicleSince.current = since;

      const elapsedWait = now - since;
      if (elapsedWait < CENTINELA_DELAY_MS) return;

      if (isCentinelaSuppressed()) return;
      if (isCentinelaBlockedByVehicles(vehiclesRef.current)) return;

      const centinelaAperturaAt = Date.now();
      console.log("[Centinela] Activando tras", Math.round(elapsedWait / 1000), "s sin veh├¡culos");
      await activateCentinelaVehicle(user.uid, centinelaAperturaAt);
      resetTimer();
    };

    forceCheckRef.current = () => {
      lastCheck.current = 0;
      void checkActivate();
    };

    const localVehicles = getLocalVehicles();
    if (isCentinelaBlockedByVehicles(localVehicles)) {
      resetTimer();
    }

    void checkExpiredCentinela();
    void reconcileGhostActiveVehicles(user.uid);
    void tickUi();
    setTimeout(() => { void runRetroMaterialize(); }, 12_000);

    const uiMs = onHubProyectos ? CENTINELA_UI_MS_HUB : CENTINELA_UI_MS_DEFAULT;
    const uiInterval = setInterval(() => { void tickUi(); }, uiMs);
    const activateInterval = setInterval(() => {
      void checkActivate();
    }, 5000);

    const onVehiclesLocalSync = () => {
      const local = getLocalVehicles();
      if (local.length > 0) {
        vehiclesRef.current = local;
      }
      lastCheck.current = 0;
      void tickUi();
    };
    window.addEventListener("vehicles-updated", onVehiclesLocalSync);
    window.addEventListener("vehicles-status-changed", onVehiclesLocalSync);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      console.log("[Centinela] App visible — reevaluando");
      void checkExpiredCentinela();
      if (Date.now() - lastRetroMaterializeAt.current >= 120_000) {
        void runRetroMaterialize();
      }
      lastCheck.current = 0;
      setTimeout(() => forceCheckRef.current?.(), 3000);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubPlanilla();
      unsubVehicles();
      clearInterval(uiInterval);
      clearInterval(activateInterval);
      window.removeEventListener("vehicles-updated", onVehiclesLocalSync);
      window.removeEventListener("vehicles-status-changed", onVehiclesLocalSync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, planillaFecha, dualKernelQuiet, onHubProyectos]);

  return null;
}
