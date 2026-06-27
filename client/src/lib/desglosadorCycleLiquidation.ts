/**
 * Liquidación asíncrona del cierre global del desglosador.
 * Fase optimista (ms0) + fase sombra (macrotarea) para no bloquear la UI.
 */
import type { SegmentoV5, SubVehiculo, Vehicle } from "@/lib/persistence";
import {
  notifyVehicleClosed,
  updateVehicle,
  updateVehicleStatus,
  wasVehicleRecentlyClosed,
} from "@/lib/persistence";
import type { DesglosadorTiempoCloseSummary } from "@/lib/desglosadorTiempoCelebration";
import { computeDesglosadorTiempoCloseSummary } from "@/lib/desglosadorTiempoCelebration";
import {
  settleDesglosadorCyclePoints,
  sumDesglosadorSubsPsAlreadyGranted,
} from "@/lib/desglosadorPointsAward";
import { hasJournalSpSourcePrefix } from "@/lib/spLogHygiene";
import {
  enrichSubRutaCierre,
  computeRutaPrivilegioPS,
} from "@/lib/rutaSeguimiento";
import { mergeRutaCruzadaFromSubs, type RutaBandaId } from "@/lib/rutaEnfoque";
import { buildTermoDecisionSnapshot } from "@/lib/termodinamicaAtencional";
import { getJournalDayStartMs } from "@/lib/segmentTime";
import { decisionKeySubDesglosador, recordDecision } from "@/lib/decisionesLedger";
import { sealVehicleSessionClose } from "@/lib/vehicleSessionSeal";
import { armEntropyGapOnConsciousClose } from "@/engines/ConcienciaEngine";
import type { VehicleHistoryOpts } from "@/components/flota/vehicleCardShared";
import { runShadowTask, runShadowTaskAsync } from "@/lib/desglosadorShadow";

export type DesglosadorClosePatch = {
  status: "cumplido";
  cierreAt: number;
  duracionFinal: number;
  cierreManual: true;
  subVehiculos: SubVehiculo[];
  desglosadorBloqueDepthPsGranted: number;
  termoDecisionSnapshot: ReturnType<typeof buildTermoDecisionSnapshot>;
  interrupcionActiva: false;
  desglosadorPausa: undefined;
  intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite";
  rutaCruzada?: ReturnType<typeof mergeRutaCruzadaFromSubs>;
};

export type DesglosadorOptimisticDeps = {
  userId: string;
  vehicleId: string;
  vehicle: Vehicle;
  subs: SubVehiculo[];
  intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite";
  rutaDeclaradaGlobal?: RutaBandaId[];
  getAllVehicles: () => Vehicle[];
  patchAllVehicles: (mapper: (list: Vehicle[]) => Vehicle[]) => void;
  removeFromOptimisticRef: (vehicleId: string) => void;
  persistVehicles: () => void;
  segmentos: SegmentoV5[];
  onConquistaPulse: () => void;
  teardownSituacion?: (vehicleId: string) => void;
  markOrphanInterrupt?: (childId: string) => void;
};

export type DesglosadorOptimisticResult = {
  closePatch: DesglosadorClosePatch;
  subsConRuta: SubVehiculo[];
  childInterrupts: Vehicle[];
  cierreAt: number;
  duracionFinal: number;
  cumplidos: number;
  fallados: number;
  psRuta: number;
  rutaCruzada: ReturnType<typeof mergeRutaCruzadaFromSubs>;
};

export type SaveVehicleHistoryFn = (
  titulo: string,
  minPerUnit: number,
  totalMin: number,
  tipoReloj: string,
  userId?: string,
  opts?: VehicleHistoryOpts
) => void;

