import { useState, useEffect, useRef, useCallback, useMemo, memo, useDeferredValue, startTransition } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Target,
  Zap,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  Flag,
  Plus,
  Archive,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Layers,
  Play,
  Square,
  Timer,
  AlertTriangle,
  Eye,
  Skull,
  Brain,
  Lock,
  Unlock,
  Activity,
  Flame,
  Menu,
  Coffee,
  Pause,
  Sun,
  Heart,
  MessageSquare,
  Trophy,
  Award,
  TrendingUp,
  ListTodo,
  PlusCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Scan,
  FileSearch,
  RefreshCw,
  Moon,
  Droplets,
  Wind,
  MonitorOff,
  Battery,
  Circle,
  RotateCcw,
  Bell,
  BellOff,
  FlaskConical,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import {
  addVehicle,
  scheduleVehicleRemotePersist,
  updateVehicleStatus,
  updateVehicle,
  Vehicle,
  VehicleStatus,
  CriterioFin,
  TipoTerminoRapido,
  TipoFlota,
  ParentesisRecarga,
  saveMision,
  MisionScores,
  recordMissionResult,
  subscribeToProgression,
  UserProgression,
  subscribeToEnergyLogs,
  EnergyLog,
  awardSovereigntyPoints,
  deductSovereigntyPoints,
  incrementModulePoints,
  getPlanillaHoy,
  savePlanilla,
  updateSegmentoInPlanilla,
  addEventoToSegmento,
  subscribeToPlanilla,
  SegmentoV5,
  Planilla,
  EventoLog,
  SubTarea,
  DetalleSubTarea,
  SubVehiculo,
  saveLocalVehicles,
  flushLocalVehicles,
  getLocalVehicles,
  parkActiveVehiclesForResume,
  getParkedActiveVehicles,
  EnergiaOscuraEntry,
  CierreJornadaLog,
  saveCierreJornada,
  getLastCierreJornada,
  getTodayCierreJornada,
  getDailyPoints,
  getDailyPointsLocalSync,
  getLocalSPLog,
  repairJournalSpLogInflation,
  getYesterdayDailyPointsTotal,
  subscribeToDailyPoints,
  getLimaDateString,
  getLimaDayStart,
  saveVehicleHistoryFirebase,
  loadVehicleHistoryFromFirebase,
  mergeVehicleHistories,
  VehicleHistoryEntry,
  PlantillaRutina,
  SegmentoTemplate,
  subscribePlantillasRutina,
  addPlantillaRutina,
  deletePlantillaRutina,
  applyPlantillaToday,
  hasDesglosadorAccess,
  hasSoberaniaDiaAccess,
  hasPuntoCeroAccess,
  subscribeToRadiografiaTokens,
  checkAndAwardRadiografiaMilestones,
  checkAndRefreshSubscriptionRadiografia,
  getRadiografiaTokens,
  consumeRadiografiaToken,
  RadiografiaTokenData,
  getExpedientesRecientes,
  ExpedienteClinico,
  notifyVehicleClosed,
  wasVehicleRecentlyClosed,
  mergeActiveVehicleSessionState,
  resolveLocalVehicleMatch,
  findLocalClosedOverride,
  isOrphanDesglosadorInterrupt,
  reconcileStaleCentinelaInFirestore,
} from "@/lib/persistence";
import {
  requestGhostReconcileAfterVehicleAction,
  requestGhostReconcileForced,
  suppressGhostReconcileAfterLaunch,
} from "@/lib/ghostReconcileScheduler";
import {
  filterVehiclesForAnilloCoverage,
  filterVehiclesForEntropy,
  isGhostActiveVehicle,
  recoverMissingJournalDayActives,
  resetGhostSessionCache,
  shouldPreserveLocalActivo,
} from "@/lib/ghostVehicleEngine";
import {
  computeDesglosadorSubAwardPS,
  DESGLOSADOR_CYCLE_CLOSE_BASE_PS,
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  VEHICLE_ARCHIVADO_BASE_PS,
  VEHICLE_CUMPLIDO_BASE_PS,
  vehicleMissionClosePS,
} from "@/lib/sovereigntyPointsConfig";
import {
  awardDesglosadorSubPointsIfNeeded,
  settleDesglosadorCyclePoints,
  desglosadorCycleCloseSource,
  sumDesglosadorSubsPsAlreadyGranted,
  estimateDesglosadorSessionPs,
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
import { dispatchDesglosadorSubIntroVoiceOnce } from "@/lib/desglosadorVoiceDispatch";
import {
  computeDesglosadorTiempoCloseSummary,
  fmtDesgloseSec,
  type DesglosadorTiempoCloseSummary,
} from "@/lib/desglosadorTiempoCelebration";
import { hasJournalSpExactSource, hasJournalSpSourcePrefix } from "@/lib/spLogHygiene";
import {
  archiveActiveCentinelas,
  buildCentinelaArchiveFields,
  closeCentinelasBeforeConsciousLaunch,
  isCentinelaBlockedByVehicles,
  listActiveCentinelas,
  maybeReleaseStaleSuppression,
  releaseCentinela,
  resetCentinelaLaunchGate,
  isInvisibleCentinelaVehicle,
} from "@/lib/centinelaEngine";
import { clearStuckDesglosadorPause, archiveOrphanDesglosadorInterrupts } from "@/lib/situacionSessionMerge";
import {
  createRutaEnfoqueState,
  applyRutaThresholdCrossing,
  repairRutaCruzadoAheadOfRestantes,
  formatRutaPreview,
  getRutaBandaActual,
  mergeRutaCruzadaFromSubs,
  resolveRutaEnfoqueForSub,
  RUTA_BANDA_META,
  type RutaBandaId,
} from "@/lib/rutaEnfoque";
import {
  enrichSubRutaCierre,
  computeRutaPrivilegioPS,
  type RutaSeguimientoPatron,
} from "@/lib/rutaSeguimiento";
import { rutaVozFluidoParts, rutaVozPartsForBanda } from "@/lib/rutaEnfoqueVoz";
import {
  RutaSeguimientoPicker,
  rutaSeguimientoPickerCanConfirm,
} from "@/components/RutaSeguimientoPicker";
import { speakUbicacionQueue, speakUbicacionSingle, speakVoiceProbe, unlockSpeechSynthesis, warmupSpeechSynthesis, recoverSpeechQueue, subscribeSpeechQueueIdle, beginJornadaRemount, endJornadaRemount, pauseVoice, resumeVoice, cancelJornadaRemountGuard } from "@/lib/speechQueue";
import { beginJornadaViewMount, endJornadaViewMount } from "@/lib/jornadaRemount";
import { isInterModuleSyncBlocked, onViewTransitionShieldReleased } from "@/lib/viewTransitionShield";
import { consumeJornadaVehicleIntent } from "@/lib/jornadaVehicleIntent";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { resetPuntoCeroVoiceQueue } from "@/lib/puntoCeroVoice";
import { pausePuntoCeroStepVoiceForRemount, resumeStepVoiceAfterRemount } from "@/lib/puntoCeroStepVoice";
import { hardResetSpeechSystems } from "@/lib/speechRecovery";
import {
  cancelUbicacionVoiceForVehicle,
} from "@/lib/desglosadorVoice";
import { isMobilePerfMode, MOBILE_PERF, shouldAllowJornadaVoice, shouldRunMobileSurvival, setJornadaFullModeEnabled } from "@/lib/mobilePerf";
import {
  registerSituacionSessionCleanup,
  resetSituacionSessionTeardownGate,
  teardownSituacionSession,
} from "@/lib/situacionSessionTeardown";
import {
  flushMissedPuertaVoiceOnVisible,
} from "@/lib/backgroundAttentionAlerts";
import {
  SEGMENT_DAY_ROLLOVER_EVENT,
  clearCruceWarnedIds,
  runSegmentAttentionTickNow,
} from "@/lib/segmentAttentionCycle";
import AnilloConcienciaLive from "@/components/AnilloConcienciaLive";
import {
  isTikSoundEnabled,
  setTikSoundEnabled,
  isSituacionAlertsEnabled,
  setSituacionAlertsEnabled,
  isPuertaVozEnabled,
  setPuertaVozEnabled,
  enableAllVoiceChannels,
  isDesglosadorVoiceEnabled,
  setDesglosadorVoiceEnabled,
  setPuntoCeroVoiceEnabled,
} from "@/lib/tikSound";
import { playSituacionCumplidoChimes } from "@/lib/situacionAlertSounds";
import {
  fireSituacion2MinAlert,
  fireSituacionCupoAlert,
  speakSituacionFilaEnFoco,
  speakRingBienvenida,
  speakRingTiempoSobra,
  SITUACION_CUPO_ESCALATION_MS,
  SITUACION_CUPO_ESCALATION_MAX,
} from "@/lib/situacionAlerts";
import {
  RING_COPY,
  RING_SOBRA_INVITACION_MIN,
  quitarSubsPorId,
  reanudarSituacionCronometroRing,
  ringSessionOperable,
} from "@/lib/ringEnfoqueReal";
import {
  computeDesglosadorClocks,
  formatElapsedHHMMSS,
  formatHHMM,
  formatMMSS,
  getDesglosadorSessionElapsedSec,
  suggestedSec,
  computeSubCloseVerdict,
  validateSubCloseCantidad,
  type SubCloseVerdict,
} from "@/lib/desglosadorClock";
import DesglosadorDuracionPanel from "@/components/DesglosadorDuracionPanel";
import {
  aplicarTiempoGanadoAlCumplir,
  absorberSaldoAdelantoEnFoco,
  applyCupoManualYRedistribuir,
  computeSituacionCronometroHorarios,
  quitarMinutosHaciaFoco,
  redistribuirMinutosSituacionCronometro,
  reacomodarColaCronometroAMeta,
  remainingCronometroBudgetMin,
  cerrarCronometroDeGolpe,
  filasCronometroOrdenadas,
  resolveCronometroCupoAnchor,
  registrarCierreFalladoCronometro,
  extraerSubTareaAReserva,
  isCupoFijo,
  resolveFocusSubTareaId,
  situacionFilaCronometroPendiente,
  situacionRelojDebeMostrarse,
  situacionTargetMsReloj,
  computeSituacionProyeccionFinMs,
  situacionGananciaVsContratoMin,
  sumMinutosCronometroPendientes,
  sumBonusPreviewEnColaPendiente,
  minutosGanadosEnVivoFoco,
  totalBudgetMinFromCronometro,
  vehicleNeedsCupoAnchorSync,
  buildSellarDirectoEnRingState,
} from "@/lib/situacionCupoDistrib";
import {
  suppressSituacionFilaVoiceAfterSellar,
} from "@/lib/ringSellarVoiceSuppress";
import {
  bolsaDisponibleSegundoReto,
  buildSituacionCronometroCierre,
  computeEficienciaSituacionPct,
  computeSituacionBolsaGanancia,
  nextRetoNumero,
  situacionContratoFinMs,
  situacionMinutosHastaObjetivoHora,
  situacionObjetivoHoraToContratoMs,
  resolveDefaultObjetivoHoraParaRing,
  sumMinutosRealesCronometro,
  describeRepartoGananciaEnCola,
} from "@/lib/situacionGanancia";
import { countCasaHechas, groupCasaByTexto, type CasaTextoCount } from "@/lib/situacionCasa";
import type { ModoPuntoCero, PuntoCeroSession } from "@/lib/puntoCeroTypes";
import {
  etapasConColoresCompletos,
  initPuntoCeroSession,
  parsePuntoCeroDuracionMin,
  todosColoresConfirmados,
} from "@/engines/PuntoCeroEngine";
import {
  computeDesglosadorSessionDepthPS,
  depthAwardForHour,
  formatDepthAwardPreview,
  nextDepthAwardAfterHours,
} from "@/lib/desglosadorDepth";
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
import { computeDailyPsBarModel } from "@/lib/dailyPsBar";
import { safeWithFallback } from "@/lib/asyncTimeout";
import { recordFocusBandEvent, getFocusBandEventsRecent, getFocusBandEventsForRange } from "@/lib/focusBandLedger";
import type { FocusBandEvent } from "@/lib/focusBandLedger";
import {
  buildDailySnapshot,
  savePlanillaDailySnapshot,
  inferBandaBloque,
  psEspectroBloque,
  computeTermodinamicaCompareV2,
  vehicleEnTermoJornada,
  FASE_ATENCIONAL_COLOR,
  FASE_ATENCIONAL_LABEL,
  getPlanillaDailySnapshotForDate,
  getPlanillaDailySnapshots,
  computeCombustibleDia,
  buildTermoDecisionSnapshot,
} from "@/lib/termodinamicaAtencional";
import {
  decisionKeyMision,
  decisionKeySubDesglosador,
  decisionKeySubSituacion,
  getDecisionLedger,
  recordDecision,
} from "@/lib/decisionesLedger";
import type { PlanillaDailySnapshot } from "@/lib/termodinamicaAtencional";
import { formatCombustibleResumen, formatCombustibleDetalle, formatCombustibleCelebracionBloque } from "@/lib/combustibleConciencia";
import { buildEscaleraConciencia, serializeEscaleraForCierreWithStats } from "@/lib/escaleraConcienciaEngine";
import { EscaleraCierreResumen } from "@/components/escalera-cierre-resumen";
import { repairStuckSituacionVehicles, vehiclesReactiveSignature } from "@/lib/situacionRepair";
import {
  getProyectoById,
  getPeldanosByProyecto,
  markPeldanoEnCurso,
  markPeldanoConquistadoTiempo,
  markPeldanoConquistadoSituacion,
} from "@/lib/proyectos";
import type { RutasMentalesSet } from "@/lib/proyectos";
import {
  ensurePeldanoFromSegmento,
  resolveClaridadParaProyecto,
  sealPeldanosFromSegmentos,
  countSegmentosListosParaSellar,
} from "@/lib/segmentoPeldanoBridge";
import { RutasMentalesEditor } from "@/components/RutasMentalesEditor";
import {
  isWithinSegmentTimeMargin,
  parseSegmentTime,
  segmentDurationMinutes,
  validateSegmentTimes,
  getJournalDateString,
  getJournalDayStartMs,
  getLimaDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/segmentTime";
import {
  classifyPuertaTiming,
  isWithinPuertaWindow,
} from "@/lib/segmentAttentionEngine";
import {
  atencionBadgeLabel,
  computeAtencionCompare,
  computeAtencionPanoramicaDia,
  describeSegmentoAtencion,
} from "@/lib/atencionPanoramicaEngine";
import {
  getCruceGraciaState,
} from "@/lib/segmentCrossEntropyEngine";
import {
  resolveSegmentoForVehicleAt,
  resolveVehicleSegmentContext,
} from "@/lib/segmentVehicleAssign";
import {
  assertCanOpenVehicle,
  formatOperationalSlotsBlockMessage,
  isDesglosadorCrossSegmentExempt,
  launchKindFromFlota,
} from "@/lib/vehicleOperationalSlots";
import {
  computeDisciplinaDia,
  computeDisciplinaCompare,
  formatDisciplinaSubheadline,
  formatDisciplinaValorPrincipal,
  describeSegmentoDisciplina,
  disciplinaBadgeLabel,
  formatEstudioTipoChip,
  buildDisciplinaSerie,
} from "@/lib/disciplinaEngine";
import { scheduleSegmentNotifications, cancelAllNotifications, requestNotificationPermission, getNotificationPermission } from "@/lib/notifications";
import { auth } from "@/lib/firebase";
import { setActiveSegmento, registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { PlanificacionTutorial } from "@/components/planificacion/PlanificacionTutorial";
import { PlanificacionPrimerDia } from "@/components/planificacion/PlanificacionPrimerDia";
import { isTutorialDone } from "@/lib/planificacionOnboarding";
import { progressionToProfile } from "@/lib/planificacionProfile";
import { openDoctorIAChat } from "@/lib/doctorIaBridge";
import BalanceConquistaPanel from "@/components/BalanceConquistaPanel";
import PlanificacionCockpit from "@/components/PlanificacionCockpit";
import PlaneacionCrisolDock from "@/components/planeacion/PlaneacionCrisolDock";
import PlaneacionMetricsEscalera from "@/components/planeacion/PlaneacionMetricsEscalera";
import { MemoVehicleCard } from "@/components/flota/VehicleCard";
import { FlotaActivaVehicleCards } from "@/components/flota/FlotaActivaVehicleCards";
import {
  aplicarProyectoHeredadoASub,
  devolverRingPendientesAlIman,
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
import { syncRingDecisionToProyectoHub } from "@/lib/syncRingDecisionToProyectoHub";
import { JORNADA_MODULE, JORNADA_V3_PATH } from "@/lib/jornadaBrand";
import { NavTransitionLink } from "@/components/NavTransitionLink";
import { FLOTA_BRAND, FLOTA_SELECTOR_DISCRIMINATOR, flotaLabelUpper, flotaLabelsRecord } from "@/lib/flotaBrand";
import { SituacionCasaPanel } from "@/components/SituacionCasaPanel";
import { PuntoCeroPanel } from "@/components/PuntoCeroPanel";
import { SegmentoProyectoSelect } from "@/components/planeacion/SegmentoProyectoSelect";
import { PlanTabPanel } from "@/components/planeacion/PlanTabPanel";
import {
  DesglosadorSubCloseButtons,
  type DesglosadorSubClosePayload,
} from "@/components/planeacion/DesglosadorSubCloseButtons";
import { buildDesglosadorSubClose } from "@/lib/desglosadorSubClose";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import { calcularMetricasAnilloConciencia, calcularBalanceConquistaJornada, buildConcienciaTimeline, computeLiveEntropy, armEntropyGapOnConsciousClose, formatMinutosJornada, resetLiveEntropyMonotonic } from "@/engines/ConcienciaEngine";
import { isCoarseConcienciaDevice, useConcienciaClockTickWhen, dispatchConcienciaClockTick } from "@/lib/concienciaClock";
import { usePlaneacionHeavyMetrics } from "@/hooks/usePlaneacionHeavyMetrics";
import { useDesglosadorManager } from "@/hooks/useDesglosadorManager";
import { JornadaStuckProbe } from "@/components/jornada/JornadaStuckProbe";
import JornadaShellV3 from "@/components/jornada/JornadaShellV3";
import type { CrisolAterrizarPayload } from "@/components/jornada/CrisolModule";
import { AnilloSurvivalPlaceholder } from "@/components/jornada/AnilloSurvivalPlaceholder";
import { reloadJornadaHard } from "@/lib/jornadaRecovery";
import { BotonRepararJornada } from "@/components/jornada/BotonRepararJornada";
import {
  JORNADA_BACKUP_INTERVAL_MS,
  saveJornadaBackup,
  segundosFromMetrics,
  tryRestoreMetricsFromJornadaBackup,
  vehiclesForJornadaBackup,
} from "@/services/jornadaBackup";
import { setJornadaFatalError } from "@/lib/jornadaFatalError";
import {
  cancelFlotaFetch,
  onFlotaStaleLoadingRefetch,
  onJornadaVisibilityReturn,
  setFlotaPaintedCount,
} from "@/services/jornadaFlotaFetch";
import {
  readLocalFlota,
  writeLocalFlota,
} from "@/services/jornadaFlotaCache";
import {
  registerFlotaMergeContext,
  refreshFlotaSession,
  getFlotaMergedSignature,
  getFlotaVehicles,
} from "@/flota/flotaStore";
import { buildFlotaActivosRenderList } from "@/flota/flotaRenderUtils";
import { useFlotaMutator, useFlotaVehiclesShallow } from "@/hooks/useModularStoreSelectors";
import { EntropiaDebugPanel, isEntropyDebugEnabled } from "@/components/EntropiaDebugPanel";
import { hasActiveConsciousJornadaProcess } from "@/lib/jornadaConsciousGuard";
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
import { sealVehicleSessionClose } from "@/lib/vehicleSessionSeal";

import {
  GOLD, AZURE, EMERALD, VIOLET, SLATE, BLOOD, PIZARRA, NARANJA, PLATA, VERDE, GRIS, CYAN,
  FLOTA_CONFIG,
  getHistoricalVehicleData,
  getDesglosadorHistorico,
  getDesglosadorMisionTitles,
  getDesglosadorMisionData,
  getRecordSuggestions,
  ENERGIA_ESPEJO_OPTIONS,
  cleanSubTitulo,
  buildDesglosadorSubFromForm,
  buildDesglosadorSubFromRuntime,
  cierrePayloadHasRutaEnfoque,
  RutaEnfoqueBar,
  type SituacionDesgloseSummary,
  type CierreEnergiaModalPayload,
  type DesglosadorSubFormRow,
  computeSituacionDesgloseSummary,
  situacionDesgloseBloqueTerminado,
  situacionDesgloseBloqueListo,
  playSituacionChimes,
  getSubVehicleRecordSuggestions,
  type VehicleHistoryOpts,
  sortSubTareasTrabajoPrimero,
  vehicleClosedAtMs,
} from "@/components/flota/vehicleCardShared";
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
      if (auth.currentUser) {
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

type VehicleRecord = {
  titulo: string;
  bestMinPerUnit: number;
  bestTotalMin: number;
  bestDate: number;
  count: number;
  history: Array<{ minPerUnit: number; totalMin: number; fecha: number; tipoReloj: string }>;
  voltaje: "Máximo" | "Alto" | "Medio" | "Bajo";
};

const getBovedaRecords = (): VehicleRecord[] => {
  try {
    const data = localStorage.getItem("sistemicar_vehicle_history");
    if (!data) return [];
    const history: Array<{ titulo: string; minPerUnit: number; totalMin: number; tipoReloj: string; fecha: number }> = JSON.parse(data);
    const grouped: Record<string, typeof history> = {};
    history.forEach(h => {
      const key = h.titulo.toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(h);
    });
    return Object.entries(grouped)
      .filter(([_, entries]) => entries.length > 0)
      .map(([_, entries]) => {
        const sorted = [...entries].sort((a, b) => a.minPerUnit - b.minPerUnit);
        const best = sorted[0];
        const chronological = [...entries].sort((a, b) => a.fecha - b.fecha);
        const improvement = chronological.length >= 2 ? ((chronological[0].minPerUnit - best.minPerUnit) / chronological[0].minPerUnit) * 100 : 0;
        const voltaje: VehicleRecord["voltaje"] = improvement >= 30 ? "Máximo" : improvement >= 15 ? "Alto" : improvement >= 5 ? "Medio" : "Bajo";
        return {
          titulo: entries[0].titulo,
          bestMinPerUnit: best.minPerUnit,
          bestTotalMin: best.totalMin,
          bestDate: best.fecha,
          count: entries.length,
          history: chronological.map(h => ({ minPerUnit: h.minPerUnit, totalMin: h.totalMin, fecha: h.fecha, tipoReloj: h.tipoReloj })),
          voltaje
        };
      })
      .sort((a, b) => b.bestDate - a.bestDate);
  } catch { return []; }
};

const VOLTAJE_CONFIG = {
  "Máximo": { color: "#D4AF37", glow: "#D4AF3740", label: "VOLTAJE MÁXIMO" },
  "Alto": { color: "#50C878", glow: "#50C87840", label: "VOLTAJE ALTO" },
  "Medio": { color: "#1E90FF", glow: "#1E90FF40", label: "VOLTAJE MEDIO" },
  "Bajo": { color: "#64748b", glow: "#64748b40", label: "VOLTAJE BAJO" }
};

const MODULE_THRESHOLDS_PLAN = [
  { pts: 10, label: "Iniciado" },
  { pts: 50, label: "Centurión" },
  { pts: 150, label: "Guerrero" },
  { pts: 500, label: "Soberano" },
];

function getNextModuleThresholdPlan(pts: number) {
  let currentLabel = "—";
  let currentPts = 0;
  for (const t of MODULE_THRESHOLDS_PLAN) {
    if (pts >= t.pts) { currentLabel = t.label; currentPts = t.pts; }
  }
  const nextT = MODULE_THRESHOLDS_PLAN.find(t => pts < t.pts) || null;
  const pct = nextT ? Math.min(((pts - currentPts) / (nextT.pts - currentPts)) * 100, 100) : 100;
  return { current: currentLabel, next: nextT?.label || null, ptsToNext: nextT ? nextT.pts - pts : 0, pct };
}

function PlanModuleMilestoneBar({ pts }: { pts: number }) {
  const { current, next, ptsToNext, pct } = getNextModuleThresholdPlan(pts);
  const color = GOLD;
  return (
    <div className="px-3 py-2.5 rounded-xl border" style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          {current} — PLANIFICACIÓN
        </span>
        {next ? (
          <span className="text-[9px] text-slate-500">
            Faltan <span className="font-bold text-white">{ptsToNext}</span> pts → {next}
          </span>
        ) : (
          <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
            nivel máximo
          </span>
        )}
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}50`, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

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

const SEGMENT_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const SEGMENT_ICONS = ["brain", "target", "flame", "shield", "zap", "activity", "eye", "layers"];

const MONITOR_STATES = {
  OMISION: {
    label: "LA OMISIÓN",
    desc: "No hay segmento activo. El tiempo pasa sin registro.",
    color: BLOOD,
    icon: Skull
  },
  PESO_TIEMPO: {
    label: "EL PESO DEL TIEMPO",
    desc: "El segmento lleva demasiado sin cierre. La entropía se acerca.",
    color: "#f59e0b",
    icon: AlertTriangle
  },
  TRAICION: {
    label: "LA TRAICIÓN SILENCIOSA",
    desc: "Cerraste por entropía. 0 PS. El sistema no perdona la omisión.",
    color: "#7f1d1d",
    icon: Lock
  }
};

type PlaneacionProps = {
  /** Laboratorio modular — monta JornadaShellV3 en lugar del monolito legacy. */
  useJornadaV3?: boolean;
};

/** Entrada dedicada para `/jornada-v3` y `/planeacion-v3`. */
export function PlaneacionV3() {
  return <Planeacion useJornadaV3 />;
}

export default function Planeacion({ useJornadaV3: useJornadaV3Prop = false }: PlaneacionProps = {}) {
  const { user } = useAuthContext();
  const [location, navigate] = useLocation();
  const useJornadaV3 = useJornadaV3Prop || location.includes("v3");
  useViewTransitionShield();
  /** Métricas pesadas — no bloquean tap + subtarea en flota. */
  const lastFlotaLaunchRef = useRef<{ key: string; at: number } | null>(null);
  const proyectoLaunchRef = useRef<{
    proyectoId: string;
    peldanoId: string;
    launch: "desglosador_tiempo" | "desglosador_situacion";
    plantillaSubTareas?: string[];
  } | null>(null);
  const proyectoLaunchHandledRef = useRef(false);
  const isViewMountingRef = useRef(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  type PlanTab = "operar" | "metricas" | "meta";
  const [planLayout, setPlanLayout] = useState<"compact" | "full">(() => {
    try {
      if (typeof window !== "undefined" && isCoarseConcienciaDevice()) return "compact";
      const raw = localStorage.getItem("sistemicar-plan-layout");
      return raw === "full" ? "full" : "compact";
    } catch {
      return "compact";
    }
  });
  const [planTab, setPlanTab] = useState<PlanTab>(() => {
    try {
      const raw = localStorage.getItem("sistemicar-plan-tab");
      return raw === "metricas" || raw === "meta" ? raw : "operar";
    } catch {
      return "operar";
    }
  });
  const compactLayout = planLayout === "compact";
  const [metricasDetalleOpen, setMetricasDetalleOpen] = useState(false);
  const [cockpitMinimized, setCockpitMinimized] = useState(() => {
    try {
      const raw = localStorage.getItem("sistemicar-cockpit-minimized");
      if (raw === "1") return true;
      if (raw === "0") return false;
      return isCoarseConcienciaDevice();
    } catch {
      return false;
    }
  });
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("sistemicar-plan-layout", planLayout); } catch {}
  }, [planLayout]);

  useEffect(() => {
    if (!isCoarseConcienciaDevice() || planLayout === "compact") return;
    setPlanLayout("compact");
    try {
      localStorage.setItem("sistemicar-plan-layout", "compact");
    } catch {}
  }, [planLayout]);
  useEffect(() => {
    try { localStorage.setItem("sistemicar-plan-tab", planTab); } catch {}
  }, [planTab]);

  useEffect(() => {
    try { localStorage.setItem("sistemicar-cockpit-minimized", cockpitMinimized ? "1" : "0"); } catch {}
  }, [cockpitMinimized]);

  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [energyLogs, setEnergyLogs] = useState<EnergyLog[]>([]);

  const desglosadorUnlocked = hasDesglosadorAccess(
    progression?.subscriptionPlan,
    user?.email,
    progression?.rank,
    progression?.activeModules
  );
  const soberaniaDiaUnlocked = hasSoberaniaDiaAccess(
    progression?.subscriptionPlan,
    user?.email,
    progression?.rank,
    progression?.activeModules
  );
  const puntoCeroUnlocked = hasPuntoCeroAccess(
    progression?.subscriptionPlan,
    user?.email,
    progression?.rank,
    progression?.activeModules
  );
  const [dailyPS, setDailyPS] = useState(0);
  const [journalDayKey, setJournalDayKey] = useState(() => getJournalDayStartMs());
  const [yesterdayPS, setYesterdayPS] = useState<number | null>(null);
  const [showDesglosadorCTA, setShowDesglosadorCTA] = useState(false);
  const [showPlanTutorial, setShowPlanTutorial] = useState(false);

  const planificacionProfile = useMemo(
    () => progressionToProfile(progression, user?.email),
    [progression, user?.email]
  );

  useEffect(() => {
    if (!user?.uid) return;
    if (!isTutorialDone(user.uid)) {
      setShowPlanTutorial(true);
    }
  }, [user?.uid]);

  const [titulo, setTitulo] = useState("");
  const [criterioFin, setCriterioFin] = useState<CriterioFin>("tiempo");
  const [criterioDetalle, setCriterioDetalle] = useState("");
  const [selectedTerminoType, setSelectedTerminoType] = useState<TipoTerminoRapido | null>(null);
  const [terminoDetalle, setTerminoDetalle] = useState("");
  const [vehicleMode, setVehicleMode] = useState<"selector" | "express" | "flota">("selector");
  const [tipoFlotaSeleccionado, setTipoFlotaSeleccionado] = useState<TipoFlota | null>(null);
  const [relojTiempo, setRelojTiempo] = useState<"proyectivo" | "produccion" | "investigador" | "desglosador">("proyectivo");
  const [intensidadEnergetica, setIntensidadEnergetica] = useState<"fluido" | "concentrado" | "limite" | null>(null);
  const [cantidadInvestigador, setCantidadInvestigador] = useState("");
  const [horaFinProyectiva, setHoraFinProyectiva] = useState("");
  const [cantidadProduccion, setCantidadProduccion] = useState("");
  const [tiempoProduccion, setTiempoProduccion] = useState("");
  const [showTituloProdSuggestions, setShowTituloProdSuggestions] = useState(false);
  const [showDesglosadorTitleSuggestions, setShowDesglosadorTitleSuggestions] = useState(false);
  const [desglosadorSubs, setDesglosadorSubs] = useState<Array<{ tempId: string; titulo: string; cantidadObjetivo: string; tiempoRecordMinPerUnit?: number; rutaEnfoqueActiva?: boolean }>>([{ tempId: "sub_0", titulo: "", cantidadObjetivo: "" }]);
  const [historialSubs, setHistorialSubs] = useState<string[]>([]);
  const [sugerenciasIA, setSugerenciasIA] = useState<string[]>([]);
  const [sugerenciasIALoading, setSugerenciasIALoading] = useState(false);
  const [sugerenciasIASeleccionadas, setSugerenciasIASeleccionadas] = useState<Set<string>>(new Set());
  const [activeSubSuggestionIdx, setActiveSubSuggestionIdx] = useState<number | null>(null);
  const [duracionDescansoH, setDuracionDescansoH] = useState("");
  const [duracionDescansoM, setDuracionDescansoM] = useState("");
  const [tipoDescanso, setTipoDescanso] = useState<"intercepcion" | "microcarga" | "reset_profundo" | "punto_cero" | null>(null);
  const [modoPuntoCero, setModoPuntoCero] = useState<ModoPuntoCero>("dia");
  const [showHistorialCompleto, setShowHistorialCompleto] = useState(false);
  const [goldenFlash, setGoldenFlash] = useState(false);
  const [recordBanner, setRecordBanner] = useState<{ mejora: number; titulo: string } | null>(null);
  const [showBoveda, setShowBoveda] = useState(false);
  const [selectedBovedaRecord, setSelectedBovedaRecord] = useState<VehicleRecord | null>(null);
  const [tikSoundEnabled, setTikSoundEnabledState] = useState(() => isTikSoundEnabled());
  const [situacionAlertsEnabled, setSituacionAlertsEnabledState] = useState(() => isSituacionAlertsEnabled());
  const [puertaVozEnabled, setPuertaVozEnabledState] = useState(() => isPuertaVozEnabled());
  const [desglosadorVozEnabled, setDesglosadorVozEnabledState] = useState(() => isDesglosadorVoiceEnabled());

  const [conquistaPulse, setConquistaPulse] = useState(false);
  const conquistaPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerConquistaPulse = useCallback(() => {
    setConquistaPulse(true);
    if (conquistaPulseTimerRef.current) clearTimeout(conquistaPulseTimerRef.current);
    conquistaPulseTimerRef.current = setTimeout(() => setConquistaPulse(false), 800);
  }, []);

  const { vehicles: vehicleState, modales, handlers } = useDesglosadorManager({
    onDailyPsChange: setDailyPS,
    onConquistaPulse: triggerConquistaPulse,
    onGoldenFlash: () => {
      setGoldenFlash(true);
      setTimeout(() => setGoldenFlash(false), 2500);
    },
    onRecordBanner: setRecordBanner,
  });
  const {
    all: vehicles,
    deferred: deferredVehicles,
    flotaActivos: flotaActivosRenderList,
    active: activeVehicles,
    historialHoy: vehiculosHoy,
    historialAnteriores: vehiculosAnteriores,
    historialGrupos: gruposPorFechaHistorial,
    setVehicles,
  } = vehicleState;
  const {
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
    situacionReserva,
    reservaActivas,
    rehydrateFlotaFromLocalRef,
    checkPuertaAtencionRef,
    situacionRetoAtascado,
    showEmergencyArchiveBanner,
  } = modales;
  const {
    handleVehicleToggle,
    handleFlotaStatusChange,
    handleInvestigadorClose,
    handleDesglosadorGlobalClose,
    handleDescansoClose,
    handleEmergencyArchiveStuckActives,
    scrollFlotaActivosIntoView,
    handleReservaTacticaQuickAdd,
    handleReservaRutaChange,
    handleReservaEliminar,
    handleEnviarReservaASituacion,
    handleEnviarReservasSeleccionadas,
    handleAbrirNidoEnSituacion,
    handleToggleSubTarea,
    handleSituacionCronometroCumplido,
    handleSituacionCronometroFallado,
    handleDesglosadorUpdate,
    safeAwardPS,
    recordVehiculoInicio,
    applyCentinelaArchiveLocally,
    setupFlotaSubscription,
    optimisticVehiclesRef,
    ghostReconcileRef,
  } = handlers;


  // ── RADIOGRAFÍA DEL OPERADOR ──
  const [radiografiaTokens, setRadiografiaTokens] = useState<RadiografiaTokenData>({ tokens: 0, milestonesCrossed: [], lastSubscriptionRefresh: "" });
  const [showRadiografia, setShowRadiografia] = useState(false);
  const [generandoRadiografia, setGenerandoRadiografia] = useState(false);
  const [radiografiaReport, setRadiografiaReport] = useState<any>(null);
  const [gordaHistory, setGordaHistory] = useState<VehicleHistoryEntry[]>([]);

  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [planillaFecha, setPlanillaFecha] = useState(() => getJournalDateString());
  const [showCrearSegmento, setShowCrearSegmento] = useState(false);
  const [segmentoProgramando, setSegmentoProgramando] = useState(false);
  const segmentosListEndRef = useRef<HTMLDivElement | null>(null);
  const [nuevoSegNombre, setNuevoSegNombre] = useState("");
  const [nuevoSegHoraInicio, setNuevoSegHoraInicio] = useState("");
  const [nuevoSegHoraFin, setNuevoSegHoraFin] = useState("");
  const [nuevoSegColor, setNuevoSegColor] = useState(SEGMENT_COLORS[0]);
  const [nuevoSegIcono, setNuevoSegIcono] = useState(SEGMENT_ICONS[0]);
  const [nuevoSegProyectoId, setNuevoSegProyectoId] = useState("");
  const [nuevoSegRutas, setNuevoSegRutas] = useState<RutasMentalesSet | null>(null);
  const [expandedSegId, setExpandedSegId] = useState<string | null>(null);
  const segmentosAutoExpandRef = useRef(false);
  // --- RUTINAS ---
  const [plantillasRutina, setPlantillasRutina] = useState<PlantillaRutina[]>([]);
  const [rutinaBanner, setRutinaBanner] = useState<PlantillaRutina | null>(null);
  const [showRutinasPanel, setShowRutinasPanel] = useState(false);
  const [showGuardarRutina, setShowGuardarRutina] = useState(false);
  const [nuevaRutinaNombre, setNuevaRutinaNombre] = useState("");
  const [nuevaRutinaTipo, setNuevaRutinaTipo] = useState<PlantillaRutina["tipo"]>("semana_laboral");
  const [nuevaRutinaDias, setNuevaRutinaDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [guardandoRutina, setGuardandoRutina] = useState(false);
  const [cargandoRutinaId, setCargandoRutinaId] = useState<string | null>(null);
  const [rutinaResaltadaId, setRutinaResaltadaId] = useState<string | null>(null);
  const rutinaItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [notifPermission, setNotifPermission] = useState<string>(getNotificationPermission());
  /** Refresco ligero de UI de segmentos (puertas/ventanas) — solo planeación clásica. */
  const segmentUiTick = useConcienciaClockTickWhen(!useJornadaV3);
  const resumeGenRef = useRef(0);
  const [activandoSegId, setActivandoSegId] = useState<string | null>(null);
  const [cerrandoSegId, setCerrandoSegId] = useState<string | null>(null);
  const [showCierreJornada, setShowCierreJornada] = useState(false);
  const [todayCierreJornada, setTodayCierreJornada] = useState<CierreJornadaLog | null>(null);
  const [showDeposito, setShowDeposito] = useState(false);

  useEffect(() => {
    setShowCierreJornada(false);
    setSaving(false);
    setIsCreating(false);
    setVehicleMode("selector");
    setTipoFlotaSeleccionado(null);
    try {
      const layout = localStorage.getItem("sistemicar-plan-layout");
      if (layout !== "full") setPlanTab("operar");
    } catch { /* ignore */ }
  }, []);

  const toastDailyPSTotal = useCallback(() => {
    if (!user) return;
    const { total } = getDailyPointsLocalSync(user.uid);
    toast(`PS del día: ${total}`, {
      duration: 2200,
      style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}60`, color: GOLD },
    });
  }, [user]);

  useEffect(() => {
    if (!rutinaResaltadaId || !showRutinasPanel) return;
    const el = rutinaItemRefs.current[rutinaResaltadaId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timer = setTimeout(() => setRutinaResaltadaId(null), 2000);
    return () => clearTimeout(timer);
  }, [rutinaResaltadaId, showRutinasPanel, plantillasRutina.length]);

  useEffect(() => {
    if (!user) return;
    const checkNightBlocking = async () => {
      const hour = new Date().getHours();
      if (hour < 22) return;
      if (hasActiveConsciousJornadaProcess(vehiclesRef.current)) return;
      const todayCierre = await getTodayCierreJornada(user.uid);
      setTodayCierreJornada(todayCierre);
      if (!todayCierre) {
        setShowCierreJornada(true);
      }
    };
    checkNightBlocking();
    const interval = setInterval(checkNightBlocking, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => () => {
    if (conquistaPulseTimerRef.current) clearTimeout(conquistaPulseTimerRef.current);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadVehicleHistoryFromFirebase(user.uid).then(remote => {
      if (remote.length === 0) return;
      try {
        const localData = localStorage.getItem("sistemicar_vehicle_history");
        const local = localData ? JSON.parse(localData) : [];
        const merged = mergeVehicleHistories(local, remote);
        localStorage.setItem("sistemicar_vehicle_history", JSON.stringify(merged));
      } catch (e) {
        console.warn("[vehicleHistory] merge local error:", e);
      }
    }).catch(e => console.warn("[vehicleHistory] load error:", e));
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !auth.currentUser || auth.currentUser.uid !== user.uid) return;
    auth.currentUser.getIdToken()
      .then(token => fetch(`/api/vehicle-history`, {
        headers: { "Authorization": `Bearer ${token}` },
      }))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.records?.length) return;
        try {
          const localData = localStorage.getItem("sistemicar_vehicle_history");
          const local: VehicleHistoryEntry[] = localData ? JSON.parse(localData) : [];
          const remote: VehicleHistoryEntry[] = (data.records as Array<{ titulo: string; minPerUnit: number; totalMin: number; tipoReloj: string; fecha: number; status?: string; subResumen?: string }>).map(rec => ({
            titulo: rec.titulo,
            minPerUnit: rec.minPerUnit,
            totalMin: rec.totalMin,
            tipoReloj: rec.tipoReloj,
            fecha: rec.fecha,
            status: rec.status,
            subResumen: rec.subResumen ? (() => { try { return JSON.parse(rec.subResumen!); } catch { return undefined; } })() : undefined,
          }));
          const merged = mergeVehicleHistories(local, remote);
          localStorage.setItem("sistemicar_vehicle_history", JSON.stringify(merged));
        } catch (e) {
          console.warn("[vehicleHistory] backend merge error:", e);
        }
      })
      .catch(e => console.warn("[vehicleHistory] backend load error:", e));
  }, [user?.uid]);

  // ── RADIOGRAFÍA — cargar historial local ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sistemicar_vehicle_history");
      if (raw) setGordaHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // ── RADIOGRAFÍA — suscribir tokens ──
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToRadiografiaTokens(user.uid, (data) => setRadiografiaTokens(data));
    return unsub;
  }, [user?.uid]);

  // ── RADIOGRAFÍA — verificar hitos PS y refresco por suscripción ──
  useEffect(() => {
    if (!user || !progression) return;
    const ps = progression.sovereigntyPoints || 0;
    getRadiografiaTokens(user.uid).then(current => {
      checkAndAwardRadiografiaMilestones(user.uid, ps, current).then(({ awarded }) => {
        if (awarded > 0) toast.success(`🔬 +${awarded} Radiografía desbloqueada — ${ps} PS alcanzados`);
      });
      const plan = (progression as any).subscriptionPlan || (progression as any).rank || null;
      checkAndRefreshSubscriptionRadiografia(user.uid, plan, current);
    });
  }, [user?.uid, progression?.sovereigntyPoints]);

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") || null;
  }, [planilla]);

  const {
    proyectosHub,
    resolverProyectoId,
    volcarMetricasAlHub,
  } = useSegmentoProyectoVinculo(user?.uid, segmentoActivo);

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

  const monitorState = useMemo(() => {
    if (!planilla || planilla.segmentos.length === 0) return null;
    const lastEntropia = planilla.segmentos.filter(s => s.estado === "entropia").slice(-1)[0];
    if (lastEntropia) return "TRAICION";
    if (!segmentoActivo) {
      const hasPendientes = planilla.segmentos.some(s => s.estado === "pendiente");
      if (hasPendientes) return "OMISION";
    }
    if (segmentoActivo && segmentoActivo.activadoAt) {
      const elapsed = (Date.now() - segmentoActivo.activadoAt) / 60000;
      const scheduled = segmentDurationMinutes(segmentoActivo.horaInicio, segmentoActivo.horaFin);
      if (scheduled > 0 && elapsed > scheduled * 1.5) return "PESO_TIEMPO";
    }
    return null;
  }, [planilla, segmentoActivo]);

  const showEntropyDebug = useMemo(() => isEntropyDebugEnabled(), []);


  useEffect(() => {
    if (!user) return;
    const unsub2 = subscribeToProgression(user.uid, (prog) => setProgression(prog), (e) => console.error(e));
    const unsub3 = subscribeToEnergyLogs(user.uid, (data) => setEnergyLogs(data), (e) => console.error(e));
    return () => {
      unsub2();
      unsub3();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    resetCentinelaLaunchGate();
    maybeReleaseStaleSuppression(15_000);
  }, [user]);


  useEffect(() => {
    if (!user) return;
    const repair = repairJournalSpLogInflation(user.uid);
    if (repair.removed > 0) {
      console.warn(
        `[PS] Limpieza día-jornada: -${repair.removed} entradas duplicadas (${repair.journalTotalBefore} → ${repair.journalTotalAfter} PS)`
      );
      setDailyPS(repair.journalTotalAfter);
      toast.info("Barra del día corregida", {
        description: `Se quitaron ${repair.removed} registros duplicados por cierres atascados (${repair.journalTotalAfter} PS hoy).`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
        duration: 6000,
      });
    }
    const unsub = subscribeToDailyPoints(user.uid, (data) => setDailyPS(data.total), (e) => console.error(e));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadYesterday = () => {
      getYesterdayDailyPointsTotal(user.uid)
        .then(setYesterdayPS)
        .catch(() => setYesterdayPS(0));
    };
    loadYesterday();
    const onDayChange = () => {
      setJournalDayKey(getJournalDayStartMs());
      setYesterdayPS(null);
      resetLiveEntropyMonotonic();
      resetGhostSessionCache();
      loadYesterday();
      requestGhostReconcileForced(user.uid);
    };
    window.addEventListener("journal-day-changed", onDayChange);
    return () => window.removeEventListener("journal-day-changed", onDayChange);
  }, [user]);

  const dailyPsBar = useMemo(
    () => computeDailyPsBarModel(dailyPS, yesterdayPS ?? 0),
    [dailyPS, yesterdayPS]
  );

  const [yesterdayTermoSnapshot, setYesterdayTermoSnapshot] = useState<PlanillaDailySnapshot | null>(null);
  const [disciplinaSnapshots, setDisciplinaSnapshots] = useState<PlanillaDailySnapshot[]>([]);
  const [focusEventsToday, setFocusEventsToday] = useState<FocusBandEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadEvents = () => {
      const fecha = getJournalDateString();
      getFocusBandEventsForRange(user.uid, fecha, fecha)
        .then(setFocusEventsToday)
        .catch(() => setFocusEventsToday([]));
    };
    loadEvents();
    window.addEventListener("focus-band-events-updated", loadEvents);
    window.addEventListener("journal-day-changed", loadEvents);
    return () => {
      window.removeEventListener("focus-band-events-updated", loadEvents);
      window.removeEventListener("journal-day-changed", loadEvents);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const yesterdayFecha = getJournalDateString(getJournalDayStartMs() - 86400000);
    getPlanillaDailySnapshotForDate(user.uid, yesterdayFecha)
      .then(setYesterdayTermoSnapshot)
      .catch(() => setYesterdayTermoSnapshot(null));
  }, [user, planillaFecha, dailyPS]);

  useEffect(() => {
    if (!user) return;
    getPlanillaDailySnapshots(user.uid, 14)
      .then(setDisciplinaSnapshots)
      .catch(() => setDisciplinaSnapshots([]));
  }, [user, planillaFecha, dailyPS]);

  const heavyMetrics = usePlaneacionHeavyMetrics({
    userId: user?.uid,
    segmentos: planilla?.segmentos ?? [],
    vehicles: deferredVehicles,
    focusEventsToday,
    yesterdayTermoSnapshot,
    disciplinaSnapshots,
    planTab,
    enabled: !useJornadaV3,
  });

  const {
    anilloSnapshotForEscalera,
    todayTermoLive,
    termoCompare,
    combustibleLive,
    disciplinaLive,
    atencionLive,
    atencionCompare,
    atencionBySegmentId,
    disciplinaCompare,
    disciplinaBySegmentId,
    disciplinaSerie,
    escaleraConciencia,
  } = heavyMetrics;

  const ringSellarInFlightRef = useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;
    const restored = tryRestoreMetricsFromJornadaBackup(yesterdayTermoSnapshot);
    if (restored) {
      const { conquistaDiaSeg, entropiaDiaSeg } = segundosFromMetrics(restored);
      saveJornadaBackup(
        conquistaDiaSeg,
        entropiaDiaSeg,
        vehiclesForJornadaBackup(vehicles)
      );
    }
  }, [user, yesterdayTermoSnapshot, vehicles]);

  useEffect(() => {
    if (!user || useJornadaV3) return;
    const tick = () => {
      const { conquistaDiaSeg, entropiaDiaSeg } = segundosFromMetrics(heavyMetrics);
      saveJornadaBackup(
        conquistaDiaSeg,
        entropiaDiaSeg,
        vehiclesForJornadaBackup(vehicles)
      );
    };
    tick();
    const id = window.setInterval(tick, JORNADA_BACKUP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, vehicles, heavyMetrics, useJornadaV3]);

  useEffect(() => {
    if (!user) return;
    const onAward = () => {
      setGoldenFlash(true);
      setTimeout(() => setGoldenFlash(false), 2500);
      setDailyPS(getDailyPointsLocalSync(user.uid).total);
    };
    window.addEventListener("sovereignty-points-awarded", onAward);
    return () => window.removeEventListener("sovereignty-points-awarded", onAward);
  }, [user]);

  /** Montaje / retorno desde background: TTS y heavy metrics no compiten con el primer paint. */
  const scheduleJornadaForegroundResume = useCallback((afterReady?: () => void) => {
    const gen = ++resumeGenRef.current;
    beginJornadaRemount();
    pausePuntoCeroStepVoiceForRemount();
    pauseVoice();
    resetPuntoCeroVoiceQueue();
    requestAnimationFrame(() => {
      const finish = () => {
        if (gen !== resumeGenRef.current) return;
        endJornadaRemount();
        resumeVoice();
        resumeStepVoiceAfterRemount();
        if (afterReady) {
          window.setTimeout(() => {
            if (gen !== resumeGenRef.current) return;
            afterReady();
          }, 300);
        }
      };
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(finish, { timeout: 2000 });
      } else {
        finish();
      }
    });
  }, []);

  const handleJornadaVisibilityReturn = useCallback(() => {
    if (!user || document.visibilityState !== "visible") return;
    rehydrateFlotaFromLocalRef.current?.();
    setupFlotaSubscription();
    scheduleJornadaForegroundResume(() => {
      if (shouldAllowJornadaVoice()) {
        warmupSpeechSynthesis();
        recoverSpeechQueue();
        const flushed = flushMissedPuertaVoiceOnVisible();
        if (flushed > 0) {
          console.log(`[Voz] Reproduciendo ${flushed} aviso(s) de segundo plano`);
        }
      }
      runSegmentAttentionTickNow();
    });
  }, [user, setupFlotaSubscription, scheduleJornadaForegroundResume]);

  /** Montaje del chunk — warmup TTS sin cancelar cola (remount con pauseVoice solo al volver de background). */
  useEffect(() => {
    isViewMountingRef.current = true;
    beginJornadaViewMount();
    const mountGuardTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      isViewMountingRef.current = false;
    }, 400);
    if (shouldAllowJornadaVoice()) {
      warmupSpeechSynthesis();
      recoverSpeechQueue();
    }
    return () => {
      window.clearTimeout(mountGuardTimer);
      isViewMountingRef.current = false;
      endJornadaViewMount();
      cancelJornadaRemountGuard();
    };
  }, []);

  useEffect(() => {
    return onJornadaVisibilityReturn(handleJornadaVisibilityReturn);
  }, [handleJornadaVisibilityReturn]);

  useEffect(() => {
    return onFlotaStaleLoadingRefetch(() => {
      if (!user) return;
      setupFlotaSubscription();
    });
  }, [user, setupFlotaSubscription]);

  useEffect(() => {
    if (!user) return;
    getPlanillaHoy(user.uid).then(p => setPlanilla(p));
    const unsub = subscribeToPlanilla(user.uid, planillaFecha, (p) => setPlanilla(p), (e) => console.error(e));
    return unsub;
  }, [user, planillaFecha]);

  useEffect(() => {
    if (planilla?.segmentos?.length && !segmentosAutoExpandRef.current) {
      segmentosAutoExpandRef.current = true;
      setExpandedSegId("segmentos");
    }
  }, [planilla?.segmentos?.length]);

  // Cargar plantillas de rutina
  useEffect(() => {
    if (!user) return;
    const unsub = subscribePlantillasRutina(user.uid, (data) => setPlantillasRutina(data));
    return unsub;
  }, [user]);

  // Detectar si hay rutina para hoy y mostrar banner cuando no hay segmentos
  useEffect(() => {
    if (!planilla || planilla.segmentos.length > 0 || plantillasRutina.length === 0) {
      setRutinaBanner(null);
      return;
    }
    const hoy = new Date().getDay(); // 0=Dom..6=Sab
    const match = plantillasRutina.find(p => p.diasActivos.includes(hoy));
    setRutinaBanner(match || null);
  }, [planilla, plantillasRutina]);

  const segmentNotifSig = useMemo(
    () =>
      planilla?.segmentos
        .map(s => `${s.id}:${s.horaInicio}:${s.horaFin}:${s.estado}`)
        .join("|") ?? "",
    [planilla?.segmentos]
  );

  // Programar notificaciones solo cuando cambia la firma de segmentos (debounced)
  useEffect(() => {
    if (!planilla) return;
    const t = window.setTimeout(() => {
      scheduleSegmentNotifications(planilla.segmentos);
    }, 1200);
    return () => {
      clearTimeout(t);
      cancelAllNotifications();
    };
  }, [segmentNotifSig, planilla?.fecha]);

  useEffect(() => {
    if (segmentoActivo && user) {
      setActiveSegmento(user.uid, segmentoActivo.id);
    } else {
      setActiveSegmento("", null);
    }
  }, [segmentoActivo, user]);


  useEffect(() => {
    const onDayRollover = (e: Event) => {
      const fecha = (e as CustomEvent<{ fecha: string }>).detail?.fecha;
      if (fecha) setPlanillaFecha(fecha);
    };
    window.addEventListener(SEGMENT_DAY_ROLLOVER_EVENT, onDayRollover);
    checkPuertaAtencionRef.current = runSegmentAttentionTickNow;
    return () => {
      window.removeEventListener(SEGMENT_DAY_ROLLOVER_EVENT, onDayRollover);
      if (checkPuertaAtencionRef.current === runSegmentAttentionTickNow) {
        checkPuertaAtencionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !planilla) return;
    const snap = {
      indiceAtencion: atencionLive.indiceAtencion,
      ratioAntesVoz: atencionLive.ratioAntesVoz,
      puertasAbiertas: atencionLive.puertasAbiertas,
    };
    const prev = planilla.atencionSnapshot;
    if (
      prev &&
      prev.indiceAtencion === snap.indiceAtencion &&
      prev.puertasAbiertas === snap.puertasAbiertas &&
      prev.ratioAntesVoz === snap.ratioAntesVoz
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      savePlanilla(user.uid, { ...planilla, atencionSnapshot: snap }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [
    user?.uid,
    planilla?.fecha,
    planilla?.segmentos,
    atencionLive.indiceAtencion,
    atencionLive.puertasAbiertas,
    atencionLive.ratioAntesVoz,
  ]);


  useEffect(() => {
    if (relojTiempo !== "desglosador" || titulo.trim().length < 3) {
      setHistorialSubs([]);
      return;
    }
    const subs = getDesglosadorHistorico(titulo.trim());
    setHistorialSubs(subs);
  }, [titulo, relojTiempo]);

  useEffect(() => {
    if (!user || proyectoLaunchHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const proyectoId = params.get("proyectoId");
    const peldanoId = params.get("peldanoId") ?? params.get("peldañoId");
    const launch = params.get("launch");
    if (!proyectoId || !peldanoId || !launch) return;
    if (launch !== "desglosador_tiempo" && launch !== "desglosador_situacion") return;

    proyectoLaunchHandledRef.current = true;

    void (async () => {
      try {
        const proyecto = await getProyectoById(user.uid, proyectoId);
        const allPeldanos = await getPeldanosByProyecto(user.uid, proyectoId);
        const peldano = allPeldanos.find(p => p.id === peldanoId);
        if (!proyecto || !peldano) {
          toast.error("Proyecto o peldaño no encontrado");
          return;
        }

        const tituloLaunch = `${proyecto.titulo} → ${peldano.titulo}`;
        proyectoLaunchRef.current = {
          proyectoId,
          peldanoId,
          launch,
          plantillaSubTareas: peldano.plantillaSubTareas,
        };

        setIsCreating(true);
        setVehicleMode("flota");
        setTitulo(tituloLaunch);

        if (launch === "desglosador_tiempo") {
          setTipoFlotaSeleccionado("tiempo");
          setRelojTiempo("desglosador");
          let subs: Array<{ tempId: string; titulo: string; cantidadObjetivo: string; tiempoRecordMinPerUnit?: number; rutaEnfoqueActiva?: boolean }>;
          if (peldano.plantillaSubs && peldano.plantillaSubs.length > 0) {
            subs = peldano.plantillaSubs.map((s, i) => ({
              tempId: `sub_${i}`,
              titulo: s.titulo,
              cantidadObjetivo: s.cantidadObjetivo != null ? String(s.cantidadObjetivo) : "",
            }));
          } else {
            const hist = getDesglosadorHistorico(tituloLaunch);
            subs = hist.length > 0
              ? hist.map((t, i) => ({ tempId: `sub_${i}`, titulo: t, cantidadObjetivo: "" }))
              : [{ tempId: "sub_0", titulo: "", cantidadObjetivo: "" }];
          }
          setDesglosadorSubs(subs);
        } else {
          setTipoFlotaSeleccionado("situacion");
          setTerminoDetalle("Al cerrar bloque de desglose");
        }

        navigate("/planeacion", { replace: true });
        toast.info(`Proyecto: ${proyecto.titulo}`, {
          description: `Peldaño «${peldano.titulo}» listo para lanzar`,
          duration: 3500,
        });
      } catch {
        toast.error("No se pudo preparar el lanzamiento desde proyecto");
      }
    })();
  }, [user, navigate]);

  const resetForm = () => {
    setTitulo("");
    setCriterioFin("tiempo");
    setCriterioDetalle("");
    setIsCreating(false);
    setVehicleMode("selector");
    setSelectedTerminoType(null);
    setTerminoDetalle("");
    setTipoFlotaSeleccionado(null);
    setRelojTiempo("proyectivo");
    setIntensidadEnergetica(null);
    setHoraFinProyectiva("");
    setCantidadProduccion("");
    setTiempoProduccion("");
    setShowTituloProdSuggestions(false);
    setShowDesglosadorTitleSuggestions(false);
    setCantidadInvestigador("");
    setDesglosadorSubs([{ tempId: "sub_0", titulo: "", cantidadObjetivo: "" }]);
    setHistorialSubs([]);
    setSugerenciasIA([]);
    setSugerenciasIALoading(false);
    setSugerenciasIASeleccionadas(new Set());
    setDuracionDescansoH("");
    setDuracionDescansoM("");
    setTipoDescanso(null);
    proyectoLaunchRef.current = null;
    setCierreEnergiaPending(null);
    setCierreEnergiaSeleccion(null);
    setCierreRutaSeleccion(new Set());
    setCierreRutaSinUso(false);
    setCierreRutaPatron(null);
  };

  const isNearDescanso = (): boolean => {
    if (!planilla) return false;
    const nowMin = getCurrentTimeMinutes();
    return planilla.segmentos.some(seg => {
      const isDescanso = seg.nombre.toLowerCase().includes("descanso") || seg.nombre.toLowerCase().includes("almuerzo") || seg.nombre.toLowerCase().includes("comida") || seg.nombre.toLowerCase().includes("break");
      if (!isDescanso) return false;
      const segStart = timeStringToMinutes(seg.horaInicio);
      return segStart - nowMin > 0 && segStart - nowMin <= 15;
    });
  };

  const getDescansoBlocks = (): { horaInicio: string; horaFin: string; duracionMin: number }[] => {
    if (!planilla) return [];
    return planilla.segmentos
      .filter(seg => seg.nombre.toLowerCase().includes("descanso") || seg.nombre.toLowerCase().includes("almuerzo") || seg.nombre.toLowerCase().includes("comida") || seg.nombre.toLowerCase().includes("break"))
      .map(seg => ({
        horaInicio: seg.horaInicio,
        horaFin: seg.horaFin,
        duracionMin: segmentDurationMinutes(seg.horaInicio, seg.horaFin),
      }));
  };

  const handleFlotaSave = async () => {
    if (!user) {
      toast.error("Inicia sesión para lanzar vehículos");
      return;
    }
    if (!titulo.trim()) {
      toast.error("Escribe un título para la misión");
      return;
    }
    if (!tipoFlotaSeleccionado) return;
    const slotsCheck = assertCanOpenVehicle(
      vehiclesRef.current,
      launchKindFromFlota(tipoFlotaSeleccionado)
    );
    if (!slotsCheck.allowed) {
      toast.error("Límite de misiones", {
        description: formatOperationalSlotsBlockMessage(slotsCheck),
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5500,
      });
      return;
    }
    const launchKey = `${titulo.trim()}|${tipoFlotaSeleccionado}`;
    const launchNow = Date.now();
    const last = lastFlotaLaunchRef.current;
    if (last?.key === launchKey && launchNow - last.at < 2000) return;
    lastFlotaLaunchRef.current = { key: launchKey, at: launchNow };
    setSaving(true);
    resetCentinelaLaunchGate();
    setCierreEnergiaPending(null);
    setCierreEnergiaSeleccion(null);
    console.log(`[handleFlotaSave] Iniciando creación: "${titulo}" tipo: ${tipoFlotaSeleccionado}`);
    try {
      const cierreAt = Date.now();
      applyCentinelaArchiveLocally(cierreAt);
      await closeCentinelasBeforeConsciousLaunch(user.uid, vehiclesRef.current);

      const flotaConfig = FLOTA_CONFIG[tipoFlotaSeleccionado];
      let detalle = "";
      let criterio: CriterioFin = "circunstancia";
      let tipoTermino: TipoTerminoRapido = "situacion";

      if (tipoFlotaSeleccionado === "tiempo") {
        criterio = "tiempo";
        tipoTermino = "hora";
        if (relojTiempo === "proyectivo") {
          detalle = horaFinProyectiva;
        } else if (relojTiempo === "produccion") {
          detalle = `${cantidadProduccion} x ${tiempoProduccion}min`;
        } else if (relojTiempo === "investigador") {
          detalle = `${cantidadInvestigador} unidades`;
        } else {
          detalle = "";
        }
      } else if (tipoFlotaSeleccionado === "situacion") {
        criterio = "circunstancia";
        tipoTermino = "situacion";
        detalle = terminoDetalle.trim() || "Al cerrar este bloque";
      } else if (tipoFlotaSeleccionado === "descanso") {
        criterio = "circunstancia";
        tipoTermino = "omitido";
        const _totalMinDescanso = (Number(duracionDescansoH) || 0) * 60 + (Number(duracionDescansoM) || 0);
        detalle = _totalMinDescanso > 0 ? `${_totalMinDescanso} min` : "Recarga consciente";

      } else {
        criterio = "circunstancia";
        tipoTermino = "omitido";
        detalle = "Modo Verdad";
      }

      const bonoTemple = isNearDescanso();

      let estadoEnergia: "optima" | "baja" | undefined;
      let energiaDiffPct: number | undefined;
      let rendimientoConsciente: "igual" | "mejor" | "peor" | undefined;
      let recordSugerido: number | undefined;
      let tiempoElegido: number | undefined;
      if (tipoFlotaSeleccionado === "tiempo" && (relojTiempo === "produccion" || relojTiempo === "investigador")) {
        const hist = getHistoricalVehicleData(titulo.trim());
        if (hist.count > 0 && hist.bestMinPerUnit) {
          recordSugerido = hist.bestMinPerUnit;
          if (relojTiempo === "produccion" && tiempoProduccion) {
            const currentMinPerUnit = Number(tiempoProduccion);
            tiempoElegido = currentMinPerUnit;
            if (currentMinPerUnit > hist.bestMinPerUnit) {
              estadoEnergia = "baja";
              energiaDiffPct = Math.round(((currentMinPerUnit - hist.bestMinPerUnit) / hist.bestMinPerUnit) * 100);
              rendimientoConsciente = "peor";
            } else if (currentMinPerUnit < hist.bestMinPerUnit) {
              estadoEnergia = "optima";
              energiaDiffPct = 0;
              rendimientoConsciente = "mejor";
            } else {
              estadoEnergia = "optima";
              energiaDiffPct = 0;
              rendimientoConsciente = "igual";
            }
          }
        }
      }

      const launchAtMs = Date.now();
      const dayStartLaunch = getLimaDayStartMs(launchAtMs);
      const segResuelto = planilla
        ? resolveSegmentoForVehicleAt(planilla.segmentos, launchAtMs, dayStartLaunch)
        : null;
      const segActualNombre = segResuelto?.nombre ?? segmentoActivo?.nombre ?? undefined;
      const segActualId = segResuelto?.id ?? segmentoActivo?.id;
      const launchCtx = proyectoLaunchRef.current;
      const resolvedProyectoId = resolverProyectoId(launchCtx);
      const subTareasPrefill =
        tipoFlotaSeleccionado === "situacion" && launchCtx?.plantillaSubTareas?.length
          ? launchCtx.plantillaSubTareas
              .filter(t => t.trim())
              .map((texto, i) => ({
                id: `st_${Date.now()}_${i}`,
                texto: texto.trim(),
                completada: false,
                creadaAt: Date.now(),
              }))
          : undefined;

      console.log(`[handleFlotaSave] Guardando vehículo local primero...`);

      if (tipoFlotaSeleccionado === "descanso" && tipoDescanso === "punto_cero") {
        const cur = vehiclesRef.current;
        const desgParent = findActiveDesglosadorForNestedStack(cur);
        const sitParent = desgParent ? null : findActiveSituacionRingForNestedStack(cur);
        if (desgParent) {
          const pausePatch = buildDesglosadorNestedPausePatch(desgParent, "punto_cero");
          if (pausePatch) {
            const pausedList = cur.map(v => (v.id === desgParent.id ? { ...v, ...pausePatch } : v));
            vehiclesRef.current = pausedList;
            setVehicles(pausedList);
            saveLocalVehicles(pausedList);
            void updateVehicle(user.uid, desgParent.id, pausePatch).catch(e =>
              console.warn("[nested-stack] desglosador pause:", e)
            );
          }
        } else if (sitParent) {
          const pausePatch = buildSituacionNestedPausePatch(sitParent, "punto_cero");
          if (pausePatch) {
            const pausedList = cur.map(v => (v.id === sitParent.id ? { ...v, ...pausePatch } : v));
            vehiclesRef.current = pausedList;
            setVehicles(pausedList);
            saveLocalVehicles(pausedList);
            void updateVehicle(user.uid, sitParent.id, pausePatch).catch(e =>
              console.warn("[nested-stack] situacion pause:", e)
            );
          }
        }
      }

      const aperturaAtMs = Date.now();
      const subVehiculosDesg =
        relojTiempo === "desglosador"
          ? desglosadorSubs.filter(s => s.titulo.trim()).map((s, idx) => buildDesglosadorSubFromForm(s, idx, aperturaAtMs))
          : undefined;

      const vehicleCreatePayload: Omit<Vehicle, "id" | "createdAt" | "userId" | "status"> = {
        titulo: titulo.trim(),
        criterioFin: criterio,
        criterioDetalle: detalle,
        tiempoInicio: new Date(),
        ejes: STUB_EJES,
        tipoTerminoRapido: tipoTermino,
        tipoFlota: tipoFlotaSeleccionado,
        aperturaAt: aperturaAtMs,
        bonoTemple,
        tipoReloj: tipoFlotaSeleccionado === "tiempo" ? relojTiempo : undefined,
        cantidadObjetivo: relojTiempo === "investigador" ? Number(cantidadInvestigador) : (relojTiempo === "produccion" ? Number(cantidadProduccion) : undefined),
        subVehiculos: subVehiculosDesg,
        subTareas: subTareasPrefill,
        ...(launchCtx || resolvedProyectoId
          ? {
              proyectoId: launchCtx?.proyectoId ?? resolvedProyectoId,
              ...(launchCtx?.peldanoId ? { proyectoPeldanoId: launchCtx.peldanoId } : {}),
            }
          : {}),
        estadoEnergia,
        energiaDiffPct,
        segmentoOrigen: segActualNombre,
        segmentoId: segActualId,
        segmentosCruzados: 0,
        rendimientoConsciente,
        recordSugerido,
        tiempoElegido,
        intensidadEnergetica: intensidadEnergetica || undefined,
        tipoDescanso: tipoFlotaSeleccionado === "descanso" ? (tipoDescanso || "microcarga") : undefined,
        microPasos: tipoFlotaSeleccionado === "descanso" && tipoDescanso !== "punto_cero" ? { hidratacion: false, respiracion: false, pantallaZero: false } : undefined,
        etapasPuntoCero: tipoFlotaSeleccionado === "descanso" && tipoDescanso === "punto_cero" ? { etapa1: false, etapa2: false, etapa3: false, etapa4: false } : undefined,
        puntoCero:
          tipoFlotaSeleccionado === "descanso" && tipoDescanso === "punto_cero"
            ? initPuntoCeroSession(modoPuntoCero, parsePuntoCeroDuracionMin(detalle), aperturaAtMs)
            : undefined,
      };

      const isDesglosadorMs0Launch = tipoFlotaSeleccionado === "tiempo" && relojTiempo === "desglosador";
      const savedLaunchCtx = launchCtx;

      const applyPostLaunchSideEffects = (newVehicleId: string) => {
        if (savedLaunchCtx) {
          const tipoOrigen = savedLaunchCtx.launch === "desglosador_tiempo" ? "tiempo" : "situacion";
          void markPeldanoEnCurso(user.uid, savedLaunchCtx.peldanoId, newVehicleId, tipoOrigen);
          proyectoLaunchRef.current = null;
        }
        if (intensidadEnergetica) {
          recordVehiculoInicio(newVehicleId, intensidadEnergetica);
        }
        if (relojTiempo === "desglosador" && user) {
          const filteredSubs = desglosadorSubs.filter(s => s.titulo.trim());
          if (filteredSubs[0]?.titulo.trim()) {
            toast.info("Profundidad de sesión", {
              description: "Cada sub cumplido suma +2 PS (y ruta si aplica) en tu barra. Profundidad: +4, +6, +8… por hora completa de sesión.",
              style: { backgroundColor: PIZARRA, border: `1px solid rgba(212,175,55,0.35)`, color: GOLD },
              duration: 4500,
            });
          }
        }
        if (bonoTemple) {
          void safeAwardPS(10, "VOLUNTAD SOBRE EL HORARIO: " + titulo.trim());
          toast.success("VOLUNTAD SOBRE EL HORARIO +10 PS", {
            description: "Iniciaste en los últimos 15 min antes del descanso",
            style: { backgroundColor: PIZARRA, border: `2px solid ${NARANJA}`, color: NARANJA },
            duration: 4000
          });
        }
      };

      const paintOptimisticLaunch = (optimisticVehicle: Vehicle, skipGhostReconcile: boolean) => {
        optimisticVehiclesRef.current = [
          ...optimisticVehiclesRef.current.filter(v => v.id !== optimisticVehicle.id),
          optimisticVehicle,
        ];
        vehiclesRef.current = [optimisticVehicle, ...vehiclesRef.current.filter(v => v.id !== optimisticVehicle.id)];
        startTransition(() => {
          setVehicles(prev => {
            const withoutDupe = prev.filter(v => v.id !== optimisticVehicle.id);
            return [optimisticVehicle, ...withoutDupe];
          });
        });
        saveLocalVehicles(vehiclesRef.current);
        if (optimisticVehicle.tipoReloj === "desglosador") {
          const sub0 = optimisticVehicle.subVehiculos?.[0];
          if (!sub0 || sub0.status !== "activo" || !sub0.aperturaAt) {
            console.warn(
              "[paintOptimisticLaunch] Desglosador sin sub activo inicial:",
              optimisticVehicle.id,
              optimisticVehicle.subVehiculos
            );
            toast.warning("Subs no listos", {
              description: "El desglosador se lanzó sin sub inicial activo. Toca la tarjeta o relanza.",
              style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
              duration: 5000,
            });
          }
        }
        if (tipoFlotaSeleccionado === "situacion" || relojTiempo === "desglosador") {
          setExpandedId(optimisticVehicle.id);
        }
        setIsCreating(false);
        scrollFlotaActivosIntoView();
        if (skipGhostReconcile) {
          suppressGhostReconcileAfterLaunch();
        } else {
          ghostReconcileRef.current?.();
        }
        toast.success(`"${titulo}" lanzado · ${flotaConfig.label}`, {
          description: flotaConfig.psCierre,
          style: { backgroundColor: PIZARRA, border: `1px solid ${flotaConfig.color}`, color: flotaConfig.color }
        });
        if (tipoFlotaSeleccionado === "situacion" || relojTiempo === "desglosador") {
          dispatchConcienciaClockTick();
        }
        registrarEvento(COMPONENTES.PLANIFICACION);
        resetForm();
      };

      if (isDesglosadorMs0Launch) {
        const newVehicleId = generateStableUuid();
        const newClientRequestId = `crq_${generateStableUuid()}`;
        const optimisticVehicle: Vehicle = {
          ...vehicleCreatePayload,
          id: newVehicleId,
          clientRequestId: newClientRequestId,
          createdAt: new Date(),
          userId: user.uid,
          status: "activo",
        };
        paintOptimisticLaunch(optimisticVehicle, true);
        applyPostLaunchSideEffects(newVehicleId);
        runShadowTask(() => {
          scheduleVehicleRemotePersist(user.uid, newVehicleId, vehicleCreatePayload, newClientRequestId);
        });
        console.log(`[handleFlotaSave] Desglosador ms0: "${titulo}" id=${newVehicleId}`);
        return;
      }

      let newVehicleId: string;
      let newClientRequestId: string;
      try {
        const created = await addVehicle(user.uid, vehicleCreatePayload);
        newVehicleId = created.id;
        newClientRequestId = created.clientRequestId;
      } catch (addErr) {
        console.error("[handleFlotaSave] addVehicle:", addErr);
        toast.error("Error al guardar vehículo", {
          description: "No se pudo registrar en este dispositivo. Libera espacio del navegador e intenta de nuevo.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 5000,
        });
        return;
      }
      console.log(`[handleFlotaSave] addVehicle retornó id: ${newVehicleId}`);

      applyPostLaunchSideEffects(newVehicleId);

      console.log(`[handleFlotaSave] Vehículo creado exitosamente: "${titulo}"`);

      try {
      const optimisticVehicle: Vehicle = {
        id: newVehicleId,
        clientRequestId: newClientRequestId,
        ...vehicleCreatePayload,
        tiempoInicio: new Date(),
        createdAt: new Date(),
        userId: user.uid,
        status: "activo" as VehicleStatus,
      };
      paintOptimisticLaunch(optimisticVehicle, false);
      } catch (uiErr) {
        console.warn("[handleFlotaSave] UI post-lanzamiento:", uiErr);
        toast.success(`"${titulo}" lanzado en este dispositivo`, {
          description: "Si no lo ves en activos, recarga la pestaña Operar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
        });
        setIsCreating(false);
      }
    } catch (err) {
      console.error("[handleFlotaSave] Error:", err);
      toast.error("Error al guardar vehículo", {
        description: "Revisa la conexión o libera espacio en el navegador e intenta de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5000,
      });
    } finally {
      releaseCentinela();
      setSaving(false);
    }
  };

  const resetNuevoSegmentoForm = () => {
    setNuevoSegNombre("");
    setNuevoSegHoraInicio("");
    setNuevoSegHoraFin("");
    setNuevoSegColor(SEGMENT_COLORS[0]);
    setNuevoSegIcono(SEGMENT_ICONS[0]);
    setNuevoSegProyectoId("");
    setNuevoSegRutas(null);
  };

  useEffect(() => {
    const processVehicleIntent = () => {
      if (!user || isInterModuleSyncBlocked()) return;
      const intent = consumeJornadaVehicleIntent();
      if (!intent) return;
      void addVehicle(user.uid, intent.payload);
    };
    processVehicleIntent();
    return onViewTransitionShieldReleased(processVehicleIntent);
  }, [user]);

  useEffect(() => {
    if (isInterModuleSyncBlocked() || isViewMountingRef.current) return;
    if (!user || !nuevoSegProyectoId) {
      setNuevoSegRutas(null);
      return;
    }
    const proy = proyectosHub.find(p => p.id === nuevoSegProyectoId);
    if (!proy) return;
    void getPeldanosByProyecto(user.uid, nuevoSegProyectoId).then(peldanos => {
      if (isInterModuleSyncBlocked() || isViewMountingRef.current) return;
      const claridad = resolveClaridadParaProyecto(proy, peldanos, nuevoSegNombre.trim() || undefined);
      if (claridad) setNuevoSegRutas(claridad);
    });
  }, [nuevoSegNombre, nuevoSegProyectoId, user, proyectosHub]);

  const addSegmento = async () => {
    if (!user || !nuevoSegNombre.trim() || !nuevoSegHoraInicio || !nuevoSegHoraFin || segmentoProgramando) return;

    const validation = validateSegmentTimes(nuevoSegHoraInicio, nuevoSegHoraFin);
    if (!validation.ok) {
      toast.error("Horario de segmento inválido", {
        description: validation.error,
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }

    setSegmentoProgramando(true);

    const nombreCapturado = nuevoSegNombre.trim();
    const horaInicioCapturada = nuevoSegHoraInicio;
    const horaFinCapturada = nuevoSegHoraFin;
    const colorCapturado = nuevoSegColor;
    const iconoCapturado = nuevoSegIcono;
    const proyectoCapturado = nuevoSegProyectoId;
    const rutasCapturadas = proyectoCapturado && nuevoSegRutas ? nuevoSegRutas : undefined;

    let seg: SegmentoV5 = {
      id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nombre: nombreCapturado,
      horaInicio: horaInicioCapturada,
      horaFin: horaFinCapturada,
      color: colorCapturado,
      icono: iconoCapturado,
      estado: "pendiente",
      eventos: [],
      psGanados: 0,
      ...(proyectoCapturado ? { proyectoVinculadoId: proyectoCapturado, rutasMentales: rutasCapturadas } : {}),
    };

    const fecha = getLimaDateString();
    const planillaBase: Planilla = planilla ?? {
      id: `planilla_${fecha}_${Date.now()}`,
      fecha,
      segmentos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    let planillaOptimista: Planilla = {
      ...planillaBase,
      segmentos: [...planillaBase.segmentos, seg],
      updatedAt: new Date().toISOString(),
    };

    resetNuevoSegmentoForm();
    setShowCrearSegmento(false);
    setPlanilla(planillaOptimista);
    setExpandedSegId("segmentos");
    setSegmentoProgramando(false);
    window.setTimeout(() => {
      segmentosListEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);

    toast.success("Segmento programado", {
      description: `${seg.nombre} · ${seg.horaInicio} – ${seg.horaFin}`,
      style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
      duration: 3200,
    });

    try {
      if (proyectoCapturado && rutasCapturadas) {
        const { peldanoId } = await ensurePeldanoFromSegmento(user.uid, {
          proyectoId: proyectoCapturado,
          segmento: seg,
          planillaFecha: fecha,
          rutasMentales: rutasCapturadas,
        });
        seg = { ...seg, proyectoPeldanoId: peldanoId };
        planillaOptimista = {
          ...planillaOptimista,
          segmentos: planillaOptimista.segmentos.map(s =>
            s.id === seg.id ? seg : s
          ),
        };
        setPlanilla(planillaOptimista);
      }
      await savePlanilla(user.uid, planillaOptimista);
      registrarEvento(COMPONENTES.PLANIFICACION);
      try {
        const ok = await safeAwardPS(1, "Segmento creado: " + seg.nombre);
        toast.success("+1 PS · segmento", {
          description: seg.nombre,
          style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
          duration: 2400,
        });
        if (ok) toastDailyPSTotal();
      } catch {
        toast.info("Segmento guardado", {
          description: "Los PS se sincronizarán al reconectar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
          duration: 2800,
        });
      }
    } catch {
      setPlanilla(planillaBase);
      savePlanilla(user.uid, planillaBase).catch(() => {});
      setNuevoSegNombre(nombreCapturado);
      setNuevoSegHoraInicio(horaInicioCapturada);
      setNuevoSegHoraFin(horaFinCapturada);
      setNuevoSegColor(colorCapturado);
      setNuevoSegIcono(iconoCapturado);
      setNuevoSegProyectoId(proyectoCapturado);
      if (rutasCapturadas) setNuevoSegRutas(rutasCapturadas);
      setShowCrearSegmento(true);
      toast.error("No se pudo programar el segmento", {
        description: "Revisa la conexión e intenta de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    }
  };

  const guardarComoRutina = async () => {
    if (!user || !planilla || !nuevaRutinaNombre.trim() || guardandoRutina) return;
    if (nuevaRutinaDias.length === 0) {
      toast.error("Selecciona al menos un día activo", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      return;
    }
    setGuardandoRutina(true);
    try {
      const segs: SegmentoTemplate[] = planilla.segmentos.map(s => ({
        nombre: s.nombre,
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        color: s.color,
        icono: s.icono,
      }));
      const nombre = nuevaRutinaNombre.trim();
      const nueva = await addPlantillaRutina(user.uid, {
        nombre,
        tipo: nuevaRutinaTipo,
        diasActivos: nuevaRutinaDias,
        segmentos: segs,
      });
      setPlantillasRutina(prev => {
        if (prev.some(p => p.id === nueva.id)) return prev;
        return [nueva, ...prev];
      });
      toast.success("Rutina guardada", {
        description: `${segs.length} segmentos guardados como "${nombre}"`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
      });
      setNuevaRutinaNombre("");
      setShowGuardarRutina(false);
      setShowRutinasPanel(true);
      setRutinaResaltadaId(nueva.id);
    } catch (e) {
      console.error("[guardarComoRutina]", e);
      toast.error("No se pudo guardar la rutina", {
        description: "Revisa la conexión e intenta de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    } finally {
      setGuardandoRutina(false);
    }
  };

  const cargarRutina = async (plantilla: PlantillaRutina) => {
    if (!user || cargandoRutinaId) return;
    setCargandoRutinaId(plantilla.id);
    try {
      const nuevaPlanilla = await applyPlantillaToday(user.uid, plantilla);
      setPlanilla(nuevaPlanilla);
      setRutinaBanner(null);
      toast.success(`Rutina cargada: ${plantilla.nombre}`, {
        description: `${plantilla.segmentos.length} segmentos programados`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
      });
    } catch (e) {
      console.error("[cargarRutina]", e);
      toast.error("No se pudo cargar la rutina", {
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
    } finally {
      setCargandoRutinaId(null);
    }
  };

  const eliminarRutina = async (plantillaId: string) => {
    if (!user) return;
    await deletePlantillaRutina(user.uid, plantillaId);
    toast.success("Rutina eliminada", {
      style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
    });
  };

  const activarSegmento = async (segId: string) => {
    if (!user) {
      toast.error("Inicia sesión para abrir la puerta");
      return;
    }
    if (!planilla) {
      toast.error("No hay planilla del día cargada");
      return;
    }
    if (activandoSegId === segId) return;
    const seg = planilla.segmentos.find(s => s.id === segId);
    if (!seg) {
      toast.error("Segmento no encontrado");
      return;
    }
    if (seg.estado !== "pendiente") {
      toast.info("Este segmento ya no está pendiente", {
        description: seg.estado === "activo" ? "La puerta ya fue abierta." : `Estado: ${seg.estado}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
      });
      return;
    }
    const nowMs = Date.now();
    const dayStart = getSegmentCalendarDayStartMs(nowMs);
    if (!isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart)) {
      toast.warning("Ventana de puerta cerrada", {
        description: `Abre la puerta de atención solo ±5 min de ${seg.horaInicio}.`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}40`, color: BLOOD },
        duration: 5000,
      });
      return;
    }
    const puertaTiming = classifyPuertaTiming(nowMs, seg.horaInicio, dayStart);
    const patch = {
      estado: "activo" as const,
      activadoAt: nowMs,
      puertaTiming,
      psGanados: (seg.psGanados || 0) + 2,
    };
    const optimisticPlanilla: Planilla = {
      ...planilla,
      segmentos: planilla.segmentos.map(s => (s.id === segId ? { ...s, ...patch } : s)),
    };
    setActivandoSegId(segId);
    setPlanilla(optimisticPlanilla);
    const rollbackSegmento = () =>
      setPlanilla(prev =>
        prev
          ? {
              ...prev,
              segmentos: prev.segmentos.map(s =>
                s.id === segId
                  ? {
                      ...s,
                      estado: "pendiente" as const,
                      activadoAt: undefined,
                      puertaTiming: undefined,
                      psGanados: seg.psGanados || 0,
                    }
                  : s
              ),
            }
          : prev
      );
    try {
      const { planilla: saved, localSaved } = await updateSegmentoInPlanilla(
        user.uid,
        segId,
        patch,
        optimisticPlanilla
      );
      if (!localSaved) {
        rollbackSegmento();
        toast.error("No se pudo guardar en el dispositivo", {
          description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 6000,
        });
        return;
      }
      setPlanilla(saved);
      setActiveSegmento(user.uid, segId);
      const timingLabel = puertaTiming === "antes_voz" ? "antes de la voz" : "tras la voz";
      toast.success("+2 PS Puerta de atención abierta", {
        description: `${seg.nombre} · ${timingLabel}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
      });
      void safeAwardPS(2, "Puerta de atención: " + seg.nombre).then(ok => {
        if (ok) toastDailyPSTotal();
      });
      void registrarEvento(COMPONENTES.PLANIFICACION);
    } catch (err) {
      console.error("[activarSegmento]", err);
      rollbackSegmento();
      toast.error("No se pudo abrir la puerta", {
        description: "Algo falló al procesar la apertura. Cierra la pestaña, vuelve a abrir e intenta otra vez.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5000,
      });
    } finally {
      setActivandoSegId(null);
    }
  };

  const cerrarSegmentoManual = async (segId: string) => {
    if (!user || !planilla) return;
    if (cerrandoSegId === segId) return;
    const seg = planilla.segmentos.find(s => s.id === segId);
    if (!seg || seg.estado !== "activo") return;

    if (seg.horaFin) {
      const nowMs = Date.now();
      const dayStart = getSegmentCalendarDayStartMs(nowMs);
      const dentroVentana = isWithinSegmentTimeMargin(nowMs, seg.horaInicio, seg.horaFin, "fin", 5, dayStart);
      if (!dentroVentana) {
        toast.warning("La puerta está sellada", {
          description: `El cierre con intención (+2 PS) solo está disponible ±5 min de ${seg.horaFin}. Fuera de esa ventana el segmento pasará a entropía automáticamente.`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}40`, color: BLOOD },
          duration: 6000,
        });
        return;
      }
    }

    const nowMs = Date.now();

    const patch = {
      estado: "cerrado_manual" as const,
      cerradoAt: nowMs,
      psGanados: (seg.psGanados || 0) + 2,
    };
    const optimisticPlanilla: Planilla = {
      ...planilla,
      segmentos: planilla.segmentos.map(s => (s.id === segId ? { ...s, ...patch } : s)),
    };
    setCerrandoSegId(segId);
    setPlanilla(optimisticPlanilla);

    const rollbackSegmento = () =>
      setPlanilla(prev =>
        prev
          ? {
              ...prev,
              segmentos: prev.segmentos.map(s =>
                s.id === segId
                  ? {
                      ...s,
                      estado: "activo" as const,
                      cerradoAt: undefined,
                      psGanados: seg.psGanados || 0,
                    }
                  : s
              ),
            }
          : prev
      );

    try {
      const { planilla: updated, localSaved } = await updateSegmentoInPlanilla(
        user.uid,
        segId,
        patch,
        optimisticPlanilla
      );
      if (!localSaved) {
        rollbackSegmento();
        toast.error("No se pudo guardar en el dispositivo", {
          description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          duration: 6000,
        });
        return;
      }
      setPlanilla(updated);
      toast.success("+2 PS Cierre consciente de puerta", {
        description: seg.puertaSistema
          ? `${seg.nombre} · Recuperaste los 2 PS de entropía`
          : `${seg.nombre} · Puerta cerrada con intención`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
      });
      void safeAwardPS(2, "Cierre consciente: " + seg.nombre).then(ok => {
        if (ok) toastDailyPSTotal();
      });
      incrementModulePoints(user.uid, "planificacion", 1).catch(() => {});
      void registrarEvento(COMPONENTES.PLANIFICACION);
    } catch (err) {
      console.error("[cerrarSegmentoManual]", err);
      rollbackSegmento();
      toast.error("No se pudo cerrar la puerta", {
        description: "Algo falló al procesar el cierre. Intenta otra vez.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5000,
      });
    } finally {
      setCerrandoSegId(null);
    }
  };

  const TERMINO_OPTIONS: { id: TipoTerminoRapido; label: string; sublabel: string; puntosCumple: number; puntosNoCumple: number; color: string }[] = [
    { id: "hora", label: "Hora de Término", sublabel: "Define cuándo termina", puntosCumple: VEHICLE_CUMPLIDO_BASE_PS, puntosNoCumple: VEHICLE_ARCHIVADO_BASE_PS, color: GOLD },
    { id: "situacion", label: "Situación de Término", sublabel: "Define qué circunstancia termina", puntosCumple: 5, puntosNoCumple: 2, color: AZURE },
    { id: "omitido", label: "Omitir", sublabel: "Sin criterio específico", puntosCumple: 1, puntosNoCumple: 0, color: "#6b7280" }
  ];

  const handleQuickSaveAndNew = async (tipoTermino: TipoTerminoRapido, detalle?: string) => {
    if (!user || !titulo.trim()) return;
    const slotsCheck = assertCanOpenVehicle(vehiclesRef.current, "quick_save");
    if (!slotsCheck.allowed) {
      toast.error("Límite de misiones", {
        description: formatOperationalSlotsBlockMessage(slotsCheck),
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
        duration: 5500,
      });
      return;
    }
    setSaving(true);
    resetCentinelaLaunchGate();
    setCierreEnergiaPending(null);
    setCierreEnergiaSeleccion(null);
    const terminoInfo = TERMINO_OPTIONS.find(t => t.id === tipoTermino);
    const detalleNorm = detalle?.trim() || (tipoTermino === "situacion" ? "Al cerrar este bloque" : "");
    let newVehicleId: string;
    let newClientRequestId: string;
    try {
      const cierreAt = Date.now();
      applyCentinelaArchiveLocally(cierreAt);
      await closeCentinelasBeforeConsciousLaunch(user.uid, vehiclesRef.current);
      const created = await addVehicle(user.uid, {
        titulo: titulo.trim(),
        criterioFin: tipoTermino === "hora" ? "tiempo" : "circunstancia",
        criterioDetalle: detalleNorm,
        tiempoInicio: new Date(),
        ejes: STUB_EJES,
        tipoTerminoRapido: tipoTermino,
        tipoFlota: tipoTermino === "situacion" ? "situacion" : tipoTermino === "hora" ? "tiempo" : undefined,
        aperturaAt: Date.now(),
      });
      newVehicleId = created.id;
      newClientRequestId = created.clientRequestId;
    } catch (err) {
      console.error("[handleQuickSaveAndNew] addVehicle:", err);
      toast.error("Error al guardar vehículo", {
        description: "No se pudo registrar en este dispositivo. Libera espacio del navegador e intenta de nuevo.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      });
      setSaving(false);
      releaseCentinela();
      return;
    }
    try {
      const optimisticVehicle: Vehicle = {
        id: newVehicleId,
        clientRequestId: newClientRequestId,
        titulo: titulo.trim(),
        criterioFin: tipoTermino === "hora" ? "tiempo" : "circunstancia",
        criterioDetalle: detalleNorm,
        tiempoInicio: new Date(),
        createdAt: new Date(),
        userId: user.uid,
        status: "activo",
        ejes: STUB_EJES,
        tipoTerminoRapido: tipoTermino,
        tipoFlota: tipoTermino === "situacion" ? "situacion" : tipoTermino === "hora" ? "tiempo" : undefined,
        aperturaAt: Date.now(),
      };
      optimisticVehiclesRef.current = [
        ...optimisticVehiclesRef.current.filter(v => v.id !== newVehicleId),
        optimisticVehicle,
      ];
      vehiclesRef.current = [optimisticVehicle, ...vehiclesRef.current.filter(v => v.id !== newVehicleId)];
      setVehicles(prev => [optimisticVehicle, ...prev.filter(v => v.id !== newVehicleId)]);
      saveLocalVehicles(vehiclesRef.current);
      setIsCreating(false);
      setVehicleMode("selector");
      scrollFlotaActivosIntoView();
      ghostReconcileRef.current?.();
      toast.success(`"${titulo}" lanzado (+${terminoInfo?.puntosCumple || 0} PS al completar)`, {
        style: { backgroundColor: PIZARRA, border: `1px solid ${terminoInfo?.color || AZURE}`, color: terminoInfo?.color || AZURE },
      });
      registrarEvento(COMPONENTES.PLANIFICACION);
      setTitulo("");
      setTerminoDetalle("");
      setSelectedTerminoType(null);
    } catch (err) {
      console.warn("[handleQuickSaveAndNew] UI post-lanzamiento:", err);
      toast.success(`"${titulo}" lanzado en este dispositivo`, {
        description: "La lista se actualizará en un momento.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${EMERALD}`, color: EMERALD },
      });
    } finally {
      releaseCentinela();
    }
    setSaving(false);
  };

  // ── RADIOGRAFÍA — generar reporte ──
  const handleGenerarRadiografia = async () => {
    if (!user || radiografiaTokens.tokens <= 0) return;
    setGenerandoRadiografia(true);
    try {
      let expedientesData: ExpedienteClinico[] = [];
      try { expedientesData = await getExpedientesRecientes(user.uid, 10); } catch {}
      const response = await fetch("/api/radiografia/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gordaRecord: gordaHistory.filter(g => !g.titulo?.includes(" → ")).slice(0, 50),
          expedientes: expedientesData.map(e => ({
            codigo: (e as any).codigo_diagnostico || "",
            interfaz: (e as any).interfaz_primaria || "",
            seccion: (e as any).seccion_afectada || "",
            vibracion: (e as any).vibracion_final || 0,
            fecha: (e as any).fecha?.toISOString?.() || ""
          })),
          totalPS: progression?.sovereigntyPoints || 0,
        })
      });
      if (!response.ok) throw new Error("Error del servidor");
      const data = await response.json();
      await consumeRadiografiaToken(user.uid);
      setRadiografiaReport(data.report);
      toast.success("Radiografía generada — perfil conductual listo");
    } catch {
      toast.error("Error generando Radiografía. Intenta de nuevo.");
    } finally {
      setGenerandoRadiografia(false);
    }
  };

  // ── RADIOGRAFÍA — métricas parciales (cliente) ──
  const radiografiaParcial = useMemo(() => {
    const base = gordaHistory.filter(g => !g.titulo?.includes(" → "));
    const incumplidos = base.filter(g => g.status === "incumplido" || g.status === "fallado");
    const cumplidos = base.filter(g => !g.status || g.status === "cumplido");
    const total = base.length;
    const ratioPct = total > 0 ? Math.round((incumplidos.length / total) * 100) : 0;
    const byType: Record<string, number> = {};
    incumplidos.forEach(g => { const t = g.tipoReloj || "otro"; byType[t] = (byType[t] || 0) + 1; });
    const tipoDom = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const tipoLabel: Record<string, string> = { produccion: "Producción", situacional: "Enfoque", conquista: "Conquista", descanso: "Descanso", verdad: "Verdad", desglosador: "Desglosador", desglosador_ciclo: "Ciclo" };
    return { cumplidos: cumplidos.length, incumplidos: incumplidos.length, total, ratioPct, tipoDom: tipoDom ? (tipoLabel[tipoDom] || tipoDom) : null, suficiente: total >= 5 };
  }, [gordaHistory]);

  /** Ancla el temporizador auditivo del cupo a la primera subtarea pendiente con minutosCupo > 0. */


  const audioCtxRef = useRef<AudioContext | null>(null);
  const tikTapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tikSoundEnabledRef = useRef(tikSoundEnabled);
  tikSoundEnabledRef.current = tikSoundEnabled;

  const clearTikTapInterval = useCallback(() => {
    if (tikTapIntervalRef.current) {
      clearInterval(tikTapIntervalRef.current);
      tikTapIntervalRef.current = null;
    }
  }, []);

  const playTikTap = useCallback(() => {
    if (!tikSoundEnabledRef.current || !isTikSoundEnabled()) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }, []);

  useEffect(() => {
    const onTikChange = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail?.on ?? isTikSoundEnabled();
      setTikSoundEnabledState(on);
      if (!on) clearTikTapInterval();
    };
    const onSituacionAlertsChange = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail?.on ?? isSituacionAlertsEnabled();
      setSituacionAlertsEnabledState(on);
      if (localStorage.getItem("sistemicar_puerta_voz") == null) {
        setPuertaVozEnabledState(on);
      }
      if (localStorage.getItem("sistemicar_desglosador_voz") == null) {
        setDesglosadorVozEnabledState(on);
      }
    };
    const onPuertaVozChange = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail?.on ?? isPuertaVozEnabled();
      setPuertaVozEnabledState(on);
    };
    const onDesglosadorVozChange = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail?.on ?? isDesglosadorVoiceEnabled();
      setDesglosadorVozEnabledState(on);
    };
    window.addEventListener("sistemicar-tik-sound-changed", onTikChange);
    window.addEventListener("sistemicar-situacion-alerts-changed", onSituacionAlertsChange);
    window.addEventListener("sistemicar-puerta-voz-changed", onPuertaVozChange);
    window.addEventListener("sistemicar-desglosador-voz-changed", onDesglosadorVozChange);
    return () => {
      window.removeEventListener("sistemicar-tik-sound-changed", onTikChange);
      window.removeEventListener("sistemicar-situacion-alerts-changed", onSituacionAlertsChange);
      window.removeEventListener("sistemicar-puerta-voz-changed", onPuertaVozChange);
      window.removeEventListener("sistemicar-desglosador-voz-changed", onDesglosadorVozChange);
    };
  }, [clearTikTapInterval]);


  const renderSoundChannelToggles = (compact?: boolean) => (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !situacionAlertsEnabled;
          setSituacionAlertsEnabledState(next);
          setSituacionAlertsEnabled(next);
          if (next) void requestNotificationPermission();
        }}
        className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
        style={{
          borderColor: situacionAlertsEnabled ? `${GOLD}40` : "rgba(255,255,255,0.08)",
          backgroundColor: situacionAlertsEnabled ? `${GOLD}10` : "rgba(0,0,0,0.2)",
        }}
        title={
          situacionAlertsEnabled
            ? "Silenciar alertas de enfoque"
            : "Activar alertas de enfoque (sonido, vibración, notificaciones)"
        }
        data-testid="button-situacion-alerts-toggle"
      >
        {situacionAlertsEnabled ? <Bell size={10} style={{ color: GOLD }} /> : <BellOff size={10} style={{ color: "#475569" }} />}
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: situacionAlertsEnabled ? GOLD : "#475569" }}
        >
          Alertas {situacionAlertsEnabled ? "ON" : "OFF"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          const next = !puertaVozEnabled;
          setPuertaVozEnabledState(next);
          setPuertaVozEnabled(next);
          if (next) {
            unlockSpeechSynthesis(true);
            void requestNotificationPermission().then(ok => {
              if (ok && planilla) scheduleSegmentNotifications(planilla.segmentos);
            });
          }
        }}
        className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
        style={{
          borderColor: puertaVozEnabled ? `${VIOLET}40` : "rgba(255,255,255,0.08)",
          backgroundColor: puertaVozEnabled ? `${VIOLET}10` : "rgba(0,0,0,0.2)",
        }}
        title={puertaVozEnabled ? "Silenciar voz de puertas (min 4)" : "Activar voz de puertas de atención"}
        data-testid="button-puerta-voz-toggle"
      >
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: puertaVozEnabled ? VIOLET : "#475569" }}
        >
          Puerta {puertaVozEnabled ? "ON" : "OFF"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          const next = !desglosadorVozEnabled;
          setDesglosadorVozEnabledState(next);
          setDesglosadorVoiceEnabled(next);
        }}
        className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
        style={{
          borderColor: desglosadorVozEnabled ? `${CYAN}40` : "rgba(255,255,255,0.08)",
          backgroundColor: desglosadorVozEnabled ? `${CYAN}10` : "rgba(0,0,0,0.2)",
        }}
        title={
          desglosadorVozEnabled
            ? "Silenciar voz de ruta de enfoque (desglosador)"
            : "Activar voz de ruta de enfoque (desglosador) — ON por defecto con alertas"
        }
        data-testid="button-desglosador-voz-toggle"
      >
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: desglosadorVozEnabled ? CYAN : "#475569" }}
        >
          DSG {desglosadorVozEnabled ? "ON" : "OFF"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          const next = !tikSoundEnabled;
          setTikSoundEnabledState(next);
          setTikSoundEnabled(next);
          if (!next) clearTikTapInterval();
        }}
        className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
        style={{
          borderColor: tikSoundEnabled ? `${GOLD}40` : "rgba(255,255,255,0.08)",
          backgroundColor: tikSoundEnabled ? `${GOLD}10` : "rgba(0,0,0,0.2)",
        }}
        title={tikSoundEnabled ? "Silenciar tick del reloj" : "Activar tick del reloj"}
        data-testid="button-tik-sound-toggle"
      >
        {tikSoundEnabled ? <Volume2 size={10} style={{ color: GOLD }} /> : <VolumeX size={10} style={{ color: "#475569" }} />}
        <span
          className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: tikSoundEnabled ? GOLD : "#475569" }}
        >
          Tick {tikSoundEnabled ? "ON" : "OFF"}
        </span>
      </button>
    </>
  );

  const renderSoundProbeButton = (compact?: boolean) => (
      <button
        type="button"
        onPointerDown={() => unlockSpeechSynthesis(true)}
        onClick={() => {
          enableAllVoiceChannels();
          setSituacionAlertsEnabledState(true);
          setPuertaVozEnabledState(true);
          setDesglosadorVozEnabledState(true);
          const result = speakVoiceProbe("puerta");
          if (result.ok && !result.reason) {
            toast.success("Voz activa", {
              style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
              duration: 3000,
            });
          } else if (result.ok && result.reason) {
            toast.warning(result.reason, {
              style: { backgroundColor: PIZARRA, border: "1px solid #f59e0b", color: "#fbbf24" },
              duration: 5000,
            });
          } else {
            toast.warning(result.reason ?? "No se pudo activar la voz", {
              style: { backgroundColor: PIZARRA, border: "1px solid #f59e0b", color: "#fbbf24" },
              duration: 5000,
            });
          }
        }}
        className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
        style={{
          borderColor: `${GOLD}50`,
          backgroundColor: `${GOLD}12`,
        }}
        title="Probar voz del sistema (requiere un toque en pantalla)"
        data-testid="button-voice-probe"
      >
        <Volume2 size={10} style={{ color: GOLD }} />
        <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: GOLD }}>
          Probar voz
        </span>
      </button>
  );

  const renderSpeechResetButton = (compact?: boolean) => (
    <button
      type="button"
      onPointerDown={() => hardResetSpeechSystems(true)}
      onClick={() => {
        hardResetSpeechSystems(true);
        toast.info("Voz restablecida", {
          description: "Cola TTS y Punto Cero reiniciados. Tocá Probar voz si hace falta.",
          style: { backgroundColor: PIZARRA, border: "1px solid rgba(239,68,68,0.45)", color: "#fca5a5" },
          duration: 4000,
        });
      }}
      className={`flex items-center gap-1 rounded-md border transition-all ${compact ? "px-2 py-1" : "px-2 py-1"}`}
      style={{
        borderColor: "rgba(239,68,68,0.45)",
        backgroundColor: "rgba(239,68,68,0.12)",
      }}
      title="Restablecer voz si se congeló (Ctrl+Shift+V)"
      data-testid="button-speech-reset"
    >
      <VolumeX size={10} style={{ color: "#fca5a5" }} />
      <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: "#fca5a5" }}>
        Reset voz
      </span>
    </button>
  );

  const soundChannelsSummary = `Alertas ${situacionAlertsEnabled ? "ON" : "OFF"} · Puerta ${puertaVozEnabled ? "ON" : "OFF"} · DSG ${desglosadorVozEnabled ? "ON" : "OFF"} · Tick ${tikSoundEnabled ? "ON" : "OFF"}`;

  const getSegIcon = (icono: string) => {
    switch (icono) {
      case "brain": return Brain;
      case "target": return Target;
      case "flame": return Flame;
      case "shield": return Shield;
      case "zap": return Zap;
      case "activity": return Activity;
      case "eye": return Eye;
      case "layers": return Layers;
      default: return Brain;
    }
  };

  const handleAterrizarReservaV3 = useCallback(
    (payload: CrisolAterrizarPayload) =>
      handleReservaTacticaQuickAdd(payload.texto, payload.ruta, payload.proyectoId),
    [handleReservaTacticaQuickAdd]
  );

  if (useJornadaV3 && user) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: "#020202" }}
        onPointerDown={handlers.unlockDesglosadorSpeechFromGesture}
        data-testid="planeacion-jornada-v3-root"
      >
        <JornadaStuckProbe />
        <JornadaShellV3
          userId={user.uid}
          segmentos={planilla?.segmentos ?? []}
          segmentoActivoId={segmentoActivo?.id ?? null}
          vehicles={vehicles}
          vehiclesRef={vehiclesRef}
          setVehicles={setVehicles}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          todayPs={dailyPS}
          yesterdayPs={yesterdayPS}
          situacionReserva={reservaActivas}
          imanProyectos={imanProyectos}
          defaultProyectoId={segmentoActivo?.proyectoVinculadoId ?? ""}
          onAterrizarReserva={handleAterrizarReservaV3}
          onReservaRutaChange={handleReservaRutaChange}
          onEnviarReservaASituacion={handleEnviarReservaASituacion}
          handleSituacionCronometroCumplido={handleSituacionCronometroCumplido}
          handleSituacionCronometroFallado={handleSituacionCronometroFallado}
          handleToggleSubTarea={handleToggleSubTarea}
          handleDesglosadorUpdate={handleDesglosadorUpdate}
          volcarMetricasAlHub={volcarMetricasAlHub}
          rehydrateFlotaFromLocalRef={rehydrateFlotaFromLocalRef}
          setupFlotaSubscription={setupFlotaSubscription}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 pb-40"
      style={{ backgroundColor: "#020202" }}
      onPointerDown={handlers.unlockDesglosadorSpeechFromGesture}
    >
      <JornadaStuckProbe />
      <div className="max-w-lg mx-auto px-4 pt-2">
        <NavTransitionLink href={JORNADA_V3_PATH}>
          <div
            className="rounded-xl border px-3 py-2 flex items-center justify-between gap-2 touch-manipulation"
            style={{
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              borderColor: "rgba(212, 175, 55, 0.28)",
            }}
            data-testid="banner-jornada-v3-lab"
          >
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
                Laboratorio Jornada V3
              </p>
              <p className="text-[7px] text-slate-500 truncate">
                Motor modular nuevo — Crisol, Ring, Anillo, Fe 120%
              </p>
            </div>
            <span className="text-[8px] font-bold shrink-0" style={{ color: GOLD }}>
              Probar →
            </span>
          </div>
        </NavTransitionLink>
      </div>
      <div className="max-w-lg mx-auto space-y-4">
        {planLayout === "full" && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3" style={{ backgroundColor: `${BLOOD}20` }}>
              <Rocket size={16} style={{ color: BLOOD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLOOD }}>{JORNADA_MODULE.title}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{JORNADA_MODULE.titleUpper}</h1>
              <ManualTriggerButton manualType="planificacion" />
            </div>
            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">{JORNADA_MODULE.tagline}</p>
          </motion.div>
        )}

        {user?.uid && planLayout === "full" && (
          <PlanificacionPrimerDia
            uid={user.uid}
            profile={planificacionProfile}
            dayStartMs={journalDayKey}
            segmentos={planilla?.segmentos ?? []}
            vehicles={vehicles}
            onOpenTutorial={() => setShowPlanTutorial(true)}
            onAskDoctor={openDoctorIAChat}
          />
        )}

        {showPlanTutorial && user?.uid && (
          <PlanificacionTutorial
            uid={user.uid}
            profile={planificacionProfile}
            onComplete={() => setShowPlanTutorial(false)}
            onAskDoctor={openDoctorIAChat}
          />
        )}

        <PlanificacionCockpit
            title={JORNADA_MODULE.title}
            tagline={JORNADA_MODULE.tagline}
            compact={compactLayout}
            minimized={cockpitMinimized}
            onToggleMinimize={() => setCockpitMinimized(v => !v)}
            onToggleCompact={() => {
              if (isCoarseConcienciaDevice()) return;
              setPlanLayout(v => (v === "compact" ? "full" : "compact"));
            }}
            tab={planTab}
            onTabChange={(tab) => {
              setPlanTab(tab);
              if (planLayout === "full") setPlanLayout("compact");
            }}
            psLine={(
              <div>
                <p className="text-[10px] font-black tabular-nums" style={{ color: CYAN }} data-testid="cockpit-ps-line">
                  {dailyPsBar.todayPs} PS · {dailyPsBar.pctOfReference}%
                </p>
                <p className="text-[7px] text-slate-600 leading-snug">Refuerzo · no es producción ni decisiones</p>
              </div>
            )}
            combustibleLine={(
              <p
                className="text-[9px] font-bold tabular-nums leading-snug"
                style={{ color: "#A855F7" }}
                title={formatCombustibleDetalle(combustibleLive)}
                data-testid="cockpit-combustible-line"
              >
                {formatCombustibleResumen(combustibleLive)}
              </p>
            )}
            anillo={(
              <div hidden={compactLayout && planTab === "metricas" ? true : undefined} aria-hidden={compactLayout && planTab === "metricas" ? true : undefined}>
                {shouldRunMobileSurvival() ? (
                  <AnilloSurvivalPlaceholder size={72} />
                ) : (
                  <AnilloConcienciaLive
                    segmentos={planilla?.segmentos || []}
                    vehicles={vehicles}
                    conquistaPulse={conquistaPulse}
                    ringOnly
                    size={72}
                  />
                )}
              </div>
            )}
            segmentoChip={(
              segmentoActivo ? (
                <div className="rounded-xl border px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }} data-testid="cockpit-segmento-activo">
                  <p className="text-[9px] font-black text-white truncate">{segmentoActivo.nombre}</p>
                  <p className="text-[8px] text-slate-500">{segmentoActivo.horaInicio}–{segmentoActivo.horaFin}</p>
                </div>
              ) : (
                <div className="rounded-xl border px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }} data-testid="cockpit-sin-segmento">
                  <p className="text-[9px] font-black text-slate-300">Sin segmento activo</p>
                  <p className="text-[8px] text-slate-600">Opera desde “Segmentos del día”.</p>
                </div>
              )
            )}
          />

        {shouldRunMobileSurvival() && (
          <div
            className="rounded-xl border px-3 py-2 mb-3 flex flex-col gap-2"
            style={{ borderColor: "rgba(212,175,55,0.2)", backgroundColor: "rgba(255,255,255,0.02)" }}
            data-testid="jornada-survival-banner"
          >
            <p className="text-[9px] text-slate-400 leading-snug">
              Modo ligero en móvil: voz y anillo en vivo desactivados para mayor estabilidad.
            </p>
            <button
              type="button"
              className="text-[9px] font-black uppercase tracking-wider py-2 rounded-lg touch-manipulation"
              style={{ backgroundColor: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
              onClick={() => {
                setJornadaFullModeEnabled(true);
                reloadJornadaHard();
              }}
            >
              Activar modo completo
            </button>
          </div>
        )}

        {/* MONITOR DE ESTADOS */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="meta">
        {monitorState && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl border-2" style={{ backgroundColor: `${MONITOR_STATES[monitorState].color}10`, borderColor: MONITOR_STATES[monitorState].color }}>
            <div className="flex items-center gap-3">
              {(() => { const Icon = MONITOR_STATES[monitorState].icon; return <Icon size={20} style={{ color: MONITOR_STATES[monitorState].color }} />; })()}
              <div>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: MONITOR_STATES[monitorState].color }}>{MONITOR_STATES[monitorState].label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{MONITOR_STATES[monitorState].desc}</p>
              </div>
            </div>
          </motion.div>
        )}
        </PlanTabPanel>

        {/* BARRA PS — total + día */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="meta">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl border relative overflow-hidden" style={{ backgroundColor: PIZARRA, borderColor: goldenFlash ? GOLD : `${GOLD}20`, boxShadow: goldenFlash ? `0 0 30px ${GOLD}50, 0 0 60px ${GOLD}20` : "none", transition: "all 0.5s ease" }}>
          <AnimatePresence>
            {goldenFlash && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 0.6, 0.3, 0.6, 0], scale: [0.8, 1.1, 1, 1.1, 0.8] }} transition={{ duration: 2.5, times: [0, 0.2, 0.5, 0.7, 1] }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${GOLD}30 0%, transparent 70%)`, zIndex: 1 }} />
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between mb-1 relative" style={{ zIndex: 2 }}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Puntos de Soberanía</span>
            <motion.span animate={goldenFlash ? { scale: [1, 1.3, 1.1, 1.25, 1], textShadow: [`0 0 0px ${GOLD}`, `0 0 20px ${GOLD}`, `0 0 10px ${GOLD}`, `0 0 25px ${GOLD}`, `0 0 0px ${GOLD}`] } : {}} transition={{ duration: 2 }} className="text-lg font-black" style={{ color: GOLD }}>{progression?.sovereigntyPoints || 0} PS</motion.span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden relative mb-2" style={{ backgroundColor: "rgba(255,255,255,0.08)", zIndex: 2 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(((progression?.sovereigntyPoints || 0) % 350) / 350 * 100, 100)}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${BLOOD} 0%, ${GOLD} 100%)` }} />
          </div>
          <div className="flex items-center justify-between mb-0.5 relative gap-2" style={{ zIndex: 2 }}>
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: CYAN }}>PS del día</span>
            <span className="text-sm font-black tabular-nums" style={{ color: CYAN }}>
              {dailyPsBar.todayPs} PS
              <span className="text-[10px] font-bold ml-1.5 opacity-80">{dailyPsBar.pctOfReference}%</span>
            </span>
          </div>
          <p className="text-[7px] text-slate-500 mb-1 relative leading-snug" style={{ zIndex: 2 }}>
            {dailyPsBar.referenceLabel}
          </p>
          <p
            className="text-[8px] font-bold mb-1.5 relative leading-snug"
            style={{ zIndex: 2, color: dailyPsBar.atOrAbove100 ? GOLD : CYAN }}
            data-testid="daily-ps-status"
          >
            {dailyPsBar.statusText}
          </p>
          <div
            className="relative h-3 rounded-full overflow-visible mb-1"
            style={{ backgroundColor: "rgba(0,255,195,0.08)", zIndex: 2 }}
            data-testid="daily-ps-bar"
          >
            <div
              className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
              style={{
                left: `${dailyPsBar.marker100WidthPct}%`,
                backgroundColor: dailyPsBar.atOrAbove100 ? `${GOLD}90` : "rgba(255,255,255,0.45)",
                boxShadow: dailyPsBar.atOrAbove100 ? `0 0 6px ${GOLD}80` : "none",
              }}
              title="100% = ayer"
            />
            <motion.div
              key={`${journalDayKey}-${dailyPsBar.todayPs}`}
              initial={{ width: 0 }}
              animate={{ width: `${dailyPsBar.fillWidthPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute top-0 bottom-0 left-0 rounded-full z-10"
              style={{
                background: dailyPsBar.atOrAbove100
                  ? `linear-gradient(90deg, ${CYAN}99 0%, ${CYAN} 70%, ${GOLD} 100%)`
                  : `linear-gradient(90deg, ${CYAN}55, ${CYAN})`,
                boxShadow: dailyPsBar.atOrAbove120 ? `0 0 12px ${GOLD}60` : `0 0 8px ${CYAN}30`,
              }}
            />
          </div>
          <div className="relative h-3 mb-0.5" style={{ zIndex: 2 }}>
            <span className="absolute left-0 top-0 text-[7px] text-slate-600">0</span>
            <span
              className="absolute top-0 text-[7px] font-bold -translate-x-1/2"
              style={{ left: `${dailyPsBar.marker100WidthPct}%`, color: dailyPsBar.atOrAbove100 ? GOLD : "rgba(255,255,255,0.45)" }}
            >
              100%
            </span>
            <span className="absolute right-0 top-0 text-[7px] text-slate-600">120%</span>
          </div>
        </motion.div>
        </PlanTabPanel>

        {/* Escalera de Conciencia — presencia · entrada · producción */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="metricas">
          <PlaneacionMetricsEscalera
            visible
            model={escaleraConciencia}
            disciplinaSerie={disciplinaSerie}
            compact={compactLayout}
            detalleOpen={metricasDetalleOpen}
          />
        </PlanTabPanel>

        {/* Termodinámica — frente a ayer (tu referencia) */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="metricas">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border overflow-hidden"
          style={{ backgroundColor: PIZARRA, borderColor: "rgba(56,189,248,0.28)" }}
          data-testid="termo-compare-card"
        >
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#38BDF8" }}>
                Termodinámica Atencional
              </p>
              <p className="text-[7px] text-slate-500 mt-0.5 leading-snug">
                Frente a ayer · resistencia = contador (objetivo) · declaración de ruta = espejo · PS = refuerzo aparte
              </p>
            </div>
            {compactLayout && (
              <button
                type="button"
                onClick={() => setMetricasDetalleOpen(v => !v)}
                className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border"
                style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)", backgroundColor: "rgba(0,0,0,0.20)" }}
                data-testid="metricas-detalle-toggle"
                title={metricasDetalleOpen ? "Ocultar detalles" : "Ver detalles"}
              >
                {metricasDetalleOpen ? "Menos" : "Más"}
              </button>
            )}
            <div
              className="shrink-0 px-2.5 py-1.5 rounded-lg border text-center"
              style={{
                backgroundColor: `${FASE_ATENCIONAL_COLOR[termoCompare.estadoHoy]}12`,
                borderColor: `${FASE_ATENCIONAL_COLOR[termoCompare.estadoHoy]}40`,
              }}
            >
              <p className="text-[7px] text-slate-500 uppercase tracking-wider">Resistencia</p>
              <p className="text-sm font-black leading-tight" style={{ color: FASE_ATENCIONAL_COLOR[termoCompare.estadoHoy] }}>
                {FASE_ATENCIONAL_LABEL[termoCompare.estadoHoy]}
              </p>
              <p className="text-[7px] text-slate-500 mt-0.5 tabular-nums">índice {termoCompare.indiceHoy}</p>
              {termoCompare.estadoAyer && (
                <p className="text-[7px] text-slate-600 mt-0.5">
                  ayer {FASE_ATENCIONAL_LABEL[termoCompare.estadoAyer]} · {termoCompare.indiceAyer ?? "—"}
                </p>
              )}
            </div>
          </div>

          <div
            className="p-2.5 rounded-lg mb-2.5 border"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p className="text-[10px] font-bold text-white leading-snug">{termoCompare.headline}</p>
            {(planLayout === "full" || metricasDetalleOpen) && (
              <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">{termoCompare.motivacion}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {termoCompare.rows.slice(0, 4).map(row => {
                const rowColor =
                  row.key === "estructura_completa"
                    ? FASE_ATENCIONAL_COLOR.dominio_fluido
                    : row.key === "persistencia"
                      ? RUTA_BANDA_META.concentrado.color
                      : row.key === "ganancia"
                        ? EMERALD
                        : row.key === "friccion"
                          ? RUTA_BANDA_META.limite.color
                          : row.key === "bloques"
                            ? "#38BDF8"
                            : row.key === "solo_fluido"
                              ? "#94a3b8"
                              : GOLD;
                const rowIcon =
                  row.key === "estructura_completa"
                    ? "3"
                    : row.key === "persistencia"
                      ? "T"
                      : row.key === "ganancia"
                        ? "+"
                        : row.key === "friccion"
                          ? "!"
                          : row.key === "bloques"
                            ? "#"
                            : row.key === "solo_fluido"
                              ? "~"
                              : "*";
                const improved = row.betterWhenHigher ? row.delta > 0 : row.delta < 0;
                const worsened = row.betterWhenHigher ? row.delta < 0 : row.delta > 0;
                const deltaColor = improved
                  ? EMERALD
                  : worsened
                    ? "#94a3b8"
                    : "rgba(255,255,255,0.5)";
                const deltaText =
                  row.delta === 0
                    ? "="
                    : row.delta > 0
                      ? `+${row.delta}`
                      : `${row.delta}`;
                const maxVal = Math.max(row.today, row.yesterday, 1);
                const todayPct = Math.round((row.today / maxVal) * 100);
                return (
                  <div
                    key={row.key}
                    className="px-2 py-2 rounded-lg border relative overflow-hidden"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderColor: `${rowColor}25`,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5"
                      style={{ backgroundColor: rowColor }}
                    />
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px]" style={{ color: rowColor }}>{rowIcon}</span>
                      <p className="text-[7px] text-slate-400 truncate leading-tight">{row.label}</p>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mb-1.5">
                      <span className="text-sm font-black text-white tabular-nums">{row.today}</span>
                      <span className="text-[9px] font-bold tabular-nums" style={{ color: deltaColor }}>
                        {termoCompare.hasYesterday ? deltaText : "—"}
                      </span>
                    </div>
                    {termoCompare.hasYesterday && (
                      <div className="space-y-0.5">
                        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${todayPct}%`, backgroundColor: rowColor }} />
                        </div>
                        <p className="text-[6px] text-slate-600">ayer {row.yesterday}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </motion.div>
        </PlanTabPanel>

        {/* Atención Panorámica — puertas conscientes */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="metricas">
        {planilla && planilla.segmentos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl border overflow-hidden"
            style={{ backgroundColor: PIZARRA, borderColor: "rgba(139,92,246,0.35)" }}
            data-testid="atencion-card"
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: VIOLET }}>
                  Atención Panorámica
                </p>
                <p className="text-[7px] text-slate-500 mt-0.5">
                  Puertas conscientes ±5 min · voz al minuto 4 · AV = antes de voz · DV = después
                </p>
              </div>
              <div
                className="shrink-0 px-2.5 py-1.5 rounded-lg border text-center"
                style={{ backgroundColor: `${VIOLET}12`, borderColor: `${VIOLET}40` }}
              >
                <p className="text-[7px] text-slate-500 uppercase tracking-wider">Hoy</p>
                <p className="text-sm font-black leading-tight" style={{ color: VIOLET }}>
                  {atencionLive.indiceAtencion}
                </p>
              </div>
            </div>

            <div
              className="p-2.5 rounded-lg mb-2.5 border"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-[10px] font-bold text-white leading-snug">{atencionCompare.headline}</p>
              {(planLayout === "full" || metricasDetalleOpen) && (
                <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">{atencionCompare.motivacion}</p>
              )}
              <div className="flex gap-3 mt-2 text-[8px] flex-wrap">
                <span className="text-slate-500">
                  Puertas: <span className="font-bold text-slate-300">{atencionLive.puertasAbiertas}</span>
                </span>
                <span className="text-slate-500">
                  Perdidas: <span className="font-bold text-slate-300">{atencionLive.puertasPerdidas}</span>
                </span>
                <span className="text-slate-500">
                  Cierres: <span className="font-bold text-slate-300">{atencionLive.cierresConscientes}</span>
                </span>
                {atencionLive.ratioAntesVoz != null && (
                  <span className="text-slate-500">
                    AV: <span className="font-bold" style={{ color: VIOLET }}>{atencionLive.ratioAntesVoz}%</span>
                  </span>
                )}
              </div>
            </div>

            <div className={`space-y-1 overflow-y-auto ${compactLayout ? "max-h-24" : "max-h-36"}`}>
              {atencionLive.segmentos.map(sa => {
                const badge = atencionBadgeLabel(sa);
                const badgeColor =
                  sa.puertaPerdida
                    ? BLOOD
                    : sa.puertaTiming === "antes_voz"
                      ? VIOLET
                      : sa.puertaTiming === "despues_voz"
                        ? GOLD
                        : sa.ventanaPuertaAbierta
                          ? CYAN
                          : "#64748b";
                return (
                  <div
                    key={sa.segmentoId}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-lg border"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderColor: `${badgeColor}25`,
                    }}
                    data-testid={`atencion-row-${sa.segmentoId}`}
                  >
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ backgroundColor: `${badgeColor}18`, color: badgeColor }}
                    >
                      {badge ?? "…"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-slate-200 truncate">
                        {sa.nombre} · {sa.horaInicio}
                      </p>
                      <p className="text-[7px] text-slate-500 leading-snug">
                        {describeSegmentoAtencion(sa)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        </PlanTabPanel>

        {/* Disciplina — vehículos conscientes en segmento */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="metricas">
        {planilla && planilla.segmentos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl border overflow-hidden"
            style={{ backgroundColor: PIZARRA, borderColor: "rgba(212,175,55,0.28)" }}
            data-testid="disciplina-card"
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
                  Disciplina
                </p>
                <p className="text-[7px] text-slate-500 mt-0.5">
                  Capa 2 · detalle por segmento · entrada al trabajo con vehículos conscientes
                </p>
              </div>
              <div
                className="shrink-0 px-2.5 py-1.5 rounded-lg border text-center min-w-[4.5rem]"
                style={{
                  backgroundColor: `${GOLD}12`,
                  borderColor: `${GOLD}40`,
                }}
              >
                <p className="text-[7px] text-slate-500 uppercase tracking-wider">
                  {disciplinaLive.faseJornada === "pre_jornada" ? "Abierta" : "Hoy"}
                </p>
                <p
                  className={`font-black leading-tight tabular-nums ${
                    disciplinaLive.faseJornada === "pre_jornada" ? "text-[10px]" : "text-sm"
                  }`}
                  style={{ color: GOLD }}
                >
                  {formatDisciplinaValorPrincipal(disciplinaLive)}
                </p>
                {disciplinaLive.faseJornada !== "pre_jornada" && disciplinaLive.indiceDisciplina > 0 && (
                  <p className="text-[7px] text-slate-500 tabular-nums">idx {disciplinaLive.indiceDisciplina}</p>
                )}
              </div>
            </div>

            {disciplinaSerie.length >= 2 && (
              <div className={`${compactLayout ? "h-20" : "h-28"} mb-2.5`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={disciplinaSerie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 8, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      width={24}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: PIZARRA,
                        border: `1px solid ${GOLD}30`,
                        borderRadius: 8,
                        fontSize: 10,
                      }}
                      labelStyle={{ color: GOLD, fontWeight: 800, fontSize: 9 }}
                      formatter={(value: number) => [`${value}`, "Índice"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha || ""}
                    />
                    <Line
                      type="monotone"
                      dataKey="indiceDisciplina"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={{ fill: GOLD, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div
              className="p-2.5 rounded-lg mb-2.5 border"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-[10px] font-bold text-white leading-snug">{disciplinaCompare.headline}</p>
              {(planLayout === "full" || metricasDetalleOpen) && (
                <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">{disciplinaCompare.motivacion}</p>
              )}
              <div className="flex gap-3 mt-2 text-[8px] flex-wrap">
                {disciplinaLive.faseJornada !== "pre_jornada" && disciplinaLive.cobertura.base > 0 && (
                  <span className="text-slate-500">
                    Cobertura:{" "}
                    <span className="font-bold text-slate-300">
                      {disciplinaLive.cobertura.conEntrada}/{disciplinaLive.cobertura.base}
                      {disciplinaLive.cobertura.pct != null ? ` (${disciplinaLive.cobertura.pct}%)` : ""}
                    </span>
                  </span>
                )}
                {disciplinaLive.faseJornada === "pre_jornada" && (
                  <span className="text-slate-500">{formatDisciplinaSubheadline(disciplinaLive)}</span>
                )}
                <span className="text-slate-500">
                  Sin entrada: <span className="font-bold text-slate-300">{disciplinaLive.sinEntrada}</span>
                </span>
                {disciplinaLive.deltaMedioDesdeInicioMin != null && (
                  <span className="text-slate-500">
                    Δ inicio: <span className="font-bold text-slate-300">+{disciplinaLive.deltaMedioDesdeInicioMin} min</span>
                  </span>
                )}
                {disciplinaLive.montajes > 0 && (
                  <span className="text-slate-500">
                    Montajes: <span className="font-bold text-slate-300">{disciplinaLive.montajes}</span>
                  </span>
                )}
              </div>
            </div>

            {disciplinaLive.estudioTipos.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {disciplinaLive.estudioTipos.map(e => (
                  <span
                    key={`${e.tipoFlota}-${e.tipoReloj}`}
                    className="text-[7px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${AZURE}18`, color: AZURE }}
                  >
                    {formatEstudioTipoChip(e)}
                  </span>
                ))}
              </div>
            )}

            <div className={`space-y-1 overflow-y-auto ${compactLayout ? "max-h-24" : "max-h-36"}`}>
              {disciplinaLive.segmentos.map(sd => {
                const badge = disciplinaBadgeLabel(sd);
                const badgeColor =
                  sd.montaje && sd.enCurso
                    ? BLOOD
                    : sd.sinEntrada
                      ? "#94a3b8"
                      : sd.scoreSegmento >= 70
                        ? EMERALD
                        : sd.scoreSegmento >= 40
                          ? GOLD
                          : "#f97316";
                return (
                  <div
                    key={sd.segmentoId}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-lg border"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderColor: `${badgeColor}25`,
                    }}
                    data-testid={`disciplina-row-${sd.segmentoId}`}
                  >
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${badgeColor}18`,
                        color: badgeColor,
                      }}
                    >
                      {badge ?? "…"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-slate-200 truncate">
                        {sd.nombre} · {sd.horaInicio}
                      </p>
                      <p className="text-[7px] text-slate-500 leading-snug">
                        {describeSegmentoDisciplina(sd)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        </PlanTabPanel>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 rounded-xl border"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.08)" }}
          data-testid="sound-controls-bar"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundPanelOpen(v => !v)}
              className="flex-1 min-w-0 text-left rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
              data-testid="sound-panel-toggle"
              title={soundPanelOpen ? "Ocultar controles de sonido" : "Mostrar controles de sonido"}
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sonido · {JORNADA_MODULE.title}</p>
              <p className="text-[7px] text-slate-600 leading-snug mt-0.5 truncate">
                {soundPanelOpen ? "Alertas · Puerta · Desglosador · Tick" : soundChannelsSummary}
              </p>
            </button>
            {renderSoundProbeButton(true)}
            {renderSpeechResetButton(true)}
            <button
              type="button"
              onClick={() => setSoundPanelOpen(v => !v)}
              className="shrink-0 p-1.5 rounded-lg border"
              style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}
              aria-label={soundPanelOpen ? "Contraer panel de sonido" : "Expandir panel de sonido"}
            >
              {soundPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          {soundPanelOpen && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end mt-2 pt-2 border-t border-white/[0.06]">
              {renderSoundChannelToggles(true)}
            </div>
          )}
        </motion.div>

        {/* RADIOGRAFÍA DEL OPERADOR — mini barra de progreso de tokens */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="meta">
        {(() => {
          const ps = progression?.sovereigntyPoints || 0;
          const STEP = 350;
          const nextMilestone = (Math.floor(ps / STEP) + 1) * STEP;
          const prevMilestone = nextMilestone - STEP;
          const pct = Math.min(((ps - prevMilestone) / STEP) * 100, 100);
          const hasTokens = radiografiaTokens.tokens > 0;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border cursor-pointer overflow-hidden"
              style={{ backgroundColor: "rgba(0,255,195,0.04)", borderColor: hasTokens ? "#00FFC340" : "rgba(0,255,195,0.12)" }}
              onClick={() => setShowRadiografia(v => !v)}
              data-testid="radiografia-toggle"
            >
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Scan size={12} style={{ color: "#00FFC3" }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#00FFC3" }}>Radiografía del Operador</span>
                </div>
                {hasTokens ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#00FFC320", color: "#00FFC3" }}>
                    {radiografiaTokens.tokens} disponible{radiografiaTokens.tokens !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500">{nextMilestone - ps} PS restantes</span>
                )}
              </div>
              {!hasTokens && (
                <div className="h-1 w-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full"
                    style={{ background: "linear-gradient(90deg, #00FFC340, #00FFC3)" }}
                  />
                </div>
              )}
            </motion.div>
          );
        })()}
        </PlanTabPanel>

        {/* BÓVEDA DE LOGROS — HITO PLANIFICACIÓN */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="meta">
          <PlanModuleMilestoneBar pts={progression?.ptsPlanificacion || 0} />
        </PlanTabPanel>

        {/* ANILLO DE CONCIENCIA */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="metricas">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center p-3 rounded-xl border"
            style={{ backgroundColor: "rgba(10,10,10,0.8)", borderColor: "rgba(212,175,55,0.15)" }}
            data-testid="anillo-card"
          >
            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-center mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              ANILLO DE CONCIENCIA
            </p>
            <p className="text-[7px] text-slate-600 text-center mb-2 leading-snug px-2">
              Tiempo presente · el combustible son tus decisiones cerradas (abajo)
            </p>
            {shouldRunMobileSurvival() ? (
              <AnilloSurvivalPlaceholder size={130} showCaption />
            ) : (
              <AnilloConcienciaLive
                segmentos={planilla?.segmentos || []}
                vehicles={vehicles}
                conquistaPulse={conquistaPulse}
                size={130}
                showDayStats
              />
            )}
            <div
              className="mt-2 w-full p-2 rounded-lg border text-center"
              style={{ backgroundColor: "rgba(168,85,247,0.08)", borderColor: "rgba(168,85,247,0.28)" }}
              data-testid="combustible-card"
              title={formatCombustibleDetalle(combustibleLive)}
            >
              <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "#A855F7" }}>
                Combustible de conciencia
              </p>
              <p className="text-sm font-black mt-0.5 tabular-nums" style={{ color: "#E9D5FF" }}>
                {formatCombustibleResumen(combustibleLive)}
              </p>
              <p className="text-[7px] text-slate-500 mt-0.5 leading-snug">
                {formatCombustibleDetalle(combustibleLive)}
              </p>
            </div>
          </motion.div>
        </PlanTabPanel>

        <AnimatePresence>
          {recordBanner && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="p-4 rounded-xl border-2 relative overflow-hidden" style={{ backgroundColor: "#1a1a0a", borderColor: GOLD, boxShadow: `0 0 25px ${GOLD}30, inset 0 0 30px ${GOLD}08` }}>
              <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top, ${GOLD}15 0%, transparent 60%)` }} />
              <div className="relative" style={{ zIndex: 2 }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}20`, boxShadow: `0 0 12px ${GOLD}30` }}>
                    <Brain size={16} style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Doctor IA</p>
                    <p className="text-[8px] text-slate-500">Récord de Soberanía Detectado</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>
                  Has optimizado tu procesamiento en un <span className="font-black" style={{ color: GOLD, textShadow: `0 0 8px ${GOLD}40` }}>{recordBanner.mejora}%</span>. Tu capacidad de solución está escalando. <span className="font-bold" style={{ color: GOLD }}>+3 PS de bono por Eficiencia Pura.</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${GOLD}20`, color: GOLD }}>{recordBanner.titulo}</span>
                  <span className="text-[8px] text-slate-600">Registro superado</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RADIOGRAFÍA DEL OPERADOR — panel expandible */}
        <AnimatePresence>
          {showRadiografia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: "#050D0A", borderColor: "#00FFC330" }}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSearch size={14} style={{ color: "#00FFC3" }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#00FFC3" }}>Radiografía del Operador</span>
                  </div>
                  {radiografiaReport && (
                    <button
                      onClick={() => { setRadiografiaReport(null); }}
                      className="text-[8px] text-slate-600 hover:text-slate-400"
                    >
                      Nueva
                    </button>
                  )}
                </div>

                {/* MÉTRICA 1 — siempre visible (datos reales del historial) */}
                <div className="p-3 rounded-lg border" style={{ backgroundColor: "rgba(0,255,195,0.05)", borderColor: "#00FFC320" }}>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#00FFC370" }}>
                    01 — Patrón de Boicot
                  </p>
                  {radiografiaParcial.total < 5 ? (
                    <p className="text-[10px] text-slate-500">Necesitas al menos 5 vehículos cerrados para detectar el patrón. ({radiografiaParcial.total}/5)</p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        <span className="font-black" style={{ color: radiografiaParcial.ratioPct >= 40 ? "#FF3131" : radiografiaParcial.ratioPct >= 20 ? "#F97316" : "#00FFC3" }}>{radiografiaParcial.ratioPct}%</span>{" "}
                        de tus {radiografiaParcial.total} vehículos cerrados son incumplidos
                        {radiografiaParcial.tipoDom && <span style={{ color: "#F97316" }}> — tipo dominante: <strong>{radiografiaParcial.tipoDom}</strong></span>}.
                      </p>
                      <p className="text-[8px] text-slate-500 mt-1">
                        {radiografiaParcial.cumplidos} cumplidos · {radiografiaParcial.incumplidos} incumplidos
                      </p>
                    </>
                  )}
                </div>

                {/* MÉTRICAS 2-6 — disponibles en reporte completo */}
                {!radiografiaReport && (
                  <div className="space-y-2">
                    {[
                      { n: "02", label: "Interfaz Clínica Dominante", preview: "Tu programa central activa M0█ — presente en el █3% de tus sesiones del Espejo" },
                      { n: "03", label: "Brecha Percepción/Realidad", preview: "Estimas █.█ min/unidad pero tu historial registra █.█ — brecha de ██%" },
                      { n: "04", label: "Curva de Soberanía", preview: "Tendencia: ██████████ — tu voltaje PS muestra █ patrón de █████████" },
                      { n: "05", label: "Ratio Desglosador", preview: "Completas el ██% de subs en ciclos — el ██% de los fallos ocurren en las ██ primeras" },
                      { n: "06", label: "Bucle Programático", preview: "Código ██-████ se repite █ veces — bucle activo en Sección ██████" },
                    ].map(m => (
                      <div key={m.n} className="p-3 rounded-lg border relative overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.05)" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-40" style={{ color: "#00FFC3" }}>
                          {m.n} — {m.label}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed" style={{ filter: "blur(3.5px)", userSelect: "none" }}>
                          {m.preview}
                        </p>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Lock size={10} className="text-slate-700 opacity-60" />
                        </div>
                      </div>
                    ))}

                    {/* CTA generar */}
                    <div className="pt-1">
                      {radiografiaTokens.tokens > 0 ? (
                        <button
                          onClick={handleGenerarRadiografia}
                          disabled={generandoRadiografia}
                          data-testid="radiografia-generar-btn"
                          className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                          style={{ backgroundColor: "#00FFC315", border: "1px solid #00FFC340", color: "#00FFC3", opacity: generandoRadiografia ? 0.6 : 1 }}
                        >
                          {generandoRadiografia ? (
                            <><RefreshCw size={12} className="animate-spin" />Procesando datos...</>
                          ) : (
                            <><Scan size={12} />Generar Radiografía — 1 token</>
                          )}
                        </button>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-[9px] text-slate-600">Alcanza 350 PS para desbloquear tu primer token</p>
                          <p className="text-[8px] text-slate-700 mt-0.5">Plan Soberano Operativo recibe 2 tokens/mes</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* REPORTE COMPLETO */}
                {radiografiaReport && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    {([
                      { key: "interfazDominante", n: "02", label: "Interfaz Clínica Dominante", getContent: (r: any) => r?.interfazDominante ? `${r.interfazDominante.interfaz} — ${r.interfazDominante.label}` : "" },
                      { key: "brechaPercepcion", n: "03", label: "Brecha Percepción/Realidad", getContent: (r: any) => r?.brechaPercepcion?.descripcion || "" },
                      { key: "curvaSoberania", n: "04", label: "Curva de Soberanía", getContent: (r: any) => r?.curvaSoberania ? `${r.curvaSoberania.label} — ${r.curvaSoberania.tendencia}` : "" },
                      { key: "ratioDesglosador", n: "05", label: "Ratio Desglosador", getContent: (r: any) => r?.ratioDesglosador?.descripcion || "" },
                      { key: "bucleProgramatico", n: "06", label: "Bucle Programático", getContent: (r: any) => r?.bucleProgramatico?.descripcion || "" },
                    ] as const).map(m => (
                      <div key={m.key} className="p-3 rounded-lg border" style={{ backgroundColor: "rgba(0,255,195,0.04)", borderColor: "#00FFC318" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#00FFC370" }}>
                          {m.n} — {m.label}
                        </p>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{m.getContent(radiografiaReport)}</p>
                      </div>
                    ))}

                    {/* Recomendación clínica */}
                    {radiografiaReport.recomendacionClinical && (
                      <div className="p-3 rounded-lg border-2 mt-2" style={{ backgroundColor: "rgba(212,175,55,0.05)", borderColor: `${GOLD}40` }}>
                        <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>Protocolo Clínico — Próximos 7 días</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Georgia, serif" }}>
                          {radiografiaReport.recomendacionClinical}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BÓVEDA DE RÉCORDS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => setShowBoveda(true)} className="w-full p-3 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01]" style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}25`, boxShadow: `0 0 15px ${GOLD}08` }} data-testid="btn-boveda-records">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}15`, boxShadow: `0 0 10px ${GOLD}20` }}>
                <Trophy size={14} style={{ color: GOLD }} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Bóveda de Récords</p>
                <p className="text-[8px] text-slate-600">Tiempos de Oro · Energía Real Verificada</p>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: GOLD }} />
          </button>
        </motion.div>

        <AnimatePresence>
          {showBoveda && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.9)" }}>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full max-w-lg mx-4 my-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}20`, boxShadow: `0 0 20px ${GOLD}30` }}>
                      <Trophy size={20} style={{ color: GOLD }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">BÓVEDA DE RÉCORDS</h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Tiempos de Oro · Certificados</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowBoveda(false); setSelectedBovedaRecord(null); }} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors" data-testid="btn-close-boveda">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                {selectedBovedaRecord ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <button onClick={() => setSelectedBovedaRecord(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft size={14} /> Volver a la Bóveda
                    </button>

                    <div className="p-4 rounded-xl border-2 relative overflow-hidden" style={{ backgroundColor: PIZARRA, borderColor: VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].color, boxShadow: `0 0 25px ${VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].glow}` }}>
                      <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top, ${VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].color}10 0%, transparent 60%)` }} />
                      <div className="relative" style={{ zIndex: 2 }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-black text-white">{selectedBovedaRecord.titulo}</h3>
                            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].color }}>{VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black" style={{ color: VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].color, textShadow: `0 0 15px ${VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].glow}` }}>{selectedBovedaRecord.bestMinPerUnit.toFixed(1)}</p>
                            <p className="text-[8px] text-slate-500 uppercase">min/unidad</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            <p className="text-sm font-black" style={{ color: GOLD }}>{selectedBovedaRecord.count}</p>
                            <p className="text-[7px] text-slate-500 uppercase">Ejecuciones</p>
                          </div>
                          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            <p className="text-sm font-black" style={{ color: EMERALD }}>{selectedBovedaRecord.bestTotalMin}m</p>
                            <p className="text-[7px] text-slate-500 uppercase">Mejor Tiempo</p>
                          </div>
                          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            <p className="text-sm font-black" style={{ color: AZURE }}>{new Date(selectedBovedaRecord.bestDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</p>
                            <p className="text-[7px] text-slate-500 uppercase">Fecha Récord</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border" style={{ backgroundColor: "rgba(0,0,0,0.3)", borderColor: `${VOLTAJE_CONFIG[selectedBovedaRecord.voltaje].color}20` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Award size={10} style={{ color: GOLD }} />
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Certificado por SISTEMICAR</p>
                          </div>
                          <p className="text-[7px] text-slate-500 uppercase tracking-wider">Energía Real Verificada · {new Date(selectedBovedaRecord.bestDate).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                      </div>
                    </div>

                    {selectedBovedaRecord.history.length >= 2 && (
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}20` }}>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp size={12} style={{ color: GOLD }} />
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Gráfica de Ascenso</span>
                        </div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedBovedaRecord.history.map((h, i) => ({ name: `#${i + 1}`, valor: Number(h.minPerUnit.toFixed(2)), fecha: new Date(h.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                              <Tooltip contentStyle={{ backgroundColor: PIZARRA, border: `1px solid ${GOLD}30`, borderRadius: 8, fontSize: 11 }} labelStyle={{ color: GOLD, fontWeight: 800, fontSize: 10 }} formatter={(value: number) => [`${value} min/u`, "Eficiencia"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha || ""} />
                              <Line type="monotone" dataKey="valor" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD, stroke: "#fff", strokeWidth: 2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[8px] text-slate-600 text-center mt-2">Evolución de min/unidad · Línea descendente = mayor eficiencia</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const records = getBovedaRecords();
                      if (records.length === 0) return (
                        <div className="p-8 rounded-xl border text-center" style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}15` }}>
                          <Trophy size={32} className="mx-auto mb-3 opacity-20" style={{ color: GOLD }} />
                          <p className="text-sm text-slate-400">La Bóveda está vacía</p>
                          <p className="text-[10px] text-slate-600 mt-1">Completa misiones de producción o investigación para registrar tus primeros récords</p>
                        </div>
                      );
                      return records.map((record, idx) => {
                        const vConfig = VOLTAJE_CONFIG[record.voltaje];
                        return (
                          <motion.button key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} onClick={() => setSelectedBovedaRecord(record)} className="w-full p-3 rounded-xl border flex items-center gap-3 text-left transition-all hover:scale-[1.01]" style={{ backgroundColor: PIZARRA, borderColor: `${vConfig.color}25`, boxShadow: `0 0 10px ${vConfig.glow}` }} data-testid={`boveda-record-${idx}`}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${vConfig.color}15` }}>
                              <Trophy size={16} style={{ color: vConfig.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{record.titulo}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${vConfig.color}15`, color: vConfig.color }}>{vConfig.label}</span>
                                <span className="text-[8px] text-slate-600">{record.count} ejecuciones</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-black" style={{ color: vConfig.color }}>{record.bestMinPerUnit.toFixed(1)}</p>
                              <p className="text-[7px] text-slate-500 uppercase">min/u</p>
                            </div>
                            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
                          </motion.button>
                        );
                      });
                    })()}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BANNER: AUTO-CARGA DE RUTINA */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="operar">
        {rutinaBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-amber-700/30 shadow-[0_0_12px_rgba(245,158,11,0.08)] p-4 flex items-center justify-between gap-3 bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950"
            data-testid="banner-rutina"
          >
            <div className="grid grid-cols-[auto_1fr] gap-2.5 items-center min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/90 ring-2 ring-gray-800 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wide text-gray-200 truncate">
                  Rutina detectada: {rutinaBanner.nombre}
                </p>
                <p className="text-[9px] text-gray-500 tabular-nums">
                  {rutinaBanner.segmentos.length} segmentos · {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date().getDay()]}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setRutinaBanner(null)}
                className="px-2.5 py-1 rounded-xl text-[9px] font-bold text-gray-500 border border-gray-800 bg-gray-900/40 hover:text-gray-300"
              >
                Omitir
              </button>
              <button
                onClick={() => cargarRutina(rutinaBanner)}
                className="px-3 py-1 rounded-xl text-[9px] font-bold text-amber-400 border border-amber-700/40 bg-amber-950/25 hover:bg-amber-950/40"
                data-testid="btn-cargar-rutina"
              >
                Cargar
              </button>
            </div>
          </motion.div>
        )}
        </PlanTabPanel>

        {/* ACORDEÓN: SEGMENTOS DEL DÍA (Puerta de Atención) */}
        <PlanTabPanel planLayout={planLayout} planTab={planTab} tab="operar">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border overflow-hidden" style={{ backgroundColor: PIZARRA, borderColor: `${BLOOD}25` }}>
          <button onClick={() => setExpandedSegId(expandedSegId === "segmentos" ? null : "segmentos")} className="w-full p-4 flex items-center justify-between" data-testid="accordion-segmentos">
            <div className="flex items-center gap-2">
              <Layers size={14} style={{ color: BLOOD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BLOOD }}>Segmentos del Día</span>
              {planilla && <span className="text-[9px] px-2 py-0.5 rounded-full ml-1" style={{ backgroundColor: `${BLOOD}20`, color: BLOOD }}>{planilla.segmentos.length}</span>}
            </div>
            {expandedSegId === "segmentos" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>

          <AnimatePresence>
            {expandedSegId === "segmentos" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3 border-t border-gray-800/80">
                  <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setShowRutinasPanel(!showRutinasPanel)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                          showRutinasPanel
                            ? "border-gray-600 bg-gray-800/60 text-gray-200"
                            : "border-gray-800 bg-gray-900/50 text-gray-400 hover:text-gray-200"
                        }`}
                        data-testid="btn-rutinas-panel"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Rutinas
                        {plantillasRutina.length > 0 && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700 tabular-nums">
                            {plantillasRutina.length}
                          </span>
                        )}
                      </button>
                      {planilla && planilla.segmentos.length > 0 && (
                        <button
                          onClick={() => setShowGuardarRutina(!showGuardarRutina)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                            showGuardarRutina
                              ? "border-gray-600 bg-gray-800/60 text-gray-200"
                              : "border-gray-800 bg-gray-900/50 text-gray-400 hover:text-gray-200"
                          }`}
                          data-testid="btn-guardar-rutina"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          Guardar como rutina
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCrearSegmento(true)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                        showCrearSegmento
                          ? "border-gray-600 bg-gray-800/60 text-gray-200"
                          : "border-gray-700 bg-gray-900/50 text-gray-300 hover:text-gray-100"
                      }`}
                    >
                      <Plus size={12} /> Nuevo Segmento
                    </button>
                  </div>

                  {/* PANEL: GUARDAR COMO RUTINA */}
                  {showGuardarRutina && planilla && planilla.segmentos.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-4 rounded-2xl border border-gray-800 bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950"
                      data-testid="panel-guardar-rutina"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/90">
                        Guardar rutina · {planilla.segmentos.length} segmentos actuales
                      </p>
                      <input
                        value={nuevaRutinaNombre}
                        onChange={e => setNuevaRutinaNombre(e.target.value)}
                        placeholder="Nombre de la rutina (ej: Semana de costura)"
                        className="w-full p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 text-xs placeholder:text-gray-600 focus:outline-none focus:border-gray-600"
                      />
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Días activos</p>
                        <div className="flex gap-1">
                          {["D","L","M","X","J","V","S"].map((d, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                setNuevaRutinaDias(prev =>
                                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                                )
                              }
                              className={`w-7 h-7 rounded-full text-[9px] font-black transition-all border ${
                                nuevaRutinaDias.includes(i)
                                  ? "bg-amber-400/90 text-zinc-950 border-amber-500/50"
                                  : "bg-gray-900/60 text-gray-500 border-gray-800 hover:border-gray-600"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowGuardarRutina(false)}
                          className="flex-1 py-2 rounded-xl text-[9px] font-bold text-gray-500 border border-gray-800 bg-gray-900/40 hover:bg-gray-900/60"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={guardarComoRutina}
                          disabled={!nuevaRutinaNombre.trim() || nuevaRutinaDias.length === 0 || guardandoRutina}
                          className="flex-1 py-2 rounded-xl text-[9px] font-bold text-amber-400 border border-amber-700/40 bg-amber-950/25 hover:bg-amber-950/40 disabled:opacity-40"
                        >
                          {guardandoRutina ? "Guardando…" : "Guardar"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* PANEL: GESTIÓN DE RUTINAS */}
                  {showRutinasPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-4 rounded-2xl border border-gray-800 bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950"
                      data-testid="panel-rutinas"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/90">
                          Mis Rutinas
                        </p>
                        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                          <button
                            onClick={async () => {
                              const ok = await requestNotificationPermission();
                              setNotifPermission(ok ? "granted" : "denied");
                            }}
                            className="text-[8px] px-2 py-0.5 rounded-md font-bold border border-gray-700 text-gray-400 bg-gray-900/60 hover:text-gray-200"
                          >
                            Activar alertas
                          </button>
                        )}
                        {notifPermission === "granted" && (
                          <span className="text-[8px] text-gray-500 uppercase tracking-wider">Alertas activas</span>
                        )}
                      </div>

                      <div className="flex gap-0.5">
                        {["D","L","M","X","J","V","S"].map((d, i) => {
                          const hoy = new Date().getDay();
                          const matching = plantillasRutina.find(p => p.diasActivos.includes(i));
                          return (
                            <div
                              key={i}
                              className={`flex-1 rounded-lg py-1.5 flex flex-col items-center gap-0.5 border ${
                                i === hoy
                                  ? "bg-gray-800/50 border-gray-600"
                                  : "bg-gray-900/40 border-gray-800"
                              }`}
                            >
                              <span
                                className={`text-[8px] font-black ${
                                  i === hoy ? "text-gray-200" : "text-gray-500"
                                }`}
                              >
                                {d}
                              </span>
                              {matching ? (
                                <div
                                  className="w-2 h-2 rounded-full bg-amber-400/80 ring-2 ring-gray-800"
                                  title={matching.nombre}
                                />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-gray-800" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {plantillasRutina.length === 0 ? (
                        <p className="text-[9px] text-gray-500 text-center py-2">Sin rutinas guardadas</p>
                      ) : (
                        <div className="space-y-2">
                          {plantillasRutina.map(r => {
                            const diasLabel = ["D","L","M","X","J","V","S"]
                              .filter((_, i) => r.diasActivos.includes(i))
                              .join(" ");
                            const highlighted = rutinaResaltadaId === r.id;
                            return (
                              <div
                                key={r.id}
                                ref={el => { rutinaItemRefs.current[r.id] = el; }}
                                className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 rounded-2xl border transition-all bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950 ${
                                  highlighted
                                    ? "border-amber-700/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                                    : "border-gray-800"
                                }`}
                              >
                                <div
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-gray-800 ${
                                    highlighted ? "bg-amber-400/90" : "bg-gray-600"
                                  }`}
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold tracking-wide text-gray-200 truncate">
                                    {r.nombre}
                                  </p>
                                  <p className="text-[8px] text-gray-500 tabular-nums">
                                    {r.segmentos.length} seg · {diasLabel}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => cargarRutina(r)}
                                    disabled={cargandoRutinaId !== null}
                                    className="px-2 py-0.5 rounded-md text-[8px] font-bold text-amber-400 border border-amber-700/40 bg-amber-950/20 hover:bg-amber-950/35 disabled:opacity-50"
                                    data-testid={`btn-cargar-${r.id}`}
                                  >
                                    {cargandoRutinaId === r.id ? "Cargando…" : "Cargar"}
                                  </button>
                                  <button
                                    onClick={() => eliminarRutina(r.id)}
                                    className="w-6 h-6 rounded-md text-[10px] font-bold text-gray-500 border border-gray-800 bg-gray-900/60 hover:text-gray-300 hover:border-gray-600"
                                    aria-label="Eliminar rutina"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {showCrearSegmento && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-4 rounded-2xl border border-gray-800 bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950"
                      data-testid="panel-nuevo-segmento"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                        Nuevo segmento
                      </p>
                      <input
                        value={nuevoSegNombre}
                        onChange={(e) => setNuevoSegNombre(e.target.value)}
                        placeholder="Nombre del segmento (ej: Costura, Planificación)"
                        className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-gray-600"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
                            Hora inicio
                          </label>
                          <input
                            type="time"
                            value={nuevoSegHoraInicio}
                            onChange={(e) => setNuevoSegHoraInicio(e.target.value)}
                            className="w-full p-2 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
                            Hora fin
                          </label>
                          <input
                            type="time"
                            value={nuevoSegHoraFin}
                            onChange={(e) => setNuevoSegHoraFin(e.target.value)}
                            className="w-full p-2 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 text-sm focus:outline-none focus:border-gray-600"
                          />
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-500 leading-relaxed">
                        Duración máxima 24 h. Si la hora fin es anterior a inicio, el segmento cruza medianoche.
                      </p>
                      <SegmentoProyectoSelect
                        value={nuevoSegProyectoId}
                        onChange={setNuevoSegProyectoId}
                        proyectos={proyectosHub}
                        compact
                      />
                      {nuevoSegProyectoId && nuevoSegRutas && (
                        <RutasMentalesEditor
                          rutas={nuevoSegRutas}
                          onChange={setNuevoSegRutas}
                          etiqueta={proyectosHub.find(p => p.id === nuevoSegProyectoId)?.etiqueta}
                        />
                      )}
                      {nuevoSegProyectoId && !nuevoSegRutas && (
                        <p className="text-[8px] text-slate-500">Cargando claridad desde el proyecto…</p>
                      )}
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Color
                        </label>
                        <div className="flex gap-1.5">
                          {SEGMENT_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setNuevoSegColor(c)}
                              className={`w-6 h-6 rounded-full transition-all ring-2 ${
                                nuevoSegColor === c
                                  ? "ring-gray-200 scale-110"
                                  : "ring-gray-800 hover:ring-gray-600"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowCrearSegmento(false)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-500 border border-gray-800 bg-gray-900/40 hover:bg-gray-900/60"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={addSegmento}
                          disabled={
                            segmentoProgramando ||
                            !nuevoSegNombre.trim() ||
                            !nuevoSegHoraInicio ||
                            !nuevoSegHoraFin
                          }
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-200 border border-gray-600 bg-gray-800/80 hover:bg-gray-700/80 disabled:opacity-50"
                        >
                          {segmentoProgramando ? "Programando…" : "Programar"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {planilla && planilla.segmentos.length > 0 ? (
                    <div className="space-y-2">
                      {planilla.segmentos.map((seg) => {
                        void segmentUiTick;
                        const isActive = seg.estado === "activo";
                        const isPuertaSistema = isActive && !!seg.puertaSistema;
                        const isEntropia = seg.estado === "entropia";
                        const isClosedManual = seg.estado === "cerrado_manual";
                        const isPendiente = seg.estado === "pendiente";
                        const nowMsSeg = Date.now();
                        // Segmentos están anclados a HH:mm sobre medianoche Lima (no inicio de jornada 05:00)
                        const dayStartSeg = getSegmentCalendarDayStartMs(nowMsSeg);
                        const puertaVentanaAbierta = isWithinPuertaWindow(
                          nowMsSeg, seg.horaInicio, dayStartSeg
                        );
                        const activarVentanaAbierta = puertaVentanaAbierta;
                        const cierreVentanaAbierta = seg.horaFin
                          ? isWithinSegmentTimeMargin(nowMsSeg, seg.horaInicio, seg.horaFin, "fin", 5, dayStartSeg)
                          : true;
                        const discSeg = disciplinaBySegmentId.get(seg.id);
                        const discBadge = discSeg ? disciplinaBadgeLabel(discSeg) : null;
                        const atencSeg = atencionBySegmentId.get(seg.id);
                        const atencBadge = atencSeg ? atencionBadgeLabel(atencSeg) : null;
                        const dotColor = isPuertaSistema
                          ? BLOOD
                          : isActive
                            ? EMERALD
                            : isClosedManual
                              ? "#64748b"
                              : seg.color;
                        const estadoBadge =
                          isEntropia
                            ? "ENTROPÍA"
                            : isPuertaSistema
                              ? "ENTROPÍA"
                              : isClosedManual
                                ? "CERRADO"
                                : isActive
                                  ? "ACTIVO"
                                  : isPendiente
                                    ? "PENDIENTE"
                                    : null;
                        const cardClass = [
                          "rounded-2xl border p-4 transition-all",
                          "bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950",
                          isEntropia || isPuertaSistema
                            ? "border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                            : isActive
                              ? "border-emerald-900/40 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                              : "border-gray-800",
                        ].join(" ");
                        const hasActions =
                          isEntropia ||
                          isPuertaSistema ||
                          (isActive && cierreVentanaAbierta) ||
                          (isActive && !cierreVentanaAbierta && !!seg.horaFin) ||
                          isPendiente ||
                          (isActive && !!seg.puertaTiming);
                        return (
                          <div key={seg.id} className={cardClass} data-testid={`segment-card-${seg.id}`}>
                            <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                              <div className="flex items-center gap-2.5 shrink-0">
                                <div
                                  className="w-3 h-3 rounded-full ring-2 ring-gray-800/90 shrink-0"
                                  style={{ backgroundColor: dotColor }}
                                />
                                <div className="flex flex-col text-xs text-gray-500 leading-tight tabular-nums">
                                  <span>{seg.horaInicio}</span>
                                  <span>{seg.horaFin}</span>
                                </div>
                              </div>

                              <div className="min-w-0 flex items-center gap-2">
                                <p className="text-gray-200 font-semibold tracking-wide truncate">
                                  {seg.nombre}
                                </p>
                                {atencBadge && (
                                  <span
                                    className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 border border-violet-900/50 bg-violet-950/30 text-violet-300"
                                    title={atencSeg ? describeSegmentoAtencion(atencSeg) : undefined}
                                    data-testid={`segment-atencion-${seg.id}`}
                                  >
                                    {atencBadge}
                                  </span>
                                )}
                                {discBadge && (
                                  <span
                                    className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 border border-gray-800 bg-gray-900/80 text-gray-400"
                                    title={discSeg ? describeSegmentoDisciplina(discSeg) : undefined}
                                    data-testid={`segment-disciplina-${seg.id}`}
                                  >
                                    D:{discBadge}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {estadoBadge && (
                                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-gray-900/90 text-gray-400 border border-gray-800">
                                    {estadoBadge}
                                  </span>
                                )}
                                {seg.psGanados !== 0 && (
                                  <span
                                    className={`font-bold text-xs tabular-nums whitespace-nowrap ${
                                      seg.psGanados > 0 ? "text-amber-400" : "text-red-400"
                                    }`}
                                  >
                                    {seg.psGanados > 0 ? `+${seg.psGanados}` : seg.psGanados} PS
                                  </span>
                                )}
                              </div>
                            </div>

                            {hasActions && (
                              <div className="mt-3 pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {isEntropia && (
                                    <p className="text-[7px] text-red-400/90 leading-tight">
                                      Entropía de atención — puerta no marcada a tiempo
                                    </p>
                                  )}
                                  {isPuertaSistema && (
                                    <p className="text-[7px] text-red-400/90 leading-tight">
                                      Puerta abierta por el sistema — −2 PS. Cierra para recuperar +2 PS
                                    </p>
                                  )}
                                  {isActive && !isPuertaSistema && seg.puertaTiming && (
                                    <p className="text-[7px] text-violet-300/80 leading-tight">
                                      Puerta abierta {seg.puertaTiming === "antes_voz" ? "antes de la voz" : "tras la voz"}
                                    </p>
                                  )}
                                  {isPendiente && !activarVentanaAbierta && (
                                    <p className="text-[7px] text-gray-500 leading-tight">
                                      Puerta de atención: ±5 min de {seg.horaInicio} · voz al min 4
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                                {isActive && cierreVentanaAbierta && (
                                  <button
                                    type="button"
                                    disabled={cerrandoSegId === seg.id}
                                    onClick={() => void cerrarSegmentoManual(seg.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-colors border border-red-900/40 text-red-300/90 bg-red-950/20 hover:bg-red-950/35 disabled:opacity-50"
                                    data-testid={`button-close-segment-${seg.id}`}
                                  >
                                    <Square size={10} />
                                    {cerrandoSegId === seg.id ? "Cerrando…" : "Cerrar puerta (+2 PS)"}
                                  </button>
                                )}
                                {isActive && !cierreVentanaAbierta && seg.horaFin && (
                                  <span className="text-[7px] text-gray-500 text-right max-w-[14rem] leading-tight">
                                    Cierre disponible ±5 min de {seg.horaFin}
                                  </span>
                                )}
                                {isPendiente &&
                                  (activarVentanaAbierta ? (
                                    <button
                                      type="button"
                                      disabled={activandoSegId === seg.id}
                                      onClick={() => void activarSegmento(seg.id)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-colors border border-violet-900/50 text-violet-300/95 bg-violet-950/25 hover:bg-violet-950/40 disabled:opacity-50"
                                      data-testid={`button-start-segment-${seg.id}`}
                                    >
                                      <Play size={10} />
                                      {activandoSegId === seg.id ? "Abriendo…" : "Abrir puerta (+2 PS)"}
                                    </button>
                                  ) : (
                                    <span
                                      className="text-[8px] px-2 py-0.5 rounded-md text-gray-500 bg-gray-900/60 border border-gray-800"
                                      title={`Ventana puerta: ${seg.horaInicio} ± 5 min`}
                                    >
                                      Esperando ventana
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isActive && seg.eventos.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-800/80">
                                <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-1.5">
                                  Eventos registrados
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {seg.eventos.slice(-5).map((ev, i) => (
                                    <span
                                      key={i}
                                      className="text-[8px] px-1.5 py-0.5 rounded-md bg-gray-900/70 text-gray-400 border border-gray-800"
                                    >
                                      {ev.componente} · {ev.hora}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                      {planilla.segmentos.filter(s => s.estado === "entropia" || s.puertaSistema).length > 0 && (
                        <div className="p-4 rounded-2xl border border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.12)] bg-gradient-to-br from-zinc-950 via-[#141416] to-zinc-950">
                          <div className="flex items-center gap-2 mb-1">
                            <Lock size={12} className="text-gray-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                              Segmentos en entropía: {planilla.segmentos.filter(s => s.estado === "entropia" || s.puertaSistema).length}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-500 leading-relaxed">
                            Cada entropía = 0 PS. Registro de atención perdida — entrena la conciencia panorámica.
                          </p>
                        </div>
                      )}
                      <div ref={segmentosListEndRef} className="h-0 w-full scroll-mt-4" aria-hidden />
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-600 text-center py-2">Sin segmentos programados</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {!isCreating ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="mb-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">La Flota</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">{FLOTA_SELECTOR_DISCRIMINATOR}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(FLOTA_CONFIG) as [TipoFlota, typeof FLOTA_CONFIG["tiempo"]][]).map(([tipo, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={tipo} onClick={() => { setCierreEnergiaPending(null); setCierreEnergiaSeleccion(null); setShowCierreJornada(false); setSituacionDesgloseCelebration(null); setSaving(false); setPlanTab("operar"); setIsCreating(true); setVehicleMode("flota"); setTipoFlotaSeleccionado(tipo); if (tipo === "situacion" && !terminoDetalle.trim()) setTerminoDetalle("Al cerrar este bloque"); }} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all hover:scale-[1.02]" style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }} data-testid={`button-flota-${tipo}`}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
                        <Icon size={20} style={{ color: cfg.color }} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[9px] text-slate-500 text-center leading-tight">{cfg.sublabel}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>{cfg.relojVisible ? cfg.relojLabel : "Reloj Oculto"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {showEmergencyArchiveBanner && (
              <div
                className="mb-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)" }}
              >
                <p className="text-[10px] text-red-200/90 flex-1 leading-snug">
                  {situacionRetoAtascado
                    ? "Reto de enfoque listo pero la pantalla no responde. Usa «Archivar atascados» o «Recibir cierre del bloque» en el vehículo."
                    : (
                      <>
                        Tienes <span className="font-black">{activeVehicles.length}</span> vehículos activos. Si no puedes cerrarlos uno a uno, libera las sesiones atascadas.
                      </>
                    )}
                </p>
                <button
                  type="button"
                  onClick={() => void handleEmergencyArchiveStuckActives()}
                  className="shrink-0 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.45)" }}
                  data-testid="button-emergency-archive-stuck"
                >
                  Archivar atascados
                </button>
              </div>
            )}
            {activeVehicles.length > 0 ? (
              <div ref={flotaActivosRef} className="scroll-mt-4">
              <AccordionSection title="VEHÍCULOS ACTIVOS" icon={Zap} color={BLOOD} count={activeVehicles.length} defaultOpen>
                <FlotaActivaVehicleCards
                  flotaActivos={flotaActivosRenderList}
                  expandedId={expandedId}
                  cierreEnergiaPendingVehicleId={cierreEnergiaPending?.vehicleId ?? null}
                  segmentoNumero={segmentoNumero}
                  planilla={planilla}
                  situacionBloqueSummaries={situacionBloqueSummaries}
                  arquitectoUnlocked={soberaniaDiaUnlocked}
                  handlers={handlers}
                />
              </AccordionSection>
              </div>
            ) : (
              <div className="p-4 rounded-xl border text-center space-y-1" style={{ backgroundColor: PIZARRA, borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin vehículos activos</p>
                <p className="text-[9px] text-slate-600">Lanza uno desde La Flota o el historial aparecerá al cerrar misiones.</p>
              </div>
            )}

            {(vehiculosHoy.length > 0 || vehiculosAnteriores.length > 0) && (
                <AccordionSection title="HISTORIAL" subtitle="Hoy" icon={Flag} color={SLATE} count={vehiculosHoy.length} defaultOpen={false}>
                  {vehiculosHoy.map((v) => (
                    <MemoVehicleCard key={v.id} vehicle={v} expanded={expandedId === v.id} onToggleVehicle={handleVehicleToggle} minimal planilla={planilla} />
                  ))}
                  {vehiculosAnteriores.length > 0 && (
                    <button
                      onClick={() => setShowHistorialCompleto(p => !p)}
                      className="w-full py-2 mt-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{ color: showHistorialCompleto ? BLOOD : "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.08)", border: "1px solid" }}
                      data-testid="button-historial-completo"
                    >
                      {showHistorialCompleto ? "▲ Ocultar días anteriores" : `▼ Ver días anteriores (${vehiculosAnteriores.length})`}
                    </button>
                  )}
                  {showHistorialCompleto && Object.entries(gruposPorFechaHistorial).map(([fecha, lista]) => (
                    <div key={fecha}>
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
                        <span className="text-[9px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>{fecha}</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
                      </div>
                      {lista.map(v => (
                        <MemoVehicleCard key={v.id} vehicle={v} expanded={expandedId === v.id} onToggleVehicle={handleVehicleToggle} minimal planilla={planilla} />
                      ))}
                    </div>
                  ))}
                </AccordionSection>
            )}

            {/* CIERRE DE JORNADA & DEPÓSITO */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowDeposito(!showDeposito)} className="py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: `${AZURE}10`, color: AZURE, border: `1px solid ${AZURE}25` }} data-testid="button-deposito">
                <Zap size={14} /> DEPÓSITO
              </button>
              <button type="button" onClick={async () => {
                try {
                  if (user) {
                    setTodayCierreJornada(await getTodayCierreJornada(user.uid));
                  } else {
                    setTodayCierreJornada(null);
                  }
                } catch (e) {
                  console.error("[CierreJornada] error al consultar cierre de hoy:", e);
                  setTodayCierreJornada(null);
                }
                setShowCierreJornada(true);
              }} className="py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: `${GOLD}10`, color: GOLD, border: `1px solid ${GOLD}25` }} data-testid="button-cierre-jornada">
                <Flag size={14} /> CIERRE DE JORNADA
              </button>
            </div>

            {showDeposito && <DepositoEnergeticoSection vehicles={vehicles} planilla={planilla} />}
          </>
        ) : vehicleMode === "flota" && tipoFlotaSeleccionado ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {(() => {
              const cfg = FLOTA_CONFIG[tipoFlotaSeleccionado];
              const Icon = cfg.icon;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}><Icon size={16} style={{ color: cfg.color }} /></div>
                      <div><span className="text-sm font-black uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span><p className="text-[9px] text-slate-500">{cfg.sublabel}</p></div>
                    </div>
                    <button onClick={resetForm} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X size={16} className="text-slate-500" /></button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">Nombre de la Misión</label>
                    <div className="relative">
                      <input value={titulo} onChange={(e) => { setTitulo(e.target.value); if (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "produccion") setShowTituloProdSuggestions(e.target.value.trim().length >= 2); if (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "desglosador") setShowDesglosadorTitleSuggestions(e.target.value.trim().length >= 2); }} onFocus={() => { if (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "produccion" && titulo.trim().length >= 2) setShowTituloProdSuggestions(true); if (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "desglosador" && titulo.trim().length >= 2) setShowDesglosadorTitleSuggestions(true); }} onBlur={() => setTimeout(() => { setShowTituloProdSuggestions(false); setShowDesglosadorTitleSuggestions(false); }, 150)} placeholder={tipoFlotaSeleccionado === "descanso" ? "Ej: Almuerzo" : tipoFlotaSeleccionado === "verdad" ? "Ej: Momento de sinceridad" : "Ej: Llamar a 3 clientes"} className="w-full p-4 rounded-xl bg-[#0a0a0a] border text-white placeholder:text-slate-600 focus:outline-none text-sm" style={{ borderColor: titulo ? cfg.color : "rgba(255,255,255,0.1)" }} autoFocus data-testid="input-mission-name" />
                      {tipoFlotaSeleccionado === "tiempo" && relojTiempo === "produccion" && showTituloProdSuggestions && (() => {
                        const sugs = getRecordSuggestions(titulo, 5);
                        if (sugs.length === 0) return null;
                        return (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border overflow-hidden" style={{ backgroundColor: "#0f0f0f", borderColor: `${cfg.color}40`, boxShadow: `0 4px 20px ${cfg.color}20` }}>
                            {sugs.map((s, i) => {
                              const best = getHistoricalVehicleData(s.titulo).bestMinPerUnit ?? s.minPerUnit;
                              return (
                                <button key={i} onMouseDown={(e) => { e.preventDefault(); setTitulo(s.titulo); setTiempoProduccion(best.toFixed(1)); setShowTituloProdSuggestions(false); }} className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/5" data-testid={`suggestion-produccion-${i}`}>
                                  <span className="text-sm text-white/90 truncate">{s.titulo}</span>
                                  <span className="text-[10px] font-bold ml-3 shrink-0 font-mono" style={{ color: cfg.color }}>{best.toFixed(1)} MIN/U</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {tipoFlotaSeleccionado === "tiempo" && relojTiempo === "desglosador" && showDesglosadorTitleSuggestions && (() => {
                        const sugs = getDesglosadorMisionData(titulo, 6);
                        if (sugs.length === 0) return null;
                        return (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border overflow-hidden" style={{ backgroundColor: "#0f0f0f", borderColor: `${GOLD}40`, boxShadow: `0 4px 20px ${GOLD}20` }}>
                            {sugs.map((s, i) => (
                              <button key={i} onMouseDown={(e) => { e.preventDefault(); setTitulo(s.titulo); setShowDesglosadorTitleSuggestions(false); }} className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5" data-testid={`suggestion-desglosador-title-${i}`}>
                                <div className="flex items-center gap-2">
                                  <ListTodo size={10} style={{ color: GOLD }} />
                                  <span className="text-sm text-white/90 truncate">{s.titulo}</span>
                                </div>
                                {s.subs.length > 0 && (
                                  <div className="pl-4 flex flex-wrap gap-x-1 items-center mt-0.5">
                                    {s.subs.map((sub, j) => (
                                      <span key={j} className="text-[8px] font-mono whitespace-nowrap" style={{ color: "rgba(212,175,55,0.55)" }}>
                                        {j > 0 && <span style={{ color: "rgba(255,255,255,0.2)" }}>→ </span>}
                                        {sub.nombre}{sub.duracionMin != null ? ` · ${Math.round(sub.duracionMin)}m` : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {titulo.trim().length >= 3 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {tipoFlotaSeleccionado === "tiempo" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider text-center">Tipo de Reloj</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "proyectivo" as const, label: "Proyectivo", desc: "Hora Fin", icon: Clock, premium: false },
                              { id: "produccion" as const, label: "Producción", desc: "Cant × Tiempo", icon: Target, premium: false },
                              { id: "investigador" as const, label: "Investigador", desc: "Cantidad · Libre", icon: Activity, premium: false },
                              { id: "desglosador" as const, label: "Desglosador", desc: "Ciclo de Misión", icon: ListTodo, premium: true }
                            ].map(opt => {
                              const isDesglosadorLocked = opt.premium && !desglosadorUnlocked;
                              if (isDesglosadorLocked) {
                                return (
                                  <div key={opt.id} className="relative">
                                    <button
                                      onClick={() => setShowDesglosadorCTA(v => !v)}
                                      className="w-full p-3 rounded-xl border text-center transition-all relative overflow-hidden"
                                      style={{ borderColor: `${GOLD}40`, backgroundColor: "rgba(212,175,55,0.04)", cursor: "pointer" }}
                                      data-testid={`button-reloj-${opt.id}-locked`}
                                    >
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl z-10">
                                        <div className="flex flex-col items-center gap-0.5">
                                          <Lock size={12} style={{ color: "#D4AF37" }} />
                                          <span className="text-[6px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>Plan Operativo</span>
                                        </div>
                                      </div>
                                      <opt.icon size={14} className="mx-auto mb-1 opacity-30" style={{ color: "#6b7280" }} />
                                      <span className="text-[9px] font-bold block opacity-30" style={{ color: "#6b7280" }}>{opt.label}</span>
                                      <span className="text-[8px] text-slate-700">{opt.desc}</span>
                                    </button>
                                    {showDesglosadorCTA && (
                                      <div
                                        className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-xl border p-3 shadow-xl text-center"
                                        style={{ backgroundColor: "#0A0A0A", borderColor: `${GOLD}60` }}
                                      >
                                        <p className="text-[10px] font-black mb-1" style={{ color: GOLD }}>Operativo — unidades y ritmo</p>
                                        <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">
                                          Para producción repetitiva. Un día mal contabilizado al mes cuesta más que la suscripción.
                                        </p>
                                        <button
                                          onClick={() => { setShowDesglosadorCTA(false); navigate("/pagos?plan=operativo"); }}
                                          className="w-full py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider text-black transition-all"
                                          style={{ background: GOLD }}
                                          data-testid="button-desglosador-unlock-cta"
                                        >
                                          Ver módulo Operativo →
                                        </button>
                                        <button
                                          onClick={() => setShowDesglosadorCTA(false)}
                                          className="mt-1 text-[8px] text-slate-600 hover:text-slate-400"
                                        >
                                          Cerrar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <button key={opt.id} onClick={() => setRelojTiempo(opt.id)} className="p-3 rounded-xl border text-center transition-all" style={{ borderColor: relojTiempo === opt.id ? cfg.color : "rgba(255,255,255,0.1)", backgroundColor: relojTiempo === opt.id ? `${cfg.color}10` : "transparent" }} data-testid={`button-reloj-${opt.id}`}>
                                  <opt.icon size={14} className="mx-auto mb-1" style={{ color: relojTiempo === opt.id ? cfg.color : "#6b7280" }} />
                                  <span className="text-[9px] font-bold block" style={{ color: relojTiempo === opt.id ? cfg.color : "#6b7280" }}>{opt.label}</span>
                                  <span className="text-[8px] text-slate-600">{opt.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                          {relojTiempo === "proyectivo" && (
                            <div className="p-3 rounded-xl border" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}30` }}>
                              <label className="text-[9px] text-slate-400 uppercase mb-2 block">Hora de Fin</label>
                              <input type="time" value={horaFinProyectiva} onChange={(e) => setHoraFinProyectiva(e.target.value)} className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none" data-testid="input-hora-fin" />
                            </div>
                          )}
                          {relojTiempo === "produccion" && (
                            <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}30` }}>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-400 uppercase mb-1 block">Cantidad</label>
                                  <input type="number" value={cantidadProduccion} onChange={(e) => setCantidadProduccion(e.target.value)} placeholder="Ej: 5" className="w-full bg-black/30 text-white text-sm p-2 rounded-lg border border-white/10 focus:outline-none" data-testid="input-cantidad" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 uppercase mb-1 block">Min/unidad</label>
                                  <input type="number" value={tiempoProduccion} onChange={(e) => setTiempoProduccion(e.target.value)} placeholder={(() => { if (titulo.trim().length >= 3) { const h = getHistoricalVehicleData(titulo.trim()); if (h.bestMinPerUnit) return `Mejor: ${h.bestMinPerUnit.toFixed(1)}`; } return "Ej: 10"; })()} className="w-full bg-black/30 text-white text-sm p-2 rounded-lg border border-white/10 focus:outline-none" data-testid="input-tiempo-produccion" />
                                </div>
                              </div>
                              {cantidadProduccion && tiempoProduccion && Number(cantidadProduccion) > 0 && Number(tiempoProduccion) > 0 && (() => {
                                const totalMin = Number(cantidadProduccion) * Number(tiempoProduccion);
                                const now = new Date();
                                const target = new Date(now.getTime() + totalMin * 60000);
                                const horaObj = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
                                const horas = Math.floor(totalMin / 60);
                                const mins = totalMin % 60;
                                const duracionStr = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;
                                return (
                                  <div className="mt-2 p-3 rounded-xl text-center" style={{ backgroundColor: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
                                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>Hora Objetivo Calculada</p>
                                    <p className="text-2xl font-black tracking-wider" style={{ color: cfg.color, fontFamily: "JetBrains Mono, monospace", textShadow: `0 0 15px ${cfg.color}40` }}>{horaObj}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{cantidadProduccion} × {tiempoProduccion} min = <span className="font-bold text-white">{duracionStr}</span></p>
                                  </div>
                                );
                              })()}
                              {titulo.trim().length >= 3 && (() => {
                                const hist = getHistoricalVehicleData(titulo.trim());
                                if (hist.count === 0) return null;
                                const bestTime = hist.bestMinPerUnit!;
                                const tiempoActual = Number(tiempoProduccion);
                                const isOverride = tiempoActual > 0 && tiempoActual > bestTime;
                                return (
                                  <div className="mt-2 p-3 rounded-xl border space-y-2" style={{ backgroundColor: isOverride ? "rgba(239,68,68,0.05)" : `${GOLD}08`, borderColor: isOverride ? "rgba(239,68,68,0.3)" : `${GOLD}30` }}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Trophy size={12} style={{ color: GOLD }} />
                                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>Tu Récord ({hist.count}x)</span>
                                      </div>
                                      <span className="text-lg font-black" style={{ color: GOLD, fontFamily: "JetBrains Mono, monospace" }}>{bestTime.toFixed(1)}</span>
                                    </div>
                                    <button onClick={() => setTiempoProduccion(bestTime.toFixed(1))} className="w-full py-2.5 rounded-lg text-[10px] font-bold transition-all" style={{ backgroundColor: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }} data-testid="button-use-best-time">
                                      Usar mi récord: {bestTime.toFixed(1)} min/u
                                    </button>
                                    {isOverride && (
                                      <p className="text-[9px] text-red-400/70 text-center italic">Pusiste {tiempoActual} min/u — mayor que tu récord. Dato registrado.</p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {relojTiempo === "investigador" && (
                            <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}30` }}>
                              <label className="text-[9px] text-slate-400 uppercase mb-1 block">¿Cuántas unidades completarás?</label>
                              <input type="number" value={cantidadInvestigador} onChange={(e) => setCantidadInvestigador(e.target.value)} placeholder="Ej: 10" className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none" data-testid="input-cantidad-investigador" />
                              {cantidadInvestigador && Number(cantidadInvestigador) > 0 && (
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>MODO INVESTIGADOR</p>
                                  <p className="text-lg font-black" style={{ color: cfg.color, fontFamily: "JetBrains Mono, monospace" }}>{cantidadInvestigador} unidades</p>
                                  <p className="text-[10px] text-slate-400 mt-1">Cronómetro libre · Se medirá tu ritmo real</p>
                                </div>
                              )}
                              {titulo.trim().length >= 3 && (() => {
                                const hist = getHistoricalVehicleData(titulo.trim());
                                if (hist.count === 0) return null;
                                return (
                                  <div className="mt-2 p-2 rounded-lg border" style={{ backgroundColor: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.2)" }}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Activity size={10} className="text-blue-400" />
                                      <span className="text-[8px] font-bold uppercase tracking-wider text-blue-400">Dato anterior ({hist.count}x)</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Última vez: <span className="font-bold text-white">{(hist.lastMinPerUnit! * 60).toFixed(0)} seg/unidad</span></p>
                                    {hist.bestMinPerUnit && hist.bestMinPerUnit !== hist.lastMinPerUnit && (
                                      <p className="text-[10px] text-slate-400">Mejor registro: <span className="font-bold text-emerald-400">{(hist.bestMinPerUnit * 60).toFixed(0)} seg/unidad</span></p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {relojTiempo === "desglosador" && (
                            <div className="p-3 rounded-xl border space-y-3" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}30`, borderStyle: "dashed" }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ListTodo size={11} style={{ color: cfg.color }} />
                                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>Plan de Ataque</span>
                                </div>
                                <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, opacity: 0.7 }}>{JORNADA_MODULE.title}</span>
                              </div>
                              <p className="text-[8px] text-slate-500 leading-snug">
                                Duración del desglose en vivo: fortalece tu resistencia atencional. Profundidad: {formatDepthAwardPreview()} PS por cada hora completa en el desglosador (curva suave).
                              </p>

                              {/* Secuencia histórica */}
                              {historialSubs.length > 0 && sugerenciasIA.length === 0 && (
                                <div className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}06` }}>
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={9} style={{ color: cfg.color }} />
                                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>Tu secuencia habitual</span>
                                  </div>
                                  <ol className="space-y-0.5">
                                    {historialSubs.map((s, i) => (
                                      <li key={i} className="text-[9px] text-slate-400 flex items-center gap-1">
                                        <span className="text-[8px] font-bold" style={{ color: cfg.color }}>{i + 1}.</span> {s}
                                      </li>
                                    ))}
                                  </ol>
                                  <button
                                    onClick={() => {
                                      const newSubs = historialSubs.map((s, i) => ({ tempId: `hist_${i}_${Date.now()}`, titulo: s, cantidadObjetivo: "" }));
                                      setDesglosadorSubs(newSubs.length > 0 ? newSubs : [{ tempId: "sub_0", titulo: "", cantidadObjetivo: "" }]);
                                    }}
                                    className="w-full py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-all"
                                    style={{ backgroundColor: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}50` }}
                                    data-testid="button-usar-secuencia-historica"
                                  >
                                    <Clock size={10} /> Usar esta secuencia
                                  </button>
                                </div>
                              )}

                              {/* Sugerencias IA */}
                              {sugerenciasIA.length > 0 && (
                                <div className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: "#00FFC330", backgroundColor: "#00FFC308" }}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles size={9} style={{ color: "#00FFC3" }} />
                                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#00FFC3" }}>Sugerencias IA</span>
                                    </div>
                                    <button onClick={() => { setSugerenciasIA([]); setSugerenciasIASeleccionadas(new Set()); }} className="text-[8px] text-slate-500 hover:text-slate-300" data-testid="button-cerrar-sugerencias-ia">✕</button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {sugerenciasIA.map((s, i) => {
                                      const selected = sugerenciasIASeleccionadas.has(s);
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => setSugerenciasIASeleccionadas(prev => {
                                            const next = new Set(prev);
                                            if (next.has(s)) next.delete(s); else next.add(s);
                                            return next;
                                          })}
                                          className="px-2 py-1 rounded-md text-[9px] font-bold border transition-all"
                                          style={{
                                            borderColor: selected ? "#00FFC3" : "#00FFC330",
                                            backgroundColor: selected ? "#00FFC315" : "transparent",
                                            color: selected ? "#00FFC3" : "#6b7280"
                                          }}
                                          data-testid={`chip-sugerencia-ia-${i}`}
                                        >
                                          {s}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {desglosadorSubs.some(s => s.titulo.trim()) && (
                                    <p className="text-[8px] text-slate-500">Se añadirán al final de tu lista actual.</p>
                                  )}
                                  <button
                                    onClick={() => {
                                      const toAdd = sugerenciasIA.filter(s => sugerenciasIASeleccionadas.has(s));
                                      if (toAdd.length === 0) return;
                                      const existingWithText = desglosadorSubs.filter(s => s.titulo.trim());
                                      const newFromIA = toAdd.map((s, i) => ({ tempId: `ia_${i}_${Date.now()}`, titulo: s, cantidadObjetivo: "" }));
                                      const combined = [...existingWithText, ...newFromIA];
                                      setDesglosadorSubs(combined.length > 0 ? combined : [{ tempId: "sub_0", titulo: "", cantidadObjetivo: "" }]);
                                      setSugerenciasIA([]);
                                      setSugerenciasIASeleccionadas(new Set());
                                    }}
                                    disabled={sugerenciasIASeleccionadas.size === 0}
                                    className="w-full py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                                    style={{ backgroundColor: "#00FFC320", color: "#00FFC3", border: "1px solid #00FFC350" }}
                                    data-testid="button-aplicar-sugerencias-ia"
                                  >
                                    <CheckCircle2 size={10} /> Aplicar selección ({sugerenciasIASeleccionadas.size})
                                  </button>
                                </div>
                              )}

                              <div className="space-y-2">
                                {desglosadorSubs.map((sv, idx) => (
                                  <div key={sv.tempId} className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => {
                                          if (idx === 0) return;
                                          setDesglosadorSubs(prev => {
                                            const next = [...prev];
                                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                            return next;
                                          });
                                        }}
                                        disabled={idx === 0}
                                        className="p-0.5 rounded disabled:opacity-20 hover:bg-white/10 transition-colors"
                                        style={{ color: cfg.color }}
                                        data-testid={`button-sub-up-${idx}`}
                                      >
                                        <ChevronUp size={10} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (idx === desglosadorSubs.length - 1) return;
                                          setDesglosadorSubs(prev => {
                                            const next = [...prev];
                                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                            return next;
                                          });
                                        }}
                                        disabled={idx === desglosadorSubs.length - 1}
                                        className="p-0.5 rounded disabled:opacity-20 hover:bg-white/10 transition-colors"
                                        style={{ color: cfg.color }}
                                        data-testid={`button-sub-down-${idx}`}
                                      >
                                        <ChevronDown size={10} />
                                      </button>
                                    </div>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>{idx + 1}</div>
                                    <div className="flex-1 relative">
                                      <input
                                        value={sv.titulo}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setDesglosadorSubs(prev => prev.map(s => s.tempId === sv.tempId ? { ...s, titulo: val, tiempoRecordMinPerUnit: undefined } : s));
                                          if (val.trim().length >= 2) setActiveSubSuggestionIdx(idx);
                                          else setActiveSubSuggestionIdx(null);
                                        }}
                                        onFocus={() => { if (sv.titulo.trim().length >= 2) setActiveSubSuggestionIdx(idx); }}
                                        onBlur={() => {
                                          // Auto-cargar récord histórico sin requerir clic en dropdown
                                          if (sv.titulo.trim().length >= 2 && !sv.tiempoRecordMinPerUnit) {
                                            const sug = getSubVehicleRecordSuggestions(sv.titulo);
                                            if (sug.length > 0) {
                                              const exact = sug.find(s => s.titulo.toLowerCase() === sv.titulo.trim().toLowerCase());
                                              const match = exact ?? sug[0];
                                              const record = getHistoricalVehicleData(match.titulo).bestMinPerUnit ?? match.minPerUnit;
                                              if (record > 0) {
                                                setDesglosadorSubs(prev => prev.map(s => s.tempId === sv.tempId ? { ...s, tiempoRecordMinPerUnit: record } : s));
                                              }
                                            }
                                          }
                                          setTimeout(() => setActiveSubSuggestionIdx(null), 150);
                                        }}
                                        placeholder={`Sub-tarea ${idx + 1}...`}
                                        className="w-full bg-black/30 text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none"
                                        data-testid={`input-desglosador-sub-${idx}`}
                                      />
                                      {activeSubSuggestionIdx === idx && (() => {
                                        const sug = getSubVehicleRecordSuggestions(sv.titulo);
                                        if (sug.length === 0) return null;
                                        return (
                                          <div className="absolute left-0 right-0 top-full mt-0.5 rounded-lg border overflow-hidden z-50" style={{ backgroundColor: "#0f0f0f", borderColor: `${cfg.color}40`, boxShadow: `0 4px 20px rgba(0,0,0,0.8)` }}>
                                            {sug.map((s, si) => (
                                              <button
                                                key={si}
                                                onMouseDown={e => {
                                                  e.preventDefault();
                                                  const best = s.minPerUnit;
                                                  setDesglosadorSubs(prev => prev.map(sub => sub.tempId === sv.tempId
                                                    ? { ...sub, titulo: s.titulo, cantidadObjetivo: "", tiempoRecordMinPerUnit: best > 0 ? best : undefined }
                                                    : sub
                                                  ));
                                                  setActiveSubSuggestionIdx(null);
                                                }}
                                                onTouchStart={e => {
                                                  e.preventDefault();
                                                  const best = s.minPerUnit;
                                                  setDesglosadorSubs(prev => prev.map(sub => sub.tempId === sv.tempId
                                                    ? { ...sub, titulo: s.titulo, cantidadObjetivo: "", tiempoRecordMinPerUnit: best > 0 ? best : undefined }
                                                    : sub
                                                  ));
                                                  setActiveSubSuggestionIdx(null);
                                                }}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
                                                data-testid={`suggestion-sub-${idx}-${si}`}
                                              >
                                                <span className="text-[10px] text-white truncate mr-2">{s.titulo}</span>
                                                <span className="text-[9px] font-black flex-shrink-0" style={{ color: cfg.color }}>{s.minPerUnit.toFixed(1)} MIN/U</span>
                                              </button>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                      {sv.tiempoRecordMinPerUnit && sv.tiempoRecordMinPerUnit > 0 && (
                                        <p className="text-[8px] mt-0.5 px-1" style={{ color: cfg.color }}>
                                          Récord: {sv.tiempoRecordMinPerUnit.toFixed(1)} MIN/U — escribe cuántas unidades
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <input
                                        type="number"
                                        value={sv.cantidadObjetivo}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setDesglosadorSubs(prev => prev.map(s => {
                                            if (s.tempId !== sv.tempId) return s;
                                            // Si aún no hay récord cargado, intentar cargarlo ahora (más confiable que onBlur en móvil)
                                            let record = s.tiempoRecordMinPerUnit;
                                            if (!record && s.titulo.trim().length >= 2) {
                                              const sug = getSubVehicleRecordSuggestions(s.titulo);
                                              if (sug.length > 0) {
                                                const exact = sug.find(x => x.titulo.toLowerCase() === s.titulo.trim().toLowerCase());
                                                const match = exact ?? sug[0];
                                                const best = match.minPerUnit;
                                                if (best > 0) record = best;
                                              }
                                            }
                                            return { ...s, cantidadObjetivo: val, tiempoRecordMinPerUnit: record };
                                          }));
                                        }}
                                        placeholder="Cant."
                                        className="w-14 bg-black/30 text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none text-center"
                                        data-testid={`input-desglosador-cant-${idx}`}
                                      />
                                      {sv.tiempoRecordMinPerUnit && sv.tiempoRecordMinPerUnit > 0 && sv.cantidadObjetivo && parseFloat(sv.cantidadObjetivo) > 0 && (
                                        <span className="text-[8px] font-mono" style={{ color: "#D4AF37" }}>
                                          ≈{Math.round(parseFloat(sv.cantidadObjetivo) * sv.tiempoRecordMinPerUnit)}m
                                        </span>
                                      )}
                                    </div>
                                    {desglosadorSubs.length > 1 && (
                                      <button onClick={() => setDesglosadorSubs(prev => prev.filter(s => s.tempId !== sv.tempId))} className="p-1 rounded" style={{ color: "#ef4444" }} data-testid={`button-remove-sub-${idx}`}>
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                  {sv.tiempoRecordMinPerUnit && sv.tiempoRecordMinPerUnit > 0 && sv.cantidadObjetivo && parseFloat(sv.cantidadObjetivo) > 0 && (
                                    <motion.div className="w-full pl-8 pr-1 pb-1 space-y-2">
                                      <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={sv.rutaEnfoqueActiva !== false}
                                          onChange={e => setDesglosadorSubs(prev => prev.map(s =>
                                            s.tempId === sv.tempId ? { ...s, rutaEnfoqueActiva: e.target.checked } : s
                                          ))}
                                          className="mt-0.5 accent-violet-500"
                                          data-testid={`checkbox-ruta-enfoque-${idx}`}
                                        />
                                        <span className="text-[8px] leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                                          <span className="font-bold text-violet-300">Ruta de enfoque (3 bandas)</span>
                                          <span className="block font-mono text-[8px] mt-0.5 font-bold" style={{ color: "rgba(255,255,255,0.68)" }}>{formatRutaPreview(parseFloat(sv.cantidadObjetivo))}</span>
                                        </span>
                                      </label>
                                      {sv.rutaEnfoqueActiva !== false && (
                                        <RutaEnfoqueBar
                                          restantes={parseFloat(sv.cantidadObjetivo)}
                                          ruta={createRutaEnfoqueState(parseFloat(sv.cantidadObjetivo))}
                                        />
                                      )}
                                    </motion.div>
                                  )}
                                  </div>
                                ))}
                              </div>
                              {(() => {
                                const totalMin = desglosadorSubs.reduce((acc, s) => {
                                  if (s.tiempoRecordMinPerUnit && s.tiempoRecordMinPerUnit > 0 && s.cantidadObjetivo && parseFloat(s.cantidadObjetivo) > 0) {
                                    return acc + Math.round(parseFloat(s.cantidadObjetivo) * s.tiempoRecordMinPerUnit);
                                  }
                                  return acc;
                                }, 0);
                                if (totalMin <= 0) return null;
                                const finDate = new Date(Date.now() + totalMin * 60000);
                                const finStr = finDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
                                return (
                                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg mt-1" style={{ backgroundColor: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)" }}>
                                    <span className="text-[8px] font-mono" style={{ color: "#D4AF37" }}>TOTAL ESTIMADO</span>
                                    <span className="text-[9px] font-black font-mono" style={{ color: "#D4AF37" }}>{totalMin} min · Fin ≈ {finStr}</span>
                                  </div>
                                );
                              })()}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setDesglosadorSubs(prev => [...prev, { tempId: `sub_${Date.now()}`, titulo: "", cantidadObjetivo: "" }])}
                                  className="flex-1 py-2 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                                  style={{ backgroundColor: `${cfg.color}10`, color: cfg.color, border: `1px dashed ${cfg.color}40` }}
                                  data-testid="button-add-sub"
                                >
                                  <PlusCircle size={11} /> Agregar sub-tarea
                                </button>
                                {titulo.trim().length >= 3 && sugerenciasIA.length === 0 && (
                                  <button
                                    onClick={async () => {
                                      setSugerenciasIALoading(true);
                                      try {
                                        const res = await fetch("/api/desglosador-sugerir", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ titulo: titulo.trim(), historico: historialSubs })
                                        });
                                        const data = await res.json();
                                        const sug: string[] = Array.isArray(data.sugerencias) ? data.sugerencias : [];
                                        setSugerenciasIA(sug);
                                        setSugerenciasIASeleccionadas(new Set(sug));
                                      } catch {
                                        toast.error("No se pudo contactar al servicio IA.");
                                      } finally {
                                        setSugerenciasIALoading(false);
                                      }
                                    }}
                                    disabled={sugerenciasIALoading}
                                    className="py-2 px-3 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 whitespace-nowrap"
                                    style={{ backgroundColor: "#00FFC310", color: "#00FFC3", border: "1px solid #00FFC330" }}
                                    data-testid="button-sugerir-ia-desglosador"
                                  >
                                    {sugerenciasIALoading ? (
                                      <span className="inline-block w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00FFC3", borderTopColor: "transparent" }} />
                                    ) : (
                                      <Sparkles size={10} />
                                    )}
                                    Sugerir IA
                                  </button>
                                )}
                              </div>
                              <p className="text-[8px] text-slate-600 text-center">El "Cant." va al Récord de Producción al cerrar</p>
                            </div>
                          )}
                        </div>
                      )}

                      {tipoFlotaSeleccionado === "situacion" && (
                        <div className="p-3 rounded-xl border" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}30` }}>
                          <label className="text-[9px] text-slate-400 uppercase mb-2 block">¿Qué circunstancia marca el fin?</label>
                          <input value={terminoDetalle} onChange={(e) => setTerminoDetalle(e.target.value)} placeholder="Ej: Cuando complete 3 llamadas..." className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none" data-testid="input-situacion-detalle" />
                        </div>
                      )}

                      {tipoFlotaSeleccionado === "descanso" && (() => {
                        const TIPO_DESCANSO_CONFIG = {
                          intercepcion: { label: "INTERCEPCIÓN", sublabel: "Pausa técnica", rango: "5–15 min", default: "10", color: CYAN, Icon: Zap, ps: 3 },
                          microcarga: { label: "MICRO-CARGA", sublabel: "Siesta activa", rango: "15–45 min", default: "20", color: "#10b981", Icon: Battery, ps: 5 },
                          reset_profundo: { label: "RESET PROFUNDO", sublabel: "Dormir / restablecer", rango: "45+ min", default: "60", color: "#8B5CF6", Icon: Moon, ps: 8 },
                          punto_cero: { label: "PUNTO CERO", sublabel: "Polo Neutro", rango: "10–30 min", default: "20", color: "#D4AF37", Icon: Circle, ps: 12 },
                        } as const;
                        const tipoActivo = tipoDescanso || null;
                        const colorActivo = tipoActivo ? TIPO_DESCANSO_CONFIG[tipoActivo].color : VERDE;
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              {(Object.entries(TIPO_DESCANSO_CONFIG) as ["intercepcion" | "microcarga" | "reset_profundo" | "punto_cero", typeof TIPO_DESCANSO_CONFIG["intercepcion"]][]).map(([key, conf]) => {
                                const active = tipoActivo === key;
                                const isPuntoCero = key === "punto_cero";
                                if (isPuntoCero && progression != null && !puntoCeroUnlocked) {
                                  return (
                                    <div
                                      key={key}
                                      className="p-2 rounded-xl border text-center opacity-60"
                                      style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                                      title="Requiere acceso operativo (Planificación). Si ya lo tenías, recarga tras iniciar sesión."
                                      data-testid={`button-tipo-descanso-${key}-locked`}
                                    >
                                      <conf.Icon size={14} style={{ color: "#64748b", margin: "0 auto 4px" }} />
                                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">{conf.label}</p>
                                      <p className="text-[7px] text-slate-600 mt-1">Acceso operativo</p>
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => { setTipoDescanso(key); setDuracionDescansoH(""); setDuracionDescansoM(conf.default); }}
                                    className="p-2 rounded-xl border text-center transition-all"
                                    style={{ backgroundColor: active ? `${conf.color}15` : "rgba(255,255,255,0.03)", borderColor: active ? conf.color : "rgba(255,255,255,0.1)", boxShadow: active ? `0 0 12px ${conf.color}30` : "none" }}
                                    data-testid={`button-tipo-descanso-${key}`}
                                  >
                                    <conf.Icon size={14} style={{ color: active ? conf.color : "#64748b", margin: "0 auto 4px" }} />
                                    <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: active ? conf.color : "#64748b" }}>{conf.label}</p>
                                    <p className="text-[7px] text-slate-500 mt-0.5">{conf.rango}</p>
                                    <p className="text-[7px] font-bold mt-1" style={{ color: active ? conf.color : "#475569" }}>+{conf.ps} PS</p>
                                  </button>
                                );
                              })}
                            </div>
                            {tipoActivo && (
                              <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${colorActivo}08`, borderColor: `${colorActivo}30` }}>
                                {tipoActivo === "punto_cero" && (
                                  <div className="space-y-2 pb-2 border-b" style={{ borderColor: `${colorActivo}25` }}>
                                    <label className="text-[9px] uppercase tracking-wider block" style={{ color: colorActivo }}>Modo Punto Cero</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setModoPuntoCero("dia")}
                                        className="py-2 px-2 rounded-lg border text-[8px] font-black uppercase tracking-wide transition-all"
                                        style={{
                                          backgroundColor: modoPuntoCero === "dia" ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)",
                                          borderColor: modoPuntoCero === "dia" ? "#fbbf24" : "rgba(255,255,255,0.1)",
                                          color: modoPuntoCero === "dia" ? "#fbbf24" : "#64748b",
                                        }}
                                        data-testid="button-punto-cero-modo-dia"
                                      >
                                        Recarga operativa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setModoPuntoCero("noche")}
                                        className="py-2 px-2 rounded-lg border text-[8px] font-black uppercase tracking-wide transition-all"
                                        style={{
                                          backgroundColor: modoPuntoCero === "noche" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                                          borderColor: modoPuntoCero === "noche" ? "#818cf8" : "rgba(255,255,255,0.1)",
                                          color: modoPuntoCero === "noche" ? "#a5b4fc" : "#64748b",
                                        }}
                                        data-testid="button-punto-cero-modo-noche"
                                      >
                                        Apagón nocturno
                                      </button>
                                    </div>
                                    <p className="text-[7px] text-slate-500 leading-snug">
                                      {modoPuntoCero === "dia"
                                        ? "Pausa de costura · fase activa + ancla theta · reactivación al cerrar."
                                        : "Antes de dormir · delta profundo · susurros cada minuto · silencio final."}
                                    </p>
                                  </div>
                                )}
                                <label className="text-[9px] uppercase tracking-wider mb-1 block" style={{ color: colorActivo }}>Duración</label>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 flex-1">
                                    <input type="number" min="0" max="23" value={duracionDescansoH} onChange={e => setDuracionDescansoH(e.target.value)} placeholder="0" className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none text-center" data-testid="input-descanso-horas" />
                                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: colorActivo }}>h</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-1">
                                    <input type="number" min="0" max="59" value={duracionDescansoM} onChange={e => setDuracionDescansoM(e.target.value)} placeholder={TIPO_DESCANSO_CONFIG[tipoActivo].default} className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none text-center" data-testid="input-descanso-duracion" />
                                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: colorActivo }}>min</span>
                                  </div>
                                </div>
                                {((Number(duracionDescansoH) || 0) * 60 + (Number(duracionDescansoM) || 0)) > 0 && (() => {
                                  const totalMin = (Number(duracionDescansoH) || 0) * 60 + (Number(duracionDescansoM) || 0);
                                  const now = new Date();
                                  const target = new Date(now.getTime() + totalMin * 60000);
                                  const tolerancia = new Date(now.getTime() + (totalMin + 5) * 60000);
                                  const fmtH = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                  return (
                                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: `${colorActivo}10`, border: `1px solid ${colorActivo}30` }}>
                                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: colorActivo }}>Recarga hasta</p>
                                      <p className="text-xl font-black" style={{ color: colorActivo, fontFamily: "JetBrains Mono, monospace" }}>{fmtH(target)}</p>
                                      <p className="text-[9px] text-slate-500 mt-1">Tolerancia hasta {fmtH(tolerancia)} (+5 min)</p>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {isNearDescanso() && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl border-2" style={{ backgroundColor: `${NARANJA}10`, borderColor: NARANJA }}>
                          <div className="flex items-center gap-2">
                            <Flame size={14} style={{ color: NARANJA }} />
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: NARANJA }}>VOLUNTAD SOBRE EL HORARIO</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">Inicias cerca de un descanso programado. +10 PS de Temple.</p>
                        </motion.div>
                      )}

                      <div className="p-3 rounded-xl text-center" style={{ backgroundColor: `${cfg.color}08`, border: `1px solid ${cfg.color}30` }}>
                        <span className="text-xs font-black" style={{ color: cfg.color }}>{cfg.psCierre}</span>
                        <p className="text-[8px] text-slate-500 mt-1">{cfg.relojVisible ? `Reloj visible: ${cfg.relojLabel}` : tipoFlotaSeleccionado === "descanso" ? "Reloj opcional · Activable durante la recarga" : "Reloj oculto · No aplica en este modo"}</p>
                      </div>

                      <div className="p-3 rounded-xl border" style={{ backgroundColor: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.2)" }}>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-2.5">Con qué energía entras</p>
                        <div className="grid grid-cols-3 gap-2">
                          {ENERGIA_ESPEJO_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setIntensidadEnergetica(prev => prev === opt.id ? null : opt.id)}
                              className="py-2.5 rounded-lg flex flex-col items-center gap-0.5 transition-all"
                              style={{
                                backgroundColor: intensidadEnergetica === opt.id ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${intensidadEnergetica === opt.id ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)"}`,
                                color: intensidadEnergetica === opt.id ? "#8B5CF6" : "#555"
                              }}
                              data-testid={`button-intensidad-${opt.id}`}
                            >
                              <span className="text-base font-black leading-none tabular-nums">{opt.badge}</span>
                              <span className="text-[8px] font-black uppercase tracking-wider mt-1">{opt.label}</span>
                              <span className="text-[7px] opacity-60 mt-0.5">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                        {!intensidadEnergetica && (
                          <p className="text-[7px] text-slate-600 text-center mt-1.5">Opcional · Alimenta el Espejo</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleFlotaSave()}
                        disabled={saving || !titulo.trim() || (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "proyectivo" && !horaFinProyectiva) || (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "produccion" && (!cantidadProduccion || !tiempoProduccion)) || (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "investigador" && !cantidadInvestigador) || (tipoFlotaSeleccionado === "tiempo" && relojTiempo === "desglosador" && !desglosadorSubs.some(s => s.titulo.trim())) || (tipoFlotaSeleccionado === "descanso" && !tipoDescanso)}
                        className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        style={{ backgroundColor: cfg.color, color: tipoFlotaSeleccionado === "verdad" ? "#fff" : "#000", boxShadow: `0 0 20px ${cfg.color}40` }}
                        data-testid="button-launch-flota"
                      >
                        {saving ? "Lanzando…" : "Lanzar Vehículo"}
                      </button>
                    </motion.div>
                  )}
                  <button onClick={resetForm} className="w-full py-2 text-xs text-slate-500 hover:text-slate-400">Cancelar</button>
                </>
              );
            })()}
          </motion.div>
        ) : vehicleMode === "express" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Zap size={20} style={{ color: BLOOD }} /><span className="text-sm font-bold" style={{ color: BLOOD }}>VEHÍCULO EXPRESS</span></div>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X size={16} className="text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">Nombre de la Misión</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Llamar a 3 clientes" className="w-full p-4 rounded-xl bg-[#0a0a0a] border text-white placeholder:text-slate-600 focus:outline-none text-sm" style={{ borderColor: titulo ? BLOOD : "rgba(255,255,255,0.1)" }} autoFocus data-testid="input-mission-name" />
              </div>
              {titulo.trim().length >= 3 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <p className="text-xs text-slate-400 text-center">¿Cómo medirás el término?</p>
                  {!selectedTerminoType ? (
                    <>
                      {TERMINO_OPTIONS.map((opt) => (
                        <button key={opt.id} onClick={() => { if (opt.id === "omitido") { handleQuickSaveAndNew(opt.id); } else { setSelectedTerminoType(opt.id); setTerminoDetalle(""); } }} className="w-full p-4 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01]" style={{ borderColor: `${opt.color}40`, backgroundColor: `${opt.color}08` }} data-testid={`button-termino-${opt.id}`}>
                          <div className="text-left">
                            <div className="flex items-center gap-2" style={{ color: opt.color }}>
                              {opt.id === "hora" && <Clock size={14} />}
                              {opt.id === "situacion" && <Flag size={14} />}
                              {opt.id === "omitido" && <X size={14} />}
                              <span>{opt.label}</span>
                            </div>
                            <span className="text-[10px] opacity-70" style={{ color: opt.color }}>{opt.sublabel}</span>
                          </div>
                          <div className="text-right" style={{ color: opt.color }}>
                            <span className="text-xs font-black">+{opt.puntosCumple} PS</span>
                            <div className="text-[9px] opacity-60">({opt.puntosNoCumple} si no cumple)</div>
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: selectedTerminoType === "hora" ? `${GOLD}08` : `${AZURE}08`, borderColor: selectedTerminoType === "hora" ? `${GOLD}40` : `${AZURE}40` }}>
                        <div className="flex items-center gap-2 mb-3">
                          {selectedTerminoType === "hora" ? <Clock size={16} style={{ color: GOLD }} /> : <Flag size={16} style={{ color: AZURE }} />}
                          <span className="text-sm font-bold" style={{ color: selectedTerminoType === "hora" ? GOLD : AZURE }}>{selectedTerminoType === "hora" ? "¿A qué hora termina?" : "¿Qué circunstancia marca el fin?"}</span>
                        </div>
                        <input type={selectedTerminoType === "hora" ? "time" : "text"} value={terminoDetalle} onChange={(e) => setTerminoDetalle(e.target.value)} placeholder={selectedTerminoType === "hora" ? "" : "Ej: Cuando complete 3 llamadas..."} className="w-full bg-black/30 text-white text-sm p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30" autoFocus data-testid="input-termino-detalle" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedTerminoType(null); setTerminoDetalle(""); }} className="flex-1 py-3 rounded-xl text-sm text-slate-400 bg-white/5">Atrás</button>
                        <button onClick={() => handleQuickSaveAndNew(selectedTerminoType, terminoDetalle)} disabled={saving || !terminoDetalle.trim()} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ backgroundColor: selectedTerminoType === "hora" ? GOLD : AZURE, color: "#000" }} data-testid="button-launch-vehicle">Lanzar Vehículo</button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
            <button onClick={resetForm} className="w-full py-2 text-xs text-slate-500 hover:text-slate-400">Cancelar</button>
          </motion.div>
        ) : isCreating ? (
          <div className="p-4 rounded-xl border text-center space-y-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <p className="text-xs text-slate-400">Formulario de lanzamiento incompleto.</p>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setVehicleMode("selector"); setTipoFlotaSeleccionado(null); }}
              className="w-full py-2.5 rounded-lg text-xs font-bold"
              style={{ backgroundColor: `${PLATA}20`, color: PLATA }}
            >
              Volver a La Flota
            </button>
          </div>
        ) : null}
        </PlanTabPanel>

        {cierreEnergiaPending && (() => {
          const showRuta = cierrePayloadHasRutaEnfoque(cierreEnergiaPending);
          const mergedCruzada = cierreEnergiaPending.kind === "desglosador"
            ? mergeRutaCruzadaFromSubs(cierreEnergiaPending.subs)
            : null;
          const resetCierreModal = () => {
            setCierreEnergiaPending(null);
            setCierreEnergiaSeleccion(null);
            setCierreRutaSeleccion(new Set());
            setCierreRutaSinUso(false);
            setCierreRutaPatron(null);
          };
          const confirmCierreEnergia = () => {
            const p = cierreEnergiaPending;
            if (!p || !user) return;
            const sel = cierreEnergiaSeleccion ?? undefined;
            const rutaDecl = showRuta && !cierreRutaSinUso ? Array.from(cierreRutaSeleccion) : [];
            if (p.kind === "flota") void handleFlotaStatusChange(p.vehicleId, p.status, sel);
            else if (p.kind === "investigador") void handleInvestigadorClose(p.vehicleId, p.cumplido, p.cantidadRealizada, sel);
            else if (p.kind === "desglosador") handleDesglosadorGlobalClose(p.vehicleId, p.subs, sel, rutaDecl);
            else void handleDescansoClose(p.vehicleId, p.status, p.etiqueta, p.nota, sel);
            resetCierreModal();
          };
          return (
          <motion.div
            className="sistemicar-modal-overlay z-[220]"
            style={{ backgroundColor: "rgba(0,0,0,0.82)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cierre-energia-titulo"
            onClick={resetCierreModal}
          >
            <div className="sistemicar-modal-shell">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              tabIndex={-1}
              autoFocus
              onClick={e => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCierreEnergia();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  resetCierreModal();
                }
              }}
              className="sistemicar-modal-panel max-w-sm rounded-2xl border p-5 space-y-4 outline-none"
              style={{ backgroundColor: PIZARRA, borderColor: "rgba(139,92,246,0.35)" }}
            >
              <div className="text-center space-y-1">
                <p id="cierre-energia-titulo" className="text-sm font-bold text-white">Cierre consciente</p>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Con qué energía terminas (opcional). Elige F fluido, C concentrado o L al límite. Alimenta tu Espejo.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ENERGIA_ESPEJO_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCierreEnergiaSeleccion(prev => prev === opt.id ? null : opt.id)}
                    className="py-2.5 rounded-lg flex flex-col items-center gap-0.5 transition-all"
                    style={{
                      backgroundColor: cierreEnergiaSeleccion === opt.id ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${cierreEnergiaSeleccion === opt.id ? "rgba(139,92,246,0.55)" : "rgba(255,255,255,0.08)"}`,
                      color: cierreEnergiaSeleccion === opt.id ? "#a78bfa" : "#64748b",
                    }}
                  >
                    <span className="text-base font-black leading-none tabular-nums">{opt.badge}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">{opt.label}</span>
                    <span className="text-[7px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {showRuta && (
                <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <RutaSeguimientoPicker
                    cruzadaReferencia={mergedCruzada}
                    seleccion={cierreRutaSeleccion}
                    sinUso={cierreRutaSinUso}
                    patronActivo={cierreRutaPatron}
                    onSeleccionChange={(bandas, patron) => {
                      setCierreRutaSeleccion(bandas);
                      setCierreRutaPatron(patron);
                    }}
                    onSinUsoChange={sin => {
                      setCierreRutaSinUso(sin);
                      if (sin) setCierreRutaPatron("sin_ruta");
                    }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetCierreModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCierreEnergia}
                  disabled={showRuta && !rutaSeguimientoPickerCanConfirm(cierreRutaSinUso, cierreRutaSeleccion)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40"
                  style={{ backgroundColor: VIOLET, color: "#fff" }}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
            </div>
          </motion.div>
          );
        })()}

        {situacionDesgloseCelebration && (() => {
          const { titulo, summary } = situacionDesgloseCelebration;
          const combustibleMensaje = summary.combustibleMensaje ?? formatCombustibleCelebracionBloque({
            minutos: summary.minutosBloque,
            decisiones: summary.cumplidos,
            psTotal: summary.psTotal,
          });
          const ratioPct = summary.totalFilas > 0
            ? Math.round((summary.cumplidos / summary.totalFilas) * 100)
            : 0;
          return (
            <motion.div
              className="sistemicar-modal-overlay z-[225]"
              style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="situacion-desglose-celebracion-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sistemicar-modal-shell">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="sistemicar-modal-panel max-w-md rounded-2xl border p-5 space-y-4"
                style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}55`, boxShadow: `0 0 40px ${GOLD}25, inset 0 0 60px ${GOLD}08` }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  animate={{ opacity: [0.2, 0.45, 0.2] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top, ${GOLD}18 0%, transparent 65%)` }}
                />
                <div className="relative text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}20`, boxShadow: `0 0 20px ${GOLD}35` }}>
                      <Trophy size={22} style={{ color: GOLD }} />
                    </div>
                  </div>
                  <p id="situacion-desglose-celebracion-titulo" className="text-sm font-black uppercase tracking-wider" style={{ color: GOLD }}>
                    Bloque completado
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 truncate px-4">{titulo}</p>
                </div>

                <div
                  className="relative rounded-xl p-3 space-y-2"
                  style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.28)" }}
                  data-testid="situacion-celebracion-combustible"
                >
                  <p className="text-[8px] font-black uppercase tracking-wider text-center" style={{ color: "#A78BFA" }}>
                    Combustible de conciencia
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed text-center px-1">
                    {combustibleMensaje}
                  </p>
                  <div className="flex justify-center gap-4 text-center">
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">Tiempo</p>
                      <p className="text-sm font-black font-mono" style={{ color: PLATA }}>{summary.minutosBloque} min</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">Decisiones</p>
                      <p className="text-sm font-black" style={{ color: VERDE }}>{summary.cumplidos}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">PS ganados</p>
                      <p className="text-sm font-black" style={{ color: GOLD }}>+{summary.psTotal}</p>
                    </div>
                  </div>
                </div>

                <p className="relative text-[10px] text-slate-400 leading-relaxed px-2 text-center">{summary.mensaje}</p>

                <div className="relative grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(0,200,81,0.08)", border: "1px solid rgba(0,200,81,0.25)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Situaciones</p>
                    <p className="text-lg font-black" style={{ color: VERDE }}>{summary.cumplidos}</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Falladas</p>
                    <p className="text-lg font-black" style={{ color: "#f87171" }}>{summary.fallados}</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Minutos</p>
                    <p className="text-lg font-black text-slate-300">{summary.minutosBloque}</p>
                  </div>
                </div>

                {(summary.minutosGanados > 0 || summary.minutosAdelanto > 0) && (
                  <div
                    className="relative rounded-xl p-3 space-y-2"
                    style={{ backgroundColor: "rgba(0,255,195,0.06)", border: `1px solid ${CYAN}35` }}
                  >
                    <p className="text-[8px] font-black uppercase tracking-wider text-center" style={{ color: CYAN }}>
                      Tiempo recuperado por eficiencia
                    </p>
                    <div className="flex justify-center items-baseline gap-2">
                      <span className="text-2xl font-black font-mono tabular-nums" style={{ color: VERDE }}>
                        +{summary.minutosGanados}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">min ganados</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 text-[8px] text-slate-500">
                      {summary.minutosAdelanto > 0 && (
                        <span>Adelanto en meta: {summary.minutosAdelanto} min</span>
                      )}
                      {summary.eficienciaPct != null && (
                        <span style={{ color: CYAN }}>Eficiencia {summary.eficienciaPct}%</span>
                      )}
                    </div>
                    {summary.minutosGanadosSesion > summary.minutosGanados && (
                      <p className="text-[7px] text-center text-slate-600">
                        Sesión acumulada: +{summary.minutosGanadosSesion} min en {summary.retoNumero} reto
                        {summary.retoNumero !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {summary.totalFilas > 0 && (
                  <div className="relative">
                    <div className="flex justify-between text-[8px] text-slate-500 mb-1">
                      <span>Conquista del bloque</span>
                      <span style={{ color: ratioPct >= 70 ? EMERALD : GOLD }}>{ratioPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ratioPct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${EMERALD}88, ${GOLD})` }}
                      />
                    </div>
                  </div>
                )}

                {summary.casaHechas > 0 && (
                  <div className="relative rounded-xl p-3 space-y-2" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.22)" }}>
                    <div className="flex justify-between items-baseline">
                      <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: VERDE }}>
                        Casa — lo repetible que hiciste
                      </p>
                      <span className="text-base font-black font-mono tabular-nums" style={{ color: GOLD }}>
                        ×{summary.casaHechas}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(summary.casaPorTexto ?? []).slice(0, 6).map(g => (
                        <span
                          key={g.texto}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: "rgba(34,197,94,0.1)", color: VERDE, border: "1px solid rgba(34,197,94,0.2)" }}
                        >
                          <span className="truncate max-w-[140px]">{g.texto}</span>
                          <span className="font-mono tabular-nums" style={{ color: GOLD }}>×{g.hechas}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[8px] text-slate-500 leading-snug">
                      Sin medir minutos — pero la cantidad cuenta. Mañana puedes superar este número.
                    </p>
                  </div>
                )}

                <div className="relative rounded-xl p-3 space-y-1.5" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}25` }}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-center mb-2" style={{ color: "rgba(212,175,55,0.7)" }}>
                    <Sparkles size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} />
                    Energía ganada en este bloque
                  </p>
                  {summary.psFilas > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Filas cumplidas ({summary.cumplidos} × 4 PS)</span>
                      <span className="font-bold" style={{ color: EMERALD }}>+{summary.psFilas} PS</span>
                    </div>
                  )}
                  {summary.psProfundidad > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Profundidad de bloque</span>
                      <span className="font-bold" style={{ color: GOLD }}>+{summary.psProfundidad} PS</span>
                    </div>
                  )}
                  {summary.psDetalles > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Detalles entregados</span>
                      <span className="font-bold" style={{ color: CYAN }}>+{summary.psDetalles} PS</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 mt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="text-[10px] font-black uppercase text-white">Total del esfuerzo</span>
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.15, 1] }}
                      transition={{ duration: 0.6 }}
                      className="text-base font-black"
                      style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}50` }}
                    >
                      +{summary.psTotal} PS
                    </motion.span>
                  </div>
                </div>

                <div
                  className="sticky bottom-0 z-10 pt-3 -mx-1 px-1 space-y-2"
                  style={{ background: `linear-gradient(to top, ${PIZARRA} 72%, ${PIZARRA}00)` }}
                >
                <button
                  type="button"
                  onClick={() => {
                    teardownSituacionSession(situacionDesgloseCelebration.vehicleId);
                    setSituacionDesgloseCelebration(null);
                  }}
                  className="relative w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider"
                  style={{ backgroundColor: GOLD, color: "#000", boxShadow: `0 0 24px ${GOLD}40` }}
                  data-testid="situacion-desglose-absorber"
                >
                  Absorber victoria
                </button>
                <p className="relative text-[7px] text-center text-slate-600 leading-snug">
                  El desglose permanece en el vehículo con «Ver PS del bloque» si cierras antes de leer.
                </p>
                </div>
              </motion.div>
              </div>
            </motion.div>
          );
        })()}

        {desglosadorTiempoCelebration && (() => {
          const { titulo, summary } = desglosadorTiempoCelebration;
          const hasSugerido = summary.totalSugeridoSec > 0;
          const deltaColor = summary.deltaGanando ? VERDE : summary.deltaPerdiendo ? BLOOD : GOLD;
          const deltaLabel = summary.deltaGanando
            ? `↓ ${fmtDesgloseSec(Math.abs(summary.deltaTotalSec))} ganado`
            : summary.deltaPerdiendo
              ? `↑ ${fmtDesgloseSec(summary.deltaTotalSec)} extra`
              : hasSugerido
                ? "→ en tiempo"
                : "Sin referencia";
          const ratioPct = summary.totalSubs > 0
            ? Math.round((summary.cumplidos / summary.totalSubs) * 100)
            : 0;
          return (
            <motion.div
              className="sistemicar-modal-overlay z-[225]"
              style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="desglosador-tiempo-celebracion-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sistemicar-modal-shell">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="sistemicar-modal-panel max-w-md rounded-2xl border p-5 space-y-4"
                style={{ backgroundColor: PIZARRA, borderColor: `${GOLD}55`, boxShadow: `0 0 40px ${GOLD}25, inset 0 0 60px ${GOLD}08` }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  animate={{ opacity: [0.2, 0.45, 0.2] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top, ${GOLD}18 0%, transparent 65%)` }}
                />
                <div className="relative text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GOLD}20`, boxShadow: `0 0 20px ${GOLD}35` }}>
                      <Trophy size={22} style={{ color: GOLD }} />
                    </div>
                  </div>
                  <p id="desglosador-tiempo-celebracion-titulo" className="text-sm font-black uppercase tracking-wider" style={{ color: GOLD }}>
                    Ciclo cerrado
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 truncate px-4">{titulo}</p>
                </div>

                <div
                  className="relative rounded-xl p-3 space-y-2"
                  style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.28)" }}
                  data-testid="desglosador-celebracion-combustible"
                >
                  <p className="text-[8px] font-black uppercase tracking-wider text-center" style={{ color: "#A78BFA" }}>
                    Combustible de conciencia
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed text-center px-1">
                    {summary.combustibleMensaje}
                  </p>
                  <div className="flex justify-center gap-4 text-center">
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">Tiempo</p>
                      <p className="text-sm font-black font-mono" style={{ color: PLATA }}>{summary.minutosSesion} min</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">Decisiones</p>
                      <p className="text-sm font-black" style={{ color: VERDE }}>{summary.cumplidos}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase text-slate-500">PS sesión</p>
                      <p className="text-sm font-black" style={{ color: GOLD }}>+{summary.psTotal}</p>
                    </div>
                  </div>
                </div>

                <p className="relative text-[10px] text-slate-400 leading-relaxed px-2 text-center">{summary.mensaje}</p>

                <div className="relative grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(0,200,81,0.08)", border: "1px solid rgba(0,200,81,0.25)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Cumplidos</p>
                    <p className="text-lg font-black" style={{ color: VERDE }}>{summary.cumplidos}</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Fallados</p>
                    <p className="text-lg font-black" style={{ color: "#f87171" }}>{summary.fallados}</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.22)" }}>
                    <p className="text-[7px] uppercase text-slate-500">Desglose</p>
                    <p className="text-sm font-black font-mono" style={{ color: "#38BDF8" }}>{formatElapsedHHMMSS(summary.sessionElapsedSec)}</p>
                  </div>
                </div>

                {hasSugerido && (
                  <div
                    className="relative rounded-xl p-3 space-y-2"
                    style={{ backgroundColor: `${deltaColor}10`, border: `1px solid ${deltaColor}35` }}
                  >
                    <p className="text-[8px] font-black uppercase tracking-wider text-center" style={{ color: deltaColor }}>
                      Tiempo vs referencia
                    </p>
                    <div className="flex justify-center items-baseline gap-2 flex-wrap">
                      <span className="text-[9px] text-slate-500">Sugerido {fmtDesgloseSec(summary.totalSugeridoSec)}</span>
                      <span className="text-[9px] text-slate-600">·</span>
                      <span className="text-[9px] text-slate-400">Real {fmtDesgloseSec(summary.totalRealSec)}</span>
                      <span className="text-[9px] font-black uppercase" style={{ color: deltaColor }}>{deltaLabel}</span>
                    </div>
                  </div>
                )}

                {summary.totalSubs > 0 && (
                  <div className="relative">
                    <div className="flex justify-between text-[8px] text-slate-500 mb-1">
                      <span>Conquista del ciclo</span>
                      <span style={{ color: ratioPct >= 70 ? EMERALD : GOLD }}>{ratioPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ratioPct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${EMERALD}88, ${GOLD})` }}
                      />
                    </div>
                  </div>
                )}

                {summary.subs.length > 0 && (
                  <div className="relative space-y-1.5 max-h-36 overflow-y-auto">
                    {summary.subs.map(sv => {
                      const subDelta =
                        sv.duracionFinal !== undefined && sv.tiempoSugeridoSeg !== undefined
                          ? sv.duracionFinal - sv.tiempoSugeridoSeg
                          : null;
                      const subGanando = subDelta !== null && subDelta < -5;
                      const subPerdiendo = subDelta !== null && subDelta > 5;
                      const subDeltaColor = subGanando ? VERDE : subPerdiendo ? BLOOD : "#94a3b8";
                      return (
                        <div
                          key={sv.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                          style={{
                            backgroundColor: sv.status === "cumplido" ? "rgba(0,200,81,0.06)" : "rgba(239,68,68,0.06)",
                            border: `1px solid ${sv.status === "cumplido" ? "rgba(0,200,81,0.15)" : "rgba(239,68,68,0.15)"}`,
                          }}
                        >
                          {sv.status === "cumplido" ? (
                            <CheckCircle2 size={10} style={{ color: VERDE }} />
                          ) : (
                            <XCircle size={10} className="text-red-400" />
                          )}
                          <span className="text-[10px] font-bold text-white flex-1 truncate">{cleanSubTitulo(sv.titulo)}</span>
                          {sv.cantidadLograda !== undefined && (
                            <span className="text-[8px] font-mono px-1 rounded" style={{ backgroundColor: `${GOLD}20`, color: GOLD }}>
                              {sv.cantidadLograda}/{sv.cantidadObjetivo}
                            </span>
                          )}
                          {sv.duracionFinal !== undefined && (
                            <span className="text-[8px] font-mono text-slate-400">{fmtDesgloseSec(sv.duracionFinal)}</span>
                          )}
                          {subDelta !== null && (
                            <span className="text-[8px] font-black" style={{ color: subDeltaColor }}>
                              {subGanando ? `−${fmtDesgloseSec(Math.abs(subDelta))}` : subPerdiendo ? `+${fmtDesgloseSec(subDelta)}` : "≈"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="relative rounded-xl p-3 space-y-1.5" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}25` }}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-center mb-2" style={{ color: "rgba(212,175,55,0.7)" }}>
                    <Sparkles size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} />
                    Energía ganada en este ciclo
                  </p>
                  {summary.psSubs > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Subs cumplidos ({summary.cumplidos})</span>
                      <span className="font-bold" style={{ color: EMERALD }}>+{summary.psSubs} PS</span>
                    </div>
                  )}
                  {summary.psCierre > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Cierre de ciclo</span>
                      <span className="font-bold" style={{ color: GOLD }}>+{summary.psCierre} PS</span>
                    </div>
                  )}
                  {summary.psProfundidad > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Profundidad de sesión</span>
                      <span className="font-bold" style={{ color: GOLD }}>+{summary.psProfundidad} PS</span>
                    </div>
                  )}
                  {summary.psRuta > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Ruta de enfoque (en subs)</span>
                      <span className="font-bold" style={{ color: CYAN }}>+{summary.psRuta} PS</span>
                    </div>
                  )}
                  {summary.psAwardedNow > 0 && summary.psAwardedNow < summary.psTotal && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Sumados ahora a la barra</span>
                      <span className="font-bold" style={{ color: PLATA }}>+{summary.psAwardedNow} PS</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 mt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="text-[10px] font-black uppercase text-white">Total del esfuerzo</span>
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.15, 1] }}
                      transition={{ duration: 0.6 }}
                      className="text-base font-black"
                      style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}50` }}
                    >
                      +{summary.psTotal} PS
                    </motion.span>
                  </div>
                </div>

                <div
                  className="sticky bottom-0 z-10 pt-3 -mx-1 px-1"
                  style={{ background: `linear-gradient(to top, ${PIZARRA} 72%, ${PIZARRA}00)` }}
                >
                <button
                  type="button"
                  onClick={() => {
                    setDesglosadorTiempoCelebration(null);
                  }}
                  className="relative w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider"
                  style={{ backgroundColor: GOLD, color: "#000", boxShadow: `0 0 24px ${GOLD}40` }}
                  data-testid="desglosador-tiempo-absorber"
                >
                  Absorber victoria
                </button>
                </div>
              </motion.div>
              </div>
            </motion.div>
          );
        })()}

        {showCierreJornada && (
          <CierreJornadaModal
            vehicles={vehicles}
            segmentos={planilla?.segmentos || []}
            todayPoints={dailyPS}
            existingCierre={todayCierreJornada}
            onClose={() => setShowCierreJornada(false)}
            onSeal={async (cierre) => {
              if (!user) {
                toast.error("Inicia sesión para sellar la jornada");
                return;
              }

              const fecha = getLimaDateString();
              const dayStartMs = getLimaDayStartMs();
              const journalStartMs = getJournalDayStartMs();
              const jornadaVehicles = vehicles.filter(v => {
                const ts = v.cierreAt || v.aperturaAt || v.createdAt?.getTime?.() || 0;
                return ts >= journalStartMs;
              });
              const balance = calcularBalanceConquistaJornada({
                segmentos: planilla?.segmentos || [],
                vehiculos: filterVehiclesForAnilloCoverage(vehicles, Date.now()),
                now: Date.now(),
                dayStartMs,
              });

              const fresh = getDailyPointsLocalSync(user.uid);
              const events = await safeWithFallback(getFocusBandEventsRecent(user.uid, 1), [], 3000);
              const todayEvents = events.filter(e => e.fecha === fecha);
              const decisionLedger = getDecisionLedger(user.uid, journalStartMs);

              const snapshot = buildDailySnapshot({
                fecha,
                segmentos: planilla?.segmentos || [],
                vehicles: jornadaVehicles,
                dayStartMs,
                logs: fresh.logs,
                events: todayEvents,
                ledgerEntries: decisionLedger,
                conquistaMin: balance.conquistaMin,
                entropiaMin: balance.entropiaMin,
                vacioMin: balance.vacioMin,
              });

              const { localSaved: snapshotSaved } = await savePlanillaDailySnapshot(user.uid, snapshot);

              const sealed: CierreJornadaLog = {
                ...cierre,
                totalPS: fresh.total,
                fecha,
                psPanoramico: snapshot.psDesglose.panoramico,
                psEspectro: snapshot.psDesglose.espectro,
                psVehiculos: snapshot.psDesglose.vehiculos,
                psIntrospeccion: 0,
                profundidadMaxima: snapshot.profundidadMaxima,
                bloquesCompletados: snapshot.bloquesCompletados,
                descansosCuerpo: snapshot.espectroBloques.descansosCuerpo,
              };

              const { localSaved: cierreSaved } = await saveCierreJornada(user.uid, sealed);

              if (!snapshotSaved && !cierreSaved) {
                toast.error("No se pudo sellar la jornada", {
                  description: "Libera espacio en el navegador o cierra pestañas y vuelve a intentar.",
                  style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
                });
                return;
              }

              setTodayCierreJornada(sealed);
              setShowCierreJornada(false);

              toast.success("Jornada Sellada", {
                description: `${(sealed as any).porcentajeDiaIdeal || sealed.porcentajeSoberania}% Día Ideal · ${cierre.escaleraConciencia?.decisionesHoy ?? snapshot.decisionesDelDia ?? 0} decisiones · Presencia ${cierre.escaleraConciencia?.presenciaNivel ?? "—"} · Producción ${cierre.escaleraConciencia?.produccionNivel ?? "—"} · ${sealed.totalPS} PS refuerzo${!snapshotSaved || !cierreSaved ? " · guardado parcial en dispositivo" : ""}`,
                style: { backgroundColor: PIZARRA, border: `2px solid ${GOLD}`, color: GOLD },
              });

              if (!snapshotSaved || !cierreSaved) {
                toast.info("Sincronización en la nube pendiente", {
                  description: "El sello quedó en tu dispositivo. La nube se actualizará cuando haya conexión estable.",
                  style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
                  duration: 4000,
                });
              }

              void (async () => {
                try {
                  const sealPel = await safeWithFallback(
                    sealPeldanosFromSegmentos(user.uid, {
                      fecha,
                      segmentos: planilla?.segmentos ?? [],
                      vehicles: jornadaVehicles,
                      dayStartMs,
                      events: todayEvents,
                    }),
                    { sealed: 0, peldanoIds: [] },
                    8000
                  );
                  if (sealPel.sealed > 0) {
                    toast.success(`${sealPel.sealed} peldaño(s) en Proyectos`, {
                      description: "Segmentos cerrados sellados en tu escalera.",
                      style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
                    });
                  }
                } catch (e) {
                  console.error("[CierreJornada] peldaños en segundo plano:", e);
                }
              })();
            }}
            userId={user?.uid || ""}
          />
        )}

        <PlaneacionCrisolDock
          items={reservaActivas}
          proyectos={imanProyectos}
          defaultProyectoId={segmentoActivo?.proyectoVinculadoId ?? ""}
          onQuickAdd={handleReservaTacticaQuickAdd}
          onEnviarUnidad={handleEnviarReservaASituacion}
          onEnviarSeleccion={handleEnviarReservasSeleccionadas}
          onAbrirNido={handleAbrirNidoEnSituacion}
          onDelete={handleReservaEliminar}
          onRutaChange={handleReservaRutaChange}
        />

        {showEntropyDebug && (
          <EntropiaDebugPanel
            segmentos={planilla?.segmentos || []}
            vehicles={vehicles}
          />
        )}
      </div>
    </div>
  );
}

function AccordionSection({ title, subtitle, icon: Icon, color, count, children, defaultOpen = true }: {
  title: string; subtitle?: string; icon: any; color: string; count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border overflow-hidden" style={{ backgroundColor: PIZARRA, borderColor: `${color}20` }}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{title}</span>
          {subtitle && <span className="text-[8px] px-2 py-0.5 rounded-full ml-1 bg-slate-700/30 text-slate-500 uppercase tracking-wider">{subtitle}</span>}
          <span className="text-[9px] px-2 py-0.5 rounded-full ml-1" style={{ backgroundColor: `${color}20`, color }}>{count} activo{count !== 1 ? "s" : ""}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DepositoEnergeticoSection({ vehicles, planilla }: { vehicles: Vehicle[]; planilla?: Planilla | null }) {
  const flotaTypes: TipoFlota[] = ["tiempo", "situacion", "descanso", "verdad"];
  const flotaStats = flotaTypes.map(tipo => {
    const all = vehicles.filter(v => v.tipoFlota === tipo);
    const completed = all.filter(v => v.status === "cumplido");
    const pct = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0;
    const totalMin = all.reduce((sum, v) => sum + (v.duracionFinal || 0), 0);
    const activeMin = all.filter(v => v.status === "activo" && v.aperturaAt).reduce((sum, v) => {
      const elapsed = Math.round((Date.now() - (v.aperturaAt || 0)) / 60000);
      return sum + elapsed;
    }, 0);
    return { tipo, all: all.length, completed: completed.length, pct, totalMin: totalMin + activeMin };
  });
  const totalAll = vehicles.length;
  const totalCompleted = vehicles.filter(v => v.status === "cumplido").length;
  const flotaColors: Record<TipoFlota, string> = { tiempo: NARANJA, situacion: PLATA, descanso: VERDE, verdad: GRIS };
  const flotaLabels = flotaLabelsRecord();

  const verdadVehicles = vehicles.filter(v => v.tipoFlota === "verdad");
  const verdadInconsciente = verdadVehicles.filter(v => v.autoVerdad);
  const verdadConsciente = verdadVehicles.filter(v => !v.autoVerdad);
  const tiempoInconsciente = verdadInconsciente.reduce((sum, v) => {
    if (v.duracionFinal) return sum + v.duracionFinal;
    if (v.status === "activo" && v.aperturaAt) return sum + Math.round((Date.now() - v.aperturaAt) / 60000);
    return sum;
  }, 0);
  const tiempoConsciente = verdadConsciente.reduce((sum, v) => {
    if (v.duracionFinal) return sum + v.duracionFinal;
    if (v.status === "activo" && v.aperturaAt) return sum + Math.round((Date.now() - v.aperturaAt) / 60000);
    return sum;
  }, 0);
  const totalTimeAll = flotaStats.reduce((sum, s) => sum + s.totalMin, 0);

  const calcConciencia = () => {
    const signals: number[] = [];

    if (totalAll > 0) {
      const cerradosConscientes = vehicles.filter(v => v.status === "cumplido" || v.status === "archivado").length;
      const activos = vehicles.filter(v => v.status === "activo").length;
      if (cerradosConscientes + activos > 0) {
        signals.push(Math.round((cerradosConscientes / (cerradosConscientes + activos)) * 100));
      }

      const vehiculosCumplidos = vehicles.filter(v => v.status === "cumplido").length;
      const vehiculosArchivados = vehicles.filter(v => v.status === "archivado").length;
      const totalCerrados = vehiculosCumplidos + vehiculosArchivados;
      if (totalCerrados > 0) {
        signals.push(Math.round((vehiculosCumplidos / totalCerrados) * 100));
      }
    }

    if (verdadVehicles.length > 0) {
      const tiempoTotal = tiempoConsciente + tiempoInconsciente;
      if (tiempoTotal > 0) {
        signals.push(Math.round((tiempoConsciente / tiempoTotal) * 100));
      }
    }

    if (planilla && planilla.segmentos.length > 0) {
      const segsPasados = planilla.segmentos.filter(s => s.estado === "cerrado_manual" || s.estado === "entropia");
      if (segsPasados.length > 0) {
        const cerradosManual = segsPasados.filter(s => s.estado === "cerrado_manual").length;
        signals.push(Math.round((cerradosManual / segsPasados.length) * 100));
      }
    }

    const situacionales = vehicles.filter(v => v.tipoFlota === "situacion");
    if (situacionales.length > 0) {
      let situacionalScore = 0;
      situacionales.forEach(v => {
        const tieneSubTareas = (v.subTareas || []).length > 0;
        const duracionMin = v.duracionFinal || (v.aperturaAt ? Math.round((Date.now() - v.aperturaAt) / 60000) : 0);
        if (tieneSubTareas) {
          situacionalScore += 100;
        } else if (duracionMin > 30) {
          situacionalScore += Math.max(0, 100 - Math.min(80, (duracionMin - 30) * 2));
        } else {
          situacionalScore += 80;
        }
      });
      signals.push(Math.round(situacionalScore / situacionales.length));
    }

    if (signals.length === 0) return 0;
    return Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
  };

  const concienciaPct = calcConciencia();

  const fmtMin = (min: number) => {
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${min}m`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border overflow-hidden p-4 space-y-4" style={{ backgroundColor: PIZARRA, borderColor: `${AZURE}25` }} data-testid="deposito-energetico-section">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} style={{ color: AZURE }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: AZURE }}>Cilindro de Fusión</span>
      </div>
      <div className="space-y-3 relative">
        {flotaStats.map(({ tipo, all, completed, pct, totalMin }) => {
          const color = flotaColors[tipo];
          return (
            <div key={tipo} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{flotaLabels[tipo]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold" style={{ color: tipo === "verdad" ? BLOOD : color }}>{fmtMin(totalMin)}</span>
                  <span className="text-[9px] font-bold" style={{ color }}>{completed}/{all}</span>
                </div>
              </div>
              <div className="h-5 rounded-full overflow-hidden relative" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full relative" style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  transition: "all 1000ms ease-out",
                  boxShadow: pct > 0 ? `0 0 12px ${color}60, inset 0 1px 2px rgba(255,255,255,0.2)` : "none"
                }}>
                  {pct > 0 && <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`, animation: "pulse 2s ease-in-out infinite" }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(verdadInconsciente.length > 0 || verdadConsciente.length > 0) && (
        <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: "rgba(0,0,0,0.3)", borderColor: `${GRIS}20` }}>
          <div className="flex items-center gap-2 mb-1">
            <Eye size={10} style={{ color: GRIS }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: GRIS }}>Desglose Verdad</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${BLOOD}10`, border: `1px solid ${BLOOD}20` }}>
              <p className="text-sm font-black" style={{ color: BLOOD }}>{fmtMin(tiempoInconsciente)}</p>
              <p className="text-[7px] text-slate-500 uppercase">Histórico auto</p>
              <p className="text-[7px]" style={{ color: BLOOD }}>{verdadInconsciente.length} eventos</p>
            </div>
            <div className="p-2 rounded-lg text-center" style={{ backgroundColor: `${EMERALD}10`, border: `1px solid ${EMERALD}20` }}>
              <p className="text-sm font-black" style={{ color: EMERALD }}>{fmtMin(tiempoConsciente)}</p>
              <p className="text-[7px] text-slate-500 uppercase">Consciente</p>
              <p className="text-[7px]" style={{ color: EMERALD }}>{verdadConsciente.length} eventos</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">% Conciencia del Usuario</p>
        <span className="text-4xl font-black" style={{
          color: concienciaPct > 80 ? GOLD : concienciaPct > 50 ? EMERALD : BLOOD,
          textShadow: `0 0 20px ${concienciaPct > 80 ? GOLD : concienciaPct > 50 ? EMERALD : BLOOD}40`,
          fontFamily: "'Playfair Display', Georgia, serif"
        }} data-testid="text-conciencia-pct">{concienciaPct}%</span>
        <p className="text-[8px] text-slate-600 mt-1 italic">Puertas · Desglose · Verdad · Disciplina</p>
        {totalTimeAll > 0 && <p className="text-[9px] text-slate-600 mt-1">Tiempo total registrado: {fmtMin(totalTimeAll)}</p>}
      </div>
    </motion.div>
  );
}

function CierreJornadaModal({
  vehicles, segmentos, todayPoints, existingCierre, onClose, onSeal, userId
}: {
  vehicles: Vehicle[];
  segmentos: SegmentoV5[];
  todayPoints: number;
  existingCierre?: CierreJornadaLog | null;
  onClose: () => void;
  onSeal: (cierre: CierreJornadaLog) => void | Promise<void>;
  userId: string;
}) {
  const [isSealing, setIsSealing] = useState(false);
  const alreadySealed = Boolean(existingCierre?.selloEmitido ?? existingCierre);
  const journalStartMs = getJournalDayStartMs();
  const segmentDayStartMs = getLimaDayStartMs();

  const jornadaVehicles = useMemo(
    () =>
      vehicles.filter(v => {
        const ts = v.cierreAt || v.aperturaAt || v.createdAt?.getTime?.() || 0;
        return ts >= journalStartMs;
      }),
    [vehicles, journalStartMs]
  );

  const balance = useMemo(
    () =>
      calcularBalanceConquistaJornada({
        segmentos,
        vehiculos: filterVehiclesForAnilloCoverage(vehicles, Date.now()),
        now: Date.now(),
        dayStartMs: segmentDayStartMs,
      }),
    [segmentos, vehicles, segmentDayStartMs]
  );

  const escaleraCierre = useMemo(() => {
    const nowMs = Date.now();
    const vehiculosAnillo = filterVehiclesForAnilloCoverage(vehicles, nowMs);
    const timeline = buildConcienciaTimeline({
      segmentos,
      vehiculos: vehiculosAnillo,
      now: nowMs,
    });
    const jornadaVehiclesTermo = vehicles.filter(v => vehicleEnTermoJornada(v, journalStartMs));
    const ledger = getDecisionLedger(userId, journalStartMs);
    const combustible = computeCombustibleDia(jornadaVehiclesTermo, journalStartMs, ledger);
    const disciplina = computeDisciplinaDia({
      segmentos,
      vehicles: jornadaVehicles,
      dayStartMs: segmentDayStartMs,
      nowMs,
    });
    return buildEscaleraConciencia({
      dayStats: timeline.dayStats,
      conquistaArcPct: timeline.metricas.conquistaArcPct,
      disciplina,
      combustible,
      ledger,
      dayStartMs: journalStartMs,
      nowMs,
    });
  }, [segmentos, vehicles, jornadaVehicles, journalStartMs, segmentDayStartMs, userId]);

  const cumplidos = jornadaVehicles.filter(v => v.status === "cumplido").length;
  const archivados = jornadaVehicles.filter(v => v.status === "archivado").length;
  const activos = jornadaVehicles.filter(v => v.status === "activo").length;
  const cerrados = cumplidos + archivados;
  const segmentosManual = segmentos.filter(s => s.estado === "cerrado_manual").length;
  const segmentosEntropia = segmentos.filter(s => s.estado === "entropia").length;
  const peldañosListos = countSegmentosListosParaSellar(segmentos);
  const porcentajeCumplidos = cerrados > 0 ? Math.round((cumplidos / cerrados) * 100) : 0;
  const flotaTypes: TipoFlota[] = ["tiempo", "situacion", "descanso", "verdad"];
  const flotaLabels = flotaLabelsRecord();

  const getMotivationalPhrase = () => {
    if (cumplidos >= 5 || porcentajeCumplidos >= 90) return "Dominio absoluto. El guerrero se forja en la constancia.";
    if (cumplidos >= 3 || porcentajeCumplidos >= 70) return "Jornada sólida. La disciplina habla por ti.";
    if (cerrados > 0) return "Avance real. Reconoce lo hecho, corrige lo pendiente.";
    if (todayPoints > 0) return `Ganaste ${todayPoints} PS hoy. El esfuerzo quedó registrado.`;
    return "Cierra lo pendiente o sella para archivar el día.";
  };

  const selloTexto = getMotivationalPhrase();

  const todayFormatted = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const handleSeal = async () => {
    if (isSealing || alreadySealed) return;
    setIsSealing(true);
    try {
      const cierre: CierreJornadaLog = {
        id: "cj_" + Date.now(),
        fecha: getLimaDateString(),
        totalPS: todayPoints,
        porcentajeSoberania: porcentajeCumplidos,
        segmentosCerradosManual: segmentosManual,
        segmentosTotales: segmentos.length,
        energiaOscuraEntries: [],
        energiaOscuraTotal: 0,
        energiaRecuperada: 0,
        fugasVoltaje: 0,
        selloEmitido: true,
        bloqueadoNocturno: new Date().getHours() >= 22,
        timestamp: Date.now()
      };
      (cierre as any).vehiculosCumplidos = cumplidos;
      (cierre as any).vehiculosTotales = jornadaVehicles.length;
      (cierre as any).porcentajeDiaIdeal = porcentajeCumplidos;
      (cierre as any).selloTexto = selloTexto;
      (cierre as any).cierreAt = Date.now();
      (cierre as any).conquistaMin = balance.conquistaMin;
      (cierre as any).entropiaMin = balance.entropiaMin;
      (cierre as any).vacioMin = balance.vacioMin;
      (cierre as any).jornadaPlanMin = balance.jornadaMin;
      cierre.escaleraConciencia = serializeEscaleraForCierreWithStats(
        escaleraCierre,
        balance.entropiaMin
      );
      await Promise.resolve(onSeal(cierre));
    } finally {
      setIsSealing(false);
    }
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sistemicar-modal-overlay z-[240]" style={{ backgroundColor: "rgba(0,0,0,0.95)" }} data-testid="cierre-jornada-modal">
      <div className="sistemicar-modal-shell">
      <div className="sistemicar-modal-panel max-w-lg rounded-2xl border p-4 space-y-3" style={{ backgroundColor: "#0a0a0a", borderColor: `${GOLD}30` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-wider" style={{ color: GOLD, fontFamily: "'Playfair Display', Georgia, serif" }}>Cierre de Jornada</h2>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Revisa tu balance, cierra vehículos pendientes y sella para archivar el día.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/5 shrink-0" aria-label="Cerrar"><X size={18} className="text-slate-500" /></button>
        </div>

        <BalanceConquistaPanel balance={balance} />

        <EscaleraCierreResumen
          model={existingCierre?.escaleraConciencia ? undefined : escaleraCierre}
          snapshot={existingCierre?.escaleraConciencia}
        />

        <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Resumen del día (números)</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg text-center" style={{ backgroundColor: `${GOLD}10` }}>
              <p className="text-[7px] uppercase text-slate-500">PS ganados</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: GOLD }} data-testid="text-total-ps">{todayPoints}</p>
            </div>
            <div className="p-2.5 rounded-lg text-center" style={{ backgroundColor: `${EMERALD}10` }}>
              <p className="text-[7px] uppercase text-slate-500">Vehículos cumplidos</p>
              <p className="text-2xl font-black tabular-nums text-white">{cumplidos}</p>
              <p className="text-[8px] text-slate-500">{cerrados} cerrados · {activos} activos</p>
            </div>
            <div className="p-2.5 rounded-lg text-center" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
              <p className="text-[7px] uppercase text-slate-500">Segmentos cierre manual</p>
              <p className="text-2xl font-black tabular-nums text-white">{segmentosManual}</p>
              <p className="text-[8px] text-slate-500">de {segmentos.length} · entropía {segmentosEntropia}</p>
            </div>
            <div className="p-2.5 rounded-lg text-center" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
              <p className="text-[7px] uppercase text-slate-500">Tasa cumplimiento</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: EMERALD }} data-testid="text-porcentaje-dia">
                {cerrados > 0 ? `${porcentajeCumplidos}%` : "—"}
              </p>
              <p className="text-[8px] text-slate-500">cumplidos / cerrados</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-slate-400">Flota del día</p>
          <div className="grid grid-cols-2 gap-2">
            {flotaTypes.map(tipo => {
              const cfg = FLOTA_CONFIG[tipo];
              const all = jornadaVehicles.filter(v => v.tipoFlota === tipo || (tipo === "verdad" && v.autoVerdad));
              const cumpl = all.filter(v => v.status === "cumplido").length;
              const arch = all.filter(v => v.status === "archivado").length;
              const act = all.filter(v => v.status === "activo").length;
              return (
                <div key={tipo} className="p-2.5 rounded-xl border" style={{ backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}25` }} data-testid={`card-balance-${tipo}`}>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: cfg.color }}>{cfg.label}</span>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <p className="text-[6px] text-slate-600">✓</p>
                      <p className="text-sm font-black text-white tabular-nums">{cumpl}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-600">Arch</p>
                      <p className="text-sm font-black text-slate-400 tabular-nums">{arch}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-600">Act</p>
                      <p className="text-sm font-black tabular-nums" style={{ color: cfg.color }}>{act}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center p-3 rounded-xl border" style={{ backgroundColor: `${GOLD}06`, borderColor: `${GOLD}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Sello de Jornada</p>
          <p className="text-[10px] text-slate-400 capitalize">{todayFormatted}</p>
          <p className="text-sm leading-relaxed text-slate-300 mt-1" data-testid="text-sello-motivacional">{selloTexto}</p>
        </div>

        {alreadySealed && existingCierre && (
          <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: `${GOLD}10`, borderColor: `${GOLD}35` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>Jornada ya sellada hoy</p>
            <p className="text-xs text-slate-400 mt-1">
              {(existingCierre as any).porcentajeDiaIdeal ?? existingCierre.porcentajeSoberania}% Día Ideal · {existingCierre.totalPS} PS
            </p>
          </div>
        )}

        {peldañosListos > 0 && !alreadySealed && (
          <div className="p-2.5 rounded-xl border text-center" style={{ backgroundColor: "rgba(0,255,195,0.06)", borderColor: "rgba(0,255,195,0.25)" }}>
            <p className="text-[9px] font-bold" style={{ color: CYAN }}>
              {peldañosListos} peldaño{peldañosListos !== 1 ? "s" : ""} irán a Proyectos al sellar
            </p>
            <p className="text-[8px] text-slate-500 mt-0.5">Segmentos con cierre manual vinculados a tu escalera</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onClose} className="py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.1)" }} data-testid="button-cerrar-silencio">
            {alreadySealed ? "Cerrar" : "Cerrar en Silencio"}
          </button>
          <button
            type="button"
            onClick={handleSeal}
            disabled={isSealing || alreadySealed}
            className="py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: GOLD, color: "#000", boxShadow: `0 0 20px ${GOLD}40` }}
            data-testid="button-sellar-jornada"
          >
            {isSealing ? "Sellando…" : alreadySealed ? "Sellada" : "Sellar Jornada"}
          </button>
        </div>
      </div>
      </div>
    </motion.div>,
    document.body
  );
}
