import { startTransition } from "react";
import { generateStableUuid } from "@/lib/stableUuid";
import { suppressGhostReconcileAfterLaunch } from "@/lib/ghostReconcileScheduler";
import { burstConcienciaClockTick } from "@/lib/concienciaClock";
import { scheduleSaveLocalVehiclesAfterLaunch } from "@/lib/deferredVehicleSave";
import { runShadowTask } from "@/lib/desglosadorShadow";
import { enqueueLaunchPersistWork } from "@/lib/launchPersistGate";
import {
  closeCentinelasBeforeConsciousLaunch,
  suppressCentinela,
  resetCentinelaTimerState,
} from "@/lib/centinelaEngine";
import { recordConsciousVehicleLaunch } from "@/lib/entropyMonotonicStore";
import { scheduleVehicleRemotePersist, type Vehicle, type VehicleStatus } from "@/lib/persistence";
import { isMobilePerfMode } from "@/lib/mobilePerf";
import { suggestedSec } from "@/lib/desglosadorClock";
import type { MutableRefObject } from "react";

/** Expand situacional / conquista grande en móvil: deja respirar toast + primer paint. */
export const SITUACION_EXPAND_DELAY_MS = 700;
/** Conquista con muchos subs o proyección larga: un poco más de aire que situacional. */
export const CONQUISTA_HEAVY_EXPAND_DELAY_MS = 900;
/** ≥3 subs o ≥60 min proyectados → expand diferido en móvil. */
export const CONQUISTA_HEAVY_SUBS_MIN = 3;
export const CONQUISTA_HEAVY_PROJECTED_MIN = 60;

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

/** Minutos proyectados de cola (sugeridos / récord×cantidad). */
export function projectedConquistaMinutes(vehicle: Vehicle): number {
  const subs = vehicle.subVehiculos ?? [];
  let totalSec = 0;
  for (const s of subs) {
    const sec = suggestedSec(s);
    if (sec != null && sec > 0) totalSec += sec;
  }
  return Math.round(totalSec / 60);
}

/**
 * En móvil, diferir expand si la card es pesada (situacional o conquista grande).
 * Evita montar VehicleCard enorme en el mismo cluster que disco/Firebase ~2–4 s.
 */
export function shouldDeferHeavyExpand(vehicle: Vehicle): boolean {
  if (!isMobilePerfMode()) return false;
  if (vehicle.tipoFlota === "situacion") return true;
  if (vehicle.tipoReloj !== "desglosador") return false;
  const n = vehicle.subVehiculos?.length ?? 0;
  if (n >= CONQUISTA_HEAVY_SUBS_MIN) return true;
  return projectedConquistaMinutes(vehicle) >= CONQUISTA_HEAVY_PROJECTED_MIN;
}

function expandDelayMsFor(vehicle: Vehicle): number {
  if (vehicle.tipoFlota === "situacion") return SITUACION_EXPAND_DELAY_MS;
  return CONQUISTA_HEAVY_EXPAND_DELAY_MS;
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

  // Disco fuera de la ventana toast/expand — lee ref al disparar (no snapshot del launch).
  scheduleSaveLocalVehiclesAfterLaunch(() => vehiclesRef.current);
  suppressGhostReconcileAfterLaunch();

  // Burst de reloj fuera del frame del gesto (móvil: evita cascada de anillo/métricas).
  globalThis.setTimeout(() => burstConcienciaClockTick(1), 120);

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
    // Card pesada en móvil: no expandir al instante del toast (conquista grande = situacional).
    if (shouldDeferHeavyExpand(optimisticVehicle)) {
      setTimeout(expand, expandDelayMsFor(optimisticVehicle));
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

/**
 * Sombra post-lanzamiento:
 * - NO llama addVehicle (ya pintamos + disco after-launch).
 * - Persist remoto quiet + pilares + centinela vía launchPersistGate
 *   (oculto/idle/cierre de sub) — sin bomba a 28s que clava el reloj conquista.
 */
export function scheduleFlotaLaunchShadow(params: FlotaLaunchShadowParams): void {
  const { userId, vehiclePayload, provisionalId, clientRequestId, vehiclesSnapshot } = params;

  // Inmediato y barato: apaga timer de centinela sin tocar Firebase.
  suppressCentinela();
  resetCentinelaTimerState();
  recordConsciousVehicleLaunch();

  enqueueLaunchPersistWork(provisionalId, "remote", () => {
    scheduleVehicleRemotePersist(userId, provisionalId, vehiclePayload, clientRequestId);
  });

  enqueueLaunchPersistWork(provisionalId, "centinela", () => {
    runShadowTask(() => {
      void closeCentinelasBeforeConsciousLaunch(userId, vehiclesSnapshot);
    });
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

/** Pilares (PS, termo, proyecto) en el mismo gate — no a N+2 segundos. */
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
  enqueueLaunchPersistWork(vehicleId, "pillars", () => {
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