export type DesglosadorLiquidationDeps = {
  userId: string;
  vehicleId: string;
  vehicleSnapshot: Vehicle;
  subsConRuta: SubVehiculo[];
  closePatch: DesglosadorClosePatch;
  childInterrupts: Vehicle[];
  cierreAt: number;
  duracionFinal: number;
  cumplidos: number;
  fallados: number;
  psRuta: number;
  rutaCruzada: ReturnType<typeof mergeRutaCruzadaFromSubs>;
  intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite";
  getVehicle: () => Vehicle | undefined;
  patchVehicle: (vehicleId: string, patch: Partial<Vehicle>) => void;
  persistVehicles: () => void;
  flushPersistVehicles: () => void;
  saveVehicleHistory: SaveVehicleHistoryFn;
  getSpLogs: () => ReturnType<typeof import("@/lib/persistence").getLocalSPLog>;
  safeAwardPS: (amount: number, source: string) => Promise<boolean>;
  reconcileDepthPS: (
    vehicleId: string,
    opts?: { silent?: boolean }
  ) => Promise<{ grantedTotal: number; awardedNow: number }>;
  beginClose: () => void;
  endClose: () => void;
  onDailyPs: (total: number) => void;
  getDailyPsTotal: () => number;
  markPeldano?: (
    vehicle: Vehicle,
    subs: SubVehiculo[],
    sessionTotalPs: number
  ) => void;
  recordVehiculoCierre?: (vehicleId: string, intensidad: "fluido" | "concentrado" | "limite") => void;
  incrementModulePoints?: () => void;
  registrarEvento?: () => void;
  onCelebration: (vehicleId: string, titulo: string, summary: DesglosadorTiempoCloseSummary) => void;
  onToastSuccess?: (message: string, description: string) => void;
  onToastError?: (message: string) => void;
  /** Celebración ya mostrada en ms0 — omitir modal duplicado al final. */
  skipCelebration?: boolean;
};

const liquidationInFlight = new Set<string>();

export function isDesglosadorLiquidationInFlight(vehicleId: string): boolean {
  return liquidationInFlight.has(vehicleId);
}

/** Solo tests. */
export function resetDesglosadorLiquidationForTests(): void {
  liquidationInFlight.clear();
}

function buildSubsConRuta(
  subs: SubVehiculo[],
  rutaDeclaradaGlobal?: RutaBandaId[]
): SubVehiculo[] {
  return subs.map(sv => {
    if (!sv.rutaEnfoque?.activa || (sv.rutaDeclarada && sv.rutaDeclarada.length > 0)) return sv;
    if (!rutaDeclaradaGlobal?.length) return sv;
    return enrichSubRutaCierre(sv, rutaDeclaradaGlobal);
  });
}

/** Fase ms0 — patch local único, sin Firebase ni PS. */
export function applyDesglosadorCloseOptimistic(
  deps: DesglosadorOptimisticDeps
): DesglosadorOptimisticResult | null {
  const {
    userId,
    vehicleId,
    vehicle,
    subs,
    intensidadEnergeticaFin,
    rutaDeclaradaGlobal,
    getAllVehicles,
    patchAllVehicles,
    removeFromOptimisticRef,
    persistVehicles,
    segmentos,
    onConquistaPulse,
    teardownSituacion,
    markOrphanInterrupt,
  } = deps;

  if (vehicle.tipoFlota === "situacion") {
    teardownSituacion?.(vehicleId);
  }

  const cierreAt = Date.now();
  const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || 0;
  const duracionFinal = aperturaAt > 0 ? Math.round((cierreAt - aperturaAt) / 60000) : 0;
  const cumplidos = subs.filter(s => s.status === "cumplido").length;
  const fallados = subs.filter(s => s.status === "fallado").length;
  const rutaCruzada = mergeRutaCruzadaFromSubs(subs);
  const subsConRuta = buildSubsConRuta(subs, rutaDeclaradaGlobal);
  const psRuta = subsConRuta.reduce((sum, s) => sum + computeRutaPrivilegioPS(s), 0);

  const childInterrupts = getAllVehicles().filter(
    v =>
      v.status === "activo" &&
      !v.autoVerdad &&
      v.vehiculoPadreDesglosadorId === vehicleId &&
      !wasVehicleRecentlyClosed(v.id, v.clientRequestId)
  );

  if (childInterrupts.length > 0) {
    const nowChild = Date.now();
    for (const child of childInterrupts) {
      markOrphanInterrupt?.(child.id);
    }
    patchAllVehicles(list =>
      list.map(v =>
        childInterrupts.some(c => c.id === v.id)
          ? {
              ...v,
              status: "archivado" as const,
              cierreAt: nowChild,
              duracionFinal: Math.max(1, Math.round((nowChild - (v.aperturaAt || nowChild)) / 60000)),
              cierreManual: false,
            }
          : v
      )
    );
  }

  removeFromOptimisticRef(vehicleId);

  const termoDecisionSnapshot = buildTermoDecisionSnapshot(
    { ...vehicle, status: "cumplido", cierreAt, subVehiculos: subsConRuta },
    getJournalDayStartMs(cierreAt)
  );

  const closePatch: DesglosadorClosePatch = {
    status: "cumplido",
    cierreAt,
    duracionFinal,
    cierreManual: true,
    subVehiculos: subsConRuta,
    desglosadorBloqueDepthPsGranted: vehicle.desglosadorBloqueDepthPsGranted ?? 0,
    termoDecisionSnapshot,
    interrupcionActiva: false,
    desglosadorPausa: undefined,
    ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
    ...(rutaCruzada ? { rutaCruzada } : {}),
  };

  patchAllVehicles(list => list.map(v => (v.id === vehicleId ? { ...v, ...closePatch } : v)));
  onConquistaPulse();

  const shadowResult = {
    closePatch,
    subsConRuta,
    childInterrupts,
    cierreAt,
    duracionFinal,
    cumplidos,
    fallados,
    psRuta,
    rutaCruzada,
  };

  runShadowTask(() => {
    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
    sealVehicleSessionClose(vehicleId, {
      cierreAt,
      status: "cumplido",
      clientRequestId: vehicle.clientRequestId,
    });
    for (const child of childInterrupts) {
      notifyVehicleClosed(child.id, child.clientRequestId);
    }
    armEntropyGapOnConsciousClose({
      segmentos,
      vehiculosAfterClose: getAllVehicles(),
      cierreAt,
    });
  });

  return shadowResult;
}

