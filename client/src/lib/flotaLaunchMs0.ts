import { startTransition } from "react";
import { generateStableUuid } from "@/lib/stableUuid";
import { suppressGhostReconcileAfterLaunch } from "@/lib/ghostReconcileScheduler";
import { burstConcienciaClockTick } from "@/lib/concienciaClock";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";
import { closeCentinelasBeforeConsciousLaunch } from "@/lib/centinelaEngine";
import { addVehicle, type Vehicle, type VehicleStatus } from "@/lib/persistence";
import type { MutableRefObject } from "react";

export type FlotaLaunchOptimisticParams = {
  userId: string;
  optimisticVehicle: Vehicle;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  optimisticVehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  setExpandedId?: (id: string | null) => void;
  expandIfSituacion?: boolean;
  scrollFlotaActivosIntoView?: () => void;
  onAfterPaint?: () => void;
};

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

  setVehicles(prev => {
    const withoutDupe = prev.filter(v => v.id !== newVehicleId);
    return [optimisticVehicle, ...withoutDupe];
  });

  scheduleSaveLocalVehicles(vehiclesRef.current);
  burstConcienciaClockTick(1);
  suppressGhostReconcileAfterLaunch();

  if (expandIfSituacion && optimisticVehicle.tipoFlota === "situacion" && setExpandedId) {
    setExpandedId(newVehicleId);
  }
  scrollFlotaActivosIntoView?.();
  onAfterPaint?.();
}

export function deferFlotaFormReset(reset: () => void): void {
  startTransition(() => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => reset(), { timeout: 1200 });
    } else {
      setTimeout(reset, 0);
    }
  });
}

export type FlotaLaunchShadowParams = {
  userId: string;
  vehiclePayload: Omit<Vehicle, "id" | "createdAt" | "userId" | "status">;
  provisionalId: string;
  clientRequestId: string;
  vehiclesSnapshot: Vehicle[];
};

/** Sombra: centinela Firebase + persistencia remota tras ms0. */
export function scheduleFlotaLaunchShadow(params: FlotaLaunchShadowParams): void {
  const { userId, vehiclePayload, provisionalId, clientRequestId, vehiclesSnapshot } = params;
  void runShadowTaskAsync(async () => {
    await closeCentinelasBeforeConsciousLaunch(userId, vehiclesSnapshot);
    await addVehicle(userId, vehiclePayload, { provisionalId, clientRequestId });
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
  void runShadowTaskAsync(async () => {
    if (markPeldano) await markPeldano();
    if (intensidadEnergetica && recordVehiculoInicio) {
      recordVehiculoInicio(vehicleId, intensidadEnergetica);
    }
    if (bonoTemple && safeAwardPS) {
      await safeAwardPS(10, "VOLUNTAD SOBRE EL HORARIO: " + titulo);
    }
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
