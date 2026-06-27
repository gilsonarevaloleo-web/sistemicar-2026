import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, startTransition } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import {
  addVehicle,
  updateVehicleStatus,
  updateVehicle,
  Vehicle,
  saveMision,
  MisionScores,
  recordMissionResult,
  awardSovereigntyPoints,
  incrementModulePoints,
  subscribeToPlanilla,
  Planilla,
  SubTarea,
  DetalleSubTarea,
  SubVehiculo,
  saveLocalVehicles,
  flushLocalVehicles,
  getLocalVehicles,
  parkActiveVehiclesForResume,
  getParkedActiveVehicles,
  clearParkedActiveVehicles,
  getDailyPointsLocalSync,
  getLocalSPLog,
  notifyVehicleClosed,
  wasVehicleRecentlyClosed,
  isOrphanDesglosadorInterrupt,
  reconcileStaleCentinelaInFirestore,
  saveVehicleHistoryFirebase,
  VehicleHistoryEntry,
} from "@/lib/persistence";
import { requestGhostReconcileAfterVehicleAction } from "@/lib/ghostReconcileScheduler";
import { shouldPreserveLocalActivo, isGhostActiveVehicle } from "@/lib/ghostVehicleEngine";
import { clearCruceWarnedIds } from "@/lib/segmentAttentionCycle";
import { isWithinSegmentTimeMargin } from "@/lib/segmentTime";
import {
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  vehicleMissionClosePS,
  VEHICLE_CUMPLIDO_BASE_PS,
} from "@/lib/sovereigntyPointsConfig";
import {
  awardDesglosadorSubPointsIfNeeded,
  sumDesglosadorSubsPsAlreadyGranted,
} from "@/lib/desglosadorPointsAward";
import {
  applyDesglosadorCloseOptimistic,
  isDesglosadorLiquidationInFlight,
  scheduleGlobalCycleLiquidation,
} from "@/lib/desglosadorCycleLiquidation";
import { runShadowTask } from "@/lib/desglosadorShadow";
import {
  registerDesglosadorDepthReconciler,
  scheduleDesglosadorDepthOnTap,
  syncDesglosadorDepthActiveIds,
} from "@/services/desglosadorDepthShadow";
import {
  dispatchDesglosadorDepthVoice,
  dispatchDesglosadorSubCloseVoice,
  dispatchDesglosadorSubIntroVoiceOnce,
  dispatchSituacionFilaCloseVoice,
} from "@/lib/desglosadorVoiceDispatch";
import type { DesglosadorTiempoCloseSummary } from "@/lib/desglosadorTiempoCelebration";
import { computeDesglosadorTiempoCloseSummary } from "@/lib/desglosadorTiempoCelebration";
import { hasJournalSpExactSource } from "@/lib/spLogHygiene";
import {
  archiveActiveCentinelas,
  buildCentinelaArchiveFields,
  closeCentinelasBeforeConsciousLaunch,
  isCentinelaBlockedByVehicles,
  isInvisibleCentinelaVehicle,
  listActiveCentinelas,
  releaseCentinela,
} from "@/lib/centinelaEngine";
import { clearStuckDesglosadorPause, archiveOrphanDesglosadorInterrupts } from "@/lib/situacionSessionMerge";
import type { RutaBandaId } from "@/lib/rutaEnfoque";
import type { RutaSeguimientoPatron } from "@/lib/rutaSeguimiento";
import { unlockSpeechSynthesis, warmupSpeechSynthesis } from "@/lib/speechQueue";
import { speakRingBienvenida } from "@/lib/situacionAlerts";
import { resetPuntoCeroVoiceQueue } from "@/lib/puntoCeroVoice";
import { teardownSituacionSession } from "@/lib/situacionSessionTeardown";
import { suppressSituacionFilaVoiceAfterSellar } from "@/lib/ringSellarVoiceSuppress";
import { RING_COPY, reanudarSituacionCronometroRing, ringSessionOperable } from "@/lib/ringEnfoqueReal";
import { getDesglosadorSessionElapsedSec } from "@/lib/desglosadorClock";
import {
  aplicarTiempoGanadoAlCumplir,
  absorberSaldoAdelantoEnFoco,
  applyCupoManualYRedistribuir,
  quitarMinutosHaciaFoco,
  redistribuirMinutosSituacionCronometro,
  remainingCronometroBudgetMin,
  cerrarCronometroDeGolpe,
  resolveCronometroCupoAnchor,
  registrarCierreFalladoCronometro,
  extraerSubTareaAReserva,
  isCupoFijo,
  resolveFocusSubTareaId,
  situacionFilaCronometroPendiente,
  totalBudgetMinFromCronometro,
  vehicleNeedsCupoAnchorSync,
  buildSellarDirectoEnRingState,
} from "@/lib/situacionCupoDistrib";
import {
  bolsaDisponibleSegundoReto,
  buildSituacionCronometroCierre,
  nextRetoNumero,
  situacionContratoFinMs,
  situacionMinutosHastaObjetivoHora,
  situacionObjetivoHoraToContratoMs,
  resolveDefaultObjetivoHoraParaRing,
  describeRepartoGananciaEnCola,
} from "@/lib/situacionGanancia";
import type { PuntoCeroSession } from "@/lib/puntoCeroTypes";
import {
  etapasConColoresCompletos,
  initPuntoCeroSession,
  parsePuntoCeroDuracionMin,
  todosColoresConfirmados,
} from "@/engines/PuntoCeroEngine";
import {
  computeDesglosadorSessionDepthPS,
  depthAwardForHour,
} from "@/lib/desglosadorDepth";
import { DESGLOSADOR_CYCLE_CLOSE_BASE_PS } from "@/lib/sovereigntyPointsConfig";
import {
  firstPendingCronometroTexto,
  firstPendingSubVehiculoTitulo,
  reorderSubTareasCronometro,
  reorderSubVehiculos,
  type ReorderDirection,
} from "@/lib/desglosadorReorder";
import {
  addSituacionReserva,
  deleteSituacionReserva,
  getReservaActivas,
  RUTA_TACTICA_META,
  sortReservasTacticas,
  subscribeToSituacionReserva,
  updateSituacionReservaEstado,
  updateSituacionReservaRuta,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";
import { recordFocusBandEvent } from "@/lib/focusBandLedger";
import { buildTermoDecisionSnapshot, inferBandaBloque, psEspectroBloque } from "@/lib/termodinamicaAtencional";
import {
  decisionKeyMision,
  decisionKeySubDesglosador,
  decisionKeySubSituacion,
  recordDecision,
} from "@/lib/decisionesLedger";
import { repairStuckSituacionVehicles, vehiclesReactiveSignature } from "@/lib/situacionRepair";
import { syncRingDecisionToProyectoHub } from "@/lib/syncRingDecisionToProyectoHub";
import { registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import {
  markPeldanoConquistadoSituacion,
  markPeldanoConquistadoTiempo,
} from "@/lib/proyectos";
import {
  aplicarProyectoHeredadoASub,
  dominanteProyectoIdEnSubs,
  imanItemsParaDesglosador,
  NIDO_INBOX_ID,
  nidoKeyFromReserva,
  proyectoMetaParaReservaDesdeSub,
  reservaEsEnviabeASituacion,
  resolveProyectoIdEnfoqueSituacion,
  subTareaConPasoEjecutado,
  subTareaFromImanItem,
} from "@/lib/imanPensamientos";
import {
  assertCanOpenVehicle,
  formatOperationalSlotsBlockMessage,
  isDesglosadorCrossSegmentExempt,
} from "@/lib/vehicleOperationalSlots";
import {
  getJournalDateString,
  getJournalDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/segmentTime";
import { resolveVehicleSegmentContext } from "@/lib/segmentVehicleAssign";
import {
  cancelFlotaFetch,
  setFlotaPaintedCount,
} from "@/services/jornadaFlotaFetch";
import { writeLocalFlota } from "@/services/jornadaFlotaCache";
import {
  registerFlotaMergeContext,
  refreshFlotaSession,
  getFlotaMergedSignature,
  getFlotaVehicles,
  setFlotaVehicles,
} from "@/flota/flotaStore";
import { buildFlotaActivosRenderList } from "@/flota/flotaRenderUtils";
import { useFlotaMutator, useFlotaVehiclesShallow } from "@/hooks/useModularStoreSelectors";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  buildDesglosadorNestedPausePatch,
  buildNestedParentResumePatch,
  buildSituacionNestedPausePatch,
  findActiveDesglosadorForNestedStack,
  findActiveSituacionRingForNestedStack,
  findNestedParentAwaitingPuntoCeroResume,
  resumeDesglosadorFromNestedPause,
} from "@/lib/nestedContextStack";
import { scheduleDeferredVehicleCleanup } from "@/lib/vehicleDeferredCleanup";
import { generateStableUuid } from "@/lib/stableUuid";
import { isEntropyDebugEnabled } from "@/components/EntropiaDebugPanel";
import { requestNotificationPermission } from "@/lib/notifications";
import { auth } from "@/lib/firebase";
import {
  GOLD, AZURE, EMERALD, VIOLET, SLATE, BLOOD, PIZARRA, NARANJA, PLATA, VERDE, GRIS, CYAN,
  cleanSubTitulo,
  buildDesglosadorSubFromRuntime,
  type SituacionDesgloseSummary,
  type CierreEnergiaModalPayload,
  type DesglosadorSubFormRow,
  computeSituacionDesgloseSummary,
  situacionDesgloseBloqueTerminado,
  situacionDesgloseBloqueListo,
  playSituacionChimes,
  getHistoricalVehicleData,
} from "@/components/flota/vehicleCardShared";

import type { VehicleHistoryOpts } from "@/components/flota/vehicleCardShared";

const saveVehicleHistory = (
  titulo: string,
  minPerUnit: number,
  totalMin: number,
  tipoReloj: string,
  userId?: string,
  opts?: VehicleHistoryOpts
) => {
  if (opts?.excluirDeHistorial) return;
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    const history: VehicleHistoryEntry[] = data ? JSON.parse(data) : [];
    const newEntry: VehicleHistoryEntry = { titulo, minPerUnit, totalMin, tipoReloj, fecha: Date.now(), ...opts };
    history.push(newEntry);
    if (history.length > 200) history.splice(0, history.length - 200);
    localStorage.setItem("sistemicar_vehicle_history", JSON.stringify(history));
    if (userId) {
      saveVehicleHistoryFirebase(userId, history).catch(e => console.warn("[vehicleHistory] Firebase save error:", e));
      if (auth?.currentUser) {
        auth.currentUser.getIdToken().then(token =>
          fetch("/api/vehicle-history", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
              entries: [{
                titulo: newEntry.titulo,
                minPerUnit: newEntry.minPerUnit,
                totalMin: newEntry.totalMin,
                tipoReloj: newEntry.tipoReloj,
                fecha: newEntry.fecha,
                status: newEntry.status,
                subResumen: newEntry.subResumen ? JSON.stringify(newEntry.subResumen) : undefined,
              }],
            }),
          })
        ).then(r => {
          if (!r.ok) console.warn("[vehicleHistory] Backend save non-2xx:", r.status);
        }).catch(e => console.warn("[vehicleHistory] Backend save error:", e));
      }
    }
  } catch {}
};

const STUB_EJES = { enfoque: { text: "", trifecta: "omitir" as const }, conflicto: { text: "", trifecta: "omitir" as const }, pasos: { text: "", trifecta: "omitir" as const }, limite: { text: "", trifecta: "omitir" as const } };

function parseTimeString(t: string): { h: number; m: number } | null {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { h: parseInt(match[1]), m: parseInt(match[2]) };
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeStringToMinutes(t: string): number {
  const parsed = parseTimeString(t);
  if (!parsed) return 0;
  return parsed.h * 60 + parsed.m;
}

const LOCAL_FLOTA_STORAGE_KEY = "sistemicar_vehicles";

function coerceValidDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (Number.isFinite(d.getTime())) return d;
  }
  return null;
}

function hasInvalidFlotaStructure(v: Vehicle): boolean {
  if (v.subTareas != null && !Array.isArray(v.subTareas)) return true;
  if (v.subVehiculos != null && !Array.isArray(v.subVehiculos)) return true;
  if (v.aperturaAt != null && (typeof v.aperturaAt !== "number" || !Number.isFinite(v.aperturaAt))) return true;
  if (v.cierreAt != null && (typeof v.cierreAt !== "number" || !Number.isFinite(v.cierreAt))) return true;
  return false;
}

/** Fase 1 — parser tolerante; detecta caché corrupta o desalineada tras cambio de jornada. */
function parseLocalFlotaForRehydrate(): { vehicles: Vehicle[]; corrupt: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_FLOTA_STORAGE_KEY);
  } catch {
    return { vehicles: [], corrupt: true };
  }
  if (!raw) return { vehicles: [], corrupt: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { vehicles: [], corrupt: true };
  }
  if (!Array.isArray(parsed)) return { vehicles: [], corrupt: true };
  if (parsed.length === 0) return { vehicles: [], corrupt: false };

  const sanitized: Vehicle[] = [];
  let corrupt = false;

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      corrupt = true;
      continue;
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== "string" || !rec.id) {
      corrupt = true;
      continue;
    }
    try {
      const createdAt = coerceValidDate(rec.createdAt);
      if (!createdAt) {
        corrupt = true;
        continue;
      }
      const tiempoInicio = coerceValidDate(rec.tiempoInicio) ?? createdAt;
      const completedAt =
        rec.completedAt != null ? coerceValidDate(rec.completedAt) ?? undefined : undefined;
      const vehicle: Vehicle = {
        ...(item as Vehicle),
        createdAt,
        tiempoInicio,
        completedAt,
      };
      if (hasInvalidFlotaStructure(vehicle)) {
        corrupt = true;
        continue;
      }
      sanitized.push(vehicle);
    } catch {
      corrupt = true;
    }
  }

  if (sanitized.length === 0 && parsed.length > 0) corrupt = true;

  sanitized.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { vehicles: sanitized, corrupt };
}

