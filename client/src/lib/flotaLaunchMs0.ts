import { startTransition } from "react";
import { generateStableUuid } from "@/lib/stableUuid";
import { suppressGhostReconcileAfterLaunch } from "@/lib/ghostReconcileScheduler";
import { burstConcienciaClockTick } from "@/lib/concienciaClock";
import { scheduleSaveLocalVehiclesAfterLaunch } from "@/lib/deferredVehicleSave";
import { runShadowTaskAfterLaunch } from "@/lib/desglosadorShadow";
import { enqueueConcienciaWork } from "@/lib/concienciaScheduler";
import { closeCentinelasBeforeConsciousLaunch } from "@/lib/centinelaEngine";
import { addVehicle, type Vehicle, type VehicleStatus } from "@/lib/persistence";
import { isMobilePerfMode } from "@/lib/mobilePerf";
import type { MutableRefObject } from "react";

/** Expand situacional en móvil: deja respirar toast + primer paint de la card. */
export const SITUACION_EXPAND_DELAY_MS = 700;

export type FlotaLaunchOptimisticParams = {
  userId: string;
  optimisticVehicle: Vehicle;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  optimisticVehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  setExpandedId?: (id: string | null) => void;
  /** Expande situacion y desglosador conquista tras el primer paint (nunca en el frame del gesto). */
  expandIfSituacion?: boolean;
  scrollFlotaActivosIntoView?: () => void;
  onAfterPaint?: () => void;
};

function shouldExpandAfterPaint(vehicle: Vehicle, expandFlag?: boolean): boolean {
  if (!expandFlag) return false;
  return vehicle.tipoFlota === "situacion" || vehicle.tipoReloj === "desglosador";
}

/** ms0: pinta vehículo en memoria + store sin await Firebase ni centinela remoto. */
export function paintFlotaLaunchOptimistic(params: FlotaLaunchOptimisticParams): void {
  const {
    optimisticVehicle,
    vehiclesRef,
    optimisticVehiclesRef,
    setVehicles,
    setExpandedId,
    expandIfSituacion,
    scrollFlotaActivosIntoView,
    onAfterPaint,
  } = params;

  const newVehicleId = optimisticVehicle.id;

  optimisticVehiclesRef.current = [
    ...optimisticVehiclesRef.current.filter(v => v.id !== newVehicleId),
    optimisticVehicle,
  ];
  vehiclesRef.current = [
    optimisticVehicle,
    ...vehiclesRef.current.filter(v => v.id !== newVehicleId),
  ];

  // ms0: lista en memoria ya actualizada; React en transición.
  startTransition(() => {
    setVehicles(prev => {
      const withoutDupe = prev.filter(v => v.id !== newVehicleId);
      return [optimisticVehicle, ...withoutDupe];
    });
  });

  // Disco fuera de la ventana toast/expand (no microtask → debounce 500ms).
  scheduleSaveLocalVehiclesAfterLaunch(vehiclesRef.current);
  suppressGhostReconcileAfterLaunch();

  // Burst de reloj fuera del frame del gesto (móvil: evita cascada de anillo/métricas).
  enqueueConcienciaWork({
    key: `launch-clock-burst:${newVehicleId}`,
    priority: "low",
    run: () => burstConcienciaClockTick(1),
  });

  const deferHeavyUi = (fn: () => void) => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => startTransition(fn));
      });
    } else {
      setTimeout(() => startTransition(fn), 32);
    }
  };

  if (shouldExpandAfterPaint(optimisticVehicle, expandIfSituacion) && setExpandedId) {
    const expand = () => deferHeavyUi(() => setExpandedId(newVehicleId));
    // Situacional monta VehicleCard enorme: en móvil no expandir al instante del toast.
    if (optimisticVehicle.tipoFlota === "situacion" && isMobilePerfMode()) {
      setTimeout(expand, SITUACION_EXPAND_DELAY_MS);
    } else {
      expand();
    }
  }
  if (scrollFlotaActivosIntoView) {
    deferHeavyUi(scrollFlotaActivosIntoView);
  }
  if (onAfterPaint) {
    deferHeavyUi(onAfterPaint);
  }
}

export function deferFlotaFormReset(reset: () => void): void {
  const run = () => startTransition(reset);
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 120);
  }
}

export type FlotaLaunchShadowParams = {
  userId: string;
  vehiclePayload: Omit<Vehicle, "id" | "createdAt" | "userId" | "status">;
  provisionalId: string;
  clientRequestId: string;
  vehiclesSnapshot: Vehicle[];
};

/** Sombra: centinela Firebase + persistencia remota tras ventana crítica post-toast. */
export function scheduleFlotaLaunchShadow(params: FlotaLaunchShadowParams): void {
  const { userId, vehiclePayload, provisionalId, clientRequestId, vehiclesSnapshot } = params;
  runShadowTaskAfterLaunch(() => {
    void (async () => {
      await closeCentinelasBeforeConsciousLaunch(userId, vehiclesSnapshot);
      await addVehicle(userId, vehiclePayload, { provisionalId, clientRequestId });
    })();
  });
}

export type FlotaLaunchPillarShadowParams = {
  bonoTemple?: boolean;
  titulo: string;
  vehicleId: string;
  intensidadEnergetica?: "fluido" | "concentrado" | "limite";
  safeAwardPS?: (points: number, reason: string) => void | Promise<void | boolean>;
  recordVehiculoInicio?: (
    vehicleId: string,
    banda?: "fluido" | "concentrado" | "limite"
  ) => void;
  markPeldano?: () => void | Promise<void>;
};

/** Pilares (PS, termo, proyecto) siempre en sombra tras ms0 estable. */
export function scheduleFlotaLaunchPillarShadow(params: FlotaLaunchPillarShadowParams): void {
  const {
    bonoTemple,
    titulo,
    vehicleId,
    intensidadEnergetica,
    safeAwardPS,
    recordVehiculoInicio,
    markPeldano,
  } = params;
  runShadowTaskAfterLaunch(() => {
    void (async () => {
      if (markPeldano) await markPeldano();
      if (intensidadEnergetica && recordVehiculoInicio) {
        recordVehiculoInicio(vehicleId, intensidadEnergetica);
      }
      if (bonoTemple && safeAwardPS) {
        await safeAwardPS(10, "VOLUNTAD SOBRE EL HORARIO: " + titulo);
      }
    })();
  });
}

export function newFlotaLaunchIds(): { provisionalId: string; clientRequestId: string } {
  return {
    provisionalId: generateStableUuid(),
    clientRequestId: `crq_${generateStableUuid()}`,
  };
}

export function buildOptimisticVehicleShell(
  base: Omit<Vehicle, "id" | "createdAt" | "userId" | "status"> & { id: string; clientRequestId: string },
  userId: string
): Vehicle {
  return {
    ...base,
    userId,
    status: "activo" as VehicleStatus,
    createdAt: new Date(),
  };
}

/** Exportado para tests: decide si la card se abre tras paint. */
export { shouldExpandAfterPaint };
