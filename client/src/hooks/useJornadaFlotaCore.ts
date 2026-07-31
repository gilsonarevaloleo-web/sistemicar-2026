/**
 * Núcleo liviano de flota para Jornada V4 (Dual Kernel).
 * Sin useDesglosadorManager: solo store, expand, rehydrate, launch deps.
 */
import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import {
  awardSovereigntyPoints,
  flushLocalVehicles,
  getDailyPointsLocalSync,
  getLocalVehicles,
  getParkedActiveVehicles,
  parkActiveVehiclesForResume,
  wasVehicleRecentlyClosed,
  type Vehicle,
} from "@/lib/persistence";
import {
  buildCentinelaArchiveFields,
  listActiveCentinelas,
} from "@/lib/centinelaEngine";
import { getJournalDayStartMs } from "@/lib/segmentTime";
import { readLocalFlota } from "@/services/jornadaFlotaCache";
import { cancelFlotaFetch, onJornadaVisibilityReturn } from "@/services/jornadaFlotaFetch";
import { refreshFlotaSession } from "@/flota/flotaStore";
import { useFlotaMutator, useFlotaVehiclesShallow } from "@/hooks/useModularStoreSelectors";
import { requestGhostReconcileAfterVehicleAction } from "@/lib/ghostReconcileScheduler";
import { recordFocusBandEvent } from "@/lib/focusBandLedger";
import { BLOOD, PIZARRA } from "@/components/flota/vehicleCardShared";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { rehydrateFlotaFromDiskSources } from "@/lib/flotaResume";

export type JornadaFlotaCore = {
  vehicles: Vehicle[];
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  vehiclesRef: React.MutableRefObject<Vehicle[]>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  optimisticVehiclesRef: React.MutableRefObject<Vehicle[]>;
  ghostReconcileRef: React.MutableRefObject<(() => void) | null | undefined>;
  rehydrateFlotaFromLocalRef: React.MutableRefObject<(() => void) | null | undefined>;
  setupFlotaSubscription: () => void;
  applyCentinelaArchiveLocally: (cierreAt: number) => void;
  safeAwardPS: (amount: number, source: string) => Promise<boolean>;
  recordVehiculoInicio: (vehicleId: string, banda?: "fluido" | "concentrado" | "limite") => void;
  scrollFlotaActivosIntoView: () => void;
  activeCount: number;
};

export function useJornadaFlotaCore(options?: {
  onDailyPsChange?: (total: number) => void;
}): JornadaFlotaCore {
  const onDailyPsChange = options?.onDailyPsChange;
  const { user } = useAuthContext();
  const vehicles = useFlotaVehiclesShallow(user?.uid);
  const setVehicles = useFlotaMutator();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const optimisticVehiclesRef = useRef<Vehicle[]>([]);
  const rehydrateFlotaFromLocalRef = useRef<(() => void) | null>(null);
  const flotaActivosRef = useRef<HTMLDivElement | null>(null);

  const ghostReconcileRef = useRef<(() => void) | null>(null);
  ghostReconcileRef.current = () => {
    if (user?.uid) requestGhostReconcileAfterVehicleAction(user.uid);
  };

  const scrollFlotaActivosIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      flotaActivosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const setupFlotaSubscription = useCallback(() => {
    if (!user) return;
    const cachedFlota = readLocalFlota(user.uid);
    if (cachedFlota.length > 0 && vehiclesRef.current.length === 0) {
      setVehicles(cachedFlota);
    }
    refreshFlotaSession({
      hasOptimisticPaint: cachedFlota.length > 0 || vehiclesRef.current.length > 0,
    });
  }, [user, setVehicles]);

  useEffect(() => {
    if (!user) return;
    setupFlotaSubscription();
    return () => cancelFlotaFetch();
  }, [user, setupFlotaSubscription]);

  useEffect(() => {
    if (!user) return;
    /** Hide/kill: escritura síncrona — el debounce de 500ms pierde el ring si el OS mata la pestaña. */
    const flushToLocal = () => {
      flushLocalVehicles(vehiclesRef.current);
      parkActiveVehiclesForResume(vehiclesRef.current);
    };
    const rehydrateFromLocal = () => {
      const nowMs = Date.now();
      const dayStart = getJournalDayStartMs(nowMs);
      const result = rehydrateFlotaFromDiskSources({
        memory: vehiclesRef.current,
        local: getLocalVehicles(),
        parked: getParkedActiveVehicles(),
        nowMs,
        dayStartMs: dayStart,
        wasRecentlyClosed: wasVehicleRecentlyClosed,
      });
      if (!result.changed) return;
      vehiclesRef.current = result.next;
      setVehicles(result.next);
      flushLocalVehicles(result.next);
      parkActiveVehiclesForResume(result.next);
    };
    rehydrateFlotaFromLocalRef.current = rehydrateFromLocal;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushToLocal();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushToLocal);
    // Bus de retorno (debounce 800ms): recupera ring/conquista tras app-switch.
    const unsubReturn = onJornadaVisibilityReturn(() => {
      rehydrateFlotaFromLocalRef.current?.();
    });
    return () => {
      rehydrateFlotaFromLocalRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushToLocal);
      unsubReturn();
    };
  }, [user, setVehicles]);

  const applyCentinelaArchiveLocally = useCallback(
    (cierreAt: number) => {
      if (listActiveCentinelas(vehiclesRef.current).length === 0) return;
      const patch = (list: Vehicle[]) =>
        list.map(v =>
          v.autoVerdad && v.status === "activo"
            ? { ...v, ...buildCentinelaArchiveFields(v, cierreAt) }
            : v
        );
      const next = patch(vehiclesRef.current);
      vehiclesRef.current = next;
      startTransition(() => setVehicles(patch));
      scheduleSaveLocalVehicles(next);
    },
    [setVehicles]
  );

  const safeAwardPS = useCallback(
    async (amount: number, source: string): Promise<boolean> => {
      if (!user) return false;
      try {
        // awardSovereigntyPoints escribe local + dispara evento antes de Firebase.
        await awardSovereigntyPoints(user.uid, amount, source);
        onDailyPsChange?.(getDailyPointsLocalSync(user.uid).total);
        return true;
      } catch (e) {
        console.error("[useJornadaFlotaCore.safeAwardPS]", e);
        // Local pudo haberse guardado antes del throw: refrescar barra igual.
        onDailyPsChange?.(getDailyPointsLocalSync(user.uid).total);
        toast.error("PS no registrados — reintenta", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return false;
      }
    },
    [user, onDailyPsChange]
  );

  const recordVehiculoInicio = useCallback(
    (vehicleId: string, banda?: "fluido" | "concentrado" | "limite") => {
      if (!user || !banda) return;
      void recordFocusBandEvent(user.uid, { source: "vehiculo_inicio", banda, vehicleId });
    },
    [user]
  );

  const activeCount = vehicles.filter(v => v.status === "activo" && !v.autoVerdad).length;

  return {
    vehicles,
    setVehicles,
    vehiclesRef,
    expandedId,
    setExpandedId,
    optimisticVehiclesRef,
    ghostReconcileRef,
    rehydrateFlotaFromLocalRef,
    setupFlotaSubscription,
    applyCentinelaArchiveLocally,
    safeAwardPS,
    recordVehiculoInicio,
    scrollFlotaActivosIntoView,
    activeCount,
  };
}