function purgeCorruptLocalFlotaBuffer(): void {
  try {
    localStorage.removeItem(LOCAL_FLOTA_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
  clearParkedActiveVehicles();
  setFlotaVehicles([]);
  setFlotaPaintedCount(0);
}

function safeVehicleTimestampMs(
  v: Vehicle,
  ...fields: Array<"cierreAt" | "aperturaAt" | "createdAt">
): number {
  for (const field of fields) {
    if (field === "createdAt") {
      const t =
        v.createdAt instanceof Date
          ? v.createdAt.getTime()
          : typeof (v.createdAt as unknown) === "number"
            ? (v.createdAt as unknown as number)
            : NaN;
      if (Number.isFinite(t) && t > 0) return t;
      continue;
    }
    const t = v[field];
    if (typeof t === "number" && Number.isFinite(t) && t > 0) return t;
  }
  return 0;
}

function safeVehicleClosedAtMs(v: Vehicle): number {
  return safeVehicleTimestampMs(v, "cierreAt", "aperturaAt", "createdAt");
}

function formatHistorialDateKey(tsMs: number): string | null {
  if (!Number.isFinite(tsMs) || tsMs <= 0) return null;
  const d = new Date(tsMs);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}


export type UseDesglosadorManagerOptions = {
  onDailyPsChange?: (total: number) => void;
  onConquistaPulse?: () => void;
  onGoldenFlash?: () => void;
  onRecordBanner?: (banner: { mejora: number; titulo: string } | null) => void;
};

export type DesglosadorManagerReturn = ReturnType<typeof useDesglosadorManager>;
export type DesglosadorManagerHandlers = DesglosadorManagerReturn["handlers"];
export type DesglosadorManagerModales = DesglosadorManagerReturn["modales"];
export type DesglosadorManagerVehicles = DesglosadorManagerReturn["vehicles"];

export function useDesglosadorManager(options?: UseDesglosadorManagerOptions) {
  const { user } = useAuthContext();

  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const planillaFecha = getJournalDateString();
  const journalDayStartMs = useMemo(() => getJournalDayStartMs(), [planillaFecha]);
  const flotaSortAnchorMin = useMemo(() => getCurrentTimeMinutes(), [planillaFecha]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPlanilla(user.uid, planillaFecha, (p) => setPlanilla(p), (e) => console.error(e));
    return unsub;
  }, [user, planillaFecha]);

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") || null;
  }, [planilla]);

  const { proyectosHub, resolverProyectoId, volcarMetricasAlHub } = useSegmentoProyectoVinculo(user?.uid, segmentoActivo);

  const imanProyectos = useMemo(
    () =>
      proyectosHub.map(p => ({
        id: p.id,
        titulo: p.titulo,
        etiqueta: p.etiqueta,
        color: p.color,
      })),
    [proyectosHub]
  );

  const showEntropyDebug = useMemo(() => isEntropyDebugEnabled(), []);

  useEffect(() => {
    try {
      repairStuckSituacionVehicles();
    } catch {
      /* noop */
    }
  }, []);

  const vehiclesFromSubscriber = useFlotaVehiclesShallow(user?.uid);
  const setVehicles = useFlotaMutator();
  const [flotaPaintEpoch, setFlotaPaintEpoch] = useState(0);
  const vehicles = useMemo(() => {
    void flotaPaintEpoch;
    const live = getFlotaVehicles();
    return live.length > 0 || vehiclesFromSubscriber.length === 0 ? live : vehiclesFromSubscriber;
  }, [vehiclesFromSubscriber, flotaPaintEpoch]);
  const optimisticVehiclesRef = useRef<Vehicle[]>([]);
  const closingInProgressRef = useRef<Map<string, number>>(new Map());
  const CLOSING_STALE_MS = 45_000;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const flotaActivosRef = useRef<HTMLDivElement | null>(null);
  const prevActiveVehicleCountRef = useRef<number | null>(null);
  const [situacionReserva, setSituacionReserva] = useState<SituacionReservaItem[]>([]);
  const reservaActivas = useMemo(() => getReservaActivas(situacionReserva), [situacionReserva]);
  const ghostReconcileRef = useRef<(() => void) | null>(null);
  ghostReconcileRef.current = () => {
    if (user?.uid) requestGhostReconcileAfterVehicleAction(user.uid);
  };
  const vehiclesRef = useRef(vehicles);
  const rehydrateFlotaFromLocalRef = useRef<(() => void) | null>(null);
  const mergedVehiclesSigRef = useRef("");
  const centinelaArchiveAttemptSigRef = useRef("");
  const desglosadorSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pausaInterrupcionLockRef = useRef<string | null>(null);
  const centinelaArchiveInFlightRef = useRef(false);
  const checkPuertaAtencionRef = useRef<(() => void) | null>(null);
  const ringSellarInFlightRef = useRef(new Set<string>());
  const scrollFlotaActivosIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      flotaActivosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  /** Fase ms0 — desbloqueo TTS en el gesto del operador (móvil). */
  const unlockDesglosadorSpeechFromGesture = useCallback(() => {
    unlockSpeechSynthesis(true);
    warmupSpeechSynthesis(true, true);
  }, []);

  const dispatchDesglosadorVoiceOnGesture = useCallback((
    dispatch: () => void
  ) => {
    unlockDesglosadorSpeechFromGesture();
    dispatch();
  }, [unlockDesglosadorSpeechFromGesture]);
  vehiclesRef.current = vehicles;
  const vehicleById = (vehicleId: string) =>
    vehiclesRef.current.find(v => v.id === vehicleId) ?? vehicles.find(v => v.id === vehicleId);
  const isCloseBlocked = (vehicleId: string): boolean => {
    const started = closingInProgressRef.current.get(vehicleId);
    if (started == null) return false;
    if (Date.now() - started > CLOSING_STALE_MS) {
      closingInProgressRef.current.delete(vehicleId);
      return false;
    }
    return true;
  };
  const beginClose = (vehicleId: string) => {
    closingInProgressRef.current.set(vehicleId, Date.now());
  };
  const endClose = (vehicleId: string) => {
    closingInProgressRef.current.delete(vehicleId);
    ghostReconcileRef.current?.();
  };

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSituacionReserva(user.uid, setSituacionReserva, e => console.error(e));
    return () => unsub();
  }, [user]);

  const consciousActiveSignature = useMemo(
    () =>
      vehicles
        .filter(v => v.status === "activo" && !v.autoVerdad)
        .map(v => v.id)
        .sort()
        .join(","),
    [vehicles]
  );
  const desglosadorPauseSignature = useMemo(
    () =>
      vehicles
        .filter(v => v.tipoReloj === "desglosador" && v.status === "activo")
        .map(v => `${v.id}:${v.interrupcionActiva ? 1 : 0}:${v.desglosadorPausa?.subActivoId ?? ""}`)
        .sort()
        .join("|"),
    [vehicles]
  );
  const orphanInterruptSignature = useMemo(
    () =>
      vehicles
        .filter(v => v.status === "activo" && v.vehiculoPadreDesglosadorId)
        .map(v => `${v.id}:${v.vehiculoPadreDesglosadorId}:${v.clientRequestId ?? ""}`)
        .sort()
        .join("|"),
    [vehicles]
  );
  const recordRutaBandCross = useCallback((payload: {
    vehicleId: string;
    subId: string;
    subTitulo: string;
    banda: RutaBandaId;
  }) => {
    if (!user) return;
    void recordFocusBandEvent(user.uid, {
      source: "ruta_cruce",
      banda: payload.banda,
      vehicleId: payload.vehicleId,
      subVehicleId: payload.subId,
      subTitulo: payload.subTitulo,
    });
  }, [user]);

  const recordVehiculoInicio = useCallback((vehicleId: string, banda?: "fluido" | "concentrado" | "limite") => {
    if (!user || !banda) return;
    void recordFocusBandEvent(user.uid, { source: "vehiculo_inicio", banda, vehicleId });
  }, [user]);

  const recordVehiculoCierre = useCallback((vehicleId: string, banda?: "fluido" | "concentrado" | "limite") => {
    if (!user || !banda) return;
    void recordFocusBandEvent(user.uid, { source: "vehiculo_cierre", banda, vehicleId });
  }, [user]);

  const recordDescansoCuerpo = useCallback((vehicleId: string) => {
    if (!user) return;
    void recordFocusBandEvent(user.uid, { source: "descanso_cuerpo", banda: "fluido", vehicleId });
  }, [user]);
  const [cierreEnergiaPending, setCierreEnergiaPending] = useState<CierreEnergiaModalPayload | null>(null);
  const [cierreEnergiaSeleccion, setCierreEnergiaSeleccion] = useState<"fluido" | "concentrado" | "limite" | null>(null);
  const [cierreRutaSeleccion, setCierreRutaSeleccion] = useState<Set<RutaBandaId>>(new Set());
  const [cierreRutaSinUso, setCierreRutaSinUso] = useState(false);
  const [cierreRutaPatron, setCierreRutaPatron] = useState<RutaSeguimientoPatron | null>(null);
  const [situacionDesgloseCelebration, setSituacionDesgloseCelebration] = useState<{
    vehicleId: string;
    titulo: string;
    summary: SituacionDesgloseSummary;
  } | null>(null);
  const [desglosadorTiempoCelebration, setDesglosadorTiempoCelebration] = useState<{
    vehicleId: string;
    titulo: string;
    summary: DesglosadorTiempoCloseSummary;
  } | null>(null);
  const situacionBloqueCelebratedRef = useRef<Set<string>>(new Set());
  const [situacionBloqueSummaries, setSituacionBloqueSummaries] = useState<
    Record<string, SituacionDesgloseSummary>
  >({});
  const openSituacionDesgloseCelebration = useCallback(
    (vehicleId: string, titulo: string, summary: SituacionDesgloseSummary) => {
      setSituacionBloqueSummaries(prev => ({ ...prev, [vehicleId]: summary }));
      setSituacionDesgloseCelebration({ vehicleId, titulo, summary });
    },
    []
  );

  const openDesglosadorTiempoCelebration = useCallback(
    (vehicleId: string, titulo: string, summary: DesglosadorTiempoCloseSummary) => {
      setDesglosadorTiempoCelebration({ vehicleId, titulo, summary });
    },
    []
  );

  const presentSituacionDesgloseCelebration = useCallback(
    (vehicleId: string, titulo: string, vehicleForSummary: Vehicle) => {
      const summary = computeSituacionDesgloseSummary(vehicleForSummary);
      window.requestAnimationFrame(() => {
        openSituacionDesgloseCelebration(vehicleId, titulo, summary);
      });
      return summary;
    },
    [openSituacionDesgloseCelebration]
  );
  const safeAwardPS = useCallback(async (amount: number, source: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await awardSovereigntyPoints(user.uid, amount, source);
      options?.onDailyPsChange?.(getDailyPointsLocalSync(user.uid).total);
      return true;
    } catch (e) {
      console.error("[safeAwardPS]", e);
      toast.error("PS no registrados — reintenta", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return false;
    }
  }, [user]);

  const recordBloqueCierre = useCallback((payload: {
    vehicleId: string;
    sub: SubVehiculo;
    status: string;
  }) => {
    if (!user || payload.status !== "cumplido") return;

    const vehicle = vehiclesRef.current.find(v => v.id === payload.vehicleId);
    if (vehicle?.tipoReloj === "desglosador") {
      runShadowTask(() => {
        void (async () => {
          const { sub, awarded } = await awardDesglosadorSubPointsIfNeeded(
            vehicle.titulo,
            payload.sub,
            safeAwardPS
          );
          if (awarded > 0) {
            const patchOne = (list: Vehicle[]) =>
              list.map(v => {
                if (v.id !== payload.vehicleId) return v;
                const subs = (v.subVehiculos ?? []).map(s => (s.id === sub.id ? sub : s));
                return { ...v, subVehiculos: subs };
              });
            setVehicles(patchOne);
            vehiclesRef.current = patchOne(vehiclesRef.current);
            saveLocalVehicles(vehiclesRef.current);
            const subVehiculos = vehiclesRef.current.find(v => v.id === payload.vehicleId)?.subVehiculos;
            if (subVehiculos) {
              void updateVehicle(user.uid, payload.vehicleId, { subVehiculos }).catch(e =>
                console.warn("[recordBloqueCierre] psOtorgados sync:", e)
              );
            }
            toast.success(`+${awarded} PS · ${cleanSubTitulo(sub.titulo)}`, {
              description: `Sub cumplido (+${DESGLOSADOR_SUB_CUMPLIDO_PS} base${awarded > DESGLOSADOR_SUB_CUMPLIDO_PS ? " + ruta" : ""}) · sumado a tu barra del día`,
              style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
              duration: 2800,
            });
          }
        })();
      });
    }

    void recordFocusBandEvent(user.uid, {
      source: "bloque_cierre",
      banda: inferBandaBloque(payload.sub),
      vehicleId: payload.vehicleId,
      subVehicleId: payload.sub.id,
      subTitulo: payload.sub.titulo,
      psEspectro: psEspectroBloque(payload.sub),
    });
  }, [user, safeAwardPS]);
  const setupFlotaSubscription = useCallback(() => {
    if (!user) return;

    const { vehicles: cachedFlota, corrupt } = parseLocalFlotaForRehydrate();

    if (corrupt) {
      console.warn("[flota] Caché local corrupta o desalineada — purga y fetch limpio desde Firebase");
      purgeCorruptLocalFlotaBuffer();
      refreshFlotaSession({ hasOptimisticPaint: false });
      return;
    }

    if (cachedFlota.length > 0 && vehiclesRef.current.length === 0) {
      setVehicles(cachedFlota);
      console.log("[flota] UI optimista", cachedFlota.length, "vehículos");
    }

    refreshFlotaSession({ hasOptimisticPaint: cachedFlota.length > 0 || vehiclesRef.current.length > 0 });
  }, [user, setVehicles]);

  useEffect(() => {
    if (!user) return;
    setupFlotaSubscription();
    return () => cancelFlotaFetch();
  }, [user, setupFlotaSubscription]);

  useEffect(() => {
    if (!user) return;

    const isCloseInFlight = (vehicleId: string): boolean => {
      const started = closingInProgressRef.current.get(vehicleId);
      if (started == null) return false;
      if (Date.now() - started > CLOSING_STALE_MS) {
        closingInProgressRef.current.delete(vehicleId);
        return false;
      }
      return true;
    };

    registerFlotaMergeContext({
      userId: user.uid,
      getOptimisticPending: () => optimisticVehiclesRef.current,
      getExtraLocalSources: () => vehiclesRef.current,
      isCloseInFlight,
      onAfterRemoteMerge: () => {
        scheduleDeferredVehicleCleanup(() => {
          const archived = archiveOrphanDesglosadorInterrupts(vehiclesRef.current, Date.now());
          const archivedSig = vehiclesReactiveSignature(archived);
          if (archivedSig === getFlotaMergedSignature()) return;
          vehiclesRef.current = archived;
          setVehicles(archived);
          writeLocalFlota(user.uid, archived);
          setFlotaPaintedCount(archived.length);
        });
      },
    });

    return () => registerFlotaMergeContext(null);
  }, [user, setVehicles]);
  useEffect(() => {
    if (!user || !consciousActiveSignature) return;
    releaseCentinela();
  }, [user, consciousActiveSignature]);

  useEffect(() => {
    if (!user) return;
    void reconcileStaleCentinelaInFirestore(user.uid);
  }, [user]);
  const prevSegmentoIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentSegId = segmentoActivo?.id || null;
    const prevSegId = prevSegmentoIdRef.current;
    if (prevSegId && currentSegId && prevSegId !== currentSegId && user && planilla) {
      clearCruceWarnedIds();
      const dayStartCruce = getSegmentCalendarDayStartMs();
      const vehiculosCruzando = vehicles.filter(
        v =>
          v.status === "activo" &&
          !v.autoVerdad &&
          v.tipoFlota !== "descanso" &&
          !isDesglosadorCrossSegmentExempt(v) &&
          (() => {
            const ctx = resolveVehicleSegmentContext(v, planilla.segmentos, dayStartCruce);
            return ctx.id != null && ctx.id !== currentSegId;
          })()
      );
      vehiculosCruzando.forEach(v => {
        const nuevoConteo = (v.segmentosCruzados || 0) + 1;
        updateVehicle(user.uid, v.id, { segmentosCruzados: nuevoConteo }).catch(() => {});
        v.segmentosCruzados = nuevoConteo;
      });
      if (vehiculosCruzando.length > 0) {
        setVehicles([...vehicles]);
        toast.warning("Abre otro vehículo", {
          description: `${vehiculosCruzando.length} sesión(es) del segmento anterior. Tienes 8 min de gracia; luego cierre automático por entropía-atención. El desglosador en foco puede continuar.`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
          duration: 7000,
        });
      }
    }
    prevSegmentoIdRef.current = currentSegId;
  }, [segmentoActivo?.id, user]);

  const applyCentinelaArchiveLocally = useCallback((cierreAt: number) => {
    if (listActiveCentinelas(vehiclesRef.current).length === 0) return;
    const patch = (list: Vehicle[]) =>
      list.map(v =>
        v.autoVerdad && v.status === "activo"
          ? { ...v, ...buildCentinelaArchiveFields(v, cierreAt) }
          : v
      );
    const next = patch(vehiclesRef.current);
    vehiclesRef.current = next;
    setVehicles(patch);
    saveLocalVehicles(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    const list = vehiclesRef.current;
    if (!isCentinelaBlockedByVehicles(list)) return;
    const activeCentinelas = listActiveCentinelas(list);
    if (activeCentinelas.length === 0) return;
    const centinelaSig = activeCentinelas.map(v => v.id).sort().join(",");
    const attemptKey = `${centinelaSig}|${consciousActiveSignature}`;
    if (centinelaArchiveInFlightRef.current) return;
    if (centinelaArchiveAttemptSigRef.current === attemptKey) return;

    centinelaArchiveInFlightRef.current = true;
    centinelaArchiveAttemptSigRef.current = attemptKey;
    const cierreAt = Date.now();
    applyCentinelaArchiveLocally(cierreAt);
    void archiveActiveCentinelas(user.uid, list).finally(() => {
      centinelaArchiveInFlightRef.current = false;
    });
  }, [user, consciousActiveSignature, applyCentinelaArchiveLocally]);

  useEffect(() => {
    if (!user) return;
    const flushToLocal = () => {
      saveLocalVehicles(vehiclesRef.current);
      parkActiveVehiclesForResume(vehiclesRef.current);
    };
    const rehydrateFromLocal = () => {
      const { vehicles: parsedLocal, corrupt } = parseLocalFlotaForRehydrate();
      if (corrupt) {
        console.warn("[Vehicles] Caché corrupta al rehidratar — purga y fetch limpio");
        purgeCorruptLocalFlotaBuffer();
        refreshFlotaSession({ hasOptimisticPaint: vehiclesRef.current.length > 0 });
        return;
      }
      const nowMs = Date.now();
      const dayStart = journalDayStartMs;
      const storeLocal = getFlotaVehicles();
      const localRaw = storeLocal.length > 0 ? storeLocal : parsedLocal;
      const localById = new Map(localRaw.map(v => [v.id, v]));
      const parked = getParkedActiveVehicles().filter(p => {
        const local = localById.get(p.id) ??
          (p.clientRequestId
            ? localRaw.find(l => l.clientRequestId === p.clientRequestId)
            : undefined);
        if (local && local.status !== "activo") return false;
        return !wasVehicleRecentlyClosed(p.id, p.clientRequestId);
      });
      const sources = [...localRaw, ...parked];
      const byId = new Map(vehiclesRef.current.map(v => [v.id, v]));
      const toAdd = sources.filter(
        v =>
          v.status === "activo" &&
          !v.autoVerdad &&
          !byId.has(v.id) &&
          !wasVehicleRecentlyClosed(v.id, v.clientRequestId) &&
          !(v.clientRequestId && localRaw.some(
            l => l.clientRequestId === v.clientRequestId && l.status !== "activo"
          )) &&
          !(localById.get(v.id) && localById.get(v.id)!.status !== "activo") &&
          shouldPreserveLocalActivo(v, nowMs, dayStart)
      );
      if (toAdd.length === 0) return;
      const deduped = toAdd.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
      console.warn(
        `[Vehicles] Rehidratando ${deduped.length} activo(s) tras volver a la app:`,
        deduped.map(v => `${v.id}:${v.titulo}`)
      );
      setVehicles(prev => {
        const ids = new Set(prev.map(v => v.id));
        const add = deduped.filter(v => !ids.has(v.id));
        const next = add.length > 0 ? [...add, ...prev] : prev;
        if (add.length > 0) saveLocalVehicles(next);
        return next;
      });
    };
    rehydrateFlotaFromLocalRef.current = rehydrateFromLocal;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushToLocal();
        return;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushToLocal);
    return () => {
      rehydrateFlotaFromLocalRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushToLocal);
    };
  }, [user, journalDayStartMs]);

  useEffect(() => {
    setCierreEnergiaPending(null);
    setCierreEnergiaSeleccion(null);
    setCierreRutaSeleccion(new Set());
    setSituacionDesgloseCelebration(null);
    setDesglosadorTiempoCelebration(null);
    closingInProgressRef.current.clear();
  }, []);

  useEffect(() => {
    try {
      const { vehicles: localRaw, corrupt } = parseLocalFlotaForRehydrate();
      if (corrupt) {
        console.warn("[Planeacion] Caché local corrupta en arranque — purga silenciosa");
        purgeCorruptLocalFlotaBuffer();
        refreshFlotaSession({ hasOptimisticPaint: false });
        return;
      }
      const nowMs = Date.now();
      const byId = new Map(localRaw.map(v => [v.id, v]));
      const localActivos = localRaw.filter(
        v =>
          v.status === "activo" &&
          !v.autoVerdad &&
          !wasVehicleRecentlyClosed(v.id) &&
          !isOrphanDesglosadorInterrupt(v, byId) &&
          shouldPreserveLocalActivo(v, nowMs, journalDayStartMs)
      );
      if (localActivos.length > 0) {
        setVehicles(prev => {
          const ids = new Set(prev.map(v => v.id));
          const crqs = new Set(prev.map(v => v.clientRequestId).filter(Boolean));
          const add = localActivos.filter(
            la => !ids.has(la.id) && !(la.clientRequestId && crqs.has(la.clientRequestId))
          );
          return add.length > 0 ? [...add, ...prev] : prev;
        });
      }
    } catch (e) {
      console.warn("[Planeacion] sync local activos:", e);
      purgeCorruptLocalFlotaBuffer();
      refreshFlotaSession({ hasOptimisticPaint: false });
    }
  }, [journalDayStartMs, setVehicles]);

  const orphanInterruptSweepRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const hasOpenInterrupt = (parentId: string) =>
      vehicles.some(
        v =>
          v.status === "activo" &&
          !v.autoVerdad &&
          v.vehiculoPadreDesglosadorId === parentId &&
          !wasVehicleRecentlyClosed(v.id)
      );
    const before = vehiclesRef.current;
    const repaired = clearStuckDesglosadorPause(before, hasOpenInterrupt);
    if (repaired === before) return;
    vehiclesRef.current = repaired;
    mergedVehiclesSigRef.current = vehiclesReactiveSignature(repaired);
    setVehicles(repaired);
    saveLocalVehicles(repaired);
    for (const v of repaired) {
      const prev = before.find(x => x.id === v.id);
      if (!prev?.interrupcionActiva || v.interrupcionActiva) continue;
      void updateVehicle(user.uid, v.id, { interrupcionActiva: false, desglosadorPausa: undefined }).catch(() => {});
    }
  }, [user, desglosadorPauseSignature]);

  useEffect(() => {
    if (!user || !orphanInterruptSignature) return;
    scheduleDeferredVehicleCleanup(() => {
      const vehicles = vehiclesRef.current;
      const byId = new Map(vehicles.map(v => [v.id, v]));
      const orphans = vehicles.filter(
        v =>
          isOrphanDesglosadorInterrupt(v, byId) &&
          !orphanInterruptSweepRef.current.has(v.id) &&
          !isCloseBlocked(v.id)
      );
      if (orphans.length === 0) return;
      const now = Date.now();
      const patches = new Map(
        orphans.map(o => {
          const patch = {
            status: "archivado" as const,
            cierreAt: now,
            duracionFinal: Math.max(1, Math.round((now - (o.aperturaAt || now)) / 60000)),
            cierreManual: false,
          };
          return [o.id, patch] as const;
        })
      );
      for (const o of orphans) {
        orphanInterruptSweepRef.current.add(o.id);
        notifyVehicleClosed(o.id, o.clientRequestId);
        const patch = patches.get(o.id)!;
        void updateVehicle(user.uid, o.id, patch).catch(e => console.warn("[orphan-interrupt]", o.id, e));
        void updateVehicleStatus(user.uid, o.id, "archivado").catch(e => console.warn("[orphan-interrupt] status", o.id, e));
      }
      setVehicles(prev => prev.map(v => {
        const patch = patches.get(v.id);
        return patch ? { ...v, ...patch } : v;
      }));
      vehiclesRef.current = vehiclesRef.current.map(v => {
        const patch = patches.get(v.id);
        return patch ? { ...v, ...patch } : v;
      });
      saveLocalVehicles(vehiclesRef.current);
      mergedVehiclesSigRef.current = vehiclesReactiveSignature(vehiclesRef.current);
    });
  }, [user, orphanInterruptSignature]);

  const persistVehiclesRef = () => {
    saveLocalVehicles(vehiclesRef.current);
  };

  /** Fase ms0 — memoria + store + React. Disco solo con flush explícito (cierre / visibility). */
  const commitFlotaPatchMs0 = useCallback(
    (mapper: (prev: Vehicle[]) => Vehicle[], opts?: { flushDisk?: boolean }) => {
      const next = mapper(vehiclesRef.current);
      vehiclesRef.current = next;
      setVehicles(next);
      setFlotaPaintEpoch(e => e + 1);
      if (opts?.flushDisk) {
        flushLocalVehicles(next);
      }
      return next;
    },
    [setVehicles]
  );

  const resolveSituacionCupoAnchorAfterSubClose = (
    subTareas: SubTarea[],
    bloqueListo: boolean,
    cur: Vehicle["situacionCupoAnchor"],
    now: number
  ): Vehicle["situacionCupoAnchor"] => {
    if (bloqueListo) return null;
    const resolved = resolveCronometroCupoAnchor(subTareas, cur ?? null, { forceResetSameRow: true, now });
    if (resolved === "unchanged") return cur ?? undefined;
    return resolved ?? undefined;
  };

  const flushPersistVehiclesRef = () => {
    flushLocalVehicles(vehiclesRef.current);
  };

  const checkTraslado50Ref = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkTraslado50 = async () => {
      const now = Date.now();
      const currentVehicles = vehiclesRef.current;

      const proyectivos = currentVehicles.filter(v => {
        if (v.status !== "activo") return false;
        if (v.tipoFlota !== "tiempo") return false;
        if (!v.aperturaAt) return false;
        const matchHora = v.criterioDetalle?.match(/^(\d{1,2}):(\d{2})$/);
        return !!matchHora;
      });

      for (const v of proyectivos) {
        const matchHora = v.criterioDetalle!.match(/^(\d{1,2}):(\d{2})$/)!;
        const target = new Date();
        target.setHours(parseInt(matchHora[1]), parseInt(matchHora[2]), 0, 0);
        const targetMs = target.getTime();
        const durationMs = targetMs - v.aperturaAt!;
        if (durationMs <= 0) continue;
        const autoCloseMs = targetMs + Math.floor(durationMs * 0.5);
        if (now >= autoCloseMs) {
          try {
            await updateVehicle(user.uid, v.id, {
              cierreAt: now,
              duracionFinal: Math.round((now - v.aperturaAt!) / 60000),
              cierreManual: false
            });
            await updateVehicleStatus(user.uid, v.id, "archivado");
            toast.info(`Cierre automático: "${v.titulo}"`, {
              description: `Pasó el 50% del margen tras ${v.criterioDetalle}. Vehículo archivado.`,
              style: { backgroundColor: PIZARRA, border: `1px solid ${SLATE}40`, color: SLATE },
              duration: 7000
            });
          } catch (err) {
            console.error("[Traslado50] Error cerrando vehículo:", err);
          }
        }
      }
    };
    checkTraslado50Ref.current = checkTraslado50;

    const interval = setInterval(checkTraslado50, 60000);
    checkTraslado50();
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkTraslado50Ref.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const checkPuntoCeroEntropy = () => {
      const now = Date.now();
      for (const v of vehiclesRef.current) {
        if (v.status !== "activo" || v.tipoDescanso !== "punto_cero") continue;
        const aperturaAt = v.aperturaAt || Date.now();
        const descansoMatch = v.criterioDetalle?.match(/([\d.]+)\s*min/i);
        const descansoDurMin = descansoMatch ? parseFloat(descansoMatch[1]) : 20;
        const deadlineMs = aperturaAt + (descansoDurMin + 5) * 60000;
        if (now >= deadlineMs && !isCloseBlocked(v.id)) {
          void handlePuntoCeroEntropyClose(v.id);
        }
      }
    };

    const interval = setInterval(checkPuntoCeroEntropy, 30_000);
    checkPuntoCeroEntropy();
    return () => clearInterval(interval);
  }, [user]);
  const handleStatusChange = async (vehicleId: string, status: "cumplido" | "archivado", intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite") => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) { console.warn("[handleStatusChange] Vehículo no encontrado:", vehicleId); return; }
    if (vehicle.tipoReloj === "desglosador") {
      console.warn("[handleStatusChange] Desglosador: usa «Cerrar ciclo» para registrar PS por subvehículo.");
      return;
    }

    const persistClose = vehicle.status === "activo";
    const cierreAt = vehicle.cierreAt ?? Date.now();
    const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || cierreAt;
    const duracionFinal = vehicle.duracionFinal ?? Math.max(1, Math.round((cierreAt - aperturaAt) / 60000));
    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);

    if (persistClose) {
      const optimisticClose = {
        status,
        cierreAt,
        duracionFinal,
        cierreManual: status === "cumplido",
      };
      setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v)));
      vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v));
      optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== vehicleId);
      saveLocalVehicles(vehiclesRef.current);
    }

    const safeFb = async (label: string, fn: () => Promise<any>) => {
      try { await fn(); } catch (e) { console.error(`[handleStatusChange] ${label}:`, e); }
    };

    const stubScores: MisionScores = { enfoque: 0, conflicto: 0, pasos: 0, limite: 0 };
    const comentario = vehicle.criterioDetalle?.trim() || null;
    await safeFb("saveMision", () => saveMision(user.uid, { titulo: vehicle.titulo, estado: status, scores: stubScores, soberaniaMomento: status === "cumplido" ? 50 : 25, comentario }));

    let missionCP = vehicleMissionClosePS(status, vehicle.tipoTerminoRapido);
    let cpMessage = "";
    if (vehicle.tipoTerminoRapido) {
      cpMessage = status === "cumplido" ? "Misión express completada" : "Misión express archivada";
    } else {
      cpMessage = status === "cumplido" ? "Objetivo cumplido" : "Archivado";
    }

    const isSuccess = status === "cumplido";
    let missionResult = { challengeCompleted: false, newRank: null as string | null, streak: 0 };
    try { missionResult = await recordMissionResult(user.uid, isSuccess, status === "cumplido", missionCP); } catch (e) { console.error("[handleStatusChange] recordMissionResult:", e); }

    await safeFb("closeTimestamps", () =>
      updateVehicle(user.uid, vehicleId, {
        cierreAt,
        duracionFinal,
        cierreManual: status === "cumplido",
      })
    );

    if (persistClose) {
      await safeFb("updateStatus", () => updateVehicleStatus(user.uid, vehicleId, status));
    }
    if (intensidadEnergeticaFin) {
      await safeFb("updateEnergiaFin", () => updateVehicle(user.uid, vehicleId, { intensidadEnergeticaFin }));
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, intensidadEnergeticaFin } : v));
      vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, intensidadEnergeticaFin } : v);
      recordVehiculoCierre(vehicleId, intensidadEnergeticaFin);
    }
    if (status === "cumplido" && !vehicle.autoVerdad && missionCP > 0) {
      await safeAwardPS(missionCP, "Planificación: " + vehicle.titulo);
      incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
    }
    if (vehicle.tipoFlota === "situacion" && status === "cumplido" && !vehicle.autoVerdad) {
      const durationMin = vehicle.aperturaAt ? Math.floor((Date.now() - vehicle.aperturaAt) / 60000) : 0;
      const isMicroSituacion = durationMin < 10;
      const situacionPS = isMicroSituacion ? 1 : 3 + Math.min(Math.floor(durationMin / 5), 4);
      await safeAwardPS(situacionPS, `Situación: ${vehicle.titulo}`);
      const durLabel = durationMin < 1 ? "< 1 min" : `${durationMin} min`;
      if (isMicroSituacion) {
        toast.info(`+${situacionPS} PS · Micro-situación registrada`, {
          description: `Duración: ${durLabel} · Menos de 10 min → 1 PS`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${GRIS}`, color: GRIS },
          duration: 4000,
        });
      } else {
        toast.success(`+${situacionPS} PS · Esfuerzo consciente`, {
          description: `Esfuerzo activo: ${durLabel} → ${situacionPS} PS`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 4000,
        });
      }
    }
    registrarEvento(COMPONENTES.PLANIFICACION);
    if (missionResult.challengeCompleted) {
      toast.success("¡RETO DE GUERRERO COMPLETADO!", { description: `Has ascendido al rango de Guerrero (+${missionCP} PS)`, style: { backgroundColor: PIZARRA, border: `2px solid ${GOLD}`, color: GOLD }, duration: 5000 });
    } else if (missionResult.newRank) {
      toast.success(`¡Ascenso a ${missionResult.newRank === "operador" ? "Operador" : "Arquitecto"}! +${missionCP} PS`, { style: { backgroundColor: PIZARRA, border: `2px solid ${GOLD}`, color: GOLD }, duration: 4000 });
    } else if (status === "cumplido") {
      toast.success(`+${missionCP} PS`, { description: cpMessage + (missionResult.streak > 0 ? ` · Racha: ${missionResult.streak}/3` : ""), style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD } });
    } else {
      if (missionCP > 0) { toast.success(`Archivado +${missionCP} PS`, { description: cpMessage, style: { backgroundColor: PIZARRA, border: `1px solid #f59e0b`, color: "#f59e0b" } }); }
      else { toast.info("Vehículo Archivado", { description: cpMessage, style: { backgroundColor: PIZARRA, border: `1px solid #6b7280`, color: "#6b7280" } }); }
    }
  };

  const handleMicroPasoToggle = async (vehicleId: string, paso: "hidratacion" | "respiracion" | "pantallaZero") => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    const mp = vehicle.microPasos || { hidratacion: false, respiracion: false, pantallaZero: false };
    if (mp[paso]) return;
    const isFirstPaso = !mp.hidratacion && !mp.respiracion && !mp.pantallaZero;
    const now = Date.now();
    const updatedMp = { ...mp, [paso]: true };
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, microPasos: updatedMp, primerAccionAt: isFirstPaso ? now : v.primerAccionAt } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, microPasos: updatedMp, primerAccionAt: isFirstPaso ? now : v.primerAccionAt } : v);
    updateVehicle(user.uid, vehicleId, isFirstPaso ? { microPasos: updatedMp, primerAccionAt: now } : { microPasos: updatedMp }).catch(() => {});
    void safeAwardPS(1, `Micro-paso (${paso}): ${vehicle.titulo}`);
    const PASO_LABELS: Record<string, string> = { hidratacion: "Hidratación", respiracion: "Respiración", pantallaZero: "Pantalla Cero" };
    toast.success(`+1 PS · ${PASO_LABELS[paso]}`, { description: "Micro-paso de recarga completado", style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN }, duration: 2500 });
  };

  const GOLD_PC = "#D4AF37";
  const handleEtapaPuntoCeroToggle = (vehicleId: string, etapa: "etapa1" | "etapa2" | "etapa3" | "etapa4") => {
    if (!user) return;
    if (etapa === "etapa4") return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    const ep = vehicle.etapasPuntoCero || { etapa1: false, etapa2: false, etapa3: false, etapa4: false };
    if (ep[etapa]) return;
    if (etapa === "etapa2" && !ep.etapa1) return;
    if (etapa === "etapa3" && !ep.etapa2) return;
    const isFirstEtapa = !ep.etapa1 && !ep.etapa2 && !ep.etapa3 && !ep.etapa4;
    const now = Date.now();
    const updatedEp = { ...ep, [etapa]: true };
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, etapasPuntoCero: updatedEp, primerAccionAt: isFirstEtapa ? now : v.primerAccionAt } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, etapasPuntoCero: updatedEp, primerAccionAt: isFirstEtapa ? now : v.primerAccionAt } : v);
    updateVehicle(user.uid, vehicleId, isFirstEtapa ? { etapasPuntoCero: updatedEp, primerAccionAt: now } : { etapasPuntoCero: updatedEp }).catch(() => {});
    void safeAwardPS(1, `Etapa Punto Cero (${etapa}): ${vehicle.titulo}`);
    const ETAPA_LABELS: Record<string, string> = { etapa1: "Tensión y quietud", etapa2: "Identificación del Pensamiento", etapa3: "Ritmo y apnea", etapa4: "Alimento de Colores" };
    toast.success(`+1 PS · ${ETAPA_LABELS[etapa]}`, { description: "Etapa Punto Cero completada", style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD_PC}`, color: GOLD_PC }, duration: 2500 });
  };

  const puntoCeroSessionSigRef = useRef<Record<string, string>>({});
  const puntoCeroAutoCloseAttemptedRef = useRef<Set<string>>(new Set());

  const handlePuntoCeroSessionUpdate = (vehicleId: string, session: PuntoCeroSession) => {
    if (!user) return;
    const sig = `${session.fase}|${session.faseInicioAt}|${session.ultimoSusurroAt ?? 0}|${session.coloresConfirmados.join("")}`;
    if (puntoCeroSessionSigRef.current[vehicleId] === sig) return;
    puntoCeroSessionSigRef.current[vehicleId] = sig;
    startTransition(() => {
      setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, puntoCero: session } : v)));
    });
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, puntoCero: session } : v));
    updateVehicle(user.uid, vehicleId, { puntoCero: session }).catch(() => {});
  };

  const handlePuntoCeroColorConfirm = (vehicleId: string, idx: number, session: PuntoCeroSession) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    const ep = vehicle.etapasPuntoCero || { etapa1: false, etapa2: false, etapa3: false, etapa4: false };
    const updatedEp = etapasConColoresCompletos(ep, session.coloresConfirmados);
    const coronaLista = todosColoresConfirmados(session.coloresConfirmados);
    const patch = { puntoCero: session, etapasPuntoCero: updatedEp };
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...patch } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...patch } : v));
    updateVehicle(user.uid, vehicleId, patch).catch(() => {});
    if (coronaLista && !ep.etapa4) {
      void safeAwardPS(1, `Etapa Punto Cero (colores): ${vehicle.titulo}`);
      toast.success("+1 PS · Alimento de Colores", {
        description: "Corona sellada — iniciando ancla del alivio",
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD_PC}`, color: GOLD_PC },
        duration: 2800,
      });
    }
  };

  const handlePuntoCeroAutoClose = (vehicleId: string) => {
    if (puntoCeroAutoCloseAttemptedRef.current.has(vehicleId)) return;
    const v = vehiclesRef.current.find(x => x.id === vehicleId) || vehicles.find(x => x.id === vehicleId);
    if (!v || v.status !== "activo") return;
    puntoCeroAutoCloseAttemptedRef.current.add(vehicleId);
    resetPuntoCeroVoiceQueue();
    void handleDescansoClose(vehicleId, "cumplido", "recuperado", "");
  };

  const handlePuntoCeroEntropyClose = async (vehicleId: string) => {
    if (!user) return;
    if (isCloseBlocked(vehicleId)) return;
    const entropyKey = `entropy:${vehicleId}`;
    if (puntoCeroAutoCloseAttemptedRef.current.has(entropyKey)) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status !== "activo" || vehicle.tipoDescanso !== "punto_cero") return;

    puntoCeroAutoCloseAttemptedRef.current.add(entropyKey);
    puntoCeroAutoCloseAttemptedRef.current.add(vehicleId);
    resetPuntoCeroVoiceQueue();
    beginClose(vehicleId);

    const aperturaAt = vehicle.aperturaAt || Date.now();
    const cierreAt = Date.now();
    const duracionMin = Math.round((cierreAt - aperturaAt) / 60000);

    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);

    const optimisticClose = {
      status: "archivado" as const,
      cierreAt,
      duracionFinal: duracionMin,
      cierreManual: false,
      etiquetaSalida: "fragmentado" as const,
      notaSalida: "Cierre por entropía — ventana de tolerancia superada",
    };

    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v));
    optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== vehicleId);
    saveLocalVehicles(vehiclesRef.current);

    try {
      await updateVehicle(user.uid, vehicleId, optimisticClose);
      await updateVehicleStatus(user.uid, vehicleId, "archivado");
    } catch {
      /* updateVehicle ya persiste en local si Firebase falla */
    } finally {
      endClose(vehicleId);
    }

    toast.info("Punto Cero cerrado por entropía", {
      description: "Superaste la ventana de 5 min sin cerrar. Sin PS de cierre — las etapas ya acreditadas se conservan.",
      style: { backgroundColor: PIZARRA, border: "1px solid #ef4444", color: "#ef4444" },
      duration: 6000,
    });
  };

  const handleDescansoClose = async (vehicleId: string, closingStatus: "cumplido" | "archivado", etiqueta: "recuperado" | "parcial" | "fragmentado", nota: string, intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite") => {
    if (!user) return;
    if (isCloseBlocked(vehicleId)) return;
    beginClose(vehicleId);
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) { endClose(vehicleId); return; }
    if (vehicle.tipoDescanso === "punto_cero") resetPuntoCeroVoiceQueue();

    const aperturaAt = vehicle.aperturaAt || Date.now();
    const cierreAt = Date.now();
    const duracionMin = Math.round((cierreAt - aperturaAt) / 60000);
    const descansoMatch = vehicle.criterioDetalle?.match(/([\d.]+)\s*min/i);
    const descansoDurMin = descansoMatch ? parseFloat(descansoMatch[1]) : 0;
    const descansoTargetMs = descansoDurMin > 0 ? aperturaAt + (descansoDurMin + 5) * 60000 : 0;
    const dentroVentana = descansoTargetMs === 0 || cierreAt <= descansoTargetMs;

    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);

    const optimisticClose = {
      status: closingStatus,
      cierreAt,
      duracionFinal: duracionMin,
      cierreManual: dentroVentana,
      etiquetaSalida: etiqueta,
      notaSalida: nota,
      ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
    };

    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v));
    optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== vehicleId);
    saveLocalVehicles(vehiclesRef.current);
    options?.onConquistaPulse?.();

    const TIPO_BASE: Record<string, number> = { intercepcion: 3, microcarga: 5, reset_profundo: 8, punto_cero: 12 };
    const psBase = vehicle.tipoDescanso ? (TIPO_BASE[vehicle.tipoDescanso] || 5) : 5;
    const psEtiqueta = etiqueta === "recuperado" ? 2 : 0;
    const psTotal = psBase + psEtiqueta;
    const ETIQUETA_LABELS: Record<string, string> = { recuperado: "RECUPERADO", parcial: "PARCIAL", fragmentado: "FRAGMENTADO" };
    const ETIQUETA_COLOR: Record<string, string> = { recuperado: "#10b981", parcial: "#f59e0b", fragmentado: "#ef4444" };

    try {
      await updateVehicle(user.uid, vehicleId, optimisticClose);
      await updateVehicleStatus(user.uid, vehicleId, closingStatus);
    } catch {
      /* updateVehicle ya persiste en local si Firebase falla */
    } finally {
      endClose(vehicleId);
    }
    recordDescansoCuerpo(vehicleId);
    void safeAwardPS(psTotal, `Descanso cerrado (${ETIQUETA_LABELS[etiqueta]}): ${vehicle.titulo}`);
    incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
    const esPuntoCero = vehicle.tipoDescanso === "punto_cero";
    const ep = vehicle.etapasPuntoCero || { etapa1: false, etapa2: false, etapa3: false, etapa4: false };
    const epAcreditados = esPuntoCero ? [ep.etapa1, ep.etapa2, ep.etapa3, ep.etapa4].filter(Boolean).length : 0;
    const mp = vehicle.microPasos || { hidratacion: false, respiracion: false, pantallaZero: false };
    const mpAcreditados = esPuntoCero ? 0 : [mp.hidratacion, mp.respiracion, mp.pantallaZero].filter(Boolean).length;
    const etapasLabel = esPuntoCero ? `Etapas (ya acreditadas): +${epAcreditados} PS · Total sesión: +${psTotal + epAcreditados} PS` : `Micro-pasos acreditados: +${mpAcreditados} PS`;
    const toastMsg = dentroVentana
      ? esPuntoCero
        ? `+${psTotal} PS · Puerta sellada. Polo Neutro alcanzado.`
        : `+${psTotal} PS · Puerta sellada. ${ETIQUETA_LABELS[etiqueta]}.`
      : `+${psTotal} PS · ${ETIQUETA_LABELS[etiqueta]}`;
    const borderColor = esPuntoCero ? GOLD_PC : ETIQUETA_COLOR[etiqueta];
    if (dentroVentana) {
      toast.success(toastMsg, {
        description: `Base: +${psBase} · Etiqueta: +${psEtiqueta} · ${etapasLabel}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${borderColor}`, color: borderColor }, duration: 5000
      });
    } else {
      toast.info(toastMsg, {
        description: `Base: +${psBase} · Tolerancia superada · ${etapasLabel}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${borderColor}`, color: borderColor }, duration: 4000
      });
    }

    if (esPuntoCero) {
      const parent = findNestedParentAwaitingPuntoCeroResume(vehiclesRef.current);
      if (parent) {
        const resumePatch = buildNestedParentResumePatch(parent);
        if (resumePatch) {
          setVehicles(prev => prev.map(v => (v.id === parent.id ? { ...v, ...resumePatch } : v)));
          vehiclesRef.current = vehiclesRef.current.map(v =>
            v.id === parent.id ? { ...v, ...resumePatch } : v
          );
          saveLocalVehicles(vehiclesRef.current);
          void updateVehicle(user.uid, parent.id, resumePatch).catch(e =>
            console.warn("[nested-stack] resume parent:", e)
          );
          toast.info("Contexto reanudado", {
            description:
              parent.tipoReloj === "desglosador"
                ? "Desglosador situacional retomado en el sub-paso donde lo dejaste."
                : "Ring situacional retomado donde lo dejaste.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
            duration: 4500,
          });
        }
      }
    }
  };
  const handleFlotaStatusChange = async (
    vehicleId: string, 
    status: "cumplido" | "archivado", 
    intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite"
  ) => {
    if (!user) return;
  
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) { 
      console.warn("[handleFlotaStatusChange] Vehículo no encontrado:", vehicleId); 
      return; 
    }
  
    // 1. Autarquía del proceso (Desglosador tiempo requiere botón dorado)
    if (vehicle.tipoReloj === "desglosador") {
      toast.error("Usa «Cerrar ciclo» en el desglosador", {
        description: "Cumplido/Incumplido de flota no cierra un desglose en curso. Abre el vehículo y usa el botón dorado de cierre de ciclo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        duration: 5000,
      });
      return;
    }
  
    if (isCloseBlocked(vehicleId)) {
      toast.info("Cierre en curso…", { description: "Espera unos segundos y reintenta.", duration: 2500 });
      return;
    }
  
    // ==========================================
    // FASE MS0 — PRIORIDAD DEL OPERADOR (INMEDIATO)
    // ==========================================
    beginClose(vehicleId);
  
    const tipoFlota = vehicle.tipoFlota;
    const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || Date.now();
    const cierreAt = Date.now();
    const duracionMs = cierreAt - aperturaAt;
    const parentesisTotal = (vehicle.parentesisRecarga || []).reduce((sum, p) => sum + p.duracionMin * 60000, 0);
    const duracionNeta = Math.max(0, duracionMs - parentesisTotal);
    const duracionMin = Math.round(duracionNeta / 60000);
  
    const situacionCloseExtras = tipoFlota === "situacion"
      ? { situacionCronometro: null, situacionCupoAnchor: null }
      : {};
  
    // Pintar en React en el mismo frame (UI Espejo se limpia rápido)
    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
  
    // ==========================================
    // TRABAJO EN SOMBRA — FUERA DEL TICK DE REACT
    // ==========================================
    runShadowTask(async () => {
      // A. Procesar snapshot termodinámico e historial en diferido
      const termoDecisionSnapshot = buildTermoDecisionSnapshot(
        { ...vehicle, status, cierreAt, ...situacionCloseExtras },
        getJournalDayStartMs(cierreAt)
      );
  
      // B. Registro de decisiones soberanas sin bloquear la UI
      if (
        (vehicle.tipoReloj as string | undefined) !== "desglosador" &&
        vehicle.tipoFlota !== "descanso" &&
        vehicle.tipoFlota !== "situacion" &&
        (status === "cumplido" || status === "archivado")
      ) {
        recordDecision(user.uid, {
          key: decisionKeyMision(vehicleId),
          kind: "mision_directa",
          vehicleId,
          ts: cierreAt,
        });
      }
  
      // C. Procesamiento de subtareas de contingencia de la situación
      if (vehicle.tipoFlota === "situacion" && vehicle.subTareas) {
        for (const st of vehicle.subTareas) {
          if (st.enDesgloseCronometro) {
            if (st.resultadoSituacion !== "cumplido") continue;
          } else if (!st.completada) {
            continue;
          }
          // Cualquier mutación incremental profunda se procesa de forma segura aquí dentro
        }
      }
      
      // Aquí puedes incluir el push/update final a Firebase si desglosadorShadow posee la primitiva
    });
  };
 
    if (vehicle.tipoFlota === "situacion") {
      for (const st of vehicle.subTareas ?? []) {
        if (st.enDesgloseCronometro) {
          if (st.resultadoSituacion !== "cumplido") continue;
        } else if (!st.completada) {
          continue;
        }
        recordDecision(user.uid, {
          key: decisionKeySubSituacion(vehicleId, st.id),
          kind: "sub_situacion",
          vehicleId,
          ts: st.cerradaAt ?? cierreAt,
        });
      }
    }

    const optimisticClose = {
      status,
      cierreAt,
      duracionFinal: duracionMin,
      cierreManual: isCierreManual,
      termoDecisionSnapshot,
      ...situacionCloseExtras,
      ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
    };

    // Optimistic UI + localStorage inmediatos — no esperar a Firebase
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...optimisticClose } : v));
    optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== vehicleId);
    saveLocalVehicles(vehiclesRef.current);
    if (!vehicle.autoVerdad) options?.onConquistaPulse?.();
    if (intensidadEnergeticaFin) recordVehiculoCierre(vehicleId, intensidadEnergeticaFin);

    try {
      await updateVehicle(user.uid, vehicleId, { ...optimisticClose, status });
      await updateVehicleStatus(user.uid, vehicleId, status);
    } catch (e) {
      console.warn("[handleFlotaStatusChange] persist anticipado:", e);
    }

    // Helper: fire-and-forget (no await) — no bloqueamos la UI
    const safeFire = (fn: () => Promise<any>) => { fn().catch(() => {}); };

    // Base update: cierreAt + duracionFinal + cierreManual (always needed)
    const baseUpdate = {
      cierreAt,
      duracionFinal: duracionMin,
      cierreManual: isCierreManual,
      termoDecisionSnapshot,
      ...situacionCloseExtras,
      ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
    };

    try {
      if (tipoFlota === "verdad") {
        safeFire(() => updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }));
        if (!vehicle.autoVerdad) {
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
        }
        toast.success("Verdad Consciente registrada", {
          description: `Duración: ${duracionMin} min`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
          duration: 4000,
        });
      } else if (vehicle.tipoReloj === "investigador") {
        safeFire(() => Promise.all([
          updateVehicle(user.uid, vehicleId, { ...baseUpdate, status: "cumplido" }),
          awardSovereigntyPoints(user.uid, 10, (vehicle.datoConfiable !== false ? "Medición válida: " : "Medición con inconveniente: ") + vehicle.titulo)
        ]));
        incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
      } else if (tipoFlota === "tiempo" || vehicle.tipoTerminoRapido === "hora") {
        const timeMatch = vehicle.criterioDetalle?.match(/^(\d{1,2}):(\d{2})$/);
        const prodMatch = vehicle.criterioDetalle?.match(/^([\d.]+)\s*x\s*([\d.]+)\s*min$/i);
        const isTimerExpired = timeMatch ? (() => {
          const targetMin = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
          const nowMin = getCurrentTimeMinutes();
          return nowMin > targetMin;
        })() : prodMatch ? (() => {
          const totalMinProd = parseFloat(prodMatch[1]) * parseFloat(prodMatch[2]);
          const targetMs = aperturaAt + totalMinProd * 60000;
          return Date.now() > targetMs;
        })() : false;

        if (isTimerExpired) {
          safeFire(() => Promise.all([
            updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }),
            awardSovereigntyPoints(user.uid, 10, "Tiempo excedido: " + vehicle.titulo)
          ]));
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          toast.success("+10 PS — Tiempo excedido", { description: "Cierre registrado fuera de ventana.", style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD }, duration: 4000 });
        } else {
          await handleStatusChange(vehicleId, status, intensidadEnergeticaFin);
        }
      } else if (tipoFlota === "descanso") {
        const descansoMatch = vehicle.criterioDetalle?.match(/([\d.]+)\s*min/i);
        const descansoDurMin = descansoMatch ? parseFloat(descansoMatch[1]) : 0;
        const descansoTargetMs = descansoDurMin > 0 ? aperturaAt + (descansoDurMin + 5) * 60000 : 0;
        const isDescansoExpired = descansoTargetMs > 0 && cierreAt > descansoTargetMs;

        if (isCierreManual && !isDescansoExpired) {
          safeFire(() => Promise.all([
            updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }),
            awardSovereigntyPoints(user.uid, 10, "Recarga consciente dentro de tolerancia: " + vehicle.titulo)
          ]));
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          toast.success("+10 PS Recarga Consciente", { description: `Duración: ${duracionMin} min · Dentro de tolerancia`, style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE }, duration: 4000 });
        } else if (isCierreManual && isDescansoExpired) {
          safeFire(() => Promise.all([
            updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }),
            awardSovereigntyPoints(user.uid, 10, "Recarga extendida: " + vehicle.titulo)
          ]));
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          toast.success("+10 PS — Descanso extendido", { description: `Duración: ${duracionMin} min · Tolerancia superada`, style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD }, duration: 4000 });
        } else {
          safeFire(() => Promise.all([
            updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }),
            awardSovereigntyPoints(user.uid, 5, "Descanso cerrado: " + vehicle.titulo)
          ]));
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          toast.info("Descanso cerrado (+5 PS)", { description: `Duración: ${duracionMin} min`, style: { backgroundColor: PIZARRA, border: `1px solid ${GRIS}`, color: GRIS } });
        }
      } else if (tipoFlota === "situacion" && (vehicle.segmentosCruzados || 0) > 0) {
        if (vehicle.justificacion) {
          const psBase = VEHICLE_CUMPLIDO_BASE_PS;
          const psRecuperado = Math.round(psBase * 0.5);
          safeFire(() => Promise.all([
            updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }),
            awardSovereigntyPoints(user.uid, psRecuperado, `Cruce justificado (${vehicle.segmentosCruzados} seg): ${vehicle.titulo}`)
          ]));
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          toast.success(`+${psRecuperado} PS Cruce Justificado`, {
            description: `Cruzó ${vehicle.segmentosCruzados} segmento(s). Justificación aceptada.`,
            style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD }, duration: 4000
          });
        } else {
          safeFire(() => updateVehicle(user.uid, vehicleId, { ...baseUpdate, status }));
          toast.info(`Cruce registrado (${vehicle.segmentosCruzados} seg)`, {
            description: "Dato registrado para evaluación.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA }, duration: 4000
          });
        }
      } else {
        await handleStatusChange(vehicleId, status, intensidadEnergeticaFin);
      }

      const isWithin5Min = segmentoActivo && segmentoActivo.horaFin &&
        isWithinSegmentTimeMargin(Date.now(), segmentoActivo.horaInicio, segmentoActivo.horaFin, "fin", 5);

      if (isCierreManual && isWithin5Min) {
        toast.success("Puerta sellada. Voltaje recuperado.", { style: { backgroundColor: PIZARRA, border: `2px solid ${GOLD}`, color: GOLD }, duration: 5000 });
      }

      if (vehicle.tipoReloj === "produccion" || vehicle.tipoReloj === "investigador") {
        const cantidad = vehicle.cantidadObjetivo || 0;
        const isDatoConfiable = vehicle.datoConfiable !== false;
        if (cantidad > 0 && duracionMin > 0 && isDatoConfiable && status === "cumplido") {
          const minPerUnit = duracionMin / cantidad;
          const prevHistory = getHistoricalVehicleData(vehicle.titulo);
          saveVehicleHistory(vehicle.titulo, minPerUnit, duracionMin, vehicle.tipoReloj, user.uid, { status: "cumplido" });
          safeFire(() => updateVehicle(user.uid, vehicleId, { resultadoPorUnidad: Math.round((duracionNeta / 1000) / cantidad) }));

          if (prevHistory.count > 0 && prevHistory.bestMinPerUnit && minPerUnit < prevHistory.bestMinPerUnit) {
            const mejoraPct = Math.round(((prevHistory.bestMinPerUnit - minPerUnit) / prevHistory.bestMinPerUnit) * 100);
            if (mejoraPct > 0) {
              options?.onGoldenFlash?.();
              options?.onRecordBanner?.({ mejora: mejoraPct, titulo: vehicle.titulo });
              setTimeout(() => options?.onRecordBanner?.(null), 8000);
              safeFire(() => awardSovereigntyPoints(user.uid, 3, "Eficiencia Pura: Récord en " + vehicle.titulo));
              toast.success("RÉCORD DE SOBERANÍA DETECTADO", {
                description: `Has optimizado tu procesamiento en un ${mejoraPct}%. +3 PS de bono por Eficiencia Pura.`,
                style: { backgroundColor: "#1a1a0a", border: `2px solid ${GOLD}`, color: GOLD, boxShadow: `0 0 30px ${GOLD}40` },
                duration: 6000
              });
            }
          }
        } else if (status === "archivado" || (status === "cumplido" && cantidad > 0 && !isDatoConfiable)) {
          // Registrar archivados/descartados para trazabilidad completa
          saveVehicleHistory(vehicle.titulo, 0, duracionMin, vehicle.tipoReloj, user.uid, { status: "incumplido" });
          if (!isDatoConfiable) {
            toast.info("Dato descartado del historial", {
              description: "Marcado como incumplido. Este tiempo no se usará para sugerencias futuras.",
              style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA }, duration: 4000
            });
          }
        }
      }

      registrarEvento(COMPONENTES.PLANIFICACION);
      if (!vehicle.autoVerdad && status === "cumplido") {
        const closedVehicle: Vehicle = { ...vehicle, ...optimisticClose, status };
        safeFire(() => volcarMetricasAlHub(closedVehicle, { minutos: duracionMin }));
      }
      if (vehicle.vehiculoPadreDesglosadorId && (status === "cumplido" || status === "archivado")) {
        await ackInterrupcionDesglosadorCerrada(vehicle.vehiculoPadreDesglosadorId);
      }
    } catch (err: any) {
      console.error("[handleFlotaStatusChange] ERROR:", err);
    } finally {
      endClose(vehicleId);
    }
  };

  const forceCloseVehicle = async (
    vehicleId: string,
    status: "cumplido" | "archivado" = "archivado"
  ) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status !== "activo") return;
    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
    const cierreAt = Date.now();
    const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || cierreAt;
    const duracionFinal = Math.max(1, Math.round((cierreAt - aperturaAt) / 60000));
    const patch = {
      status,
      cierreAt,
      duracionFinal,
      cierreManual: status === "cumplido",
      interrupcionActiva: false,
      desglosadorPausa: undefined,
      situacionCronometro: null,
      situacionCupoAnchor: null,
    };
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, ...patch } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, ...patch } : v));
    saveLocalVehicles(vehiclesRef.current);
    try {
      await updateVehicle(user.uid, vehicleId, patch);
      await updateVehicleStatus(user.uid, vehicleId, status);
    } catch (e) {
      console.warn("[forceCloseVehicle]", vehicleId, e);
    }
  };

  const handleEmergencyArchiveStuckActives = async () => {
    if (!user) return;
    const nowMs = Date.now();
    const dayStartMs = getJournalDayStartMs(nowMs);
    const byId = new Map(vehiclesRef.current.map(v => [v.id, v]));
    const actives = vehiclesRef.current.filter(v => v.status === "activo" && !v.autoVerdad);
    if (actives.length === 0) return;
    const situacionBloqueAtascado = (v: Vehicle) =>
      v.tipoFlota === "situacion" &&
      v.situacionCronometro?.activo === true &&
      situacionDesgloseBloqueListo(v.subTareas || [], v.situacionCronometro);
    const targets = actives.filter(
      v =>
        isGhostActiveVehicle(v, nowMs, dayStartMs, byId) ||
        isOrphanDesglosadorInterrupt(v, byId) ||
        situacionBloqueAtascado(v) ||
        actives.length >= 5
    );
    if (targets.length === 0) return;
    let closed = 0;
    for (const v of targets) {
      const subs = v.subVehiculos || [];
      const desglosadorListo =
        v.tipoReloj === "desglosador" &&
        subs.length > 0 &&
        subs.every(s => s.status === "cumplido" || s.status === "fallado");
      if (desglosadorListo) {
        dispatchDesglosadorGlobalClose(v.id, subs);
      } else {
        await forceCloseVehicle(v.id, "archivado");
      }
      closed++;
    }
    toast.success(`${closed} vehículo(s) archivado(s)`, {
      description: "Sesiones atascadas liberadas. Revisa el historial.",
      style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
      duration: 5000,
    });
  };

  const handleInvestigadorClose = async (vehicleId: string, cumplido: boolean, cantidadRealizada: number, intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite") => {
    if (!user) return;
    if (isCloseBlocked(vehicleId)) return;
    beginClose(vehicleId);
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle) { endClose(vehicleId); return; }

    notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
    optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== vehicleId);
    const closePatch = {
      status: "cumplido" as const,
      datoConfiable: cumplido,
      cierreAt: Date.now(),
      cierreManual: true,
      ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
    };
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...closePatch } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, ...closePatch } : v);
    if (!saveLocalVehicles(vehiclesRef.current)) {
      console.warn("[investigadorClose] Cierre en memoria OK; localStorage no disponible");
    }
    options?.onConquistaPulse?.();

    const cierreAt = closePatch.cierreAt;
    const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || 0;
    if (!aperturaAt) {
      console.warn("[investigadorClose] Advertencia: aperturaAt y createdAt ausentes. duracionFinal será 0.", vehicleId);
    }
    const duracionFinal = aperturaAt > 0 ? Math.round((cierreAt - aperturaAt) / 60000) : 0;

    const extraUpdates: Record<string, unknown> = {};
    if (cumplido && cantidadRealizada > 0 && duracionFinal > 0) {
      const minPerUnit = duracionFinal / cantidadRealizada;
      extraUpdates.resultadoPorUnidad = Number(minPerUnit.toFixed(2));
      extraUpdates.cantidadObjetivo = cantidadRealizada;
    }

    try {
      await updateVehicle(user.uid, vehicleId, {
        status: "cumplido",
        datoConfiable: cumplido,
        cierreAt,
        duracionFinal,
        cierreManual: true,
        ...(intensidadEnergeticaFin ? { intensidadEnergeticaFin } : {}),
        ...(extraUpdates as object)
      });

      if (cumplido && cantidadRealizada > 0 && duracionFinal > 0) {
        const minPerUnit = duracionFinal / cantidadRealizada;
        const prevHistory = getHistoricalVehicleData(vehicle.titulo);
        saveVehicleHistory(vehicle.titulo, minPerUnit, duracionFinal, "investigador", user.uid, { status: "cumplido" });

        if (prevHistory.count > 0 && prevHistory.bestMinPerUnit && minPerUnit < prevHistory.bestMinPerUnit) {
          const mejoraPct = Math.round(((prevHistory.bestMinPerUnit - minPerUnit) / prevHistory.bestMinPerUnit) * 100);
          if (mejoraPct > 0) {
            options?.onGoldenFlash?.();
            options?.onGoldenFlash?.();
            options?.onRecordBanner?.({ mejora: mejoraPct, titulo: vehicle.titulo });
            setTimeout(() => options?.onRecordBanner?.(null), 8000);
            awardSovereigntyPoints(user.uid, 3, "Récord Investigador: " + vehicle.titulo)
              .catch(e => console.warn("[investigadorClose] recordPS falló:", e));
          }
        }
      } else if (!cumplido && duracionFinal > 0) {
        saveVehicleHistory(vehicle.titulo, 0, duracionFinal, "investigador", user.uid, { status: "incumplido" });
      }

      void awardSovereigntyPoints(user.uid, 10,
        (cumplido ? "Medición válida: " : "Medición con inconveniente: ") + vehicle.titulo
      ).catch(e => console.warn("[investigadorClose] PS falló:", e));
      incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
      registrarEvento(COMPONENTES.PLANIFICACION);
      if (intensidadEnergeticaFin) recordVehiculoCierre(vehicleId, intensidadEnergeticaFin);
      toast.success(cumplido ? "+10 PS Medición Válida" : "+10 PS Registro Honesto", {
        description: cumplido
          ? `Dato registrado. ${cantidadRealizada > 0 && duracionFinal > 0 ? `${(duracionFinal / cantidadRealizada).toFixed(1)} min/unidad guardado en Bóveda.` : "Guardado para sugerencias futuras."}`
          : "Inconveniente reportado. Dato descartado del historial.",
        style: {
          backgroundColor: PIZARRA,
          border: `1px solid ${cumplido ? EMERALD : NARANJA}`,
          color: cumplido ? EMERALD : NARANJA
        },
        duration: 4000
      });
      if (vehicle.vehiculoPadreDesglosadorId) {
        try {
          await ackInterrupcionDesglosadorCerrada(vehicle.vehiculoPadreDesglosadorId);
        } catch (e) {
          console.warn("[investigadorClose] ack desglosador:", e);
        }
      }
    } catch (err) {
      console.error("[investigadorClose] Error detallado:", err);
      toast.error("Error al sincronizar el cierre. El vehículo ya quedó cerrado en este dispositivo.", {
        description: "Si los PS no aparecen, reintenta cuando tengas conexión.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5000,
      });
    } finally {
      endClose(vehicleId);
    }
  };

  const ackInterrupcionDesglosadorCerrada = async (parentId: string) => {
    if (!user) return;
    const parent = vehiclesRef.current.find(v => v.id === parentId);
    if (!parent || parent.tipoReloj !== "desglosador") return;
    if (!parent.interrupcionActiva || !parent.desglosadorPausa?.subActivoId) return;

    toast.info("Interrupción cerrada", {
      description: "Desglosador en pausa. Pulsa «Reanudar desglosador ahora» cuando continúes.",
      style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
      duration: 4500,
    });
  };

  const resumeDesglosadorTrasInterrupcion = async (parentId: string) => {
    if (!user) return;
    const openInterrupt = vehiclesRef.current.find(
      v =>
        v.status === "activo" &&
        !v.autoVerdad &&
        v.vehiculoPadreDesglosadorId === parentId &&
        !wasVehicleRecentlyClosed(v.id)
    );
    if (openInterrupt) {
      toast.error("Cierra la interrupción activa arriba", {
        description: "Usa Cumplido o Incumplido en el vehículo de interrupción.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 4000,
      });
      return;
    }
    const parent = vehiclesRef.current.find(v => v.id === parentId);
    if (!parent?.desglosadorPausa && !parent?.interrupcionActiva) return;

    let patch: Partial<Vehicle>;
    if (parent.desglosadorPausa) {
      const nestedResume = resumeDesglosadorFromNestedPause(parent);
      if (nestedResume) {
        patch = nestedResume;
      } else {
        const pausa = parent.desglosadorPausa;
        const subs = [...(parent.subVehiculos || [])];
        const idx = subs.findIndex(s => s.id === pausa.subActivoId);
        if (idx === -1) {
          patch = { desglosadorPausa: undefined, interrupcionActiva: false };
        } else {
          const resumedApertura = pausa.elapsedSecSnapshot != null
            ? Date.now() - pausa.elapsedSecSnapshot * 1000
            : Date.now();
          subs[idx] = { ...subs[idx], status: "activo", aperturaAt: resumedApertura };
          patch = {
            subVehiculos: subs,
            desglosadorPausa: undefined,
            interrupcionActiva: false,
          };
        }
      }
    } else {
      patch = { desglosadorPausa: undefined, interrupcionActiva: false };
    }

    setVehicles(prev => prev.map(v => v.id === parentId ? { ...v, ...patch } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === parentId ? { ...v, ...patch } : v);
    if (!saveLocalVehicles(vehiclesRef.current)) {
      console.warn("[desglosador] resume: localStorage no disponible");
    }
    await updateVehicle(user.uid, parentId, patch).catch(e => console.warn("[desglosador] resume:", e));
    toast.info("Desglosador reanudado", {
      description: "Tiempo restante recuperado tras la interrupción.",
      style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
      duration: 3500,
    });
  };

  const handleDesglosadorPausaInterrupcion = async (vehicleId: string, tituloInterrupcion: string) => {
    if (!user || !tituloInterrupcion.trim()) return;
    if (pausaInterrupcionLockRef.current === vehicleId) return;

    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.tipoReloj !== "desglosador" || vehicle.interrupcionActiva) return;
    const existingInterrupt = vehiclesRef.current.find(
      v =>
        v.status === "activo" &&
        !v.autoVerdad &&
        v.vehiculoPadreDesglosadorId === vehicleId &&
        !wasVehicleRecentlyClosed(v.id)
    );
    if (existingInterrupt) {
      toast.error("Ya hay una interrupción activa", {
        description: "Ciérrala arriba antes de lanzar otra.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const slotsCheck = assertCanOpenVehicle(vehiclesRef.current, "interrupcion", {
      parentDesglosadorId: vehicleId,
    });
    if (!slotsCheck.allowed) {
      toast.error("Límite de misiones", {
        description: formatOperationalSlotsBlockMessage(slotsCheck),
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5500,
      });
      return;
    }
    const activeSub = (vehicle.subVehiculos || []).find(s => s.status === "activo");
    if (!activeSub?.aperturaAt) {
      toast.error("No hay sub activo para pausar");
      return;
    }

    pausaInterrupcionLockRef.current = vehicleId;

    const cierreAt = Date.now();
    applyCentinelaArchiveLocally(cierreAt);
    void closeCentinelasBeforeConsciousLaunch(user.uid, vehiclesRef.current);

    const elapsedSec = Math.floor((Date.now() - activeSub.aperturaAt) / 1000);
    let restanteUnidades: number | undefined;
    if (activeSub.cantidadObjetivo && activeSub.tiempoRecordMinPerUnit) {
      const done = Math.floor((elapsedSec / 60) / activeSub.tiempoRecordMinPerUnit);
      restanteUnidades = Math.max(0, activeSub.cantidadObjetivo - done);
    }

    const nestedPause = buildDesglosadorNestedPausePatch(vehicle, "interrupcion_situacion");
    if (!nestedPause) {
      pausaInterrupcionLockRef.current = null;
      toast.error("No se pudo pausar el sub activo");
      return;
    }
    const pausedPatch = {
      ...nestedPause,
      desglosadorPausa: {
        ...nestedPause.desglosadorPausa,
        restanteUnidades,
      },
    };

    const provisionalInterruptId = generateStableUuid();
    const clientRequestId = `crq_${generateStableUuid()}`;
    const interruptVehicle: Vehicle = {
      id: provisionalInterruptId,
      titulo: tituloInterrupcion.trim(),
      criterioFin: "circunstancia",
      criterioDetalle: "Interrupción",
      tiempoInicio: new Date(),
      createdAt: new Date(),
      userId: user.uid,
      status: "activo",
      ejes: STUB_EJES,
      tipoTerminoRapido: "situacion",
      tipoFlota: "situacion",
      aperturaAt: Date.now(),
      excluirDeHistorial: true,
      vehiculoPadreDesglosadorId: vehicleId,
      clientRequestId,
    };

    const pausedList = vehiclesRef.current.map(v =>
      v.id === vehicleId ? { ...v, ...pausedPatch } : v
    );
    const optimisticList = [interruptVehicle, ...pausedList];
    setVehicles(optimisticList);
    vehiclesRef.current = optimisticList;
    saveLocalVehicles(optimisticList);

    setExpandedId(provisionalInterruptId);

    toast.success("Interrupción lanzada", {
      description: "Cierra la situación arriba (Cumplido o Incumplido) para reanudar el desglosador.",
      style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
      duration: 4500,
    });

    try {
      void updateVehicle(user.uid, vehicleId, pausedPatch).catch(e =>
        console.warn("[desglosador] pause patch:", e)
      );
      const { id: realId } = await addVehicle(user.uid, {
        titulo: tituloInterrupcion.trim(),
        criterioFin: "circunstancia",
        criterioDetalle: "Interrupción",
        tiempoInicio: new Date(),
        ejes: interruptVehicle.ejes,
        tipoTerminoRapido: "situacion",
        tipoFlota: "situacion",
        aperturaAt: Date.now(),
        excluirDeHistorial: true,
        vehiculoPadreDesglosadorId: vehicleId,
      }, { provisionalId: provisionalInterruptId, clientRequestId });
      if (realId !== provisionalInterruptId) {
        const synced = vehiclesRef.current.map(v =>
          v.id === provisionalInterruptId ? { ...v, id: realId } : v
        );
        vehiclesRef.current = synced;
        setVehicles(synced);
        setExpandedId(prev => (prev === provisionalInterruptId ? realId : prev));
      }
      ghostReconcileRef.current?.();
    } catch {
      const rolledBack = vehiclesRef.current
        .filter(v => v.id !== provisionalInterruptId)
        .map(v => v.id === vehicleId
          ? { ...v, desglosadorPausa: undefined, interrupcionActiva: false }
          : v);
      setVehicles(rolledBack);
      vehiclesRef.current = rolledBack;
      saveLocalVehicles(rolledBack);
      toast.error("No se pudo lanzar la interrupción", {
        description: "El desglosador se reanudó. Intenta de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    } finally {
      pausaInterrupcionLockRef.current = null;
    }
  };

  const reconcileDesglosadorDepthPS = useCallback(async (
    vehicleId: string,
    options?: { silent?: boolean; sourceLabel?: string; resetGranted?: number }
  ): Promise<{ grantedTotal: number; awardedNow: number }> => {
    if (!user) return { grantedTotal: 0, awardedNow: 0 };
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo") {
      return {
        grantedTotal: vehicle?.desglosadorBloqueDepthPsGranted ?? 0,
        awardedNow: 0,
      };
    }

    const elapsedSec = getDesglosadorSessionElapsedSec(vehicle);
    const totalDepthPs = computeDesglosadorSessionDepthPS(elapsedSec);
    const depthGranted = options?.resetGranted ?? vehicle.desglosadorBloqueDepthPsGranted ?? 0;
    const newGranted = totalDepthPs;
    const depthSource = `Profundidad desglosador [${vehicleId}] nivel:${newGranted}`;
    const spLogs = getLocalSPLog(user.uid);
    if (hasJournalSpExactSource(spLogs, depthSource)) {
      if (depthGranted < newGranted) {
        const patchOnly = (list: Vehicle[]) =>
          list.map(v => v.id === vehicleId ? { ...v, desglosadorBloqueDepthPsGranted: newGranted } : v);
        setVehicles(patchOnly);
        vehiclesRef.current = patchOnly(vehiclesRef.current);
        try { saveLocalVehicles(vehiclesRef.current); } catch { /* ignore */ }
      }
      return { grantedTotal: Math.max(depthGranted, newGranted), awardedNow: 0 };
    }

    const delta = totalDepthPs - depthGranted;
    if (delta <= 0) return { grantedTotal: depthGranted, awardedNow: 0 };

    const ok = await safeAwardPS(delta, depthSource);
    if (!ok) return { grantedTotal: depthGranted, awardedNow: 0 };
    const patchVehicles = (list: Vehicle[]) =>
      list.map(v => v.id === vehicleId ? { ...v, desglosadorBloqueDepthPsGranted: newGranted } : v);
    setVehicles(patchVehicles);
    vehiclesRef.current = patchVehicles(vehiclesRef.current);
    try {
      saveLocalVehicles(vehiclesRef.current);
    } catch (e) {
      console.warn("[reconcileDesglosadorDepthPS] localStorage save failed:", e);
    }

    if (!options?.silent) {
      const hoursDone = Math.floor(elapsedSec / 3600);
      const hourAward = hoursDone > 0 ? depthAwardForHour(hoursDone) : delta;
      dispatchDesglosadorVoiceOnGesture(() => {
        dispatchDesglosadorDepthVoice(vehicleId, delta, hoursDone > 0 ? hoursDone : undefined);
      });
      toast.success(`+${delta} PS · profundidad de sesión`, {
        description: hoursDone > 0
          ? `Hora ${hoursDone} completada · +${hourAward} PS (progresivo)`
          : `Profundidad progresiva · +${delta} PS`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        duration: 3200,
      });
    }
    return { grantedTotal: newGranted, awardedNow: delta };
  }, [user, safeAwardPS, dispatchDesglosadorVoiceOnGesture]);

  const desglosadorProgressScore = (subs: SubVehiculo[] | undefined): number =>
    (subs ?? []).reduce((acc, s) => {
      if (s.status === "cumplido" || s.status === "fallado") return acc + 100;
      if (s.status === "activo") return acc + 10;
      return acc;
    }, 0);

  const handleDesglosadorUpdate = useCallback((
    vehicleId: string,
    updatedSubs: SubVehiculo[],
    opts?: {
      resetDepth?: boolean;
      silentDepth?: boolean;
      force?: boolean;
      /** Solo cruce de banda ruta — memoria local, sin Firebase/depth/disco. */
      rutaCruzadoOnly?: boolean;
      /** Primer paint tras lanzar — sin depth ni disco en el mismo frame. */
      launchPaint?: boolean;
    }
  ) => {
    if (!user) return;
    const prevVehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!prevVehicle) return;
    if (prevVehicle.status !== "activo") {
      console.warn("[Desglosador] Ignorando actualización: vehículo ya cerrado", vehicleId);
      return;
    }

    const subs = updatedSubs.map(s => ({
      ...s,
      rutaEnfoque: s.rutaEnfoque ? { ...s.rutaEnfoque, cruzado: { ...s.rutaEnfoque.cruzado } } : undefined,
    }));

    const prevProgress = desglosadorProgressScore(prevVehicle.subVehiculos);
    const nextProgress = desglosadorProgressScore(subs);
    if (!opts?.force && nextProgress < prevProgress) {
      console.warn("[Desglosador] Ignorando actualización obsoleta de subs", vehicleId);
      return;
    }

    if (opts?.rutaCruzadoOnly) {
      commitFlotaPatchMs0(list =>
        list.map(v => (v.id === vehicleId ? { ...v, subVehiculos: subs } : v))
      );
      return;
    }

    const launchPaint = opts?.launchPaint === true;

    const prevActiveId = prevVehicle.subVehiculos?.find(s => s.status === "activo")?.id;
    const closedPrevActive =
      prevActiveId != null &&
      (() => {
        const closed = subs.find(s => s.id === prevActiveId);
        return closed != null && closed.status !== "activo" &&
          (closed.status === "cumplido" || closed.status === "fallado");
      })();
    const nextActiveId = subs.find(s => s.status === "activo")?.id;
    const advancedToNext =
      closedPrevActive && nextActiveId != null && nextActiveId !== prevActiveId;
    const shouldResetDepth = opts?.resetDepth ?? advancedToNext;

    for (const sub of subs) {
      if (sub.status !== "cumplido") continue;
      const prevSub = prevVehicle.subVehiculos?.find(s => s.id === sub.id);
      if (prevSub?.status === "cumplido") continue;
      recordDecision(user.uid, {
        key: decisionKeySubDesglosador(vehicleId, sub.id),
        kind: "sub_desglosador",
        vehicleId,
      });
    }

    if (prevVehicle.tipoReloj === "desglosador") {
      for (const sub of subs) {
        if (sub.status !== "cumplido" && sub.status !== "fallado") continue;
        const prevSub = prevVehicle.subVehiculos?.find(s => s.id === sub.id);
        if (!prevSub || prevSub.status === sub.status) continue;
        if (prevSub.status !== "activo" && prevSub.status !== "pendiente") continue;
        dispatchDesglosadorVoiceOnGesture(() => {
          dispatchDesglosadorSubCloseVoice(vehicleId, sub, sub.status as "cumplido" | "fallado");
        });
      }
    }

    const depthGranted = shouldResetDepth ? 0 : (prevVehicle.desglosadorBloqueDepthPsGranted ?? 0);
    const now = Date.now();

    commitFlotaPatchMs0(list =>
      list.map(v => {
        if (v.id !== vehicleId) return v;
        const patch: Partial<Vehicle> = {
          subVehiculos: subs,
          desglosadorBloqueDepthPsGranted: depthGranted,
        };
        if (shouldResetDepth) patch.aperturaAt = now;
        return { ...v, ...patch };
      })
    );

    const prevTimer = desglosadorSyncTimersRef.current.get(vehicleId);
    if (prevTimer) clearTimeout(prevTimer);
    desglosadorSyncTimersRef.current.set(
      vehicleId,
      setTimeout(() => {
        desglosadorSyncTimersRef.current.delete(vehicleId);
        runShadowTask(() => {
          const latest = vehiclesRef.current.find(v => v.id === vehicleId);
          if (!latest?.subVehiculos?.length || latest.status !== "activo") return;
          void updateVehicle(user.uid, vehicleId, {
            subVehiculos: latest.subVehiculos,
            desglosadorBloqueDepthPsGranted: latest.desglosadorBloqueDepthPsGranted,
            ...(shouldResetDepth ? { aperturaAt: latest.aperturaAt } : {}),
          }).catch(e => console.warn("[Desglosador] sync Firebase subs:", e));
        });
      }, launchPaint ? 2_500 : 450)
    );

    if (launchPaint) return;

    if (shouldResetDepth) {
      scheduleDesglosadorDepthOnTap(vehicleId, { silent: true, resetGranted: 0 });
    } else if (opts?.silentDepth) {
      scheduleDesglosadorDepthOnTap(vehicleId, { silent: true });
    } else {
      scheduleDesglosadorDepthOnTap(vehicleId, { silent: false });
    }
    saveLocalVehicles(vehiclesRef.current);
  }, [user, dispatchDesglosadorVoiceOnGesture, commitFlotaPatchMs0]);

  const handleDesglosadorReorderSubs = (vehicleId: string, movedId: string, direction: ReorderDirection) => {
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle?.subVehiculos) return;
    if (vehicle.interrupcionActiva) {
      toast.info("Desglosador en pausa", {
        description: "Cierra la interrupción arriba o reanúdalo antes de reordenar la cola.",
        duration: 3500,
      });
      return;
    }
    const next = reorderSubVehiculos(vehicle.subVehiculos, movedId, direction);
    if (!next) return;
    handleDesglosadorUpdate(vehicleId, next, { silentDepth: true });
    const nextTitulo = firstPendingSubVehiculoTitulo(next);
    toast.info("Orden actualizado", {
      description: nextTitulo ? `Próximo tras el activo: ${nextTitulo}` : "Cola de subs reordenada",
      style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
      duration: 2400,
    });
  };

  const handleDesglosadorActivatePendingSub = (vehicleId: string, subId: string) => {
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle?.subVehiculos || vehicle.status !== "activo") return;
    if (vehicle.interrupcionActiva) {
      toast.info("Desglosador en pausa", {
        description: "Cierra la interrupción arriba o reanúdalo antes de abrir otro sub.",
        duration: 3500,
      });
      return;
    }
    const subs = [...vehicle.subVehiculos];
    const targetIdx = subs.findIndex(s => s.id === subId);
    if (targetIdx === -1 || subs[targetIdx].status !== "pendiente") return;
    const activeIdx = subs.findIndex(s => s.status === "activo");
    if (activeIdx !== -1) {
      toast.warning("Hay un sub en curso", {
        description: `Cierra «${cleanSubTitulo(subs[activeIdx].titulo)}» con Cumplido o Fallado. El siguiente arranca solo al cerrar.`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
        duration: 4500,
      });
      return;
    }
    const now = Date.now();
    subs[targetIdx] = { ...subs[targetIdx], status: "activo", aperturaAt: now };
    handleDesglosadorUpdate(vehicleId, subs, { silentDepth: true });
    dispatchDesglosadorVoiceOnGesture(() => {
      dispatchDesglosadorSubIntroVoiceOnce(
        vehicleId,
        subs[targetIdx].id,
        now,
        subs[targetIdx].titulo,
        Boolean(subs[targetIdx].rutaEnfoque?.activa)
      );
    });
    toast.success("Sub en curso", {
      description: cleanSubTitulo(subs[targetIdx].titulo),
      style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
      duration: 2800,
    });
  };

  const handleDesglosadorAddSub = (
    vehicleId: string,
    form: DesglosadorSubFormRow
  ) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
    if (!vehicle?.subVehiculos || vehicle.status !== "activo") return;
    if (vehicle.interrupcionActiva) {
      toast.info("Desglosador en pausa", {
        description: "Cierra la interrupción arriba o reanúdalo antes de añadir subtareas.",
        duration: 3500,
      });
      return;
    }
    const titulo = form.titulo.trim();
    if (!titulo) {
      toast.error("Escribe un título para la subtarea");
      return;
    }
    const subs = [...vehicle.subVehiculos];
    const hasActive = subs.some(s => s.status === "activo");
    const allDone = subs.length > 0 && subs.every(s => s.status === "cumplido" || s.status === "fallado");
    const activate = !hasActive && allDone;
    const newSub = buildDesglosadorSubFromRuntime(form, subs, { activate });
    handleDesglosadorUpdate(vehicleId, [...subs, newSub], { silentDepth: true });
    if (activate && newSub.aperturaAt != null) {
      const subAperturaAt = newSub.aperturaAt;
      dispatchDesglosadorVoiceOnGesture(() => {
        dispatchDesglosadorSubIntroVoiceOnce(
          vehicleId,
          newSub.id,
          subAperturaAt,
          newSub.titulo,
          Boolean(newSub.rutaEnfoque?.activa)
        );
      });
    }
    toast.success("Subtarea añadida", {
      description: activate
        ? `"${titulo}" · en curso ahora`
        : `"${titulo}" · al final de la cola`,
      style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
      duration: 3200,
    });
  };

  const dispatchDesglosadorGlobalClose = useCallback((
    vehicleId: string,
    subs: SubVehiculo[],
    intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite",
    rutaDeclaradaGlobal?: RutaBandaId[]
  ) => {
    if (!user) return;
    if (isCloseBlocked(vehicleId) || isDesglosadorLiquidationInFlight(vehicleId)) {
      toast.info("Cierre en curso…", { description: "Espera unos segundos y reintenta.", duration: 2500 });
      return;
    }

    const pendingSubSync = desglosadorSyncTimersRef.current.get(vehicleId);
    if (pendingSubSync) {
      clearTimeout(pendingSubSync);
      desglosadorSyncTimersRef.current.delete(vehicleId);
    }

    setExpandedId(prev => (prev === vehicleId ? null : prev));
    setCierreEnergiaPending(null);
    setCierreEnergiaSeleccion(null);

    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;

    const optimistic = applyDesglosadorCloseOptimistic({
      userId: user.uid,
      vehicleId,
      vehicle,
      subs,
      intensidadEnergeticaFin,
      rutaDeclaradaGlobal,
      getAllVehicles: () => vehiclesRef.current,
      patchAllVehicles: mapper => {
        setVehicles(prev => mapper(prev));
        vehiclesRef.current = mapper(vehiclesRef.current);
      },
      removeFromOptimisticRef: id => {
        optimisticVehiclesRef.current = optimisticVehiclesRef.current.filter(v => v.id !== id);
      },
      persistVehicles: persistVehiclesRef,
      segmentos: planilla?.segmentos || [],
      onConquistaPulse: () => window.requestAnimationFrame(() => options?.onConquistaPulse?.()),
      teardownSituacion: teardownSituacionSession,
      markOrphanInterrupt: id => orphanInterruptSweepRef.current.add(id),
    });

    if (!optimistic) return;

    const closedVehicleMs0: Vehicle = {
      ...vehicle,
      ...optimistic.closePatch,
      subVehiculos: optimistic.subsConRuta,
    };
    const subsPsBefore = sumDesglosadorSubsPsAlreadyGranted(optimistic.subsConRuta);
    const depthPs = vehicle.desglosadorBloqueDepthPsGranted ?? 0;
    const psTotalEstimate =
      subsPsBefore + DESGLOSADOR_CYCLE_CLOSE_BASE_PS + depthPs + optimistic.psRuta;
    const celebrationSummaryMs0 = computeDesglosadorTiempoCloseSummary(
      closedVehicleMs0,
      optimistic.subsConRuta,
      {
        duracionMin: optimistic.duracionFinal,
        psSubs: subsPsBefore,
        psCierre: DESGLOSADOR_CYCLE_CLOSE_BASE_PS,
        psProfundidad: depthPs,
        psRuta: optimistic.psRuta,
        psTotal: psTotalEstimate,
        psAwardedNow: 0,
      }
    );
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() =>
        openDesglosadorTiempoCelebration(vehicleId, vehicle.titulo, celebrationSummaryMs0)
      );
    } else {
      openDesglosadorTiempoCelebration(vehicleId, vehicle.titulo, celebrationSummaryMs0);
    }

    scheduleGlobalCycleLiquidation({
        userId: user.uid,
        vehicleId,
        vehicleSnapshot: vehicle,
        subsConRuta: optimistic.subsConRuta,
        closePatch: optimistic.closePatch,
        childInterrupts: optimistic.childInterrupts,
        cierreAt: optimistic.cierreAt,
        duracionFinal: optimistic.duracionFinal,
        cumplidos: optimistic.cumplidos,
        fallados: optimistic.fallados,
        psRuta: optimistic.psRuta,
        rutaCruzada: optimistic.rutaCruzada,
        intensidadEnergeticaFin,
        getVehicle: () => vehicleById(vehicleId),
        patchVehicle: (id, patch) => {
          setVehicles(prev => prev.map(v => (v.id === id ? { ...v, ...patch } : v)));
          vehiclesRef.current = vehiclesRef.current.map(v => (v.id === id ? { ...v, ...patch } : v));
        },
        persistVehicles: persistVehiclesRef,
        flushPersistVehicles: flushPersistVehiclesRef,
        saveVehicleHistory,
        getSpLogs: () => getLocalSPLog(user.uid),
        safeAwardPS,
        reconcileDepthPS: (id, opts) => reconcileDesglosadorDepthPS(id, opts),
        beginClose: () => beginClose(vehicleId),
        endClose: () => endClose(vehicleId),
        onDailyPs: (total) => options?.onDailyPsChange?.(total),
        getDailyPsTotal: () => getDailyPointsLocalSync(user.uid).total,
        markPeldano: (v, subsSettled, sessionTotalPs) => {
          void markPeldanoConquistadoTiempo(user.uid, v, subsSettled, sessionTotalPs);
        },
        recordVehiculoCierre: (id, banda) => recordVehiculoCierre(id, banda),
        incrementModulePoints: () => {
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
        },
        registrarEvento: () => {
          registrarEvento(COMPONENTES.PLANIFICACION);
        },
        onCelebration: openDesglosadorTiempoCelebration,
        skipCelebration: true,
        onToastSuccess: (message, description) => {
          toast.success(message, {
            description,
            style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
            duration: 3200,
          });
        },
        onToastError: message => {
          toast.error(message, {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
        },
    });
  }, [
    user,
    planilla?.segmentos,
    safeAwardPS,
    reconcileDesglosadorDepthPS,
    recordVehiculoCierre,
    openDesglosadorTiempoCelebration,
    setVehicles,
  ]);

  /** @deprecated Usar dispatchDesglosadorGlobalClose — liquidación ya es asíncrona. */
  const handleDesglosadorGlobalClose = dispatchDesglosadorGlobalClose;

  const handleSyncSituacionCupoAnchor = useCallback(async (vehicleId: string, opts?: { forceResetSameRow?: boolean }) => {
    if (!user) return;
    const v = vehiclesRef.current.find(x => x.id === vehicleId);
    if (!v || v.tipoFlota !== "situacion" || v.status !== "activo") return;
    const list = v.subTareas || [];
    const cronActivo = v.situacionCronometro?.activo === true;
    const cur = v.situacionCupoAnchor;

    let next: { subTareaId: string; startedAt: number } | null | undefined;
    if (cronActivo) {
      const resolved = resolveCronometroCupoAnchor(list, cur, opts);
      if (resolved === "unchanged") return;
      next = resolved;
    } else {
      const first = list.find(st => {
        if (!((st.minutosCupo ?? 0) > 0)) return false;
        return !st.enDesgloseCronometro && !st.completada;
      });
      if (!first) {
        next = null;
      } else if (cur?.subTareaId === first.id && !opts?.forceResetSameRow) {
        return;
      } else {
        next = { subTareaId: first.id, startedAt: Date.now() };
      }
    }

    if (next === undefined) return;
    if (next === null) {
      if (cur != null) {
        vehiclesRef.current = vehiclesRef.current.map(x =>
          x.id === vehicleId ? { ...x, situacionCupoAnchor: undefined } : x
        );
        persistVehiclesRef();
        startTransition(() => {
          setVehicles(prev => prev.map(x => (x.id === vehicleId ? { ...x, situacionCupoAnchor: undefined } : x)));
        });
        void updateVehicle(user.uid, vehicleId, { situacionCupoAnchor: null }).catch(err => {
          console.error("[handleSyncSituacionCupoAnchor] clear", err);
        });
      }
      return;
    }

    vehiclesRef.current = vehiclesRef.current.map(x =>
      x.id === vehicleId ? { ...x, situacionCupoAnchor: next } : x
    );
    persistVehiclesRef();
    startTransition(() => {
      setVehicles(prev => prev.map(x => (x.id === vehicleId ? { ...x, situacionCupoAnchor: next } : x)));
    });
    void updateVehicle(user.uid, vehicleId, { situacionCupoAnchor: next }).catch(err => {
      console.error("[handleSyncSituacionCupoAnchor] set", err);
    });
  }, [user]);

  const handleAddSubTarea = async (vehicleId: string, texto: string): Promise<string | undefined> => {
    if (!user) return undefined;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return undefined;
    if (showEntropyDebug) performance.mark("add-subtarea-start");
    const proyectoId = resolveProyectoIdEnfoqueSituacion(vehicle, segmentoActivo?.proyectoVinculadoId);
    const newSubTarea = {
      id: `st_${Date.now()}`,
      texto,
      completada: false,
      creadaAt: Date.now(),
      ...(proyectoId ? { proyectoId } : {}),
    };
    const subTareas = [...(vehicle.subTareas || []), newSubTarea];
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    startTransition(() => {
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    });
    void updateVehicle(user.uid, vehicleId, { subTareas })
      .then(() => {
        const live = vehiclesRef.current.find(v => v.id === vehicleId);
        if (live && vehicleNeedsCupoAnchorSync(live)) {
          queueMicrotask(() => { void handleSyncSituacionCupoAnchor(vehicleId); });
        }
      })
      .catch(e => console.error("[handleAddSubTarea]", e));
    if (showEntropyDebug) performance.mark("add-subtarea-end");
    return newSubTarea.id;
  };

  const handleSellarDirectoEnRing = (vehicleId: string, texto: string): boolean => {
    if (!user) return false;
    if (ringSellarInFlightRef.current.has(vehicleId)) return false;
    ringSellarInFlightRef.current.add(vehicleId);
    try {
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicleById(vehicleId);
    if (!vehicle) return false;
    const segProy = segmentoActivo?.proyectoVinculadoId;
    const proyectoIdNuevaSub = resolveProyectoIdEnfoqueSituacion(vehicle, segProy);
    const built = buildSellarDirectoEnRingState(vehicle, texto, {
      proyectoIdNuevaSub,
      enfoqueHeredado: resolveProyectoIdEnfoqueSituacion(vehicle, segProy),
      segProyectoVinculadoId: segProy,
    });
    if (!built.ok) {
      if (built.reason === "invalid_budget") {
        toast.error("Meta del reto no disponible", {
          description: "No hay tiempo sellado para repartir entre la cola.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 3200,
        });
      }
      return false;
    }
    const { subTareas, situacionCronometro, situacionCupoAnchor } = built;
    vehiclesRef.current = vehiclesRef.current.map(v =>
      v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
    );
    flushPersistVehiclesRef();
    startTransition(() => {
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        )
      );
    });
    setExpandedId(vehicleId);
    suppressSituacionFilaVoiceAfterSellar(vehicleId);
    void updateVehicle(user.uid, vehicleId, {
      subTareas,
      situacionCronometro,
      situacionCupoAnchor: situacionCupoAnchor ?? null,
    }).catch(e => console.error("[handleSellarDirectoEnRing]", e));
    return true;
    } finally {
      queueMicrotask(() => ringSellarInFlightRef.current.delete(vehicleId));
    }
  };

  const handleAddSubTareaUrgenteACola = (vehicleId: string, texto: string) => {
    handleSellarDirectoEnRing(vehicleId, texto);
  };

  const handleToggleSubTarea = async (vehicleId: string, subTareaId: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;
    const targetSub = (vehicle.subTareas || []).find(st => st.id === subTareaId);
    if (targetSub?.enDesgloseCronometro) return;
    const isChecking = targetSub ? !targetSub.completada : false;
    const list = vehicle.subTareas || [];
    const idx = list.findIndex(st => st.id === subTareaId);
    const chimesOnComplete = isChecking && vehicle.tipoFlota === "situacion" && idx >= 0 ? Math.max(1, list.length - idx) : 0;
    const nowMs = Date.now();
    let subTareas = list.map(st =>
      st.id === subTareaId
        ? {
            ...st,
            completada: !st.completada,
            cerradaAt: isChecking ? nowMs : undefined,
          }
        : st
    );
    let pasoNumero: number | null = null;
    if (isChecking && vehicle.tipoFlota === "situacion" && targetSub) {
      const updatedSub = subTareas.find(st => st.id === subTareaId)!;
      const sync = await syncRingDecisionToProyectoHub(user.uid, vehicle, updatedSub, "cumplido", nowMs);
      pasoNumero = sync.pasoNumero;
      if (pasoNumero != null) {
        subTareas = subTareaConPasoEjecutado(subTareas, subTareaId, pasoNumero);
      }
    }
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
      const live = vehiclesRef.current.find(v => v.id === vehicleId);
      if (live && vehicleNeedsCupoAnchorSync(live)) {
        queueMicrotask(() => { void handleSyncSituacionCupoAnchor(vehicleId); });
      }
      if (chimesOnComplete > 0) void playSituacionChimes(chimesOnComplete);
      if (isChecking && vehicle.tipoFlota === "situacion" && targetSub) {
        recordDecision(user.uid, {
          key: decisionKeySubSituacion(vehicleId, subTareaId),
          kind: "sub_situacion",
          vehicleId,
          ts: nowMs,
        });
        try {
          await awardSovereigntyPoints(user.uid, 2, `Sub-tarea (lista libre): ${targetSub.texto}`);
          toast.success("+2 PS · Cerrar sin reloj", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
            duration: 2000,
          });
          if (pasoNumero != null) {
            const proyTitulo = proyectosHub.find(p => p.id === targetSub.proyectoId)?.titulo;
            toast.info(`Paso #${pasoNumero} en ${proyTitulo ?? "proyecto"}`, {
              description: "Paso desde el Crisol — fe incremental, anti-miopía.",
              style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
              duration: 3500,
            });
          }
        } catch { console.error("[handleToggleSubTarea] awardSovereigntyPoints falló"); }
      }
    } catch (e) { console.error("[handleToggleSubTarea]", e); }
  };

  const handleSetSubTareaMinutosCupo = async (vehicleId: string, subTareaId: string, minutos: number | undefined) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas) return;
    const sc = vehicle.situacionCronometro;
    const cronActivo = sc?.activo === true;
    const base = sc?.bloqueInicioAt ?? Date.now();
    let subTareas: SubTarea[];

    if (cronActivo) {
      const budget = totalBudgetMinFromCronometro(
        vehicle.subTareas,
        base,
        sc?.horaFinContratoMs ?? sc?.horaFinMs
      );
      subTareas = applyCupoManualYRedistribuir(vehicle.subTareas, subTareaId, minutos, budget);
    } else {
      subTareas = vehicle.subTareas.map(st => {
        if (st.id !== subTareaId) return st;
        if (minutos === undefined || minutos <= 0 || !Number.isFinite(minutos)) {
          const next = { ...st };
          delete (next as { minutosCupo?: number; cupoFijo?: boolean }).minutosCupo;
          delete (next as { cupoFijo?: boolean }).cupoFijo;
          return next;
        }
        return { ...st, minutosCupo: Math.round(Math.min(999, Math.max(0, minutos))), cupoFijo: true };
      });
    }

    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
      const vAfter = vehiclesRef.current.find(x => x.id === vehicleId);
      const first = (vAfter?.subTareas || []).find(st => {
        if (!((st.minutosCupo ?? 0) > 0)) return false;
        if (cronActivo) return situacionFilaCronometroPendiente(st);
        return !st.enDesgloseCronometro && !st.completada;
      });
      queueMicrotask(() => {
        void handleSyncSituacionCupoAnchor(
          vehicleId,
          first?.id === subTareaId ? { forceResetSameRow: true } : undefined
        );
      });
    } catch (err) {
      console.error("[handleSetSubTareaMinutosCupo]", err);
    }
  };

  const handleExtendSituacionCupo = async (vehicleId: string, subTareaId: string, delta: number) => {
    if (!user || delta <= 0) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return;
    const list = vehicle.subTareas;
    const idx = list.findIndex(st => st.id === subTareaId);
    if (idx === -1) return;
    const cronActivo = vehicle.situacionCronometro?.activo === true;
    const donorIdx = list.findIndex((st, i) => {
      if (i <= idx) return false;
      if (cronActivo) return situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) >= delta;
      return !st.completada && (st.minutosCupo ?? 0) >= delta;
    });
    if (donorIdx === -1) {
      toast.error("Sin cupo en la siguiente fila", {
        description: `Necesitas ≥${delta} min en una subtarea posterior pendiente.`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const cur = list[idx];
    const donor = list[donorIdx];
    const subTareas = list.map((st, i) => {
      if (i === idx) return { ...st, minutosCupo: (cur.minutosCupo ?? 0) + delta, cupoFijo: true };
      if (i === donorIdx) return { ...st, minutosCupo: Math.max(0, (donor.minutosCupo ?? 0) - delta) };
      return st;
    });
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
      toast.success(`+${delta} min`, {
        description: `Tomado de la subtarea ${donorIdx + 1}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2500,
      });
      void handleSyncSituacionCupoAnchor(vehicleId);
    } catch (e) {
      console.error("[handleExtendSituacionCupo]", e);
    }
  };

  const tryFinalizeSituacionDesgloseBloque = useCallback((
    vehicleId: string,
    subTareas: SubTarea[],
    vehicleSnapshot: Vehicle
  ): Promise<boolean> => {
    if (!user) return Promise.resolve(false);
    const sc = vehicleSnapshot.situacionCronometro;
    if (!situacionDesgloseBloqueListo(subTareas, sc)) return Promise.resolve(false);

    const bloqueKey = `${vehicleId}_${sc!.bloqueInicioAt ?? 0}`;
    if (situacionBloqueCelebratedRef.current.has(bloqueKey)) return Promise.resolve(false);

    const bloqueInicio = sc!.bloqueInicioAt ?? vehicleSnapshot.aperturaAt ?? Date.now();
    const elapsedSec = Math.floor((Date.now() - bloqueInicio) / 1000);
    const totalDepthPs = computeDesglosadorSessionDepthPS(elapsedSec);
    const prevGranted = sc!.depthBlockPsGranted ?? 0;
    const deltaDepth = totalDepthPs - prevGranted;
    const situacionCronometro: NonNullable<Vehicle["situacionCronometro"]> = {
      ...buildSituacionCronometroCierre(
        { ...sc!, depthBlockPsGranted: totalDepthPs },
        Date.now()
      ),
      depthBlockPsGranted: totalDepthPs,
    };

    teardownSituacionSession(vehicleId);

    const updatedVehicle: Vehicle = { ...vehicleSnapshot, subTareas, situacionCronometro };
    commitFlotaPatchMs0(
      prev => prev.map(v => (v.id === vehicleId ? updatedVehicle : v)),
      { flushDisk: true }
    );

    const summary = presentSituacionDesgloseCelebration(vehicleId, vehicleSnapshot.titulo, updatedVehicle);
    situacionBloqueCelebratedRef.current.add(bloqueKey);

    window.requestAnimationFrame(() => {
      void playSituacionChimes(3);
      options?.onGoldenFlash?.();
    });

    runShadowTask(() => {
      void (async () => {
        try {
          await updateVehicle(user.uid, vehicleId, { subTareas, situacionCronometro });
          if (deltaDepth > 0) {
            await awardSovereigntyPoints(user.uid, deltaDepth, `Profundidad bloque situación: ${vehicleSnapshot.titulo}`);
          }
          void handleSyncSituacionCupoAnchor(vehicleId);
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          registrarEvento(COMPONENTES.PLANIFICACION);
          if (vehicleSnapshot.proyectoId && vehicleSnapshot.proyectoPeldanoId) {
            const { ideasCreadas } = await markPeldanoConquistadoSituacion(user.uid, updatedVehicle, {
              duracionMin: summary.minutosBloque,
              psGanados: summary.psTotal,
              subTareas,
              minutosGanados: summary.minutosGanados,
              minutosGanadosSesion: summary.minutosGanadosSesion,
              retoNumero: summary.retoNumero,
            });
            if (ideasCreadas > 0) {
              toast.info(
                `${ideasCreadas} rama${ideasCreadas !== 1 ? "s" : ""} guardada${ideasCreadas !== 1 ? "s" : ""} en Proyectos`,
                {
                  description: "Ideas de profundidad pendiente — retómalas desde el Hub.",
                  style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}40`, color: CYAN },
                  duration: 5000,
                }
              );
            }
          }
        } catch (e) {
          console.error("[tryFinalizeSituacionDesgloseBloque]", e);
          situacionBloqueCelebratedRef.current.delete(bloqueKey);
        }
      })();
    });

    return Promise.resolve(true);
  }, [user, presentSituacionDesgloseCelebration, commitFlotaPatchMs0, handleSyncSituacionCupoAnchor]);

  const handleCerrarSituacionDesglosadorDeGolpe = (vehicleId: string) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion" || vehicle.situacionCronometro?.activo !== true) {
      return;
    }
    const now = Date.now();
    const sc = vehicle.situacionCronometro!;
    const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
    const subTareas = cerrarCronometroDeGolpe(
      vehicle.subTareas,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio
    );
    const situacionCronometro = buildSituacionCronometroCierre(
      { ...sc, depthBlockPsGranted: sc.depthBlockPsGranted ?? 0 },
      now
    );
    const elapsedSec = Math.floor((now - bloqueInicio) / 1000);
    const totalDepthPs = computeDesglosadorSessionDepthPS(elapsedSec);
    const prevGranted = sc.depthBlockPsGranted ?? 0;
    const deltaDepth = totalDepthPs - prevGranted;
    const situacionCronometroFinal = { ...situacionCronometro, depthBlockPsGranted: totalDepthPs };
    const closedVehicle: Vehicle = {
      ...vehicle,
      subTareas,
      situacionCronometro: situacionCronometroFinal,
      situacionCupoAnchor: null,
    };

    teardownSituacionSession(vehicleId);
    commitFlotaPatchMs0(
      prev =>
        prev.map(v =>
          v.id === vehicleId
            ? { ...v, subTareas, situacionCronometro: situacionCronometroFinal, situacionCupoAnchor: null }
            : v
        ),
      { flushDisk: true }
    );
    presentSituacionDesgloseCelebration(vehicleId, vehicle.titulo, closedVehicle);
    window.requestAnimationFrame(() => {
      void playSituacionChimes(2);
      options?.onGoldenFlash?.();
    });
    const bolsa = situacionCronometroFinal.bolsaSegundoRetoMin ?? 0;
    toast.info("Ronda cerrada de golpe", {
      description:
        bolsa > 0
          ? `Filas pendientes marcadas falladas · ${bolsa} min disponibles para otra ronda`
          : "Filas pendientes marcadas falladas · revisa el resumen del bloque",
      duration: 3500,
    });

    runShadowTask(() => {
      void (async () => {
        try {
          await updateVehicle(user.uid, vehicleId, {
            subTareas,
            situacionCronometro: situacionCronometroFinal,
            situacionCupoAnchor: null,
          });
          if (deltaDepth > 0) {
            await awardSovereigntyPoints(user.uid, deltaDepth, `Profundidad bloque situación: ${vehicle.titulo}`);
          }
          incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
          registrarEvento(COMPONENTES.PLANIFICACION);
        } catch (e) {
          console.error("[handleCerrarSituacionDesglosadorDeGolpe]", e);
        }
      })();
    });
  };

  const handleDesglosadorCierreDeGolpe = async (vehicleId: string) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subVehiculos || vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo") return;
    if (vehicle.interrupcionActiva) {
      toast.info("Desglosador en pausa", {
        description: "Cierra o reanuda la interrupción antes de cerrar el desglosador.",
        duration: 3500,
      });
      return;
    }
    const now = Date.now();
    const prevSubs = vehicle.subVehiculos;
    const subs = prevSubs.map(sv => {
      if (sv.status === "cumplido" || sv.status === "fallado") return sv;
      if (sv.status === "activo") {
        const duracionFinal = sv.aperturaAt ? Math.floor((now - sv.aperturaAt) / 1000) : 0;
        return {
          ...sv,
          status: "fallado" as const,
          cierreAt: now,
          duracionFinal,
        };
      }
      return {
        ...sv,
        status: "fallado" as const,
        cierreAt: now,
        duracionFinal: 0,
      };
    });
    unlockDesglosadorSpeechFromGesture();
    for (const sub of subs) {
      const prev = prevSubs.find(s => s.id === sub.id);
      if (!prev || prev.status === sub.status) continue;
      if (sub.status === "fallado" || sub.status === "cumplido") {
        dispatchDesglosadorSubCloseVoice(vehicleId, sub, sub.status);
      }
    }
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subVehiculos: subs } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subVehiculos: subs } : v));
    saveLocalVehicles(vehiclesRef.current);
    dispatchDesglosadorGlobalClose(vehicleId, subs);
  };

  const handleCerrarSituacionDesgloseBloque = useCallback(async (vehicleId: string) => {
    let vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas) return;

    let finalized =
      vehicle.situacionCronometro?.activo === true &&
      situacionDesgloseBloqueListo(vehicle.subTareas, vehicle.situacionCronometro)
        ? await tryFinalizeSituacionDesgloseBloque(vehicleId, vehicle.subTareas, vehicle)
        : false;

    if (
      !finalized &&
      vehicle.situacionCronometro?.activo === true &&
      situacionDesgloseBloqueListo(vehicle.subTareas, vehicle.situacionCronometro)
    ) {
      const bloqueKey = `${vehicleId}_${vehicle.situacionCronometro.bloqueInicioAt ?? 0}`;
      if (situacionBloqueCelebratedRef.current.has(bloqueKey)) {
        situacionBloqueCelebratedRef.current.delete(bloqueKey);
        finalized = await tryFinalizeSituacionDesgloseBloque(vehicleId, vehicle.subTareas, vehicle);
      }
    }

    if (finalized) return;

    vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicle;
    if (!situacionDesgloseBloqueTerminado(vehicle.subTareas || [])) {
      toast.info("Ring incompleto", {
        description: "Marca cumplido o fallado en cada fila del desglose antes de cerrar la ronda.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        duration: 4000,
      });
      return;
    }

    teardownSituacionSession(vehicleId);
    presentSituacionDesgloseCelebration(vehicleId, vehicle.titulo, vehicle);
  }, [vehicles, tryFinalizeSituacionDesgloseBloque, presentSituacionDesgloseCelebration]);

  const handleEnqueueSubTareasToCronometro = async (
    vehicleId: string,
    ids: string[],
    opts?: { proyectoEnfoqueId?: string }
  ): Promise<boolean> => {
    if (!user || ids.length === 0) return false;
    if (ringSellarInFlightRef.current.has(vehicleId)) return false;
    ringSellarInFlightRef.current.add(vehicleId);
    try {
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return false;
    const sc = vehicle.situacionCronometro;
    if (sc?.activo !== true) return false;

    const idSet = new Set(ids);
    const invalid = ids.some(id => {
      const st = vehicle.subTareas!.find(s => s.id === id);
      return !st || st.enDesgloseCronometro || st.completada;
    });
    if (invalid) {
      toast.error("No se puede encolar", {
        description: "Solo subtareas libres (no completadas) pueden entrar a la cola del reto.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 3200,
      });
      return false;
    }

    const segProy = segmentoActivo?.proyectoVinculadoId;
    const enfoqueHeredado =
      opts?.proyectoEnfoqueId?.trim() ||
      sc.proyectoEnfoqueId?.trim() ||
      resolveProyectoIdEnfoqueSituacion(vehicle, segProy);

    const lifted = vehicle.subTareas
      .filter(st => idSet.has(st.id))
      .map(st => {
        const next: SubTarea = {
          ...st,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente" as const,
          completada: false,
        };
        if (!isCupoFijo(st)) {
          delete (next as { minutosCupo?: number }).minutosCupo;
          delete (next as { cupoFijo?: boolean }).cupoFijo;
        }
        return aplicarProyectoHeredadoASub(next, enfoqueHeredado);
      });
    const libreOrdered = vehicle.subTareas.filter(st => !idSet.has(st.id));
    let subTareas = [...libreOrdered, ...lifted];
    const budgetMin = remainingCronometroBudgetMin(sc, subTareas);
    if (budgetMin == null) {
      toast.error("Meta del reto no disponible", {
        description: "No hay tiempo sellado para repartir entre la cola.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 3200,
      });
      return false;
    }

    subTareas = redistribuirMinutosSituacionCronometro(subTareas, budgetMin);

    const contratoMs = situacionContratoFinMs(sc);
    const proyectoEnfoqueId =
      opts?.proyectoEnfoqueId?.trim() ||
      sc.proyectoEnfoqueId?.trim() ||
      dominanteProyectoIdEnSubs(subTareas.filter(st => st.enDesgloseCronometro)) ||
      vehicle.proyectoId?.trim() ||
      segProy?.trim();
    const situacionCronometro = {
      ...sc,
      ...(proyectoEnfoqueId && !sc.proyectoEnfoqueId?.trim() ? { proyectoEnfoqueId } : {}),
    };
    let situacionCupoAnchor = vehicle.situacionCupoAnchor ?? undefined;
    const curAnchor = vehicle.situacionCupoAnchor;
    const curSub = curAnchor ? subTareas.find(s => s.id === curAnchor.subTareaId) : undefined;
    const anchorStillValid =
      !!curSub &&
      situacionFilaCronometroPendiente(curSub) &&
      (curSub.minutosCupo ?? 0) > 0;
    if (!anchorStillValid) {
      const firstCron = subTareas.find(st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0);
      if (firstCron) {
        situacionCupoAnchor = { subTareaId: firstCron.id, startedAt: Date.now() };
      }
    }

    vehiclesRef.current = vehiclesRef.current.map(v =>
      v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
    );
    flushPersistVehiclesRef();
    startTransition(() => {
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
        )
      );
    });
    setExpandedId(vehicleId);
    void updateVehicle(user.uid, vehicleId, {
      subTareas,
      situacionCronometro,
      situacionCupoAnchor: situacionCupoAnchor ?? null,
    })
      .then(() => {
        if (!anchorStillValid && !situacionCupoAnchor) {
          void handleSyncSituacionCupoAnchor(vehicleId);
        }
      })
      .catch(e => console.error("[handleEnqueueSubTareasToCronometro]", e));
    const metaLabel = contratoMs != null
      ? new Date(contratoMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
    toast.success("Añadido a la cola", {
      description: `${lifted.length} fila(s) · meta ${metaLabel} · ${budgetMin} min repartidos`,
      style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE },
      duration: 3200,
    });
    return true;
    } finally {
      queueMicrotask(() => ringSellarInFlightRef.current.delete(vehicleId));
    }
  };

  const handleMoveSubTareasToCronometro = async (
    vehicleId: string,
    ids: string[],
    opts?: { objetivoHora?: string; proyectoEnfoqueId?: string }
  ): Promise<boolean> => {
    if (!user || ids.length === 0) return false;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return false;
    if (vehicle.situacionCronometro?.activo === true) {
      return handleEnqueueSubTareasToCronometro(vehicleId, ids, opts);
    }
    const idSet = new Set(ids);
    const segProy = segmentoActivo?.proyectoVinculadoId;
    const enfoqueHeredado =
      opts?.proyectoEnfoqueId?.trim() ||
      resolveProyectoIdEnfoqueSituacion(vehicle, segProy);
    const libreOrdered = vehicle.subTareas.filter(st => !idSet.has(st.id));
    const lifted = vehicle.subTareas.filter(st => idSet.has(st.id)).map(st => {
      const next: SubTarea = {
        ...st,
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente" as const,
      };
      if (!isCupoFijo(st)) {
        delete (next as { minutosCupo?: number }).minutosCupo;
        delete (next as { cupoFijo?: boolean }).cupoFijo;
      }
      return aplicarProyectoHeredadoASub(next, enfoqueHeredado);
    });
    let subTareas = [...libreOrdered, ...lifted];
    const prevSc = vehicle.situacionCronometro;
    const objetivoHora =
      opts?.objetivoHora?.trim() ||
      resolveDefaultObjetivoHoraParaRing(segmentoActivo?.horaFin) ||
      "";
    const contratoMs = situacionObjetivoHoraToContratoMs(objetivoHora);
    const sum = contratoMs != null ? situacionMinutosHastaObjetivoHora(objetivoHora) : null;
    if (sum == null || contratoMs == null) {
      toast.error("Tiempo objetivo inválido", {
        description: "Indica una hora futura (ej. fin de segmento) para abrir el ring de enfoque.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 3200,
      });
      return false;
    }
    subTareas = redistribuirMinutosSituacionCronometro(subTareas, sum);
    const firstActivation = true;
    const bloqueInicioAt = Date.now();
    const retoNumero = nextRetoNumero(prevSc);
    const proyectoEnfoqueId =
      opts?.proyectoEnfoqueId?.trim() ||
      dominanteProyectoIdEnSubs(lifted) ||
      vehicle.proyectoId?.trim() ||
      segProy?.trim();
    const situacionCronometro = {
      activo: true,
      bloqueInicioAt,
      horaFinMs: contratoMs,
      horaFinContratoMs: contratoMs,
      depthBlockPsGranted: 0,
      retoNumero,
      retosCompletados: prevSc?.retosCompletados ?? 0,
      minutosGanadosReto: 0,
      minutosGanadosSesion: prevSc?.minutosGanadosSesion ?? 0,
      saldoAdelantoMin: 0,
      bolsaSegundoRetoMin: undefined,
      ...(proyectoEnfoqueId ? { proyectoEnfoqueId } : {}),
    };
    const firstCron = subTareas.find(st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0);
    let situacionCupoAnchor = vehicle.situacionCupoAnchor ?? undefined;
    if (firstCron) {
      const curAnchor = vehicle.situacionCupoAnchor;
      const curSub = curAnchor ? subTareas.find(s => s.id === curAnchor.subTareaId) : undefined;
      const anchorStillValid =
        !!curSub &&
        situacionFilaCronometroPendiente(curSub) &&
        (curSub.minutosCupo ?? 0) > 0;
      if (firstActivation || !anchorStillValid) {
        situacionCupoAnchor = {
          subTareaId: firstCron.id,
          startedAt: firstActivation ? bloqueInicioAt : Date.now(),
        };
      }
    }
    setVehicles(prev =>
      prev.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      )
    );
    vehiclesRef.current = vehiclesRef.current.map(v =>
      v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
    );
    persistVehiclesRef();
    setExpandedId(vehicleId);
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas, situacionCronometro, situacionCupoAnchor: situacionCupoAnchor ?? null });
      if (firstActivation) {
        void requestNotificationPermission();
        unlockDesglosadorSpeechFromGesture();
        queueMicrotask(() =>
          speakRingBienvenida(retoNumero, `ring-bienvenida-${vehicleId}-${bloqueInicioAt}`)
        );
      }
      toast.success(retoNumero > 1 ? RING_COPY.siguienteRonda : RING_COPY.ring, {
        description: `${lifted.length} subtarea(s) · meta ${objetivoHora} (${sum} min repartidos)`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2800,
      });
      return true;
    } catch (e) {
      console.error("[handleMoveSubTareasToCronometro]", e);
      return false;
    }
  };

  const handleReorderSubTareasCronometro = async (
    vehicleId: string,
    movedId: string,
    direction: ReorderDirection
  ) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas || !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return;
    const next = reorderSubTareasCronometro(vehicle.subTareas, movedId, direction);
    if (!next) return;
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas: next } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas: next } : v));
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas: next });
      const nextTexto = firstPendingCronometroTexto(next);
      toast.info("Orden actualizado", {
        description: nextTexto ? `Siguiente en cronómetro: ${nextTexto}` : "Cola del desglose reordenada",
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2400,
      });
    } catch (e) {
      console.error("[handleReorderSubTareasCronometro]", e);
    }
  };

  const handleSituacionCronometroSetHoraFin = async (vehicleId: string, hhmm: string) => {
    if (!user) return;
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas || !vehicle.situacionCronometro || !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return;
    if (vehicle.situacionCronometro.horaFinContratoMs != null || vehicle.situacionCronometro.horaFinMs != null) {
      toast.info("Meta del reto sellada", {
        description: "Cierra el bloque y abre el siguiente reto para cambiar el horario.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        duration: 3500,
      });
      return;
    }
    const now = new Date();
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const mi = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    const target = new Date(now);
    target.setHours(h, mi, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    const horaFinMs = target.getTime();
    const remainingMin = Math.max(1, Math.round((horaFinMs - Date.now()) / 60000));
    const subTareas = redistribuirMinutosSituacionCronometro(vehicle.subTareas, remainingMin);
    const situacionCronometro = { ...vehicle.situacionCronometro!, horaFinMs };
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCronometro } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCronometro } : v));
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas, situacionCronometro });
      void handleSyncSituacionCupoAnchor(vehicleId);
      toast.success("Hora fin ajustada · cupos flexibles redistribuidos", {
        description: "Las filas con minutos fijados manualmente se conservan.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE },
        duration: 2800,
      });
    } catch (e) {
      console.error("[handleSituacionCronometroSetHoraFin]", e);
    }
  };

  const handleSituacionCronometroCumplido = async (vehicleId: string, subTareaId: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion" || !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return;
    const list = vehicle.subTareas;
    const targetSub = list.find(st => st.id === subTareaId);
    if (!targetSub?.enDesgloseCronometro || (targetSub.resultadoSituacion ?? "pendiente") !== "pendiente") return;
    const listCronOrder = list.filter(st => st.enDesgloseCronometro);
    const idx = listCronOrder.findIndex(st => st.id === subTareaId);
    const chimesOnComplete = idx >= 0 ? Math.max(1, listCronOrder.length - idx) : 1;
    const now = Date.now();
    let sc = vehicle.situacionCronometro!;
    if (!sc.horaFinContratoMs && sc.horaFinMs) {
      sc = { ...sc, horaFinContratoMs: sc.horaFinMs };
    }
    const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
    let workingList = list;
    if ((sc.saldoAdelantoMin ?? 0) > 0) {
      const absorbed = absorberSaldoAdelantoEnFoco(workingList, sc.saldoAdelantoMin!, vehicle.situacionCupoAnchor);
      workingList = absorbed.subTareas;
      sc = { ...sc, saldoAdelantoMin: absorbed.saldoRestante };
    }
    let { subTareas, minutosGanados, saldoAdelantoMin } = aplicarTiempoGanadoAlCumplir(
      workingList,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio,
      sc.horaFinContratoMs ?? sc.horaFinMs
    );
    const repartoColaDesc = describeRepartoGananciaEnCola(workingList, subTareas, subTareaId);
    const elapsedSec = Math.floor((now - bloqueInicio) / 1000);
    const totalDepthPs = computeDesglosadorSessionDepthPS(elapsedSec);
    const prevGranted = sc.depthBlockPsGranted ?? 0;
    const deltaDepth = totalDepthPs - prevGranted;
    const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
    const scActivo = {
      ...sc,
      depthBlockPsGranted: totalDepthPs,
      saldoAdelantoMin: (sc.saldoAdelantoMin ?? 0) + saldoAdelantoMin,
      minutosGanadosReto: (sc.minutosGanadosReto ?? 0) + minutosGanados,
      minutosGanadosSesion: (sc.minutosGanadosSesion ?? 0) + minutosGanados,
      retoNumero: sc.retoNumero ?? 1,
      retosCompletados: sc.retosCompletados ?? 0,
    };
    const situacionCronometro =
      !bloqueListo && scActivo.activo !== true
        ? reanudarSituacionCronometroRing(scActivo)
        : scActivo;
    const situacionCupoAnchor = resolveSituacionCupoAnchorAfterSubClose(
      subTareas,
      bloqueListo,
      vehicle.situacionCupoAnchor,
      now
    );

    commitFlotaPatchMs0(prev =>
      prev.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      )
    );

    recordDecision(user.uid, {
      key: decisionKeySubSituacion(vehicleId, subTareaId),
      kind: "sub_situacion",
      vehicleId,
      ts: now,
    });
    dispatchDesglosadorVoiceOnGesture(() => {
      dispatchSituacionFilaCloseVoice(vehicleId, subTareaId, targetSub.texto, "cumplido", {
        psBase: 4,
        depthDelta: deltaDepth > 0 ? deltaDepth : undefined,
        minutosGanados: deltaDepth <= 0 && minutosGanados > 0 ? minutosGanados : undefined,
        ts: now,
      });
    });

    runShadowTask(() => {
      void (async () => {
        let shadowSubTareas = subTareas;
        let pasoNumero: number | null = null;
        const updatedSub = shadowSubTareas.find(st => st.id === subTareaId);
        if (updatedSub) {
          const sync = await syncRingDecisionToProyectoHub(user.uid, vehicle, updatedSub, "cumplido", now);
          pasoNumero = sync.pasoNumero;
          if (pasoNumero != null) {
            shadowSubTareas = subTareaConPasoEjecutado(shadowSubTareas, subTareaId, pasoNumero);
            commitFlotaPatchMs0(prev =>
              prev.map(v =>
                v.id === vehicleId ? { ...v, subTareas: shadowSubTareas } : v
              )
            );
          }
        }
        try {
          const live = vehiclesRef.current.find(v => v.id === vehicleId);
          await updateVehicle(user.uid, vehicleId, {
            subTareas: shadowSubTareas,
            situacionCronometro: live?.situacionCronometro ?? situacionCronometro,
            situacionCupoAnchor: live?.situacionCupoAnchor ?? situacionCupoAnchor,
          });
          void playSituacionChimes(chimesOnComplete);
          await safeAwardPS(4, `Sub-tarea (cronómetro): ${targetSub.texto}`);
          if (deltaDepth > 0) await safeAwardPS(deltaDepth, `Profundidad bloque situación: ${vehicle.titulo}`);
          if (bloqueListo) {
            toast.success("+4 PS · Ronda completada", {
              description: `Todas las filas del ring están cerradas. Usa «${RING_COPY.cerrarRing}» cuando quieras sellar la ronda.`,
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 5000,
            });
          } else if (deltaDepth > 0) {
            toast.success(`+4 PS · +${deltaDepth} PS profundidad (bloque)`, {
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 2800,
            });
          } else if (minutosGanados > 0) {
            toast.success(`+4 PS · +${minutosGanados} min ganados`, {
              description:
                repartoColaDesc ??
                "Tiempo sumado al cupo de la cola o de la fila en foco",
              style: { backgroundColor: PIZARRA, border: `1px solid ${VERDE}`, color: VERDE },
              duration: 3400,
            });
          } else {
            toast.success("+4 PS · Cumplido (cronómetro)", {
              style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
              duration: 2200,
            });
          }
          if (pasoNumero != null) {
            const proyTitulo = proyectosHub.find(p => p.id === targetSub.proyectoId)?.titulo;
            toast.info(`Paso #${pasoNumero} en ${proyTitulo ?? "proyecto"}`, {
              description: "Paso desde el Crisol — fe incremental, anti-miopía.",
              style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
              duration: 3500,
            });
          }
        } catch (e) {
          console.error("[handleSituacionCronometroCumplido]", e);
        }
      })();
    });
  };

  const handleSituacionCronometroFallado = async (vehicleId: string, subTareaId: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion" || !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return;
    const targetSub = vehicle.subTareas.find(st => st.id === subTareaId);
    if (!targetSub?.enDesgloseCronometro || (targetSub.resultadoSituacion ?? "pendiente") !== "pendiente") return;
    const now = Date.now();
    const sc = vehicle.situacionCronometro!;
    const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
    const subTareasRaw = registrarCierreFalladoCronometro(
      vehicle.subTareas,
      subTareaId,
      vehicle.situacionCupoAnchor,
      now,
      bloqueInicio
    );
    const { subTareas, minutosPerdidos } = subTareasRaw;
    const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
    const situacionCronometro =
      !bloqueListo && sc.activo !== true ? reanudarSituacionCronometroRing(sc) : sc;
    const situacionCupoAnchor = resolveSituacionCupoAnchorAfterSubClose(
      subTareas,
      bloqueListo,
      vehicle.situacionCupoAnchor,
      now
    );

    commitFlotaPatchMs0(prev =>
      prev.map(v =>
        v.id === vehicleId ? { ...v, subTareas, situacionCronometro, situacionCupoAnchor } : v
      )
    );

    dispatchDesglosadorVoiceOnGesture(() => {
      dispatchSituacionFilaCloseVoice(vehicleId, subTareaId, targetSub.texto, "fallado", { ts: now });
    });

    runShadowTask(() => {
      void (async () => {
        try {
          const live = vehiclesRef.current.find(v => v.id === vehicleId);
          await updateVehicle(user.uid, vehicleId, {
            subTareas,
            situacionCronometro: live?.situacionCronometro ?? situacionCronometro,
            situacionCupoAnchor: live?.situacionCupoAnchor ?? situacionCupoAnchor,
          });
          if (bloqueListo) {
            toast.info("Ronda completada", {
              description: `Usa «${RING_COPY.cerrarRing}» para sellar la ronda o añade más filas al ring.`,
              duration: 4500,
            });
          } else {
            toast.info(
              minutosPerdidos > 0 ? `Fallado · −${minutosPerdidos} min en cola` : "Fallado (sin PS de fila)",
              { description: targetSub.texto, duration: 2200 }
            );
          }
        } catch (e) {
          console.error("[handleSituacionCronometroFallado]", e);
        }
      })();
    });
  };

  const handleSituacionCronometroReservar = async (vehicleId: string, subTareaId: string) => {
    if (!user) return;
    const vehicle = vehiclesRef.current.find(v => v.id === vehicleId) || vehicles.find(v => v.id === vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion" || !ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas)) return;
    const { subTareas, extraido } = extraerSubTareaAReserva(vehicle.subTareas, subTareaId);
    if (!extraido) return;
    const now = Date.now();
    const sc = vehicle.situacionCronometro!;
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCronometro: sc } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCronometro: sc } : v));
    persistVehiclesRef();
    try {
      const { localSaved } = await addSituacionReserva(user.uid, {
        texto: extraido.texto,
        ruta: "situacion_desglosador",
        origenVehiculoTitulo: vehicle.titulo,
        origenVehiculoId: vehicle.id,
        minutosCupo: extraido.minutosCupo,
        detalles: extraido.detalles,
        ...proyectoMetaParaReservaDesdeSub(
          extraido,
          vehicle,
          segmentoActivo?.proyectoVinculadoId,
          imanProyectos
        ),
        ...(segmentoActivo
          ? { segmentoId: segmentoActivo.id, segmentoNombre: segmentoActivo.nombre }
          : {}),
      });
      if (!localSaved) {
        toast.error("No se pudo guardar la reserva en el dispositivo", {
          description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 5000,
        });
        return;
      }
      void updateVehicle(user.uid, vehicleId, { subTareas, situacionCronometro: sc });
      void handleSyncSituacionCupoAnchor(vehicleId, { forceResetSameRow: true });
      toast.info("Devuelto al Crisol", {
        description: `"${extraido.texto}" · ruta S · retómalo con Abrir nido`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 3200,
      });
      const bloqueListo = !subTareas.some(situacionFilaCronometroPendiente);
      if (bloqueListo) {
        setVehicles(prev =>
          prev.map(v => (v.id === vehicleId ? { ...v, subTareas, situacionCupoAnchor: null } : v))
        );
        vehiclesRef.current = vehiclesRef.current.map(v =>
          v.id === vehicleId ? { ...v, subTareas, situacionCupoAnchor: null } : v
        );
        persistVehiclesRef();
        await updateVehicle(user.uid, vehicleId, { subTareas, situacionCupoAnchor: null });
        toast.info("Ronda completada", {
          description: `Usa «${RING_COPY.cerrarRing}» para sellar la ronda.`,
          duration: 4500,
        });
      }
    } catch (e) {
      console.error("[handleSituacionCronometroReservar]", e);
      toast.error("No se pudo reservar la tarea", {
        description: "Cierra la pestaña, vuelve a abrir e inténtalo otra vez.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5000,
      });
    }
  };

  const pickSituacionVehicleTarget = useCallback((): Vehicle | undefined => {
    const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
    if (activos.length === 0) return undefined;
    if (expandedId) {
      const ex = activos.find(v => v.id === expandedId);
      if (ex) return ex;
    }
    if (activos.length === 1) return activos[0];
    return undefined;
  }, [vehicles, expandedId]);

  const handleVehicleToggle = useCallback((vehicleId: string) => {
    setExpandedId(prev => (prev === vehicleId ? null : vehicleId));
  }, []);

  const handleVehicleComplete = useCallback((vehicleId: string) => {
    setCierreEnergiaSeleccion(null);
    setCierreEnergiaPending({ kind: "flota", vehicleId, status: "cumplido" });
  }, []);

  const handleVehicleArchive = useCallback((vehicleId: string) => {
    setCierreEnergiaSeleccion(null);
    setCierreEnergiaPending({ kind: "flota", vehicleId, status: "archivado" });
  }, []);

  const handleOpenCierreEnergiaStable = useCallback((p: CierreEnergiaModalPayload) => {
    setCierreEnergiaSeleccion(null);
    setCierreRutaSeleccion(new Set());
    setCierreRutaSinUso(false);
    setCierreRutaPatron(null);
    setCierreEnergiaPending(p);
  }, []);

  const handleVerSituacionBloquePsStable = useCallback(
    (vehicleId: string, titulo: string, summary: SituacionDesgloseSummary) => {
      openSituacionDesgloseCelebration(vehicleId, titulo, summary);
    },
    [openSituacionDesgloseCelebration]
  );

  const handleReservaTacticaQuickAdd = async (
    texto: string,
    ruta: ReservaTacticaRuta,
    proyectoId?: string
  ) => {
    if (!user) {
      toast.error("Inicia sesión para guardar pensamientos");
      throw new Error("no-user");
    }
    const trimmed = texto.trim();
    if (!trimmed) return;
    const proy = proyectoId ? proyectosHub.find(p => p.id === proyectoId) : undefined;
    try {
      const { localSaved, duplicate } = await addSituacionReserva(user.uid, {
        texto: trimmed,
        ruta,
        ...(proy
          ? { proyectoId: proy.id, proyectoTitulo: proy.titulo, proyectoEtiqueta: proy.etiqueta }
          : {}),
        ...(segmentoActivo
          ? { segmentoId: segmentoActivo.id, segmentoNombre: segmentoActivo.nombre }
          : {}),
      });
      if (duplicate) return;
      if (!localSaved) {
        toast.error("No se pudo guardar en el dispositivo", {
          description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 5000,
        });
        throw new Error("local-save-failed");
      }
      const nidoLabel = proy ? proy.titulo : "aterrizaje pendiente";
      toast.success("Pensamiento aterrizado", {
        description: `${nidoLabel} · [${RUTA_TACTICA_META[ruta].short}] ${trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2800,
      });
    } catch (e) {
      if ((e as Error)?.message === "local-save-failed") throw e;
      console.error("[handleReservaTacticaQuickAdd]", e);
      toast.error("No se pudo aterrizar el pensamiento", {
        description: "Algo falló al procesar la captura. Cierra la pestaña, vuelve a abrir e inténtalo otra vez.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      throw e;
    }
  };

  const handleReservaRutaChange = async (reservaId: string, ruta: ReservaTacticaRuta) => {
    if (!user) return;
    const prevRuta = situacionReserva.find(i => i.id === reservaId)?.ruta;
    setSituacionReserva(prev =>
      prev.map(i => (i.id === reservaId ? { ...i, ruta } : i))
    );
    const localSaved = await updateSituacionReservaRuta(user.uid, reservaId, ruta);
    if (!localSaved) {
      setSituacionReserva(prev =>
        prev.map(i =>
          i.id === reservaId && prevRuta ? { ...i, ruta: prevRuta } : i
        )
      );
      toast.error("No se pudo cambiar la ruta", {
        description: "Libera espacio en el navegador e inténtalo de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    }
  };

  const handleReservaEliminar = async (reservaId: string) => {
    if (!user) return;
    const backup = situacionReserva.find(i => i.id === reservaId);
    setSituacionReserva(prev => prev.filter(i => i.id !== reservaId));
    const localSaved = await deleteSituacionReserva(user.uid, reservaId);
    if (!localSaved && backup) {
      setSituacionReserva(prev => sortReservasTacticas([backup, ...prev]));
      toast.error("No se pudo eliminar la reserva", {
        description: "Libera espacio en el navegador e inténtalo de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    toast.info("Eliminada de la reserva", { duration: 1800 });
  };

  const handleReservaAListaLibre = async (reservaId: string) => {
    if (!user) return;
    const item = reservaActivas.find(r => r.id === reservaId);
    if (!item) return;
    const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
    const vehicle = pickSituacionVehicleTarget();
    if (!vehicle) {
      toast.error(activos.length > 1 ? "Expande el vehículo de enfoque destino" : "Abre un vehículo de enfoque activo", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const newSub = subTareaFromImanItem(item);
    const subTareas = [...(vehicle.subTareas || []), newSub];
    setVehicles(prev => prev.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v));
    persistVehiclesRef();
    try {
      void updateVehicle(user.uid, vehicle.id, { subTareas });
      const localSaved = await updateSituacionReservaEstado(user.uid, reservaId, "retomada_libre", {
        retomadaAt: Date.now(),
        retomadaEnVehiculoId: vehicle.id,
      });
      if (!localSaved) {
        toast.error("No se pudo actualizar la reserva", {
          description: "Libera espacio en el navegador e inténtalo de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return;
      }
      setSituacionReserva(prev =>
        prev.map(i =>
          i.id === reservaId
            ? {
                ...i,
                estado: "retomada_libre" as const,
                retomadaAt: Date.now(),
                retomadaEnVehiculoId: vehicle.id,
              }
            : i
        )
      );
      setExpandedId(vehicle.id);
      void handleSyncSituacionCupoAnchor(vehicle.id);
      toast.success("Retomada en lista libre", {
        description: `"${item.texto}" · marcada cumplida en reserva`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
        duration: 2800,
      });
    } catch (e) {
      console.error("[handleReservaAListaLibre]", e);
      toast.error("No se pudo retomar en lista libre", {
        description: "Comprueba que el vehículo de enfoque siga activo e inténtalo de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    }
  };

  const handleReservaACronometro = async (reservaId: string) => {
    if (!user) return;
    const item = reservaActivas.find(r => r.id === reservaId);
    if (!item) return;
    const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
    const vehicle =
      (item.origenVehiculoId ? activos.find(v => v.id === item.origenVehiculoId) : undefined) ??
      pickSituacionVehicleTarget();
    if (!vehicle) {
      toast.error(activos.length > 1 ? "Expande el vehículo de enfoque destino" : "Abre un vehículo de enfoque activo", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const newSub = subTareaFromImanItem(item);
    const prevSubTareas = vehicle.subTareas || [];
    const subTareas = [...prevSubTareas, newSub];
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v));
    setVehicles(prev => prev.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v)));
    try {
      const moved = await handleMoveSubTareasToCronometro(vehicle.id, [newSub.id], {
        proyectoEnfoqueId: item.proyectoId,
      });
      if (!moved) {
        vehiclesRef.current = vehiclesRef.current.map(v =>
          v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v
        );
        setVehicles(prev =>
          prev.map(v => (v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v))
        );
        persistVehiclesRef();
        return;
      }
      const localSaved = await updateSituacionReservaEstado(user.uid, reservaId, "retomada_cron", {
        retomadaAt: Date.now(),
        retomadaEnVehiculoId: vehicle.id,
      });
      if (!localSaved) {
        toast.error("No se pudo actualizar la reserva", {
          description: "Libera espacio en el navegador e inténtalo de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
        return;
      }
      setSituacionReserva(prev =>
        prev.map(i =>
          i.id === reservaId
            ? {
                ...i,
                estado: "retomada_cron" as const,
                retomadaAt: Date.now(),
                retomadaEnVehiculoId: vehicle.id,
              }
            : i
        )
      );
      setExpandedId(vehicle.id);
      toast.success("Retomada en desglose con tiempo", {
        description: item.texto,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2800,
      });
    } catch (e) {
      console.error("[handleReservaACronometro]", e);
      vehiclesRef.current = vehiclesRef.current.map(v =>
        v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v
      );
      setVehicles(prev =>
        prev.map(v => (v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v))
      );
      persistVehiclesRef();
      toast.error("No se pudo retomar en cronómetro", {
        description: "Comprueba que el vehículo de enfoque siga activo e inténtalo de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    }
  };

  const handleEnviarReservaASituacion = async (reservaId: string) => {
    const item = reservaActivas.find(r => r.id === reservaId);
    if (!item) return;
    if (!reservaEsEnviabeASituacion(item)) {
      toast.info("Ruta M — tener en cuenta", {
        description: "Esta fila no va al vehículo de enfoque. Cambia a S o E para enviarla.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}40`, color: PLATA },
        duration: 4000,
      });
      return;
    }
    const ruta = item.ruta ?? "ejecucion";
    if (ruta === "situacion_desglosador") {
      await handleReservaACronometro(reservaId);
    } else {
      await handleReservaAListaLibre(reservaId);
    }
  };

  const handleEnviarReservasSeleccionadas = async (reservaIds: string[]) => {
    for (const id of reservaIds) {
      await handleEnviarReservaASituacion(id);
    }
  };

  const handleAbrirNidoEnSituacion = async (nidoId: string) => {
    if (!user) return;
    const nidoItems = reservaActivas.filter(i => nidoKeyFromReserva(i) === nidoId);
    const ejecutables = imanItemsParaDesglosador(nidoItems);
    if (ejecutables.length === 0) {
      toast.error("Nido sin pensamientos ejecutables", {
        description: "Solo «tener en cuenta» queda fuera del desglosador.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const activos = vehicles.filter(v => v.status === "activo" && v.tipoFlota === "situacion");
    const vehicle = pickSituacionVehicleTarget();
    if (!vehicle) {
      toast.error(activos.length > 1 ? "Expande el vehículo de enfoque destino" : "Abre un vehículo de enfoque activo", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const batchId = Date.now();
    const newSubs = ejecutables.map((item, idx) => subTareaFromImanItem(item, `${batchId}_${idx}`));
    const cronIds: string[] = [];
    ejecutables.forEach((item, idx) => {
      const ruta = item.ruta ?? "ejecucion";
      if (ruta === "situacion_desglosador") cronIds.push(newSubs[idx].id);
    });
    const prevSubTareas = vehicle.subTareas || [];
    const subTareas = [...prevSubTareas, ...newSubs];
    setVehicles(prev => prev.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicle.id ? { ...v, subTareas } : v));
    try {
      if (cronIds.length > 0) {
        const nidoProy = nidoId !== NIDO_INBOX_ID ? nidoId : undefined;
        const moved = await handleMoveSubTareasToCronometro(vehicle.id, cronIds, {
          proyectoEnfoqueId: nidoProy,
        });
        if (!moved) {
          setVehicles(prev =>
            prev.map(v => (v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v))
          );
          vehiclesRef.current = vehiclesRef.current.map(v =>
            v.id === vehicle.id ? { ...v, subTareas: prevSubTareas } : v
          );
          persistVehiclesRef();
          return;
        }
      } else {
        await updateVehicle(user.uid, vehicle.id, { subTareas });
      }
      const now = Date.now();
      for (const item of ejecutables) {
        const ruta = item.ruta ?? "ejecucion";
        const estado = ruta === "situacion_desglosador" ? ("retomada_cron" as const) : ("retomada_libre" as const);
        const localSaved = await updateSituacionReservaEstado(user.uid, item.id, estado, {
          retomadaAt: now,
          retomadaEnVehiculoId: vehicle.id,
        });
        if (localSaved) {
          setSituacionReserva(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, estado, retomadaAt: now, retomadaEnVehiculoId: vehicle.id }
                : i
            )
          );
        }
      }
      setExpandedId(vehicle.id);
      if (cronIds.length === 0) void handleSyncSituacionCupoAnchor(vehicle.id);
      const nidoTitulo =
        nidoId === NIDO_INBOX_ID
          ? "Aterrizaje pendiente"
          : proyectosHub.find(p => p.id === nidoId)?.titulo ?? "Nido";
      toast.success(`Nido abierto — ${ejecutables.length} pensamiento(s)`, {
        description: nidoTitulo,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 3200,
      });
    } catch (e) {
      console.error("[handleAbrirNidoEnSituacion]", e);
      toast.error("No se pudo abrir el nido", {
        description: "Comprueba el vehículo de enfoque e inténtalo de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    }
  };

  const handleQuitarSituacionCupo = async (vehicleId: string, subTareaId: string, delta: number) => {
    if (!user || delta <= 0) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle?.subTareas || vehicle.tipoFlota !== "situacion") return;
    const focusId = resolveFocusSubTareaId(vehicle.subTareas, vehicle.situacionCupoAnchor);
    if (!focusId) {
      toast.error("Sin tarea en foco", {
        description: "Activa el ring de enfoque antes de quitar minutos.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    const result = quitarMinutosHaciaFoco(vehicle.subTareas, subTareaId, focusId, delta);
    if (!result.ok) {
      if (result.reason === "sin_flexibles" || result.reason === "sin_foco" || result.reason === "foco_no_pendiente") {
        toast.error("Sin filas flexibles posteriores", {
          description: "Solo se descuenta de subtareas pendientes sin minutos fijados (🔒).",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      } else {
        toast.error("Minutos insuficientes en filas flexibles", {
          description: `Disponible para descontar: ${result.disponible ?? 0} min.`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        });
      }
      return;
    }
    const subTareas = result.subTareas;
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas } : v));
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
      const focoTexto = subTareas.find(st => st.id === focusId)?.texto ?? "foco";
      toast.success(`−${result.descontado} min cola → +${result.focoGanado} min foco`, {
        description: focoTexto,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
        duration: 2800,
      });
      void handleSyncSituacionCupoAnchor(vehicleId);
    } catch (e) {
      console.error("[handleQuitarSituacionCupo]", e);
    }
  };

  const handleAddCasaItem = async (vehicleId: string, subTareaId: string, texto: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;
    const t = texto.trim();
    if (!t) return;
    const nuevo: DetalleSubTarea = {
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      texto: t,
      entregado: false,
      creadaAt: Date.now(),
      casa: true,
    };
    const subTareas = (vehicle.subTareas || []).map(st =>
      st.id === subTareaId ? { ...st, detalles: [...(st.detalles || []), nuevo] } : st
    );
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas } : v));
    persistVehiclesRef();
    startTransition(() => {
      setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas } : v)));
    });
    void updateVehicle(user.uid, vehicleId, { subTareas }).catch(e => {
      console.error("[handleAddCasaItem]", e);
    });
  };

  const handleToggleCasaItem = async (vehicleId: string, subTareaId: string, detalleId: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;
    const targetSub = (vehicle.subTareas || []).find(st => st.id === subTareaId);
    const target = (targetSub?.detalles || []).find(d => d.id === detalleId && d.casa);
    if (!target || target.entregado) return;
    const subTareas = (vehicle.subTareas || []).map(st =>
      st.id === subTareaId
        ? {
            ...st,
            detalles: (st.detalles || []).map(d =>
              d.id === detalleId ? { ...d, entregado: true } : d
            ),
          }
        : st
    );
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, subTareas } : v)));
    vehiclesRef.current = vehiclesRef.current.map(v => (v.id === vehicleId ? { ...v, subTareas } : v));
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
    } catch (e) {
      console.error("[handleToggleCasaItem]", e);
    }
  };

  const handleAddDetalle = async (vehicleId: string, subTareaId: string, texto: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;
    const nuevoDetalle: DetalleSubTarea = { id: `dt_${Date.now()}`, texto, entregado: false, creadaAt: Date.now() };
    const subTareas = (vehicle.subTareas || []).map(st =>
      st.id === subTareaId ? { ...st, detalles: [...(st.detalles || []), nuevoDetalle] } : st
    );
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    startTransition(() => {
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    });
    void updateVehicle(user.uid, vehicleId, { subTareas }).catch(e => {
      console.error("[handleAddDetalle]", e);
    });
  };

  const handleEntregarDetalle = async (vehicleId: string, subTareaId: string, detalleId: string) => {
    if (!user) return;
    const vehicle = vehicleById(vehicleId);
    if (!vehicle) return;
    const targetSub = (vehicle.subTareas || []).find(st => st.id === subTareaId);
    const targetDetalle = (targetSub?.detalles || []).find(d => d.id === detalleId);
    if (!targetDetalle || targetDetalle.entregado || targetDetalle.casa) return;
    const subTareas = (vehicle.subTareas || []).map(st =>
      st.id === subTareaId
        ? { ...st, detalles: (st.detalles || []).map(d => d.id === detalleId ? { ...d, entregado: true } : d) }
        : st
    );
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, subTareas } : v));
    vehiclesRef.current = vehiclesRef.current.map(v => v.id === vehicleId ? { ...v, subTareas } : v);
    persistVehiclesRef();
    try {
      await updateVehicle(user.uid, vehicleId, { subTareas });
      try {
        await awardSovereigntyPoints(user.uid, 1, `Detalle: ${targetDetalle.texto}`);
        toast.success("⚡ +1 PS · Detalle entregado", {
          style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
          duration: 1800
        });
      } catch { console.error("[handleEntregarDetalle] awardSovereigntyPoints falló"); }
    } catch (e) { console.error("[handleEntregarDetalle]", e); }
  };
  const activeVehicles = useMemo(
    () => vehicles.filter(v => v.status === "activo" && !isInvisibleCentinelaVehicle(v)),
    [vehicles]
  );
  const completedVehicles = useMemo(
    () =>
      vehicles.filter(
        v =>
          (v.status === "cumplido" || v.status === "archivado") &&
          !isInvisibleCentinelaVehicle(v)
      ),
    [vehicles]
  );
  const expressVehiclesActivos = useMemo(
    () => activeVehicles.filter(v => v.tipoTerminoRapido),
    [activeVehicles]
  );
  const panoramicaActivos = useMemo(
    () => expressVehiclesActivos.filter(v => v.tipoTerminoRapido === "omitido"),
    [expressVehiclesActivos]
  );
  const operativaActivos = useMemo(
    () => expressVehiclesActivos.filter(v => v.tipoTerminoRapido !== "omitido"),
    [expressVehiclesActivos]
  );
  const panoramicaHistorial = useMemo(
    () => completedVehicles.filter(v => v.tipoTerminoRapido === "omitido"),
    [completedVehicles]
  );
  const operativaHistorial = useMemo(
    () => completedVehicles.filter(v => v.tipoTerminoRapido !== "omitido"),
    [completedVehicles]
  );

  const sortedOperativaActivos = useMemo(() => {
    return [...operativaActivos].sort((a, b) => {
      const isHoraA = a.tipoTerminoRapido === "hora";
      const isHoraB = b.tipoTerminoRapido === "hora";
      if (isHoraA && !isHoraB) return -1;
      if (!isHoraA && isHoraB) return 1;
      if (isHoraA && isHoraB) {
        const diffA = Math.abs(timeStringToMinutes(a.criterioDetalle) - flotaSortAnchorMin);
        const diffB = Math.abs(timeStringToMinutes(b.criterioDetalle) - flotaSortAnchorMin);
        return diffA - diffB;
      }
      return 0;
    });
  }, [operativaActivos, flotaSortAnchorMin]);

  const flotaActivos = useMemo(
    () => buildFlotaActivosRenderList(sortedOperativaActivos, panoramicaActivos, activeVehicles),
    [sortedOperativaActivos, panoramicaActivos, activeVehicles]
  );

  const historialFlota = useMemo(() => {
    const todayStartMs = journalDayStartMs;
    const vehiculosHoy = completedVehicles
      .filter(v => {
        if (v.autoVerdad) return false;
        const closedAt = safeVehicleClosedAtMs(v);
        return closedAt > 0 && closedAt >= todayStartMs;
      })
      .sort((a, b) => safeVehicleClosedAtMs(a) - safeVehicleClosedAtMs(b));
    const vehiculosAnteriores = completedVehicles
      .filter(v => {
        if (v.autoVerdad) return false;
        const t = safeVehicleTimestampMs(v, "cierreAt", "aperturaAt", "createdAt");
        return t > 0 && t < todayStartMs;
      })
      .sort((a, b) => {
        const tA = safeVehicleTimestampMs(a, "cierreAt", "aperturaAt", "createdAt");
        const tB = safeVehicleTimestampMs(b, "cierreAt", "aperturaAt", "createdAt");
        return tB - tA;
      });
    const gruposPorFecha: Record<string, Vehicle[]> = {};
    for (const v of vehiculosAnteriores) {
      const ts = safeVehicleTimestampMs(v, "cierreAt", "aperturaAt", "createdAt");
      const key = formatHistorialDateKey(ts);
      if (!key) continue;
      if (!gruposPorFecha[key]) gruposPorFecha[key] = [];
      gruposPorFecha[key].push(v);
    }
    return { vehiculosHoy, vehiculosAnteriores, gruposPorFecha };
  }, [completedVehicles, journalDayStartMs]);

  const situacionRetoAtascado = useMemo(
    () =>
      activeVehicles.some(
        v =>
          v.tipoFlota === "situacion" &&
          v.situacionCronometro?.activo === true &&
          situacionDesgloseBloqueListo(v.subTareas || [], v.situacionCronometro)
      ),
    [activeVehicles]
  );

  const showEmergencyArchiveBanner = useMemo(
    () => activeVehicles.length >= 5 || situacionRetoAtascado,
    [activeVehicles.length, situacionRetoAtascado]
  );

  useEffect(() => {
    registerDesglosadorDepthReconciler(reconcileDesglosadorDepthPS);
    return () => registerDesglosadorDepthReconciler(null);
  }, [reconcileDesglosadorDepthPS]);

  useEffect(() => {
    syncDesglosadorDepthActiveIds(
      flotaActivos
        .filter(v => v.tipoReloj === "desglosador" && v.status === "activo")
        .map(v => v.id)
    );
  }, [flotaActivos]);
  const segmentoActualIdx = planilla ? planilla.segmentos.findIndex(s => s.estado === "activo") : -1;
  const segmentoNumero = segmentoActualIdx >= 0 ? segmentoActualIdx + 1 : null;

  useEffect(() => {
    if (!expandedId) return;
    const expanded = vehicles.find(v => v.id === expandedId);
    if (expanded && expanded.status !== "activo") {
      setExpandedId(null);
    }
  }, [vehicles, expandedId]);

  useEffect(() => {
    const activeCount = vehicles.filter(v => v.status === "activo").length;
    if (prevActiveVehicleCountRef.current !== null && activeCount < prevActiveVehicleCountRef.current) {
      scrollFlotaActivosIntoView();
    }
    prevActiveVehicleCountRef.current = activeCount;
  }, [vehicles, scrollFlotaActivosIntoView]);
  const deferredAll = useDeferredValue(vehicles);

  const handlers = useMemo(
    () => ({
      handleVehicleToggle,
      handleVehicleComplete,
      handleVehicleArchive,
      handleOpenCierreEnergiaStable,
      handleVerSituacionBloquePsStable,
      handleAddSubTarea,
      handleAddSubTareaUrgenteACola,
      handleToggleSubTarea,
      handleSetSubTareaMinutosCupo,
      handleExtendSituacionCupo,
      handleSyncSituacionCupoAnchor,
      handleMoveSubTareasToCronometro,
      handleSituacionCronometroSetHoraFin,
      handleSituacionCronometroCumplido,
      handleSituacionCronometroFallado,
      handleSituacionCronometroReservar,
      handleQuitarSituacionCupo,
      handleCerrarSituacionDesgloseBloque,
      handleCerrarSituacionDesglosadorDeGolpe,
      handleAddDetalle,
      handleEntregarDetalle,
      handleAddCasaItem,
      handleToggleCasaItem,
      handleInvestigadorClose,
      handleDesglosadorUpdate,
      handleDesglosadorGlobalClose,
      handleDesglosadorCierreDeGolpe,
      handleDesglosadorPausaInterrupcion,
      resumeDesglosadorTrasInterrupcion,
      handleDesglosadorReorderSubs,
      handleDesglosadorAddSub,
      handleDesglosadorActivatePendingSub,
      handleReorderSubTareasCronometro,
      handleDescansoClose,
      handleMicroPasoToggle,
      handleEtapaPuntoCeroToggle,
      handlePuntoCeroSessionUpdate,
      handlePuntoCeroColorConfirm,
      handlePuntoCeroAutoClose,
      recordRutaBandCross,
      recordBloqueCierre,
      unlockDesglosadorSpeechFromGesture,
      handleFlotaStatusChange,
      handleStatusChange,
      handleEmergencyArchiveStuckActives,
      scrollFlotaActivosIntoView,
      handleReservaTacticaQuickAdd,
      handleReservaRutaChange,
      handleReservaEliminar,
      handleReservaAListaLibre,
      handleReservaACronometro,
      handleEnviarReservaASituacion,
      handleEnviarReservasSeleccionadas,
      handleAbrirNidoEnSituacion,
      safeAwardPS,
      recordVehiculoInicio,
      recordVehiculoCierre,
      applyCentinelaArchiveLocally,
      setupFlotaSubscription,
      setVehicles,
      vehiclesRef,
      optimisticVehiclesRef,
      ghostReconcileRef,
      resolverProyectoId,
    }),
    [
      handleVehicleToggle,
      handleVehicleComplete,
      handleVehicleArchive,
      handleOpenCierreEnergiaStable,
      handleVerSituacionBloquePsStable,
      handleAddSubTarea,
      handleAddSubTareaUrgenteACola,
      handleToggleSubTarea,
      handleSetSubTareaMinutosCupo,
      handleExtendSituacionCupo,
      handleSyncSituacionCupoAnchor,
      handleMoveSubTareasToCronometro,
      handleSituacionCronometroSetHoraFin,
      handleSituacionCronometroCumplido,
      handleSituacionCronometroFallado,
      handleSituacionCronometroReservar,
      handleQuitarSituacionCupo,
      handleCerrarSituacionDesgloseBloque,
      handleCerrarSituacionDesglosadorDeGolpe,
      handleAddDetalle,
      handleEntregarDetalle,
      handleAddCasaItem,
      handleToggleCasaItem,
      handleInvestigadorClose,
      handleDesglosadorUpdate,
      handleDesglosadorGlobalClose,
      handleDesglosadorCierreDeGolpe,
      handleDesglosadorPausaInterrupcion,
      resumeDesglosadorTrasInterrupcion,
      handleDesglosadorReorderSubs,
      handleDesglosadorAddSub,
      handleDesglosadorActivatePendingSub,
      handleReorderSubTareasCronometro,
      handleDescansoClose,
      handleMicroPasoToggle,
      handleEtapaPuntoCeroToggle,
      handlePuntoCeroSessionUpdate,
      handlePuntoCeroColorConfirm,
      handlePuntoCeroAutoClose,
      recordRutaBandCross,
      recordBloqueCierre,
      unlockDesglosadorSpeechFromGesture,
      handleFlotaStatusChange,
      handleStatusChange,
      handleEmergencyArchiveStuckActives,
      scrollFlotaActivosIntoView,
      handleReservaTacticaQuickAdd,
      handleReservaRutaChange,
      handleReservaEliminar,
      handleReservaAListaLibre,
      handleReservaACronometro,
      handleEnviarReservaASituacion,
      handleEnviarReservasSeleccionadas,
      handleAbrirNidoEnSituacion,
      safeAwardPS,
      recordVehiculoInicio,
      recordVehiculoCierre,
      applyCentinelaArchiveLocally,
      setupFlotaSubscription,
      setVehicles,
      resolverProyectoId,
    ]
  );

  return {
    vehicles: {
      all: vehicles,
      deferred: deferredAll,
      flotaActivos,
      active: activeVehicles,
      completed: completedVehicles,
      historialHoy: historialFlota.vehiculosHoy,
      historialAnteriores: historialFlota.vehiculosAnteriores,
      historialGrupos: historialFlota.gruposPorFecha,
      setVehicles,
    },
    modales: {
      expandedId,
      setExpandedId,
      cierreEnergiaPending,
      setCierreEnergiaPending,
      cierreEnergiaSeleccion,
      setCierreEnergiaSeleccion,
      cierreRutaSeleccion,
      setCierreRutaSeleccion,
      cierreRutaSinUso,
      setCierreRutaSinUso,
      cierreRutaPatron,
      setCierreRutaPatron,
      situacionDesgloseCelebration,
      setSituacionDesgloseCelebration,
      desglosadorTiempoCelebration,
      setDesglosadorTiempoCelebration,
      situacionBloqueSummaries,
      flotaActivosRef,
      vehiclesRef,
      segmentoNumero,
      segmentoActivo,
      planilla,
      situacionReserva,
      reservaActivas,
      rehydrateFlotaFromLocalRef,
      checkPuertaAtencionRef,
      situacionRetoAtascado,
      showEmergencyArchiveBanner,
    },
    handlers,
  };
}