export function scheduleGlobalCycleLiquidation(
  deps: DesglosadorLiquidationDeps,
  options?: {
    defer?: (run: () => void) => unknown;
    execute?: (deps: DesglosadorLiquidationDeps) => Promise<void>;
  }
): void {
  const defer = options?.defer ?? runShadowTaskAsync;
  const execute = options?.execute ?? executeGlobalCycleLiquidation;
  defer(() => {
    void execute(deps);
  });
}

/** Fase sombra — historial, Firebase, PS y celebración. */
export async function executeGlobalCycleLiquidation(
  deps: DesglosadorLiquidationDeps
): Promise<void> {
  const { vehicleId, userId } = deps;
  if (liquidationInFlight.has(vehicleId)) return;
  liquidationInFlight.add(vehicleId);
  deps.beginClose();

  const {
    vehicleSnapshot: vehicle,
    subsConRuta,
    closePatch,
    childInterrupts,
    cierreAt,
    duracionFinal,
    cumplidos,
    fallados,
    psRuta,
    rutaCruzada,
    intensidadEnergeticaFin,
  } = deps;

  try {
    for (const child of childInterrupts) {
      const nowChild = child.cierreAt ?? Date.now();
      void updateVehicle(userId, child.id, {
        status: "archivado",
        cierreAt: nowChild,
        duracionFinal: Math.max(1, Math.round((nowChild - (child.aperturaAt || nowChild)) / 60000)),
        cierreManual: false,
      }).catch(e => console.warn("[desglosadorLiquidation] interrupción:", child.id, e));
      void updateVehicleStatus(userId, child.id, "archivado").catch(e =>
        console.warn("[desglosadorLiquidation] interrupción status:", child.id, e)
      );
    }

    const closedSubs = subsConRuta.filter(s => s.status === "cumplido" || s.status === "fallado");

    for (const sv of subsConRuta) {
      if (sv.excluirDeHistorial) continue;
      if (
        sv.status === "cumplido" &&
        sv.cantidadLograda &&
        sv.cantidadLograda > 0 &&
        sv.duracionFinal &&
        sv.duracionFinal > 0
      ) {
        const minPerUnit = (sv.duracionFinal / 60) / sv.cantidadLograda;
        deps.saveVehicleHistory(
          `${vehicle.titulo} → ${sv.titulo}`,
          minPerUnit,
          sv.duracionFinal / 60,
          "desglosador",
          userId,
          { status: "cumplido" }
        );
      }
    }

    if (closedSubs.length > 0) {
      deps.saveVehicleHistory(vehicle.titulo, 0, duracionFinal, "desglosador_ciclo", userId, {
        status: "cumplido",
        cumplidos,
        fallados,
        totalSubs: subsConRuta.length,
        subResumen: closedSubs.map(sv => ({
          titulo: sv.titulo,
          status: sv.status as "cumplido" | "fallado",
          cantidadObjetivo: sv.cantidadObjetivo,
          cantidadLograda: sv.cantidadLograda,
          duracionMin: sv.duracionFinal != null ? Math.round(sv.duracionFinal / 60) : undefined,
          rutaDeclarada: sv.rutaDeclarada,
        })),
      });
    }

    for (const sv of subsConRuta) {
      if (sv.status !== "cumplido") continue;
      recordDecision(userId, {
        key: decisionKeySubDesglosador(vehicleId, sv.id),
        kind: "sub_desglosador",
        vehicleId,
        ts: sv.cierreAt ?? cierreAt,
      });
    }

    try {
      await updateVehicle(userId, vehicleId, closePatch);
      await updateVehicleStatus(userId, vehicleId, "cumplido");
    } catch (persistErr) {
      console.warn("[desglosadorLiquidation] Persistencia anticipada:", persistErr);
    }

    const { grantedTotal: depthPsGranted, awardedNow: depthPsAwardedNow } =
      await deps.reconcileDepthPS(vehicleId, { silent: true });

    if (depthPsGranted !== closePatch.desglosadorBloqueDepthPsGranted) {
      deps.patchVehicle(vehicleId, { desglosadorBloqueDepthPsGranted: depthPsGranted });
      deps.persistVehicles();
    }
    const closePatchFinal = { ...closePatch, desglosadorBloqueDepthPsGranted: depthPsGranted };

    const latestSubs = deps.getVehicle()?.subVehiculos ?? subsConRuta;
    const subsPsBefore = sumDesglosadorSubsPsAlreadyGranted(latestSubs);
    const spLogs = deps.getSpLogs();
    const skipCycleClose = hasJournalSpSourcePrefix(
      spLogs,
      `Cierre ciclo desglosador [${vehicleId}]`
    );
    const { subs: subsSettled, subsPsAwarded, cycleClosePs } = await settleDesglosadorCyclePoints(
      vehicleId,
      vehicle.titulo,
      latestSubs,
      deps.safeAwardPS,
      { skipCycleClose }
    );
    const subsPsTotal = subsPsBefore + subsPsAwarded;
    const sessionTotalPs = subsPsTotal + cycleClosePs + depthPsGranted;
    const closeDeltaPs = subsPsAwarded + cycleClosePs + depthPsAwardedNow;

    deps.onDailyPs(deps.getDailyPsTotal());

    await updateVehicle(userId, vehicleId, {
      ...closePatchFinal,
      subVehiculos: subsSettled,
    });
    await updateVehicleStatus(userId, vehicleId, "cumplido");

    deps.patchVehicle(vehicleId, { ...closePatchFinal, subVehiculos: subsSettled });
    deps.flushPersistVehicles();

    if (vehicle.proyectoId && vehicle.proyectoPeldanoId) {
      deps.markPeldano?.(
        { ...vehicle, ...closePatchFinal, duracionFinal, subVehiculos: subsSettled, ...(rutaCruzada ? { rutaCruzada } : {}) },
        subsSettled,
        sessionTotalPs
      );
    }
    if (intensidadEnergeticaFin) deps.recordVehiculoCierre?.(vehicleId, intensidadEnergeticaFin);
    deps.incrementModulePoints?.();
    deps.registrarEvento?.();

    const closedVehicle: Vehicle = {
      ...vehicle,
      ...closePatchFinal,
      subVehiculos: subsSettled,
      desglosadorBloqueDepthPsGranted: depthPsGranted,
    };
    const celebrationSummary = computeDesglosadorTiempoCloseSummary(closedVehicle, subsSettled, {
      duracionMin: duracionFinal,
      psSubs: subsPsTotal,
      psCierre: cycleClosePs,
      psProfundidad: depthPsGranted,
      psRuta,
      psTotal: sessionTotalPs,
      psAwardedNow: closeDeltaPs,
    });

    const showCelebration = () => {
      if (deps.skipCelebration) return;
      deps.onCelebration(vehicleId, vehicle.titulo, celebrationSummary);
      if (closeDeltaPs > 0) {
        deps.onToastSuccess?.(
          `+${closeDeltaPs} PS sumados a tu barra`,
          "Revisa el resumen del ciclo en pantalla."
        );
      }
    };
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(showCelebration);
    } else {
      showCelebration();
    }
  } catch (err) {
    console.error("[desglosadorLiquidation] Error:", err);
    deps.onToastError?.("Error al cerrar ciclo. El cierre local se conservó; reintenta si hace falta.");
  } finally {
    liquidationInFlight.delete(vehicleId);
    deps.endClose();
  }
}
