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
import {
  RutaSeguimientoPicker,
  rutaSeguimientoPickerCanConfirm,
} from "@/components/RutaSeguimientoPicker";
import { speakUbicacionQueue, speakUbicacionSingle, speakVoiceProbe, unlockSpeechSynthesis, warmupSpeechSynthesis, recoverSpeechQueue, subscribeSpeechQueueIdle, beginJornadaRemount, endJornadaRemount, pauseVoice, resumeVoice, cancelJornadaRemountGuard } from "@/lib/speechQueue";
import { resetPuntoCeroVoiceQueue } from "@/lib/puntoCeroVoice";
import { pausePuntoCeroStepVoiceForRemount, resumeStepVoiceAfterRemount } from "@/lib/puntoCeroStepVoice";
import { hardResetSpeechSystems } from "@/lib/speechRecovery";
import { cancelUbicacionVoiceForVehicle } from "@/lib/desglosadorVoice";
import {
  dispatchDesglosadorRutaBandVoice,
  dispatchDesglosadorSubIntroVoiceOnce,
} from "@/lib/desglosadorVoiceDispatch";
import { runShadowTask } from "@/lib/desglosadorShadow";
import {
  computeSafeRemainingMs,
  computeSafeRemainingSec,
  durationMinutesToMs,
  hardwareClockNow,
  hardwareElapsedMs,
} from "@/lib/hardwareClock";
import { isMobilePerfMode, MOBILE_PERF } from "@/lib/mobilePerf";
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
  formatElapsedHHMMSS,
  formatHHMM,
  formatMMSS,
  getDesglosadorSessionElapsedSec,
  suggestedSec,
  computeSubCloseVerdict,
  validateSubCloseCantidad,
  sumDesglosadorUnitCycle,
  type SubCloseVerdict,
} from "@/lib/desglosadorClock";
import DesglosadorDuracionPanel from "@/components/DesglosadorDuracionPanel";
import {
  ConquistaUnitFocusButton,
  ConquistaUnitFocusOverlay,
} from "@/components/flota/ConquistaUnitFocusOverlay";
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
  situacionFilaEnFocoPendiente,
  situacionRelojDebeMostrarse,
  situacionTargetMsReloj,
  computeSituacionProyeccionFinMs,
  situacionGananciaVsContratoMin,
  sumMinutosCronometroPendientes,
  sumBonusPreviewEnColaPendiente,
  minutosGanadosEnVivoFoco,
  totalBudgetMinFromCronometro,
  vehicleNeedsCupoAnchorSync,
} from "@/lib/situacionCupoDistrib";
import { isSituacionFilaVoiceSuppressed } from "@/lib/ringSellarVoiceSuppress";
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
import { VehicleCardLiveNow } from "@/components/planeacion/vehicleCardLiveClock";
import { DesglosadorSubLiveIsland, desglosadorSubClockKey } from "@/components/planeacion/desglosadorSubLiveIsland";
import { SituacionRelojIsland } from "@/components/planeacion/situacionRelojIsland";
import { VehicleTimerIsland } from "@/components/planeacion/vehicleTimerIsland";
import {
  Situacion2MinAlertWatcher,
  SituacionRingSobraVoiceWatcher,
} from "@/components/planeacion/situacionLiveWatchers";
import { areVehicleCardPropsEqual } from "@/components/planeacion/vehicleCardMemo";
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
import { JORNADA_MODULE } from "@/lib/jornadaBrand";
import { FLOTA_BRAND, FLOTA_SELECTOR_DISCRIMINATOR, flotaLabelUpper, flotaLabelsRecord } from "@/lib/flotaBrand";
import { SituacionCasaPanel } from "@/components/SituacionCasaPanel";
import { PuntoCeroPanel } from "@/components/PuntoCeroPanel";
import { SegmentoProyectoSelect } from "@/components/planeacion/SegmentoProyectoSelect";
import { PlanTabPanel } from "@/components/planeacion/PlanTabPanel";
import {
  DesglosadorSubCloseButtons,
  type DesglosadorSubClosePayload,
} from "@/components/planeacion/DesglosadorSubCloseButtons";
import { flushLaunchPersistOnSubClose } from "@/lib/launchPersistGate";
import { buildDesglosadorSubClose } from "@/lib/desglosadorSubClose";
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import { calcularMetricasAnilloConciencia, calcularBalanceConquistaJornada, buildConcienciaTimeline, computeLiveEntropy, armEntropyGapOnConsciousClose, formatMinutosJornada, resetLiveEntropyMonotonic } from "@/engines/ConcienciaEngine";
import { burstConcienciaClockTick, isCoarseConcienciaDevice } from "@/lib/concienciaClock";
import { usePlaneacionHeavyMetrics } from "@/hooks/usePlaneacionHeavyMetrics";
import { JornadaStuckProbe } from "@/components/jornada/JornadaStuckProbe";
import { JornadaShell } from "@/components/jornada/JornadaShell";
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
  getFlotaFetchStatus,
  onFlotaStaleLoadingRefetch,
  onJornadaVisibilityReturn,
  retryFlotaFetch,
  setFlotaPaintedCount,
  subscribeFlotaFetchStatus,
  type FlotaFetchStatus,
} from "@/services/jornadaFlotaFetch";
import {
  hasLocalFlotaPaint,
  readLocalFlota,
  writeLocalFlota,
} from "@/services/jornadaFlotaCache";
import { registerFlotaMergeContext, refreshFlotaSession, getFlotaMergedSignature } from "@/flota/flotaStore";
import { buildFlotaActivosRenderList } from "@/flota/flotaRenderUtils";
import { useFlotaStore } from "@/hooks/useFlotaStore";
import { EntropiaDebugPanel, isEntropyDebugEnabled } from "@/components/EntropiaDebugPanel";
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
  sortSubTareasTrabajoPrimero,
  calculateVehicleScore,
} from "@/components/flota/vehicleCardShared";

function VehicleCard({
  vehicle, expanded, onToggleVehicle, onCompleteVehicle, onArchiveVehicle, minimal = false,
  segmentoNumero,
  planilla,
  onAddSubTarea, onAddSubTareaUrgenteACola, onToggleSubTarea, onSetSubTareaMinutosCupo, onExtendSituacionCupo, onSyncSituacionCupoAnchor, onAddDetalle, onEntregarDetalle, onAddCasaItem, onToggleCasaItem, arquitectoUnlocked,
  onMoveSubTareasToCronometro, onSituacionCronometroSetHoraFin, onSituacionCronometroCumplido, onSituacionCronometroFallado, onSituacionCronometroReservar, onQuitarSituacionCupo, onCerrarSituacionDesgloseBloque, onCerrarSituacionDesglosadorDeGolpe, situacionBloquePsTotal, situacionDesgloseSummary, onVerSituacionBloquePs,
  onInvestigadorClose, onDesglosadorUpdate, onDesglosadorGlobalClose, onDesglosadorCierreDeGolpe, onDesglosadorPausaInterrupcion, onResumeDesglosador, onDesglosadorReorderSubs, onDesglosadorAddSub, onDesglosadorActivatePendingSub,
  onReorderSubTareasCronometro,
  onDescansoClose, onMicroPasoToggle, onEtapaPuntoCeroToggle,
  onPuntoCeroSessionUpdate, onPuntoCeroColorConfirm, onPuntoCeroAutoClose,
  onOpenCierreEnergia,
  cierreEnergiaPendingVehicleId,
  onRutaBandCross, onBloqueCierre
}: {
  vehicle: Vehicle; expanded: boolean;
  onToggleVehicle: (vehicleId: string) => void;
  onCompleteVehicle?: (vehicleId: string) => void;
  onArchiveVehicle?: (vehicleId: string) => void;
  minimal?: boolean; segmentoNumero?: number | null;
  planilla?: Planilla | null;
  onAddSubTarea?: (vehicleId: string, texto: string) => void | Promise<string | undefined>;
  onAddSubTareaUrgenteACola?: (vehicleId: string, texto: string) => void;
  onToggleSubTarea?: (vehicleId: string, subTareaId: string) => void;
  onSetSubTareaMinutosCupo?: (vehicleId: string, subTareaId: string, minutos: number | undefined) => void;
  onExtendSituacionCupo?: (vehicleId: string, subTareaId: string, delta: number) => void;
  onSyncSituacionCupoAnchor?: (vehicleId: string) => void;
  onMoveSubTareasToCronometro?: (vehicleId: string, subTareaIds: string[], opts?: { objetivoHora?: string; proyectoEnfoqueId?: string }) => void;
  onSituacionCronometroSetHoraFin?: (vehicleId: string, hhmm: string) => void;
  onSituacionCronometroCumplido?: (vehicleId: string, subTareaId: string) => void;
  onSituacionCronometroFallado?: (vehicleId: string, subTareaId: string) => void;
  onSituacionCronometroReservar?: (vehicleId: string, subTareaId: string) => void;
  onQuitarSituacionCupo?: (vehicleId: string, subTareaId: string, minutos: number) => void;
  onCerrarSituacionDesgloseBloque?: (vehicleId: string) => void;
  onCerrarSituacionDesglosadorDeGolpe?: (vehicleId: string) => void;
  onDesglosadorCierreDeGolpe?: (vehicleId: string) => void;
  situacionBloquePsTotal?: number;
  situacionDesgloseSummary?: SituacionDesgloseSummary;
  onVerSituacionBloquePs?: (vehicleId: string, titulo: string, summary: SituacionDesgloseSummary) => void;
  onAddDetalle?: (vehicleId: string, subTareaId: string, texto: string) => void;
  onEntregarDetalle?: (vehicleId: string, subTareaId: string, detalleId: string) => void;
  onAddCasaItem?: (vehicleId: string, subTareaId: string, texto: string) => void;
  onToggleCasaItem?: (vehicleId: string, subTareaId: string, detalleId: string) => void;
  arquitectoUnlocked?: boolean;
  onInvestigadorClose?: (vehicleId: string, cumplido: boolean, cantidadRealizada: number, intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite") => void;
  onDesglosadorUpdate?: (
    vehicleId: string,
    updatedSubs: SubVehiculo[],
    opts?: { resetDepth?: boolean; rutaCruzadoOnly?: boolean; force?: boolean; launchPaint?: boolean }
  ) => void;
  onDesglosadorGlobalClose?: (vehicleId: string, subs: SubVehiculo[], intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite", rutaDeclarada?: RutaBandaId[]) => void;
  onDesglosadorPausaInterrupcion?: (vehicleId: string, tituloInterrupcion: string) => void | Promise<void>;
  onResumeDesglosador?: (vehicleId: string) => void;
  onDesglosadorReorderSubs?: (vehicleId: string, movedId: string, direction: ReorderDirection) => void;
  onDesglosadorAddSub?: (vehicleId: string, form: DesglosadorSubFormRow) => void;
  onDesglosadorActivatePendingSub?: (vehicleId: string, subId: string) => void;
  onReorderSubTareasCronometro?: (vehicleId: string, movedId: string, direction: ReorderDirection) => void;
  onDescansoClose?: (vehicleId: string, status: "cumplido" | "archivado", etiqueta: "recuperado" | "parcial" | "fragmentado", nota: string, intensidadEnergeticaFin?: "fluido" | "concentrado" | "limite") => void;
  onMicroPasoToggle?: (vehicleId: string, paso: "hidratacion" | "respiracion" | "pantallaZero") => void;
  onEtapaPuntoCeroToggle?: (vehicleId: string, etapa: "etapa1" | "etapa2" | "etapa3" | "etapa4") => void;
  onPuntoCeroSessionUpdate?: (vehicleId: string, session: PuntoCeroSession) => void;
  onPuntoCeroColorConfirm?: (vehicleId: string, idx: number, session: PuntoCeroSession) => void;
  onPuntoCeroAutoClose?: (vehicleId: string) => void;
  onOpenCierreEnergia?: (payload: CierreEnergiaModalPayload) => void;
  /** Si el modal de energía se cierra sin confirmar, libera el despacho local. */
  cierreEnergiaPendingVehicleId?: string | null;
  onRutaBandCross?: (payload: { vehicleId: string; subId: string; subTitulo: string; banda: RutaBandaId }) => void;
  onBloqueCierre?: (payload: { vehicleId: string; sub: SubVehiculo; status: string }) => void;
}) {
  const [timerExpired, setTimerExpired] = useState(false);
  const [showDescansoReloj, setShowDescansoReloj] = useState(false);
  const [newSubTarea, setNewSubTarea] = useState("");
  const [cantidadRealizada, setCantidadRealizada] = useState("");
  const [remainingUnits, setRemainingUnits] = useState<number | null>(null);
  const [subVehicleRestante, setSubVehicleRestante] = useState<number | null>(null);
  const [desglosadorSummary, setDesglosadorSummary] = useState(false);
  const [unitFocusOpen, setUnitFocusOpen] = useState(false);
  const subtasksExpandedStorageKey = `sistemicar_subtasks_expanded_${vehicle.id}`;
  const [subTasksCollapsed, setSubTasksCollapsed] = useState(() => {
    if (vehicle.tipoFlota === "situacion" && vehicle.situacionCronometro?.activo === true) return false;
    try {
      return sessionStorage.getItem(subtasksExpandedStorageKey) === "0";
    } catch {
      return false;
    }
  });
  const [expandedDetalleStId, setExpandedDetalleStId] = useState<string | null>(null);
  const [expandedCasaStId, setExpandedCasaStId] = useState<string | null>(null);
  const [situacionLibreSeleccion, setSituacionLibreSeleccion] = useState<Set<string>>(() => new Set());
  const [situacionRetoObjetivoHora, setSituacionRetoObjetivoHora] = useState("");
  const [newDetalleTexts, setNewDetalleTexts] = useState<Record<string, string>>({});
  const [newCasaTexts, setNewCasaTexts] = useState<Record<string, string>>({});
  const [quitarMinDraft, setQuitarMinDraft] = useState<Record<string, string>>({});
  const [showEtiquetaSalida, setShowEtiquetaSalida] = useState(false);
  const [etiquetaSalidaLocal, setEtiquetaSalidaLocal] = useState<"recuperado" | "parcial" | "fragmentado" | null>(null);
  const [notaSalidaLocal, setNotaSalidaLocal] = useState("");
  const [pendingDescansoStatus, setPendingDescansoStatus] = useState<"cumplido" | "archivado" | null>(null);
  const [showMicroPasos, setShowMicroPasos] = useState(false);
  type UltimoCierreSub = {
    subId: string;
    titulo: string;
    status: "cumplido" | "fallado";
    verdict: SubCloseVerdict;
    deltaSec: number;
    conquistaFluidezAbsoluta?: boolean;
  };
  const [ultimoCierreSub, setUltimoCierreSub] = useState<UltimoCierreSub | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const prevRemainingRef = useRef<number | null>(null);
  const prevSubRestanteRef = useRef<number | null>(null);
  const rutaUmbralAlertKeysRef = useRef<Set<string>>(new Set());
  const activeSubIdForRutaRef = useRef<string | null>(null);
  const prevSubRestanteRutaRef = useRef<number | null>(null);
  const chimeCtxRef = useRef<AudioContext | null>(null);
  const alarmCtxRef = useRef<AudioContext | null>(null);
  const prevTimerExpiredRef = useRef<boolean>(false);
  const situacionCupoFireKeyRef = useRef<string | null>(null);
  const situacion2MinWarnKeyRef = useRef<string | null>(null);
  const situacionFilaVoiceKeysRef = useRef<Set<string>>(new Set());
  const situacionFilaVoicePendingRef = useRef<Set<string>>(new Set());
  const ringSobraBloqueRef = useRef<string | null>(null);
  const ringSobraVoiceKeyRef = useRef<string | null>(null);
  const ringSobraVoicePendingRef = useRef<string | null>(null);
  const situacionCupoEscalationRef = useRef<number | null>(null);
  const subVehiculosRef = useRef(vehicle.subVehiculos);
  subVehiculosRef.current = vehicle.subVehiculos;
  const vehicleRef = useRef(vehicle);
  vehicleRef.current = vehicle;
  const subTareasRef = useRef(vehicle.subTareas);
  subTareasRef.current = vehicle.subTareas;
  const situacionAnchorRef = useRef(vehicle.situacionCupoAnchor);
  situacionAnchorRef.current = vehicle.situacionCupoAnchor;
  const [subRutaModal, setSubRutaModal] = useState<null | {
    subId: string;
    status: "cumplido" | "fallado";
    cantidadRealizada: number;
    duracionCompletado?: number;
  }>(null);
  const [subRutaSel, setSubRutaSel] = useState<Set<RutaBandaId>>(new Set());
  const [subRutaSinUso, setSubRutaSinUso] = useState(false);
  const [subRutaPatron, setSubRutaPatron] = useState<RutaSeguimientoPatron | null>(null);
  const prevActiveSubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (vehicle.tipoReloj !== "desglosador") return;
    const activeSub = (vehicle.subVehiculos || []).find(s => s.status === "activo");
    const nextId = activeSub?.id ?? null;
    if (prevActiveSubIdRef.current !== nextId) {
      prevActiveSubIdRef.current = nextId;
      setCantidadRealizada("");
    }
  }, [vehicle.subVehiculos, vehicle.tipoReloj]);

  const openSubRutaModal = (payload: NonNullable<typeof subRutaModal>) => {
    setSubRutaSel(new Set());
    setSubRutaSinUso(false);
    setSubRutaPatron(null);
    setSubRutaModal(payload);
  };

  const [showPausaForm, setShowPausaForm] = useState(false);
  const [pausaTitulo, setPausaTitulo] = useState("");
  const [pausaEnviando, setPausaEnviando] = useState(false);
  const [desglosadorReorderMode, setDesglosadorReorderMode] = useState(false);
  const [showExecAddSub, setShowExecAddSub] = useState(false);
  const [execSubTitulo, setExecSubTitulo] = useState("");
  const [execSubCantidad, setExecSubCantidad] = useState("");
  const [execSubRecord, setExecSubRecord] = useState<number | undefined>();
  const [execSubRuta, setExecSubRuta] = useState(true);
  const [execSubSugOpen, setExecSubSugOpen] = useState(false);

  const handleTimerExpiredChange = useCallback((expired: boolean) => {
    setTimerExpired(expired);
  }, []);

  const handleRemainingUnitsChange = useCallback((n: number | null) => {
    setRemainingUnits(n);
  }, []);

  const resetDesglosadorSubCounterState = useCallback(() => {
    setSubVehicleRestante(null);
  }, []);

  const handleSubVehicleRestanteChange = useCallback((n: number | null) => {
    // No re-renderizar el VehicleCard (~3.7k LOC) en el tick urgente del reloj.
    startTransition(() => {
      setSubVehicleRestante(n);
    });
  }, []);

  const playChime = useCallback(() => {
    if (!isTikSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!chimeCtxRef.current) chimeCtxRef.current = new AudioCtx();
      const ctx = chimeCtxRef.current;
      if (ctx.state === "suspended") { ctx.resume(); return; }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.debug("[investigador chime] audio error:", err);
    }
  }, []);

  const playWarDrum = useCallback(() => {
    if (!isTikSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {
      console.debug("[war drum] audio error:", err);
    }
  }, []);

  const playAlarm = useCallback(() => {
    if (!isTikSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!alarmCtxRef.current || alarmCtxRef.current.state === "closed") alarmCtxRef.current = new AudioCtx();
      const ctx = alarmCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const freqs = [440, 880, 1320];
      const cycleLen = freqs.length;
      const stepGap = 0.3;
      const cycleGap = 0.2;
      const totalCycles = 3;
      for (let c = 0; c < totalCycles; c++) {
        freqs.forEach((freq, i) => {
          const t = ctx.currentTime + c * (cycleLen * stepGap + cycleGap) + i * stepGap;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.55, t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
          osc.start(t); osc.stop(t + 0.27);
        });
      }
    } catch (err) {
      console.debug("[alarm] audio error:", err);
    }
  }, []);

  const situacionSubWatchKey = useMemo(() => {
    if (vehicle.tipoFlota !== "situacion") return "";
    const sc = vehicle.situacionCronometro;
    return (
      (vehicle.subTareas || [])
        .map(s => `${s.id}:${s.completada ? 1 : 0}:${s.minutosCupo ?? 0}:${s.enDesgloseCronometro ? 1 : 0}:${s.resultadoSituacion ?? ""}`)
        .join("|") + `|sc:${sc?.activo ? 1 : 0}:${sc?.horaFinMs ?? 0}`
    );
  }, [vehicle.tipoFlota, vehicle.subTareas, vehicle.situacionCronometro]);

  const situacionAnchorKey = useMemo(() => {
    const a = vehicle.situacionCupoAnchor;
    if (!a?.subTareaId) return "";
    const sub = (vehicle.subTareas || []).find(s => s.id === a.subTareaId);
    return `${a.subTareaId}:${a.startedAt}:${sub?.minutosCupo ?? 0}:${sub?.resultadoSituacion ?? ""}:${sub?.enDesgloseCronometro ? 1 : 0}:${sub?.completada ? 1 : 0}`;
  }, [vehicle.situacionCupoAnchor, situacionSubWatchKey]);

  useEffect(() => {
    if (vehicle.tipoFlota === "situacion" && vehicle.situacionCronometro?.activo === true) {
      setSubTasksCollapsed(false);
    }
  }, [vehicle.id, vehicle.tipoFlota, vehicle.situacionCronometro?.activo]);

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion") return;
    try {
      sessionStorage.setItem(subtasksExpandedStorageKey, subTasksCollapsed ? "0" : "1");
    } catch { /* ignore */ }
  }, [subTasksCollapsed, subtasksExpandedStorageKey, vehicle.tipoFlota]);

  useEffect(() => {
    if (!onSyncSituacionCupoAnchor || vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return;
    // No sync-idle si el ancla ya apunta a una fila pendiente con cupo vivo:
    // tras Cumplido/Fallado el paint ms0 deja startedAt≈now; un sync sin forceReset
    // sobre estado intermedio podía reafirmar anclas viejas vía merge/disco.
    const anchor = vehicle.situacionCupoAnchor;
    if (anchor?.subTareaId && (anchor.startedAt ?? 0) > 0) {
      const sub = (vehicle.subTareas || []).find(s => s.id === anchor.subTareaId);
      if (
        sub &&
        situacionFilaCronometroPendiente(sub) &&
        (sub.minutosCupo ?? 0) > 0 &&
        computeSafeRemainingMs(anchor.startedAt, sub.minutosCupo ?? 0) > 0
      ) {
        return;
      }
    }
    const run = () => {
      onSyncSituacionCupoAnchor(vehicle.id);
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 1500 });
      return () => cancelIdleCallback(id);
    }
    const retryTimer = window.setTimeout(run, 0);
    return () => clearTimeout(retryTimer);
  }, [vehicle.id, vehicle.status, vehicle.tipoFlota, situacionSubWatchKey, situacionAnchorKey, onSyncSituacionCupoAnchor]);

  const desglosadorAutoActivateRef = useRef<Set<string>>(new Set());
  /** Ventana post-lanzamiento: evita ruta-repair + voz que saturan el hilo al abrir conquista. */
  const desglosadorLaunchGraceUntilRef = useRef(0);
  useEffect(() => {
    if (vehicle.tipoReloj === "desglosador" && vehicle.status === "activo") {
      const ageMs = Date.now() - (vehicle.aperturaAt ?? 0);
      if (ageMs >= 0 && ageMs < 4_000) {
        desglosadorLaunchGraceUntilRef.current = Date.now() + 2_500;
      }
    }
  }, [vehicle.id, vehicle.tipoReloj, vehicle.status, vehicle.aperturaAt]);

  useEffect(() => {
    if (vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo" || !onDesglosadorUpdate) return;
    const subs = subVehiculosRef.current ?? [];
    const hasActive = subs.some(s => s.status === "activo");
    const pendingIdx = subs.findIndex(s => s.status === "pendiente");
    const allSubsClosed = subs.length > 0 && subs.every(s => s.status === "cumplido" || s.status === "fallado");
    if (!hasActive && pendingIdx !== -1 && !allSubsClosed) {
      const pendingId = subs[pendingIdx]?.id;
      if (!pendingId) return;
      const autoKey = `${vehicle.id}:${pendingId}`;
      if (desglosadorAutoActivateRef.current.has(autoKey)) return;
      desglosadorAutoActivateRef.current.add(autoKey);
      const now = Date.now();
      const repaired = subs.map((s, i) =>
        i === pendingIdx ? { ...s, status: "activo" as const, aperturaAt: now } : s
      );
      activeSubIdForRutaRef.current = null;
      prevSubRestanteRutaRef.current = null;
      const ageMs = Date.now() - (vehicle.aperturaAt ?? 0);
      const isLaunchWindow = ageMs >= 0 && ageMs < 4_000;
      if (isLaunchWindow) {
        desglosadorLaunchGraceUntilRef.current = Date.now() + 2_500;
      }
      // launchPaint SOLO en el primer paint post-lanzamiento.
      // Mid-ciclo (tras Cumplido) debe ser force urgente o el reloj no remonta.
      onDesglosadorUpdate(
        vehicle.id,
        repaired,
        isLaunchWindow ? { launchPaint: true } : { force: true }
      );
      const activated = repaired[pendingIdx];
      if (activated) {
        // Voz intro tras paint (corto): supervivencia ya no silencia TTS.
        window.setTimeout(() => {
          dispatchDesglosadorSubIntroVoiceOnce(
            vehicle.id,
            activated.id,
            activated.aperturaAt ?? now,
            activated.titulo,
            Boolean(activated.rutaEnfoque?.activa)
          );
        }, 700);
      }
    }
  }, [vehicle.subVehiculos, vehicle.status, vehicle.tipoReloj, vehicle.id, onDesglosadorUpdate]);

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return;
    const anchor = vehicle.situacionCupoAnchor;
    if (!anchor?.subTareaId) return;
    const sub = (vehicle.subTareas || []).find(s => s.id === anchor.subTareaId);
    if (!sub || !(sub.minutosCupo && sub.minutosCupo > 0)) return;
    if (sub.enDesgloseCronometro && (sub.resultadoSituacion ?? "pendiente") !== "pendiente") return;
    if (!sub.enDesgloseCronometro && sub.completada) return;
    const durationMin = sub.minutosCupo;
    const fireKey = `${anchor.subTareaId}-${anchor.startedAt}-${durationMin}`;

    const isSubStillPending = () => {
      const a = situacionAnchorRef.current;
      if (!a?.subTareaId) return false;
      const cur = (subTareasRef.current || []).find(s => s.id === a.subTareaId);
      if (!cur || !(cur.minutosCupo && cur.minutosCupo > 0)) return false;
      if (cur.enDesgloseCronometro && (cur.resultadoSituacion ?? "pendiente") !== "pendiente") return false;
      if (!cur.enDesgloseCronometro && cur.completada) return false;
      return true;
    };

    const clearEscalation = () => {
      if (situacionCupoEscalationRef.current) {
        clearInterval(situacionCupoEscalationRef.current);
        situacionCupoEscalationRef.current = null;
      }
    };

    const run = () => {
      if (!isSubStillPending()) {
        clearEscalation();
        return;
      }
      if (computeSafeRemainingMs(anchor.startedAt, durationMin) > 0) return;
      if (situacionCupoFireKeyRef.current === fireKey) return;
      situacionCupoFireKeyRef.current = fireKey;
      fireSituacionCupoAlert({
        vehicleId: vehicle.id,
        vehicleTitulo: vehicle.titulo,
        subTexto: sub.texto,
        tagKey: fireKey,
      });
      clearEscalation();
      let escalationCount = 0;
      situacionCupoEscalationRef.current = window.setInterval(() => {
        if (!isSubStillPending()) {
          clearEscalation();
          return;
        }
        escalationCount += 1;
        if (escalationCount > SITUACION_CUPO_ESCALATION_MAX) {
          clearEscalation();
          return;
        }
        const cur = (subTareasRef.current || []).find(s => s.id === anchor.subTareaId);
        if (!cur) return;
        fireSituacionCupoAlert({
          vehicleId: vehicle.id,
          vehicleTitulo: vehicle.titulo,
          subTexto: cur.texto,
          tagKey: fireKey,
          escalation: true,
        });
      }, SITUACION_CUPO_ESCALATION_MS);
    };
    run();
    const intervalId = window.setInterval(run, 2000);
    return () => {
      clearInterval(intervalId);
      clearEscalation();
    };
  }, [vehicle.tipoFlota, vehicle.status, situacionAnchorKey, vehicle.titulo, vehicle.id]);

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion" || vehicle.status !== "activo") return;
    if (vehicle.situacionCronometro?.activo !== true) return;
    if (isSituacionFilaVoiceSuppressed(vehicle.id)) return;
    const anchor = vehicle.situacionCupoAnchor;
    if (!anchor?.subTareaId) return;
    const sub = (vehicle.subTareas || []).find(s => s.id === anchor.subTareaId);
    if (!sub || !(sub.minutosCupo && sub.minutosCupo > 0)) return;
    if (sub.enDesgloseCronometro && (sub.resultadoSituacion ?? "pendiente") !== "pendiente") return;

    const voiceKey = `${anchor.subTareaId}-${anchor.startedAt}`;
    if (situacionFilaVoiceKeysRef.current.has(voiceKey)) return;
    if (situacionFilaVoicePendingRef.current.has(voiceKey)) return;
    situacionFilaVoicePendingRef.current.add(voiceKey);
    situacion2MinWarnKeyRef.current = null;
    situacionCupoFireKeyRef.current = null;

    let cancelled = false;
    let cleanupVoice: (() => void) | undefined;
    const subTexto = sub.texto;
    const speak = () => {
      if (cancelled) return;
      cleanupVoice = speakSituacionFilaEnFoco(subTexto, {
        intro: false,
        key: `fila-${voiceKey}`,
        onSpoken: () => {
          situacionFilaVoiceKeysRef.current.add(voiceKey);
          situacionFilaVoicePendingRef.current.delete(voiceKey);
        },
      });
    };
    const scheduleSpeak = () => {
      window.requestAnimationFrame(() => {
        window.setTimeout(speak, 0);
      });
    };

    const bloqueInicioAt = vehicle.situacionCronometro?.bloqueInicioAt;
    const isFreshRing = bloqueInicioAt != null && Date.now() - bloqueInicioAt < 12_000;
    let unsubIdle: (() => void) | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (isFreshRing) {
      // Esperar idle real: el fallback a 900ms cancelaba la bienvenida (cancelPrevious).
      let spoke = false;
      const trySpeak = () => {
        if (cancelled || spoke) return;
        spoke = true;
        unsubIdle?.();
        if (fallbackTimer) clearTimeout(fallbackTimer);
        scheduleSpeak();
      };
      unsubIdle = subscribeSpeechQueueIdle(trySpeak);
      fallbackTimer = setTimeout(trySpeak, 14_000);
    } else {
      scheduleSpeak();
    }

    return () => {
      cancelled = true;
      unsubIdle?.();
      if (fallbackTimer) clearTimeout(fallbackTimer);
      cleanupVoice?.();
      situacionFilaVoicePendingRef.current.delete(voiceKey);
    };
  }, [
    vehicle.tipoFlota,
    vehicle.status,
    vehicle.situacionCronometro?.activo,
    vehicle.situacionCronometro?.bloqueInicioAt,
    situacionAnchorKey,
    vehicle.id,
  ]);

  useEffect(() => {
    const wasExpired = prevTimerExpiredRef.current;
    prevTimerExpiredRef.current = timerExpired;
    if (!wasExpired && timerExpired && vehicle.status === "activo") {
      playAlarm();
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 600]);
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(`⏱ ${vehicle.titulo}`, {
            body: "Tiempo completado. Cierra el vehículo para registrar tus puntos.",
            icon: "/favicon.ico",
            tag: `alarm-${vehicle.id}`,
          });
        } catch { }
      }
    }
  }, [timerExpired, vehicle.status, vehicle.titulo, vehicle.id, playAlarm]);

  useEffect(() => {
    if (vehicle.tipoReloj !== "investigador") return;
    if (remainingUnits === null) { prevRemainingRef.current = null; return; }
    if (prevRemainingRef.current !== null && remainingUnits < prevRemainingRef.current) {
      playChime();
    }
    prevRemainingRef.current = remainingUnits;
  }, [remainingUnits, playChime, vehicle.tipoReloj]);

  useEffect(() => {
    if (vehicle.tipoReloj !== "desglosador") return;
    if (subVehicleRestante === null) { prevSubRestanteRef.current = null; return; }
    if (prevSubRestanteRef.current !== null && subVehicleRestante < prevSubRestanteRef.current) {
      playChime();
    }
    prevSubRestanteRef.current = subVehicleRestante;
  }, [subVehicleRestante, playChime, vehicle.tipoReloj]);

  const resetDesglosadorVoiceRefs = useCallback(() => {
    rutaUmbralAlertKeysRef.current.clear();
    activeSubIdForRutaRef.current = null;
    prevSubRestanteRutaRef.current = null;
  }, []);

  useEffect(() => {
    if (vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo" || !onDesglosadorUpdate) return;
    if (Date.now() < desglosadorLaunchGraceUntilRef.current) return;
    const subsNow = subVehiculosRef.current ?? [];
    const activeSub = subsNow.find(s => s.status === "activo");
    if (!activeSub || activeSub.rutaEnfoque?.activa) return;
    const ruta = resolveRutaEnfoqueForSub(
      activeSub.cantidadObjetivo,
      activeSub.tiempoRecordMinPerUnit,
      activeSub.rutaEnfoque
    );
    if (!ruta) return;
    onDesglosadorUpdate(
      vehicle.id,
      subsNow.map(s => (s.id === activeSub.id ? { ...s, rutaEnfoque: ruta } : s)),
      // Mid-ciclo: no marcar launchPaint (eso es solo el primer paint post-lanzamiento).
      { silentDepth: true }
    );
  }, [vehicle.tipoReloj, vehicle.status, vehicle.subVehiculos, vehicle.id, onDesglosadorUpdate]);

  useEffect(() => {
    if (vehicle.tipoReloj !== "desglosador" || vehicle.status !== "activo" || subVehicleRestante === null) return;
    if (Date.now() < desglosadorLaunchGraceUntilRef.current) return;
    const subsNow = subVehiculosRef.current ?? [];
    const activeSub = subsNow.find(s => s.status === "activo");
    if (!activeSub?.rutaEnfoque?.activa || !onDesglosadorUpdate) {
      prevSubRestanteRutaRef.current = null;
      return;
    }

    if (activeSubIdForRutaRef.current !== activeSub.id) {
      activeSubIdForRutaRef.current = activeSub.id;
      rutaUmbralAlertKeysRef.current = new Set();
      prevSubRestanteRutaRef.current = null;
      const { ruta: repaired, changed } = repairRutaCruzadoAheadOfRestantes(
        activeSub.rutaEnfoque,
        subVehicleRestante
      );
      if (changed) {
        const updated = subsNow.map(s =>
          s.id === activeSub.id ? { ...s, rutaEnfoque: repaired } : s
        );
        onDesglosadorUpdate(vehicle.id, updated, { rutaCruzadoOnly: true, silentDepth: true });
      }
      return;
    }

    const prev = prevSubRestanteRutaRef.current;
    if (prev === null) {
      prevSubRestanteRutaRef.current = subVehicleRestante;
      return;
    }
    if (subVehicleRestante > prev) {
      prevSubRestanteRutaRef.current = subVehicleRestante;
      return;
    }

    prevSubRestanteRutaRef.current = subVehicleRestante;
    const { ruta: nextRuta, alerts } = applyRutaThresholdCrossing(
      activeSub.rutaEnfoque,
      subVehicleRestante,
      prev
    );
    for (const alert of alerts) {
      const key = `${activeSub.id}-${alert}`;
      if (rutaUmbralAlertKeysRef.current.has(key)) continue;
      onRutaBandCross?.({
        vehicleId: vehicle.id,
        subId: activeSub.id,
        subTitulo: activeSub.titulo,
        banda: alert,
      });
      if (isSituacionAlertsEnabled()) {
        void playSituacionChimes(alert === "concentrado" ? 1 : 2);
      } else {
        playChime();
      }
      rutaUmbralAlertKeysRef.current.add(key);
      dispatchDesglosadorRutaBandVoice(vehicle.id, activeSub.id, alert);
    }
    const cruzadoChanged =
      nextRuta.cruzado.concentrado !== activeSub.rutaEnfoque.cruzado.concentrado ||
      nextRuta.cruzado.limite !== activeSub.rutaEnfoque.cruzado.limite;
    if (cruzadoChanged) {
      const updated = (subVehiculosRef.current ?? []).map(s =>
        s.id === activeSub.id ? { ...s, rutaEnfoque: nextRuta } : s
      );
      onDesglosadorUpdate(vehicle.id, updated, { rutaCruzadoOnly: true });
    }
  }, [subVehicleRestante, vehicle.tipoReloj, vehicle.status, vehicle.subVehiculos, vehicle.id, onDesglosadorUpdate, playChime, onRutaBandCross]);

  const finalizeSubClose = useCallback((
    activeSubId: string,
    status: "cumplido" | "fallado",
    cantidad: number,
    duracionCompletado: number | undefined,
    rutaDeclarada?: RutaBandaId[]
  ) => {
    if (!onDesglosadorUpdate) return;
    const now = Date.now();
    const sourceSubs = subVehiculosRef.current ?? vehicle.subVehiculos ?? [];
    const built = buildDesglosadorSubClose(
      sourceSubs,
      activeSubId,
      status,
      cantidad,
      duracionCompletado,
      rutaDeclarada,
      now
    );
    if (!built) return;
    const { subs: allSubs, closedSub, nextActiveSubId } = built;

    // Gesto seguro: vaciar persist launch pendiente (sin bomba a N s).
    flushLaunchPersistOnSubClose(vehicle.id);

    const veredicto = computeSubCloseVerdict(closedSub);
    setUltimoCierreSub({
      subId: closedSub.id,
      titulo: cleanSubTitulo(closedSub.titulo),
      status,
      verdict: veredicto.verdict,
      deltaSec: veredicto.deltaSec,
      conquistaFluidezAbsoluta: closedSub.conquistaFluidezAbsoluta,
    });
    if (nextActiveSubId) {
      activeSubIdForRutaRef.current = null;
      prevSubRestanteRutaRef.current = null;
      rutaUmbralAlertKeysRef.current.clear();
      subVehiculosRef.current = allSubs;
    }
    // ms0: paint primero; voz del siguiente sub en sombra (no pelear remount del island).
    onDesglosadorUpdate(vehicle.id, allSubs, { force: true });
    burstConcienciaClockTick(1);
    if (nextActiveSubId) {
      const nextSub = allSubs.find(s => s.id === nextActiveSubId);
      if (nextSub) {
        runShadowTask(() => {
          dispatchDesglosadorSubIntroVoiceOnce(
            vehicle.id,
            nextSub.id,
            nextSub.aperturaAt ?? now,
            nextSub.titulo,
            Boolean(nextSub.rutaEnfoque?.activa)
          );
        });
      }
    }
    const allDone = allSubs.every(s => s.status === "cumplido" || s.status === "fallado");
    if (allDone) {
      setDesglosadorSummary(true);
      resetDesglosadorSubCounterState();
    }
    setCantidadRealizada("");
    setSubRutaModal(null);
    setSubRutaSel(new Set());
    setSubRutaSinUso(false);
    setSubRutaPatron(null);

    const bloquePayload = { vehicleId: vehicle.id, sub: closedSub, status };
    onBloqueCierre?.(bloquePayload);
  }, [onBloqueCierre, onDesglosadorUpdate, resetDesglosadorSubCounterState, vehicle.id, vehicle.subVehiculos]);

  const attemptCloseActiveSubById = useCallback((
    subId: string,
    status: "cumplido" | "fallado",
    duracionCompletado: number | undefined
  ) => {
    const subsNow = subVehiculosRef.current ?? vehicle.subVehiculos ?? [];
    const activeSub = subsNow.find(s => s.id === subId && s.status === "activo");
    if (!activeSub) return;

    const validation = validateSubCloseCantidad(activeSub, cantidadRealizada, status);
    if (!validation.ok) {
      toast.warning(validation.message, {
        description: "Sin cantidad no hay medición — el tiempo quedaría sin registrar.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${NARANJA}`, color: NARANJA },
        duration: 4500,
      });
      return;
    }
    if (activeSub.rutaEnfoque?.activa) {
      openSubRutaModal({
        subId: activeSub.id,
        status,
        cantidadRealizada: validation.cantidad,
        duracionCompletado,
      });
      return;
    }
    finalizeSubClose(activeSub.id, status, validation.cantidad, duracionCompletado);
  }, [cantidadRealizada, finalizeSubClose, vehicle.subVehiculos]);

  const handleDesglosadorSubCloseFromButton = useCallback(
    (payload: DesglosadorSubClosePayload) => {
      if (payload.vehicleId !== vehicle.id) return;
      attemptCloseActiveSubById(payload.subId, payload.status, payload.duracionSec);
    },
    [attemptCloseActiveSubById, vehicle.id]
  );

  const tipoFlota = vehicle.tipoFlota;
  const flotaConfig = tipoFlota ? FLOTA_CONFIG[tipoFlota] : null;
  const DESCANSO_TIPO_COLOR: Record<string, string> = { intercepcion: "#00FFC3", microcarga: "#10b981", reset_profundo: "#8B5CF6", punto_cero: "#D4AF37" };
  const flotaColor = tipoFlota === "descanso" && vehicle.tipoDescanso
    ? DESCANSO_TIPO_COLOR[vehicle.tipoDescanso] || VERDE
    : (flotaConfig?.color || (vehicle.tipoTerminoRapido === "hora" ? NARANJA : vehicle.tipoTerminoRapido === "situacion" ? PLATA : GRIS));

  useEffect(() => {
    if (tipoFlota !== "descanso" || vehicle.status !== "activo") return;
    if (vehicle.tipoDescanso === "punto_cero") {
      setShowMicroPasos(true);
      return;
    }
    const aperturaMs = vehicle.aperturaAt || Date.now();
    const elapsed = Date.now() - aperturaMs;
    const delay = Math.max(0, 30000 - elapsed);
    const timer = setTimeout(() => setShowMicroPasos(true), delay);
    return () => clearTimeout(timer);
  }, [tipoFlota, vehicle.status, vehicle.tipoDescanso, vehicle.aperturaAt]);

  useEffect(() => {
    if (vehicle.status !== "activo") {
      if (!mountedRef.current) return;
      setDesglosadorSummary(false);
    }
  }, [vehicle.status, vehicle.id]);

  useEffect(() => {
    if (!expanded && mountedRef.current) {
      setDesglosadorSummary(false);
    }
  }, [expanded]);

  // A1: montaje en dos fases. Al expandir, el contenedor se abre de inmediato
  // (barato) y el subárbol pesado (conquista + situacional) se monta fuera del
  // frame del expand — si no, el toast de lanzamiento "congela" el celular.
  const [heavyBodyReady, setHeavyBodyReady] = useState(false);
  useEffect(() => {
    if (!expanded) {
      setHeavyBodyReady(false);
      return;
    }
    let raf2 = 0;
    let idleHandle: number | ReturnType<typeof setTimeout> | null = null;
    const isHeavyBody =
      vehicle.tipoReloj === "desglosador" || vehicle.tipoFlota === "situacion";
    const mountHeavy = () => {
      if (!mountedRef.current) return;
      setHeavyBodyReady(true);
    };
    const raf1 = requestAnimationFrame(() => {
      if (!isHeavyBody) {
        mountHeavy();
        return;
      }
      raf2 = requestAnimationFrame(() => {
        if (typeof requestIdleCallback !== "undefined") {
          idleHandle = requestIdleCallback(mountHeavy, { timeout: 900 });
        } else {
          idleHandle = setTimeout(mountHeavy, 80);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (idleHandle != null) {
        if (typeof cancelIdleCallback !== "undefined" && typeof idleHandle === "number") {
          cancelIdleCallback(idleHandle);
        } else {
          clearTimeout(idleHandle);
        }
      }
    };
  }, [expanded, vehicle.tipoReloj, vehicle.tipoFlota]);

  // A3: el histórico se parsea de localStorage una sola vez cuando el cuerpo
  // pesado está listo (no en cada render ni en el frame del tap), y solo para
  // vehículos investigador que lo consumen.
  const historicalVehicleData = useMemo(
    () =>
      heavyBodyReady && vehicle.tipoReloj === "investigador"
        ? getHistoricalVehicleData(vehicle.titulo)
        : null,
    [heavyBodyReady, vehicle.tipoReloj, vehicle.titulo]
  );

  useEffect(() => {
    if (vehicle.status === "activo") return;
    setShowEtiquetaSalida(false);
    setEtiquetaSalidaLocal(null);
    setNotaSalidaLocal("");
    setPendingDescansoStatus(null);
    setTimerExpired(false);
    setRemainingUnits(null);
  }, [vehicle.status, vehicle.id]);

  const statusColors = { activo: GOLD, cumplido: EMERALD, archivado: "#6b7280" };
  const { difficulty, potentialCPCumplido, potentialCPArchivado, scorePercent } = calculateVehicleScore(vehicle);
  const difficultyConfig = {
    facil: { label: "FÁCIL", color: "#6b7280", bgColor: "rgba(107,114,128,0.2)" },
    media: { label: "MEDIA", color: AZURE, bgColor: "rgba(30,144,255,0.2)" },
    dificil: { label: "DIFÍCIL", color: GOLD, bgColor: "rgba(212,175,55,0.2)" }
  };

  const completedSubTareas = (vehicle.subTareas || []).filter(st => {
    if (st.enDesgloseCronometro) return st.resultadoSituacion === "cumplido" || st.resultadoSituacion === "fallado";
    return st.completada;
  }).length;

  const isSituacionFlota = vehicle.tipoFlota === "situacion";
  const showSituacionCasaUi = isSituacionFlota && vehicle.status === "activo";
  const situacionTotalDetalles = (vehicle.subTareas || []).reduce(
    (n, st) => n + (st.detalles?.filter(d => !d.casa).length ?? 0),
    0
  );
  const situacionTotalCasa = (vehicle.subTareas || []).reduce(
    (n, st) => n + (st.detalles?.filter(d => d.casa).length ?? 0),
    0
  );
  const situacionHechasCasa = (vehicle.subTareas || []).reduce(
    (n, st) => n + (st.detalles?.filter(d => d.casa && d.entregado).length ?? 0),
    0
  );
  const situacionCronActivo = vehicle.situacionCronometro?.activo === true;
  const ringOperable = ringSessionOperable(vehicle.situacionCronometro, vehicle.subTareas ?? []);
  const situacionBolsaSegundo = bolsaDisponibleSegundoReto(vehicle.situacionCronometro);
  const situacionProximoReto = nextRetoNumero(vehicle.situacionCronometro);
  const situacionLibrePendientes = (vehicle.subTareas || []).filter(
    st => !st.enDesgloseCronometro && !st.completada
  );
  const situacionPuedeLanzarReto =
    !situacionCronActivo &&
    onMoveSubTareasToCronometro &&
    situacionLibrePendientes.length > 0;
  const situacionPuedeEncolarEnReto =
    situacionCronActivo &&
    onMoveSubTareasToCronometro &&
    situacionLibrePendientes.length > 0;
  const situacionSegmentoActivo = planilla?.segmentos?.find(s => s.estado === "activo") ?? null;
  const situacionObjetivoHoraTrim = situacionRetoObjetivoHora.trim();
  const situacionObjetivoMinParsed = situacionMinutosHastaObjetivoHora(situacionObjetivoHoraTrim);
  const situacionObjetivoHoraValid =
    !!parseSegmentTime(situacionObjetivoHoraTrim) && (situacionObjetivoMinParsed ?? 0) >= 1;
  const situacionAlineadoSegmento =
    !!situacionSegmentoActivo?.horaFin &&
    situacionObjetivoHoraTrim === situacionSegmentoActivo.horaFin;
  const situacionBloqueListo =
    situacionCronActivo &&
    situacionDesgloseBloqueListo(vehicle.subTareas || [], vehicle.situacionCronometro);
  const situacionCronPendientes = (vehicle.subTareas || []).filter(situacionFilaCronometroPendiente).length;

  useEffect(() => {
    if (vehicle.tipoFlota === "situacion" && situacionBloqueListo) {
      setSubTasksCollapsed(false);
    }
  }, [vehicle.tipoFlota, situacionBloqueListo]);

  useEffect(() => {
    if (situacionCronActivo) setSubTasksCollapsed(false);
  }, [situacionCronActivo]);

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion") return;
    resetSituacionSessionTeardownGate(vehicle.id);
    return registerSituacionSessionCleanup(vehicle.id, () => {
      if (situacionCupoEscalationRef.current) {
        clearInterval(situacionCupoEscalationRef.current);
        situacionCupoEscalationRef.current = null;
      }
      cancelUbicacionVoiceForVehicle(vehicle.id);
      resetDesglosadorVoiceRefs();
    });
  }, [vehicle.id, vehicle.tipoFlota, resetDesglosadorVoiceRefs]);

  useEffect(() => {
    if (vehicle.tipoFlota !== "situacion" || vehicle.situacionCronometro?.activo !== true) {
      ringSobraBloqueRef.current = null;
      return;
    }
    const bloqueKey = `${vehicle.id}-${vehicle.situacionCronometro?.bloqueInicioAt ?? 0}`;
    if (ringSobraBloqueRef.current !== bloqueKey) {
      ringSobraBloqueRef.current = bloqueKey;
      ringSobraVoiceKeyRef.current = null;
      ringSobraVoicePendingRef.current = null;
    }
  }, [
    vehicle.tipoFlota,
    vehicle.id,
    vehicle.situacionCronometro?.activo,
    vehicle.situacionCronometro?.bloqueInicioAt,
  ]);

  useEffect(() => {
    if (situacionCronActivo) return;
    if (situacionBolsaSegundo > 0) {
      setSituacionRetoObjetivoHora(formatHHMM(Date.now() + situacionBolsaSegundo * 60000));
    } else if ((vehicle.situacionCronometro?.retosCompletados ?? 0) === 0 && situacionSegmentoActivo?.horaFin) {
      setSituacionRetoObjetivoHora(situacionSegmentoActivo.horaFin);
    } else if ((vehicle.situacionCronometro?.retosCompletados ?? 0) === 0) {
      setSituacionRetoObjetivoHora("");
    }
  }, [
    situacionCronActivo,
    situacionBolsaSegundo,
    vehicle.situacionCronometro?.retosCompletados,
    situacionSegmentoActivo?.horaFin,
  ]);

  const situacionCanViewDetalles = isSituacionFlota && vehicle.status === "activo" && (situacionCronActivo || situacionTotalDetalles > 0);
  const showSituacionDetallesUi = !!(arquitectoUnlocked || situacionCanViewDetalles);
  const canAddSituacionDetalles = !!(arquitectoUnlocked || (situacionCanViewDetalles && situacionCronActivo));
  const effectivePotentialCP = potentialCPCumplido;

  const resetExecSubForm = () => {
    setShowExecAddSub(false);
    setExecSubTitulo("");
    setExecSubCantidad("");
    setExecSubRecord(undefined);
    setExecSubRuta(true);
    setExecSubSugOpen(false);
  };

  const submitExecSub = () => {
    if (!onDesglosadorAddSub || !execSubTitulo.trim()) return;
    const allDone = (vehicle.subVehiculos || []).every(s => s.status === "cumplido" || s.status === "fallado");
    onDesglosadorAddSub(vehicle.id, {
      titulo: execSubTitulo,
      cantidadObjetivo: execSubCantidad,
      tiempoRecordMinPerUnit: execSubRecord,
      rutaEnfoqueActiva: execSubRuta,
    });
    if (allDone) setDesglosadorSummary(false);
    resetExecSubForm();
  };

  const renderDesglosadorAddSubForm = () => {
    if (!onDesglosadorAddSub || vehicle.interrupcionActiva) return null;
    const sug = execSubSugOpen && execSubTitulo.trim().length >= 2
      ? getSubVehicleRecordSuggestions(execSubTitulo)
      : [];
    const cantNum = execSubCantidad ? parseFloat(execSubCantidad) : 0;
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "rgba(212,175,55,0.05)", borderColor: "rgba(212,175,55,0.22)" }}>
        {!showExecAddSub ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowExecAddSub(true); }}
            className="w-full py-2.5 px-3 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all hover:bg-white/5"
            style={{ color: GOLD }}
            data-testid={`button-desglosador-add-sub-toggle-${vehicle.id}`}
          >
            <PlusCircle size={12} /> Añadir subtarea
          </button>
        ) : (
          <div className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Nueva subtarea</span>
              <button type="button" onClick={resetExecSubForm} className="text-[8px] text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <p className="text-[8px] text-slate-500">Se añade al final de la cola. Si ya cerraste todas, arranca de inmediato.</p>
            <div className="relative">
              <input
                value={execSubTitulo}
                onChange={e => {
                  const val = e.target.value;
                  setExecSubTitulo(val);
                  setExecSubRecord(undefined);
                  setExecSubSugOpen(val.trim().length >= 2);
                }}
                onFocus={() => { if (execSubTitulo.trim().length >= 2) setExecSubSugOpen(true); }}
                onBlur={() => {
                  if (execSubTitulo.trim().length >= 2 && !execSubRecord) {
                    const suggestions = getSubVehicleRecordSuggestions(execSubTitulo);
                    if (suggestions.length > 0) {
                      const exact = suggestions.find(s => s.titulo.toLowerCase() === execSubTitulo.trim().toLowerCase());
                      const match = exact ?? suggestions[0];
                      if (match.minPerUnit > 0) setExecSubRecord(match.minPerUnit);
                    }
                  }
                  setTimeout(() => setExecSubSugOpen(false), 150);
                }}
                placeholder="Título de la subtarea..."
                className="w-full bg-black/30 text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none"
                data-testid={`input-desglosador-exec-sub-${vehicle.id}`}
              />
              {sug.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-0.5 rounded-lg border overflow-hidden z-50" style={{ backgroundColor: "#0f0f0f", borderColor: "rgba(212,175,55,0.35)" }}>
                  {sug.map((s, si) => (
                    <button
                      key={si}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        setExecSubTitulo(s.titulo);
                        setExecSubRecord(s.minPerUnit > 0 ? s.minPerUnit : undefined);
                        setExecSubSugOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-white/5"
                    >
                      <span className="text-[10px] text-white truncate mr-2">{s.titulo}</span>
                      <span className="text-[9px] font-black flex-shrink-0" style={{ color: GOLD }}>{s.minPerUnit.toFixed(1)} MIN/U</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={execSubCantidad}
                onChange={e => {
                  const val = e.target.value;
                  setExecSubCantidad(val);
                  if (!execSubRecord && execSubTitulo.trim().length >= 2) {
                    const suggestions = getSubVehicleRecordSuggestions(execSubTitulo);
                    if (suggestions.length > 0) {
                      const exact = suggestions.find(s => s.titulo.toLowerCase() === execSubTitulo.trim().toLowerCase());
                      const match = exact ?? suggestions[0];
                      if (match.minPerUnit > 0) setExecSubRecord(match.minPerUnit);
                    }
                  }
                }}
                placeholder="Cant."
                className="w-16 bg-black/30 text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none text-center"
                data-testid={`input-desglosador-exec-cant-${vehicle.id}`}
              />
              {execSubRecord && execSubRecord > 0 && cantNum > 0 && (
                <span className="text-[8px] font-mono" style={{ color: GOLD }}>≈{Math.round(cantNum * execSubRecord)} min</span>
              )}
              {execSubRecord && execSubRecord > 0 && (
                <span className="text-[8px] text-slate-500 flex-1">Récord: {execSubRecord.toFixed(1)} min/u</span>
              )}
            </div>
            {execSubRecord && execSubRecord > 0 && cantNum > 0 && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={execSubRuta}
                    onChange={e => setExecSubRuta(e.target.checked)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <span className="text-[8px] leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                    <span className="font-bold text-violet-300">Ruta de enfoque (3 bandas)</span>
                    <span className="block font-mono text-[8px] mt-0.5 font-bold" style={{ color: "rgba(255,255,255,0.68)" }}>{formatRutaPreview(cantNum)}</span>
                  </span>
                </label>
                {execSubRuta && (
                  <RutaEnfoqueBar restantes={cantNum} ruta={createRutaEnfoqueState(cantNum)} />
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => submitExecSub()}
              disabled={!execSubTitulo.trim()}
              className="w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-wider disabled:opacity-40"
              style={{ backgroundColor: "rgba(212,175,55,0.2)", color: GOLD, border: "1px solid rgba(212,175,55,0.35)" }}
              data-testid={`button-desglosador-exec-add-${vehicle.id}`}
            >
              <Plus size={11} className="inline mr-1" /> Añadir a la cola
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      layout
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${statusColors[vehicle.status]}30` }}
    >
      {vehicle.tipoFlota === "situacion" && vehicle.status === "activo" && (
        <>
          <Situacion2MinAlertWatcher
            vehicle={vehicle}
            situacionAnchorKey={situacionAnchorKey}
            warnKeyRef={situacion2MinWarnKeyRef}
          />
          <SituacionRingSobraVoiceWatcher
            vehicle={vehicle}
            situacionBloqueListo={situacionBloqueListo}
            voiceKeyRef={ringSobraVoiceKeyRef}
            pendingRef={ringSobraVoicePendingRef}
          />
        </>
      )}

      <button onClick={() => onToggleVehicle(vehicle.id)} className="w-full p-3 text-left" data-testid={`card-vehicle-${vehicle.id}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[vehicle.status] }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-white">{vehicle.titulo}</p>
                {tipoFlota && flotaConfig ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}>{flotaConfig.label}</span>
                ) : vehicle.tipoTerminoRapido && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" style={{
                    backgroundColor: vehicle.tipoTerminoRapido === "hora" ? "rgba(239, 68, 68, 0.2)" : vehicle.tipoTerminoRapido === "situacion" ? "rgba(168, 85, 247, 0.2)" : "rgba(107, 114, 128, 0.2)",
                    color: vehicle.tipoTerminoRapido === "hora" ? "#ef4444" : vehicle.tipoTerminoRapido === "situacion" ? "#a855f7" : "#6b7280"
                  }}>{vehicle.tipoTerminoRapido === "hora" ? "HORA" : vehicle.tipoTerminoRapido === "situacion" ? flotaLabelUpper("situacion") : "OMITIR"}</span>
                )}
                {vehicle.bonoTemple && <span className="text-[7px] font-black px-1 py-0.5 rounded-full" style={{ backgroundColor: `${NARANJA}20`, color: NARANJA }}>TEMPLE</span>}
                {vehicle.intensidadEnergetica && (
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                    {vehicle.intensidadEnergetica === "fluido" ? "~ FLUIDO" : vehicle.intensidadEnergetica === "concentrado" ? "● CONCENTRADO" : "▲ AL LÍMITE"}
                  </span>
                )}
                {vehicle.intensidadEnergeticaFin && (
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest" style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.35)" }} title="Energía al cerrar">
                    FIN · {vehicle.intensidadEnergeticaFin === "fluido" ? "~" : vehicle.intensidadEnergeticaFin === "concentrado" ? "●" : "▲"}
                  </span>
                )}
                {vehicle.tipoReloj === "investigador" && vehicle.status === "activo" && (
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest" style={{ backgroundColor: "rgba(30,144,255,0.15)", color: "#60a5fa", border: "1px solid rgba(30,144,255,0.3)" }}>⚗ INVESTIGADOR</span>
                )}
                {vehicle.vehiculoPadreDesglosadorId && vehicle.status === "activo" && (
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest" style={{ backgroundColor: "rgba(0,255,195,0.12)", color: CYAN, border: "1px solid rgba(0,255,195,0.35)" }}>INTERRUPCIÓN</span>
                )}
                {vehicle.interrupcionActiva && vehicle.tipoReloj === "desglosador" && (
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: VIOLET, border: "1px solid rgba(139,92,246,0.35)" }}>EN PAUSA</span>
                )}
                {vehicle.tipoReloj === "desglosador" && vehicle.status === "activo" && (
                  <VehicleCardLiveNow>
                    {(nowMs) => (
                      <span className="inline-flex items-center gap-1.5">
                        <DesglosadorDuracionPanel
                          elapsedSec={getDesglosadorSessionElapsedSec(vehicle, nowMs)}
                          depthPsGranted={vehicle.desglosadorBloqueDepthPsGranted ?? 0}
                          compact
                        />
                        <ConquistaUnitFocusButton
                          onOpen={() => setUnitFocusOpen(true)}
                          accentColor={flotaColor}
                        />
                      </span>
                    )}
                  </VehicleCardLiveNow>
                )}
                {segmentoNumero != null && vehicle.status === "activo" && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${EMERALD}20`, color: EMERALD }}>S{segmentoNumero}</span>}
                {isSituacionFlota && vehicle.status === "activo" && situacionRelojDebeMostrarse(vehicle) && (
                  <SituacionRelojIsland vehicle={vehicle} compact onExpiredChange={handleTimerExpiredChange} />
                )}
              </div>
              <p className="text-[10px] text-slate-500">{vehicle.criterioDetalle}</p>
              {!expanded && vehicle.tipoReloj === "desglosador" && vehicle.status === "activo" && isMobilePerfMode() && (
                <p className="text-[9px] font-bold mt-0.5 tracking-wide" style={{ color: NARANJA }} data-testid={`desglosador-tap-hint-${vehicle.id}`}>
                  Toca para abrir subs
                </p>
              )}
              {!expanded && isSituacionFlota && vehicle.status === "activo" && isMobilePerfMode() && (
                <p className="text-[9px] font-bold mt-0.5 tracking-wide" style={{ color: NARANJA }} data-testid={`situacion-tap-hint-${vehicle.id}`}>
                  Toca para operar
                </p>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: difficultyConfig[difficulty].bgColor, color: difficultyConfig[difficulty].color }}>{difficultyConfig[difficulty].label}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={10} style={{ color: difficultyConfig[difficulty].color }} />
              {vehicle.status === "activo" ? (
                isSituacionFlota ? (
                  <span className="text-xs font-black" style={{ color: PLATA }}>
                    {effectivePotentialCP > 0 ? `${effectivePotentialCP}+` : "3-7"} PS
                    {potentialCPArchivado > 0 && <span className="text-[9px] text-amber-500 ml-1">({potentialCPArchivado} si archiva)</span>}
                  </span>
                ) : (
                  <span className="text-xs font-black" style={{ color: difficultyConfig[difficulty].color }}>{effectivePotentialCP} PS{potentialCPArchivado > 0 && <span className="text-[9px] text-amber-500 ml-1">({potentialCPArchivado} si archiva)</span>}</span>
                )
              ) : (
                <span className="text-xs font-black" style={{ color: vehicle.status === "cumplido" ? EMERALD : "#f59e0b" }}>+{vehicle.status === "cumplido" ? effectivePotentialCP : potentialCPArchivado} PS</span>
              )}
            </div>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${scorePercent}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: difficultyConfig[difficulty].color, boxShadow: `0 0 6px ${difficultyConfig[difficulty].color}80` }} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeOut" }} className="overflow-hidden">
            {heavyBodyReady && (
            <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {vehicle.tipoReloj === "desglosador" && vehicle.status === "activo" && (() => {
                const subs = vehicle.subVehiculos || [];
                const activeSub = subs.find(s => s.status === "activo");
                const cumplidos = subs.filter(s => s.status === "cumplido").length;
                const fallados = subs.filter(s => s.status === "fallado").length;
                const terminados = subs.filter(s => s.status === "cumplido" || s.status === "fallado");
                const pendientes = subs.filter(s => s.status === "pendiente");
                const done = subs.every(s => s.status === "cumplido" || s.status === "fallado");
                const fmtSec = (sec: number) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };

                if (done) {
                  const sessionElapsedSec = getDesglosadorSessionElapsedSec(vehicle);
                  const totalRealSec = subs.reduce((acc, s) => acc + (s.duracionFinal || 0), 0);
                  const totalSugeridoSec = subs.reduce((acc, s) => acc + (s.tiempoSugeridoSeg || 0), 0);
                  const hasSugerido = totalSugeridoSec > 0;
                  const deltaTotalSec = totalRealSec - totalSugeridoSec;
                  const deltaGanando = hasSugerido && deltaTotalSec < -5;
                  const deltaPerdiendo = hasSugerido && deltaTotalSec > 5;
                  const deltaColor = deltaGanando ? "#00C851" : deltaPerdiendo ? "#FF3131" : "#D4AF37";
                  const deltaLabel = deltaGanando ? `↓ ${fmtSec(Math.abs(deltaTotalSec))} ganado` : deltaPerdiendo ? `↑ ${fmtSec(deltaTotalSec)} extra` : "→ en tiempo";
                  const unitCycle = sumDesglosadorUnitCycle(subs);
                  const psProfundidad = vehicle.desglosadorBloqueDepthPsGranted ?? 0;
                  const subsPsGranted = sumDesglosadorSubsPsAlreadyGranted(subs);
                  const totalPS = estimateDesglosadorSessionPs(subs, psProfundidad);
                  const psCumplidosEst = subs
                    .filter(s => s.status === "cumplido")
                    .reduce(
                      (sum, s) => sum + (s.psOtorgados ?? computeDesglosadorSubAwardPS(s)),
                      0
                    );
                  return (
                    <div className="pt-3">
                      <div className="p-4 rounded-xl border-2 space-y-3" style={{ backgroundColor: "rgba(212,175,55,0.05)", borderColor: "#D4AF37", boxShadow: "0 0 20px rgba(212,175,55,0.15)" }}>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy size={14} style={{ color: "#D4AF37" }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>CICLO COMPLETADO</span>
                          </div>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>+{totalPS} PS</span>
                        </div>

                        {/* Top stats */}
                        <div className="grid grid-cols-2 gap-1.5 text-center sm:grid-cols-5">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(56,189,248,0.1)" }}>
                            <p className="text-base font-black font-mono" style={{ color: "#38BDF8" }}>{formatElapsedHHMMSS(sessionElapsedSec)}</p>
                            <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>Desglose</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(0,200,81,0.1)" }}>
                            <p className="text-base font-black" style={{ color: "#00C851" }}>{cumplidos}</p>
                            <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>Cumplidos</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
                            <p className="text-base font-black text-red-400">{fallados}</p>
                            <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>Fallados</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(212,175,55,0.1)" }}>
                            <p className="text-base font-black" style={{ color: "#D4AF37" }}>{fmtSec(totalRealSec)}</p>
                            <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>Real</p>
                          </div>
                          {hasSugerido ? (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${deltaColor}15` }}>
                              <p className="text-[11px] font-black" style={{ color: deltaColor }}>{deltaLabel}</p>
                              <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>Delta</p>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(100,116,139,0.08)" }}>
                              <p className="text-base font-black" style={{ color: "rgba(255,255,255,0.45)" }}>—</p>
                              <p className="text-[7px] uppercase font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>Sin ref</p>
                            </div>
                          )}
                        </div>

                        {unitCycle.stepsCounted > 0 && (
                          <div
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                            style={{ backgroundColor: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.35)" }}
                            data-testid="desglosador-unit-cycle-done"
                          >
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#FB923C" }}>
                                1 unidad completa
                              </p>
                              <p className="text-[7px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                                Suma seg/unidad de {unitCycle.stepsCounted}/{unitCycle.stepsTotal} pasos
                                {unitCycle.allRef ? " · ref" : unitCycle.hasMeasured ? " · medido" : ""}
                              </p>
                            </div>
                            <p
                              className="text-lg font-black font-mono tabular-nums"
                              style={{ color: "#FB923C" }}
                            >
                              {fmtSec(Math.round(unitCycle.totalSec))}
                            </p>
                          </div>
                        )}

                        {/* Time vs Suggested breakdown (if available) */}
                        {hasSugerido && (
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.72)" }}>Sugerido</span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: "#C4B5FD" }}>{fmtSec(totalSugeridoSec)}</span>
                            <span className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>vs</span>
                            <span className="text-[10px] font-mono font-bold text-white">{fmtSec(totalRealSec)}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.72)" }}>Real</span>
                          </div>
                        )}

                        {/* PS breakdown */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>PS</span>
                          <span className="text-[8px] font-bold flex-1" style={{ color: "rgba(255,255,255,0.78)" }}>Subs +{psCumplidosEst}{subsPsGranted < psCumplidosEst ? ` (${subsPsGranted} ya en barra)` : ""} · cierre +{DESGLOSADOR_CYCLE_CLOSE_BASE_PS}{psProfundidad > 0 ? ` · profundidad +${psProfundidad}` : ""}{fallados > 0 ? ` · ${fallados} fallado(s) sin PS` : ""}</span>
                          <span className="text-[10px] font-black" style={{ color: "#D4AF37" }}>={totalPS}</span>
                        </div>

                        {/* Per-sub breakdown */}
                        <div className="space-y-1.5">
                          {subs.map((sv) => {
                            const subDelta = sv.duracionFinal !== undefined && sv.tiempoSugeridoSeg !== undefined
                              ? sv.duracionFinal - sv.tiempoSugeridoSeg : null;
                            const subGanando = subDelta !== null && subDelta < -5;
                            const subPerdiendo = subDelta !== null && subDelta > 5;
                            const subDeltaColor = subGanando ? "#00C851" : subPerdiendo ? "#FF3131" : "#94a3b8";
                            return (
                              <div key={sv.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: sv.status === "cumplido" ? "rgba(0,200,81,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${sv.status === "cumplido" ? "rgba(0,200,81,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                                <div className="flex items-center gap-2 py-1.5 px-2">
                                  {sv.status === "cumplido" ? <CheckCircle2 size={10} style={{ color: "#00C851" }} /> : <XCircle size={10} className="text-red-400" />}
                                  <span className="text-[10px] font-bold text-white flex-1 truncate">{cleanSubTitulo(sv.titulo)}</span>
                                  {sv.cantidadLograda !== undefined && (
                                    <span className="text-[8px] font-mono px-1 rounded" style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>
                                      {sv.cantidadLograda}/{sv.cantidadObjetivo}
                                    </span>
                                  )}
                                  {sv.duracionFinal !== undefined && (
                                    <span className="text-[8px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>{fmtSec(sv.duracionFinal)}</span>
                                  )}
                                  {subDelta !== null && (
                                    <span className="text-[8px] font-black" style={{ color: subDeltaColor }}>
                                      {subGanando ? `−${fmtSec(Math.abs(subDelta))}` : subPerdiendo ? `+${fmtSec(subDelta)}` : "≈"}
                                    </span>
                                  )}
                                </div>
                                {sv.tiempoSugeridoSeg !== undefined && sv.duracionFinal !== undefined && (
                                  <div className="flex items-center gap-1 px-2 pb-1.5">
                                    <span className="text-[7px] font-bold font-mono" style={{ color: "rgba(255,255,255,0.62)" }}>ref {fmtSec(sv.tiempoSugeridoSeg)}</span>
                                    <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.45)" }}>→</span>
                                    <span className="text-[7px] font-bold font-mono" style={{ color: "rgba(255,255,255,0.78)" }}>real {fmtSec(sv.duracionFinal)}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {renderDesglosadorAddSubForm()}

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const resetSubs = subs.map((sv, i) => ({
                                ...sv,
                                status: i === 0 ? "activo" as const : "pendiente" as const,
                                aperturaAt: i === 0 ? Date.now() : undefined,
                                cierreAt: undefined,
                                duracionFinal: undefined,
                                cantidadLograda: undefined,
                                rutaEnfoque: sv.rutaEnfoque
                                  ? { ...sv.rutaEnfoque, cruzado: { fluido: true, concentrado: false, limite: false } }
                                  : undefined,
                              }));
                              if (onDesglosadorUpdate) {
                                resetDesglosadorVoiceRefs();
                                onDesglosadorUpdate(vehicle.id, resetSubs, { resetDepth: true });
                              }
                              setDesglosadorSummary(false);
                              setUltimoCierreSub(null);
                            }}
                            className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                            style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}
                            data-testid={`button-desglosador-nuevo-ciclo-${vehicle.id}`}
                          >
                            <RotateCcw size={11} /> Nuevo Ciclo
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!mountedRef.current) return;
                              setDesglosadorSummary(false);
                              if (onOpenCierreEnergia) {
                                onOpenCierreEnergia({ kind: "desglosador", vehicleId: vehicle.id, subs });
                                return;
                              }
                              onDesglosadorGlobalClose?.(vehicle.id, subs);
                            }}
                            className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            style={{ backgroundColor: "#D4AF37", color: "#000", boxShadow: "0 0 16px rgba(212,175,55,0.25)" }}
                            data-testid={`button-desglosador-global-close-${vehicle.id}`}
                          >
                            {`Cerrar · +${totalPS} PS`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <DesglosadorSubLiveIsland
                    key={desglosadorSubClockKey(activeSub)}
                    vehicle={vehicle}
                    activeSub={activeSub}
                    onSubVehicleRestanteChange={handleSubVehicleRestanteChange}
                  >
                    {(clockUi) => {
                const sessionElapsedSec = clockUi.sessionElapsedSec;
                const unitCycle = sumDesglosadorUnitCycle(subs);
                const unitCycleLabel =
                  unitCycle.stepsCounted > 0
                    ? formatMMSS(Math.round(unitCycle.totalSec))
                    : "—";

                return (
                  <div className="pt-3 space-y-3">
                    <DesglosadorDuracionPanel
                      elapsedSec={sessionElapsedSec}
                      depthPsGranted={vehicle.desglosadorBloqueDepthPsGranted ?? 0}
                    />

                    {onDesglosadorCierreDeGolpe && (activeSub || pendientes.length > 0) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDesglosadorCierreDeGolpe(vehicle.id); }}
                        className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}
                        data-testid={`desglosador-cerrar-de-golpe-${vehicle.id}`}
                      >
                        <Square size={11} />
                        Cerrar desglosador de golpe
                      </button>
                    )}
                    {/* Progress header with collapse toggle */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <ListTodo size={12} style={{ color: flotaColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: flotaColor }}>MODO EJECUCIÓN</span>
                        <ConquistaUnitFocusButton
                          onOpen={() => setUnitFocusOpen(true)}
                          accentColor={flotaColor}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="text-[8px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.82)" }}>{cumplidos + fallados}/{subs.length}</span>
                        <span className="text-[8px] font-mono font-bold" style={{ color: clockUi.futuroCicloLabel === "—" ? "rgba(255,255,255,0.45)" : "#FDBA74" }}>🏁 CICLO: {clockUi.futuroCicloLabel}</span>
                        <span
                          className="text-[8px] font-mono font-bold"
                          style={{ color: unitCycle.stepsCounted > 0 ? "#FB923C" : "rgba(255,255,255,0.45)" }}
                          title="Suma de seg/unidad de cada sub = 1 producto completo"
                          data-testid="desglosador-unit-cycle-live"
                        >
                          1 und: {unitCycleLabel}
                          {unitCycle.allRef ? " ·ref" : ""}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSubTasksCollapsed(c => !c); }}
                          className="p-1 rounded-md transition-colors hover:bg-white/10"
                          data-testid={`button-collapse-subtasks-${vehicle.id}`}
                          title={subTasksCollapsed ? "Expandir subtareas" : "Colapsar subtareas"}
                        >
                          {subTasksCollapsed ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronUp size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {ultimoCierreSub && (() => {
                      const fmtDelta = (sec: number) => {
                        const m = Math.floor(Math.abs(sec) / 60);
                        const s = Math.abs(sec) % 60;
                        return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
                      };
                      const v = ultimoCierreSub.verdict;
                      const badgeColor =
                        v === "gain" ? "#00C851" : v === "loss" ? "#FF3131" : v === "neutral" ? GOLD : SLATE;
                      const label =
                        v === "gain"
                          ? `↓ ${fmtDelta(ultimoCierreSub.deltaSec)} · GANASTE`
                          : v === "loss"
                            ? `↑ ${fmtDelta(ultimoCierreSub.deltaSec)} · PERDISTE`
                            : v === "neutral"
                              ? "≈ EN TIEMPO"
                              : `Sin referencia · ${ultimoCierreSub.status}`;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-2 p-2.5 rounded-xl border"
                          style={{
                            backgroundColor: `${badgeColor}10`,
                            borderColor: `${badgeColor}40`,
                            boxShadow: `0 0 12px ${badgeColor}18`,
                          }}
                          data-testid="desglosador-ultimo-cierre"
                        >
                          <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: badgeColor }}>
                            Último cierre
                          </p>
                          <p className="text-[10px] font-bold text-white truncate">{ultimoCierreSub.titulo}</p>
                          <p className="text-sm font-black mt-0.5" style={{ color: badgeColor, fontFamily: "JetBrains Mono, monospace" }}>
                            {label}
                          </p>
                          {ultimoCierreSub.conquistaFluidezAbsoluta && (
                            <p className="text-[8px] font-bold mt-1" style={{ color: "#38BDF8" }}>
                              Conquista de fluidez absoluta · segmento A
                            </p>
                          )}
                        </motion.div>
                      );
                    })()}

                    <AnimatePresence>
                      {!subTasksCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-3"
                        >
                          {/* Active sub-vehicle — protagonist */}
                          {activeSub && (
                            <div className="rounded-xl border-2 overflow-hidden" style={{
                              borderColor: flotaColor,
                              backgroundColor: `${flotaColor}08`,
                              boxShadow: `0 0 16px ${flotaColor}20`
                            }}>
                              <div className="p-3 space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black" style={{ backgroundColor: flotaColor, color: "#000" }}>
                                    <Play size={10} />
                                  </div>
                                  <span className="text-sm font-black text-white flex-1">{cleanSubTitulo(activeSub.titulo)}</span>
                                  {activeSub.cantidadObjetivo && (
                                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${flotaColor}15`, color: flotaColor }}>
                                      obj: {activeSub.cantidadObjetivo}
                                    </span>
                                  )}
                                  {activeSub.tiempoSugeridoSeg && (
                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                                      ref {fmtSec(activeSub.tiempoSugeridoSeg)}
                                    </span>
                                  )}
                                </div>
                                {/* Active sub timer */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center gap-2 py-3 rounded-lg" style={{ backgroundColor: clockUi.subTimerExpired ? "rgba(255,49,49,0.08)" : `${flotaColor}10` }}>
                                    <Timer size={12} style={{ color: clockUi.subTimerExpired ? "#FF3131" : flotaColor }} />
                                    <span className="text-2xl font-black tracking-wider" style={{ color: clockUi.subTimerExpired ? "#FF3131" : flotaColor, fontFamily: "JetBrains Mono, monospace" }}>
                                      {clockUi.subTimerIsCountdown && clockUi.subTimerExpired ? `+${clockUi.subTimerDisplay}` : clockUi.subTimerDisplay || "00:00:00"}
                                    </span>
                                  </div>
                                  {activeSub.cantidadObjetivo && activeSub.tiempoRecordMinPerUnit && (
                                    <p className="text-[9px] text-center font-mono font-bold leading-snug" style={{ color: "rgba(255,255,255,0.88)" }}>
                                      <span style={{ color: flotaColor }}>{activeSub.cantidadObjetivo} u</span>
                                      {" × "}
                                      <span style={{ color: flotaColor }}>{activeSub.tiempoRecordMinPerUnit.toFixed(1)} MIN/U</span>
                                      {" = "}
                                      <span style={{ color: GOLD }}>{Math.round(activeSub.cantidadObjetivo * activeSub.tiempoRecordMinPerUnit)} min obj</span>
                                    </p>
                                  )}
                                  {/* Lucha Consciente — delta acumulado en tiempo real */}
                                  {(clockUi.liveAccumDeltaSec < -5 || clockUi.liveAccumDeltaSec > 5) && (
                                    <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg" style={{
                                      backgroundColor: clockUi.liveAccumDeltaSec < 0 ? "rgba(0,200,81,0.08)" : "rgba(255,49,49,0.08)",
                                      border: `1px solid ${clockUi.liveAccumDeltaSec < 0 ? "rgba(0,200,81,0.25)" : "rgba(255,49,49,0.25)"}`,
                                    }}>
                                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: clockUi.liveAccumDeltaSec < 0 ? "#00C851" : "#FF3131" }}>
                                        {clockUi.liveAccumDeltaSec < 0 ? "↓" : "↑"}
                                      </span>
                                      <span className="text-[13px] font-black" style={{ color: clockUi.liveAccumDeltaSec < 0 ? "#00C851" : "#FF3131", fontFamily: "JetBrains Mono, monospace" }}>
                                        {Math.floor(Math.abs(clockUi.liveAccumDeltaSec) / 60)}m {String(Math.abs(clockUi.liveAccumDeltaSec) % 60).padStart(2, "0")}s
                                      </span>
                                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: clockUi.liveAccumDeltaSec < 0 ? "#00C851" : "#FF3131" }}>
                                        {clockUi.liveAccumDeltaSec < 0 ? "ganando" : "perdiendo"}
                                      </span>
                                    </div>
                                  )}
                                  {/* Reloj del Futuro — siempre visible, "—" si sin datos */}
                                  <div className="flex justify-between items-center px-1 pt-0.5">
                                    <div>
                                      <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "#6EE7B7" }}>TERMINA A LAS</p>
                                      <p className="text-[11px] font-black" style={{ color: clockUi.futuroSubLabel === "—" ? "rgba(255,255,255,0.45)" : "#00FFC3", fontFamily: "JetBrains Mono, monospace" }}>{clockUi.futuroSubLabel}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.72)" }}>CICLO GLOBAL</p>
                                      <p className="text-[11px] font-black" style={{ color: clockUi.futuroCicloLabel === "—" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.9)", fontFamily: "JetBrains Mono, monospace" }}>{clockUi.futuroCicloLabel}</p>
                                    </div>
                                  </div>
                                </div>
                                {/* Cantidad lograda input if applicable */}
                                {activeSub.cantidadObjetivo && (
                                  <div className="space-y-2">
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.78)" }}>Cant. lograda</span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setCantidadRealizada(v => String(Math.max(0, Number(v) - 1)))}
                                          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl transition-all active:scale-95"
                                          style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.35)" }}
                                          data-testid={`button-sub-decrement-${activeSub.id}`}
                                        >−</button>
                                        <input
                                          type="number"
                                          value={cantidadRealizada}
                                          onChange={e => setCantidadRealizada(e.target.value)}
                                          placeholder="¿cuántas?"
                                          className="flex-1 bg-black/30 text-white text-sm p-2 rounded border border-white/10 focus:outline-none text-center font-bold"
                                          style={{ fontFamily: "JetBrains Mono, monospace" }}
                                          data-testid={`input-sub-cantidad-${activeSub.id}`}
                                        />
                                        <button
                                          onClick={() => setCantidadRealizada(v => String(Number(v) + 1))}
                                          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl transition-all active:scale-95"
                                          style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.35)" }}
                                          data-testid={`button-sub-increment-${activeSub.id}`}
                                        >+</button>
                                      </div>
                                    </div>
                                    {clockUi.subVehicleRestante !== null && activeSub.tiempoRecordMinPerUnit ? (
                                      <div className="text-center py-1">
                                        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>RESTANTE</p>
                                        <span className="text-3xl font-black tracking-wider" style={{ color: clockUi.subVehicleRestante === 0 ? "#22C55E" : "#8B5CF6", fontFamily: "JetBrains Mono, monospace", textShadow: clockUi.subVehicleRestante === 0 ? "0 0 12px rgba(34,197,94,0.5)" : "0 0 12px rgba(139,92,246,0.5)" }}>
                                          {clockUi.subVehicleRestante}
                                        </span>
                                        <p className="text-[8px] mt-0.5 font-mono font-bold" style={{ color: "rgba(255,255,255,0.78)" }}>
                                          Ritmo: <span style={{ color: "#C4B5FD" }}>{activeSub.tiempoRecordMinPerUnit.toFixed(1)} min/unidad</span> (récord)
                                        </p>
                                        {clockUi.subVehicleRestante === 0 && (
                                          <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ color: "#22C55E", fontFamily: "monospace" }}>OBJETIVO ALCANZADO</p>
                                        )}
                                        {(() => {
                                          const rutaBar = resolveRutaEnfoqueForSub(
                                            activeSub.cantidadObjetivo,
                                            activeSub.tiempoRecordMinPerUnit,
                                            activeSub.rutaEnfoque
                                          );
                                          if (!rutaBar || clockUi.subVehicleRestante === null) return null;
                                          return (
                                            <div className="mt-2 px-1">
                                              <RutaEnfoqueBar restantes={clockUi.subVehicleRestante} ruta={rutaBar} />
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      <div className="text-center py-1">
                                        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>RESTANTE</p>
                                        <span className="text-3xl font-black tracking-wider" style={{ color: "#8B5CF6", fontFamily: "JetBrains Mono, monospace", textShadow: "0 0 12px rgba(139,92,246,0.5)" }}>
                                          {Math.max(0, activeSub.cantidadObjetivo - (Number(cantidadRealizada) || 0))}
                                        </span>
                                        <p className="text-[8px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.62)" }}>
                                          Sin récord · primer ciclo · Cumplido asume todo el objetivo
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {!vehicle.interrupcionActiva && (
                                  <div className="mb-2">
                                    {!showPausaForm ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowPausaForm(true); }}
                                        className="w-full py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: "rgba(0,255,195,0.08)", color: CYAN, border: "1px solid rgba(0,255,195,0.25)" }}
                                        data-testid="button-desglosador-pausa"
                                      >
                                        Pausar e interrumpir
                                      </button>
                                    ) : (
                                      <div className="flex gap-1.5">
                                        <input
                                          value={pausaTitulo}
                                          onChange={e => setPausaTitulo(e.target.value)}
                                          placeholder="Tarea que interrumpe..."
                                          className="flex-1 px-2 py-1.5 rounded bg-black/40 border text-white text-[10px] focus:outline-none"
                                          style={{ borderColor: "rgba(0,255,195,0.25)" }}
                                          onClick={e => e.stopPropagation()}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (pausaEnviando || !pausaTitulo.trim()) return;
                                            setPausaEnviando(true);
                                            void Promise.resolve(onDesglosadorPausaInterrupcion?.(vehicle.id, pausaTitulo.trim()))
                                              .finally(() => {
                                                setPausaEnviando(false);
                                                setPausaTitulo("");
                                                setShowPausaForm(false);
                                              });
                                          }}
                                          disabled={pausaEnviando || !pausaTitulo.trim()}
                                          className="px-2 py-1.5 rounded text-[9px] font-bold disabled:opacity-40"
                                          style={{ backgroundColor: "rgba(0,255,195,0.2)", color: CYAN }}
                                        >{pausaEnviando ? "…" : "Ir"}</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setShowPausaForm(false); setPausaTitulo(""); }} className="px-2 text-slate-500 text-[9px]">✕</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {vehicle.interrupcionActiva && (
                                  <div className="mb-2 space-y-1.5">
                                    <p className="text-[8px] text-center uppercase tracking-wider" style={{ color: CYAN }}>
                                      Desglosador en pausa — cierra la interrupción arriba (Cumplido o Incumplido)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onResumeDesglosador?.(vehicle.id); }}
                                      className="w-full py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider"
                                      style={{ backgroundColor: "rgba(139,92,246,0.12)", color: VIOLET, border: "1px solid rgba(139,92,246,0.35)" }}
                                    >
                                      Reanudar desglosador ahora
                                    </button>
                                  </div>
                                )}
                                {activeSub && (
                                  <DesglosadorSubCloseButtons
                                    vehicleId={vehicle.id}
                                    activeSub={activeSub}
                                    cantidadRealizada={cantidadRealizada}
                                    blockedByInterrupt={!!vehicle.interrupcionActiva}
                                    onCloseSub={handleDesglosadorSubCloseFromButton}
                                    onWarDrum={playWarDrum}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Pending sub-vehicles — compact */}
                          {pendientes.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-1 gap-2">
                                <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.78)" }}>
                                  Pendientes ({pendientes.length})
                                  {pendientes[0] && !vehicle.interrupcionActiva && (
                                    <span className="font-normal normal-case ml-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                                      · sigue: {cleanSubTitulo(pendientes[0].titulo)}
                                    </span>
                                  )}
                                </p>
                                {pendientes.length >= 2 && !vehicle.interrupcionActiva && onDesglosadorReorderSubs && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDesglosadorReorderMode(m => !m); }}
                                    className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: desglosadorReorderMode ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
                                      color: desglosadorReorderMode ? VIOLET : "rgba(255,255,255,0.55)",
                                      border: `1px solid ${desglosadorReorderMode ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.12)"}`,
                                    }}
                                  >
                                    {desglosadorReorderMode ? "Listo" : "Reordenar cola"}
                                  </button>
                                )}
                              </div>
                              {pendientes.map((sv, pIdx) => (
                                <button
                                  key={sv.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDesglosadorActivatePendingSub?.(vehicle.id, sv.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg flex-wrap text-left transition-all hover:bg-white/8"
                                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)" }}
                                  data-testid={`button-desglosador-pending-sub-${sv.id}`}
                                >
                                  {desglosadorReorderMode && !vehicle.interrupcionActiva && onDesglosadorReorderSubs && (
                                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                                      <button
                                        type="button"
                                        disabled={pIdx === 0}
                                        onClick={(e) => { e.stopPropagation(); onDesglosadorReorderSubs(vehicle.id, sv.id, "up"); }}
                                        className="p-0.5 rounded disabled:opacity-25 hover:bg-white/10"
                                        title="Subir en cola"
                                      >
                                        <ChevronUp size={12} className="text-slate-400" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pIdx === pendientes.length - 1}
                                        onClick={(e) => { e.stopPropagation(); onDesglosadorReorderSubs(vehicle.id, sv.id, "down"); }}
                                        className="p-0.5 rounded disabled:opacity-25 hover:bg-white/10"
                                        title="Bajar en cola"
                                      >
                                        <ChevronDown size={12} className="text-slate-400" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-[7px] font-mono font-bold flex-shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>#{pIdx + 1}</span>
                                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border" style={{ borderColor: "rgba(255,255,255,0.45)" }} />
                                  <span className="text-[10px] font-semibold flex-1 min-w-0" style={{ color: "rgba(255,255,255,0.92)" }}>{cleanSubTitulo(sv.titulo)}</span>
                                  {sv.cantidadObjetivo && sv.tiempoRecordMinPerUnit ? (
                                    <span className="text-[8px] font-mono font-bold whitespace-nowrap" style={{ color: GOLD }}>
                                      {sv.cantidadObjetivo}×{sv.tiempoRecordMinPerUnit.toFixed(1)}m/u · ≈{Math.round(sv.cantidadObjetivo * sv.tiempoRecordMinPerUnit)}m
                                    </span>
                                  ) : sv.cantidadObjetivo ? (
                                    <span className="text-[8px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.82)" }}>{sv.cantidadObjetivo} u</span>
                                  ) : null}
                                  {sv.tiempoSugeridoSeg ? (
                                    <span className="text-[8px] font-mono font-bold" style={{ color: "#C4B5FD" }}>ref {fmtSec(sv.tiempoSugeridoSeg)}</span>
                                  ) : null}
                                  {!vehicle.interrupcionActiva && (
                                    <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
                                      {activeSub ? "en cola" : "abrir"}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Projection panel — shown while active sub exists */}
                          {activeSub && (() => {
                            const ganando = clockUi.liveAccumDeltaSec < -5;
                            const perdiendo = clockUi.liveAccumDeltaSec > 5;
                            const deltaColor = ganando ? "#00C851" : perdiendo ? "#FF3131" : "#D4AF37";
                            const deltaLabel = ganando ? "↓ ganando" : perdiendo ? "↑ perdiendo" : "→ estable";
                            const futureClockColor = perdiendo && clockUi.liveAccumDeltaSec > 300 ? "#FF3131" : "#F97316";
                            const noSuggested = !subs.some(s => suggestedSec(s) != null);
                            const cycleRemain = clockUi.horaFinRemainSec ?? 0;
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 rounded-xl border text-center" style={{ backgroundColor: `${futureClockColor}08`, borderColor: `${futureClockColor}30` }}>
                                  <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: futureClockColor }}>🔮 FIN PROYECTADO</p>
                                  {clockUi.horaFinProyectada && !noSuggested ? (
                                    <>
                                      <motion.p
                                        key={clockUi.horaFinProyectada}
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 0.3, times: [0, 0.5, 1] }}
                                        className="text-base font-black leading-tight"
                                        style={{ color: futureClockColor, fontFamily: "JetBrains Mono, monospace" }}
                                      >
                                        {clockUi.horaFinProyectada}
                                      </motion.p>
                                      {clockUi.horaFinRemainSec !== null && (
                                        <p className="text-[8px] font-mono font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>en {(() => { const h = Math.floor(clockUi.horaFinRemainSec / 3600); const m = Math.floor((clockUi.horaFinRemainSec % 3600) / 60); return h > 0 ? `${h}h ${String(m).padStart(2,'0')}min` : `${m}min ${String(clockUi.horaFinRemainSec % 60).padStart(2,'0')}s`; })()}</p>
                                      )}
                                      {clockUi.horaFinDeltaSec !== 0 && (
                                        <p className="text-[7px] font-bold mt-0.5" style={{ color: clockUi.horaFinDeltaSec < 0 ? "#00C851" : "#FF3131" }}>
                                          {clockUi.horaFinDeltaSec < 0 ? `−${Math.floor(Math.abs(clockUi.horaFinDeltaSec)/60).toString().padStart(2,'0')}:${String(Math.abs(clockUi.horaFinDeltaSec)%60).padStart(2,'0')} · ganando` : `+${Math.floor(clockUi.horaFinDeltaSec/60).toString().padStart(2,'0')}:${String(clockUi.horaFinDeltaSec%60).padStart(2,'0')} · perdiendo`}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="relative inline-flex items-center justify-center">
                                        <Clock size={16} style={{ color: "rgba(100,116,139,0.4)" }} />
                                        <span className="absolute text-[10px] font-black" style={{ color: "rgba(100,116,139,0.5)" }}>✕</span>
                                      </div>
                                      <p className="text-[7px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Sin proyección</p>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2.5 rounded-xl border text-center" style={{ backgroundColor: "rgba(139,92,246,0.07)", borderColor: "rgba(139,92,246,0.25)" }}>
                                  <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: "#8B5CF6" }}>📈 PROYECCIÓN</p>
                                  <p className="text-base font-black" style={{ color: "#8B5CF6", fontFamily: "JetBrains Mono, monospace" }}>
                                    {cycleRemain > 0 ? fmtSec(cycleRemain) : fmtSec(0)}
                                  </p>
                                  {!noSuggested ? (
                                    <p className="text-[7px] font-bold mt-0.5" style={{ color: deltaColor }}>
                                      {clockUi.liveAccumDeltaSec !== 0 ? `${clockUi.liveAccumDeltaSec <= 0 ? "−" : "+"}${fmtSec(Math.abs(clockUi.liveAccumDeltaSec))} · ` : ""}{deltaLabel}
                                    </p>
                                  ) : (
                                    <p className="text-[8px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>sin ref. aún</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Terminados group — always below pending */}
                          {terminados.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 px-1">
                                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.72)" }}>Terminados ({terminados.length})</span>
                                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                              </div>
                              {terminados.map((sv) => {
                                const isCumplido = sv.status === "cumplido";
                                const deltaSv = sv.duracionFinal && sv.tiempoSugeridoSeg ? sv.duracionFinal - sv.tiempoSugeridoSeg : null;
                                const isUltimo = ultimoCierreSub?.subId === sv.id;
                                return (
                                  <div key={sv.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: isCumplido ? "rgba(0,200,81,0.06)" : "rgba(239,68,68,0.06)", border: isUltimo ? `2px solid ${isCumplido ? "#00C851" : "#ef4444"}` : `1px solid ${isCumplido ? "rgba(0,200,81,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                                    {isCumplido ? <CheckCircle2 size={10} style={{ color: "#00C851" }} /> : <XCircle size={10} className="text-red-400" />}
                                    <span className="text-[10px] font-bold flex-1" style={{ color: "rgba(255,255,255,0.9)" }}>{cleanSubTitulo(sv.titulo)}</span>
                                    {isUltimo && <span className="text-[6px] font-black uppercase px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: SLATE }}>último</span>}
                                    {sv.cantidadLograda !== undefined && <span className="text-[8px] font-bold font-mono" style={{ color: GOLD }}>{sv.cantidadLograda}/{sv.cantidadObjetivo}</span>}
                                    {sv.duracionFinal && <span className="text-[8px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>{fmtSec(sv.duracionFinal)}</span>}
                                    {deltaSv !== null && (
                                      <span className="text-[7px] font-black" style={{ color: deltaSv <= 0 ? "#00C851" : "#FF3131" }}>
                                        {deltaSv <= 0 ? `−${fmtSec(Math.abs(deltaSv))}` : `+${fmtSec(deltaSv)}`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {renderDesglosadorAddSubForm()}
                  </div>
                );
                    }}
                  </DesglosadorSubLiveIsland>
                );
              })()}

              {vehicle.status === "activo" && tipoFlota === "situacion" && situacionRelojDebeMostrarse(vehicle) && (
                <SituacionRelojIsland vehicle={vehicle} onExpiredChange={handleTimerExpiredChange} />
              )}

              {vehicle.status === "activo" && vehicle.tipoReloj !== "desglosador" && tipoFlota !== "situacion" && tipoFlota !== "verdad" && (
                <>
                  <VehicleTimerIsland
                    vehicle={vehicle}
                    tipoFlota={tipoFlota}
                    showDescansoReloj={showDescansoReloj}
                    onExpiredChange={handleTimerExpiredChange}
                    onRemainingUnitsChange={handleRemainingUnitsChange}
                  />
                  {(vehicle.parentesisRecarga || []).length > 0 && (
                    <p className="text-[8px] mt-1 text-center" style={{ color: VERDE }}>
                      Paréntesis: +{(vehicle.parentesisRecarga || []).reduce((s, p) => s + p.duracionMin, 0)} min
                    </p>
                  )}
                  {(vehicle.tipoReloj === "produccion" || vehicle.tipoReloj === "investigador") && remainingUnits !== null && (
                    <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
                      <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#8B5CF6", fontFamily: "monospace", opacity: 0.7 }}>RESTANTE</p>
                      <span className="text-3xl font-black tracking-wider" style={{ color: remainingUnits === 0 ? "#22C55E" : "#8B5CF6", fontFamily: "JetBrains Mono, monospace", textShadow: remainingUnits === 0 ? "0 0 12px rgba(34,197,94,0.5)" : "0 0 12px rgba(139,92,246,0.5)" }}>
                        {remainingUnits}
                      </span>
                      {remainingUnits === 0 && (
                        <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ color: "#22C55E", fontFamily: "monospace" }}>OBJETIVO ALCANZADO</p>
                      )}
                      {vehicle.tipoReloj === "investigador" && (() => {
                        const hist = historicalVehicleData ?? getHistoricalVehicleData(vehicle.titulo);
                        const mpu = hist.bestMinPerUnit ?? hist.lastMinPerUnit;
                        return mpu ? (
                          <p className="text-[8px] mt-1" style={{ color: "rgba(139,92,246,0.6)", fontFamily: "monospace" }}>
                            Ritmo: {mpu.toFixed(1)} min/unidad (récord)
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {vehicle.tipoReloj === "investigador" && vehicle.cantidadObjetivo && remainingUnits === null && (() => {
                    const hist = historicalVehicleData ?? getHistoricalVehicleData(vehicle.titulo);
                    const mpu = hist.bestMinPerUnit ?? hist.lastMinPerUnit;
                    if (mpu) return null;
                    return (
                      <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: "rgba(139,92,246,0.15)" }}>
                        <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                          Sin récord · primer ciclo
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}

              {tipoFlota === "situacion" && vehicle.status === "activo" && (
                <div className="p-3 rounded-xl border" style={{ backgroundColor: "rgba(148,163,184,0.08)", borderColor: "rgba(148,163,184,0.3)" }} data-testid={`subtareas-${vehicle.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flag size={12} style={{ color: PLATA }} />
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: PLATA }}>Desglosar Situación</span>
                      {(vehicle.subTareas || []).length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(148,163,184,0.2)", color: PLATA }}>{completedSubTareas}/{(vehicle.subTareas || []).length}</span>}
                    </div>
                    {(vehicle.subTareas || []).length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSubTasksCollapsed(c => !c); }}
                        className="p-1 rounded-md transition-colors hover:bg-white/10"
                        data-testid={`button-collapse-subtareas-${vehicle.id}`}
                      >
                        {subTasksCollapsed ? <ChevronDown size={11} className="text-slate-400" /> : <ChevronUp size={11} className="text-slate-400" />}
                      </button>
                    )}
                  </div>
                  {!situacionCronActivo && (
                  <p className="text-[7px] text-slate-600 leading-snug mb-2 px-0.5 border-l-2 pl-2" style={{ borderColor: "rgba(139,92,246,0.4)" }}>
                    {RING_COPY.ringHint}
                  </p>
                  )}
                  {!situacionCronActivo && onCompleteVehicle && onArchiveVehicle && (
                    <div className="grid grid-cols-2 gap-2 mb-2" data-testid={`situacion-cerrar-vehiculo-${vehicle.id}`}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCompleteVehicle(vehicle.id); }}
                        className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        style={{ backgroundColor: `${EMERALD}18`, color: EMERALD, border: `1px solid ${EMERALD}40` }}
                      >
                        <Check size={12} /> Cumplido
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onArchiveVehicle(vehicle.id); }}
                        className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}
                      >
                        <X size={12} /> Incumplido
                      </button>
                    </div>
                  )}
                  {situacionPuedeLanzarReto && (
                    <div
                      className="mb-2 p-2.5 rounded-xl border space-y-2"
                      style={{ backgroundColor: "rgba(212,175,55,0.06)", borderColor: "rgba(212,175,55,0.28)" }}
                      data-testid={`situacion-reto-setup-${vehicle.id}`}
                    >
                      <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: GOLD }}>
                        {situacionProximoReto > 1 ? RING_COPY.siguienteRonda : RING_COPY.abrirRing}
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="text-[7px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Tiempo objetivo</label>
                        <input
                          type="time"
                          value={situacionRetoObjetivoHora}
                          onChange={(e) => setSituacionRetoObjetivoHora(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[10px] bg-black/40 border text-white text-center font-mono"
                          style={{ borderColor: situacionObjetivoHoraValid ? `${GOLD}55` : "rgba(148,163,184,0.35)" }}
                          data-testid={`input-situacion-reto-objetivo-${vehicle.id}`}
                        />
                      </div>
                      {situacionObjetivoHoraValid && (
                        <p className="text-[7px] text-slate-500 leading-snug">
                          Meta sellada a las <span className="font-mono" style={{ color: GOLD }}>{situacionObjetivoHoraTrim}</span>
                          {" "}· <span style={{ color: PLATA }}>{situacionObjetivoMinParsed} min</span> restantes
                          {situacionAlineadoSegmento && situacionSegmentoActivo ? (
                            <> · alineado con cierre de <span style={{ color: GOLD }}>{situacionSegmentoActivo.nombre}</span></>
                          ) : null}
                        </p>
                      )}
                      {situacionBolsaSegundo > 0 && (
                        <p className="text-[7px] text-slate-500 leading-snug">
                          Tiempo disponible: <span style={{ color: VERDE }}>+{situacionBolsaSegundo} min</span> — sugerimos {formatHHMM(Date.now() + situacionBolsaSegundo * 60000)}.
                        </p>
                      )}
                      <p className="text-[7px] text-slate-600">
                        Marca «{RING_COPY.sellarEnRing}» en cada fila ({situacionLibreSeleccion.size} sellada{situacionLibreSeleccion.size !== 1 ? "s" : ""}).
                      </p>
                    </div>
                  )}
                  {vehicle.situacionCronometro?.activo === true && (
                    <VehicleCardLiveNow>
                      {(nowTick) => {
                    const sc = vehicle.situacionCronometro!;
                    const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? nowTick;
                    const contratoMs = situacionContratoFinMs(sc);
                    const proyMs = computeSituacionProyeccionFinMs(vehicle.subTareas || [], {
                      bloqueInicioAt: bloqueInicio,
                      anchor: vehicle.situacionCupoAnchor,
                      now: nowTick,
                      horaFinContratoMs: contratoMs,
                    });
                    const focoFinMs = situacionTargetMsReloj(vehicle, nowTick);
                    const gananciaMin = situacionGananciaVsContratoMin(contratoMs, proyMs);
                    const bonusEnCola = sumBonusPreviewEnColaPendiente(
                      vehicle.subTareas || [],
                      vehicle.situacionCupoAnchor,
                      nowTick,
                      contratoMs
                    );
                    const fmtHora = (ms: number | null) =>
                      ms != null
                        ? new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—";
                    return (
                      <>
                        {situacionBloqueListo && (
                          <p
                            className="text-[8px] font-bold uppercase tracking-wider mb-2 px-2 py-1.5 rounded-lg text-center"
                            style={{ backgroundColor: "rgba(212,175,55,0.1)", color: GOLD, border: "1px solid rgba(212,175,55,0.3)" }}
                            data-testid={`situacion-ronda-lista-${vehicle.id}`}
                          >
                            Ronda lista — {RING_COPY.cerrarRing.toLowerCase()} cuando quieras
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 mb-2" data-testid={`situacion-reto-relojes-${vehicle.id}`}>
                          <div className="p-2 rounded-lg border text-center" style={{ backgroundColor: "rgba(212,175,55,0.08)", borderColor: "rgba(212,175,55,0.28)" }}>
                            <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Meta sellada</p>
                            <p className="text-sm font-black font-mono mt-0.5" style={{ color: GOLD }}>{fmtHora(contratoMs)}</p>
                          </div>
                          <div className="p-2 rounded-lg border text-center" style={{
                            backgroundColor: bonusEnCola > 0 || (gananciaMin != null && gananciaMin > 0) ? "rgba(0,200,81,0.08)" : gananciaMin != null && gananciaMin < 0 ? "rgba(255,49,49,0.08)" : "rgba(0,255,195,0.06)",
                            borderColor: bonusEnCola > 0 || (gananciaMin != null && gananciaMin > 0) ? "rgba(0,200,81,0.28)" : gananciaMin != null && gananciaMin < 0 ? "rgba(255,49,49,0.28)" : "rgba(0,255,195,0.22)",
                          }}>
                            <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: bonusEnCola > 0 || (gananciaMin != null && gananciaMin > 0) ? VERDE : gananciaMin != null && gananciaMin < 0 ? "#FF3131" : CYAN }}>Termina foco</p>
                            <p className="text-sm font-black font-mono mt-0.5" style={{ color: bonusEnCola > 0 || (gananciaMin != null && gananciaMin > 0) ? VERDE : gananciaMin != null && gananciaMin < 0 ? "#FF3131" : CYAN }}>{fmtHora(focoFinMs)}</p>
                            {bonusEnCola > 0 ? (
                              <p className="text-[7px] font-bold mt-0.5" style={{ color: VERDE }}>+{bonusEnCola} min repartidos en cola</p>
                            ) : gananciaMin != null && gananciaMin < 0 ? (
                              <p className="text-[7px] font-bold mt-0.5 text-red-400">cola −{Math.abs(gananciaMin)} min vs meta</p>
                            ) : proyMs != null && contratoMs != null && proyMs < contratoMs - 60000 ? (
                              <p className="text-[7px] font-bold mt-0.5" style={{ color: VERDE }}>cola termina {fmtHora(proyMs)}</p>
                            ) : (
                              <p className="text-[7px] text-slate-500 mt-0.5">reloj proyectivo del foco vigente</p>
                            )}
                          </div>
                        </div>
                      </>
                    );
                      }}
                    </VehicleCardLiveNow>
                  )}
                  <VehicleCardLiveNow>
                    {(nowMs) => {
                    const anchor = vehicle.situacionCupoAnchor;
                    const subs = vehicle.subTareas || [];
                    if (!anchor?.subTareaId || subs.length === 0) {
                      if (situacionCronActivo && subs.some(st => situacionFilaCronometroPendiente(st) && (st.minutosCupo ?? 0) > 0)) {
                        return (
                          <p className="text-[8px] font-mono mb-1.5" style={{ color: "rgba(212,175,55,0.75)" }} data-testid={`situacion-cupo-sync-${vehicle.id}`}>
                            Sincronizando reloj de fila…
                          </p>
                        );
                      }
                      return null;
                    }
                    const st = subs.find(s => s.id === anchor.subTareaId);
                    if (!st || !(st.minutosCupo && st.minutosCupo > 0)) return null;
                    if (st.enDesgloseCronometro && (st.resultadoSituacion ?? "pendiente") !== "pendiente") return null;
                    if (!st.enDesgloseCronometro && st.completada) return null;
                    const remainSec = computeSafeRemainingSec(anchor.startedAt, st.minutosCupo);
                    const gananciaVivoMin = minutosGanadosEnVivoFoco(subs, anchor, nowMs);
                    const rm = Math.floor(remainSec / 60);
                    const rs = remainSec % 60;
                    const cronList = subs.filter(s => s.enDesgloseCronometro);
                    const idx = (st.enDesgloseCronometro ? cronList : subs).findIndex(s => s.id === st.id) + 1;
                    return (
                      <div className="mb-1.5" data-testid={`situacion-cupo-countdown-${vehicle.id}`}>
                        <p className="text-[8px] font-mono" style={{ color: "rgba(212,175,55,0.9)" }}>
                          Fila foco #{idx} · {String(rm).padStart(2, "0")}:{String(rs).padStart(2, "0")} / {st.minutosCupo} min
                        </p>
                        {gananciaVivoMin > 0 && (
                          <p className="text-[7px] font-bold font-mono mt-0.5" style={{ color: VERDE }}>
                            +{gananciaVivoMin} min ganados → repartiéndose en cola
                          </p>
                        )}
                      </div>
                    );
                    }}
                  </VehicleCardLiveNow>
                  {vehicle.situacionCronometro?.activo !== true && (situacionBloquePsTotal ?? 0) > 0 && onVerSituacionBloquePs && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (situacionDesgloseSummary) {
                          onVerSituacionBloquePs?.(vehicle.id, vehicle.titulo, situacionDesgloseSummary);
                        }
                      }}
                      className="w-full py-2 mb-2 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: "rgba(212,175,55,0.1)", color: GOLD, border: "1px solid rgba(212,175,55,0.35)" }}
                      data-testid={`situacion-ver-ps-bloque-${vehicle.id}`}
                    >
                      <Sparkles size={11} />
                      Ver PS del bloque (+{situacionBloquePsTotal} PS)
                    </button>
                  )}
                  {subTasksCollapsed && (vehicle.subTareas || []).length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSubTasksCollapsed(false); }}
                      className="w-full py-2.5 mb-2 rounded-lg text-[9px] font-bold uppercase tracking-wide text-left px-3"
                      style={{ backgroundColor: "rgba(0,255,195,0.08)", color: CYAN, border: "1px solid rgba(0,255,195,0.25)" }}
                      data-testid={`button-expand-subtareas-${vehicle.id}`}
                    >
                      Ver {(vehicle.subTareas || []).length} subtareas
                      {situacionHechasCasa > 0
                        ? ` · Casa ×${situacionHechasCasa}`
                        : situacionTotalCasa > 0
                          ? ` · ${situacionTotalCasa} en Casa`
                          : ""}
                      {situacionTotalDetalles > 0 ? ` · ${situacionTotalDetalles} detalles` : ""}
                      {situacionCronActivo ? ` · ${RING_COPY.ring} activo` : ""}
                    </button>
                  )}
                  <AnimatePresence>
                    {!subTasksCollapsed && (vehicle.subTareas || []).length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5">
                          <VehicleCardLiveNow>
                            {(nowMs) => {
                            const all = vehicle.subTareas || [];
                            const subsLibre = sortSubTareasTrabajoPrimero(all.filter(s => !s.enDesgloseCronometro));
                            const subsCron = sortSubTareasTrabajoPrimero(all.filter(s => s.enDesgloseCronometro));
                            const horariosCron =
                              situacionCronActivo && subsCron.length > 0
                                ? computeSituacionCronometroHorarios(subsCron, {
                                    bloqueInicioAt:
                                      vehicle.situacionCronometro?.bloqueInicioAt ??
                                      vehicle.aperturaAt ??
                                      nowMs,
                                    anchor: vehicle.situacionCupoAnchor,
                                    now: nowMs,
                                    previewTiempoGanado: vehicle.situacionCronometro?.activo === true,
                                    horaFinContratoMs: situacionContratoFinMs(vehicle.situacionCronometro),
                                  })
                                : [];
                            const horarioById = new Map(horariosCron.map(h => [h.subTareaId, h]));
                            const renderLibre = subsLibre.length > 0 ? (
                              <>
                                <div className="px-0.5 mb-1 space-y-0.5">
                                  <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: PLATA }}>
                                    {RING_COPY.taller}
                                  </p>
                                  <p className="text-[6px] text-slate-600 leading-snug">
                                    {RING_COPY.tallerHint}
                                  </p>
                                </div>
                                {subsLibre.map((st, stIdx) => {
                            const casaItems = (st.detalles || []).filter(d => d.casa);
                            const detallesEnergia = (st.detalles || []).filter(d => !d.casa);
                            const entregados = detallesEnergia.filter(d => d.entregado).length;
                            const isDetalleExpanded = expandedDetalleStId === st.id;
                            return (
                              <div key={st.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                                <div className="flex flex-col gap-1 p-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] leading-tight flex-1 min-w-0 ${st.completada ? "line-through text-slate-600" : "text-slate-300"}`}>
                                      <span className="text-[8px] mr-1" style={{ color: PLATA }}>{stIdx + 1}.</span>
                                      {st.texto}
                                    </span>
                                    {showSituacionDetallesUi && detallesEnergia.length > 0 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedDetalleStId(isDetalleExpanded ? null : st.id); }}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 transition-all"
                                        style={{ backgroundColor: "rgba(0,255,195,0.1)", color: CYAN, border: "1px solid rgba(0,255,195,0.3)" }}
                                        data-testid={`button-toggle-detalles-${st.id}`}
                                      >
                                        ⚡ {detallesEnergia.length} · {entregados} PS
                                        {isDetalleExpanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                                      </button>
                                    )}
                                  </div>
                                  {!st.completada && (
                                    <div className="flex flex-wrap gap-1 pl-0.5" onClick={e => e.stopPropagation()}>
                                      {onMoveSubTareasToCronometro && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSituacionLibreSeleccion(prev => {
                                              const n = new Set(prev);
                                              if (n.has(st.id)) n.delete(st.id);
                                              else n.add(st.id);
                                              return n;
                                            });
                                          }}
                                          className="flex-1 min-w-[46%] py-1 px-1.5 rounded text-[6px] font-black uppercase tracking-wide text-left leading-snug"
                                          style={{
                                            backgroundColor: situacionLibreSeleccion.has(st.id) ? "rgba(0,255,195,0.14)" : "rgba(255,255,255,0.03)",
                                            color: situacionLibreSeleccion.has(st.id) ? CYAN : "rgba(148,163,184,0.85)",
                                            border: `1px solid ${situacionLibreSeleccion.has(st.id) ? "rgba(0,255,195,0.45)" : "rgba(148,163,184,0.25)"}`,
                                          }}
                                          data-testid={`situacion-sellar-enfoque-${st.id}`}
                                        >
                                          {situacionLibreSeleccion.has(st.id) ? "✓ " : ""}{RING_COPY.sellarEnRing}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onToggleSubTarea?.(vehicle.id, st.id)}
                                        className="flex-1 min-w-[46%] py-1 px-1.5 rounded text-[6px] font-black uppercase tracking-wide text-left leading-snug"
                                        style={{
                                          backgroundColor: "rgba(0,200,81,0.08)",
                                          color: "rgba(134,239,172,0.9)",
                                          border: "1px solid rgba(0,200,81,0.28)",
                                        }}
                                        data-testid={`subtarea-${st.id}`}
                                      >
                                        Cerrar sin reloj (+2 PS)
                                      </button>
                                    </div>
                                  )}
                                  {st.completada && (
                                    <p className="text-[6px] font-bold uppercase tracking-wider pl-0.5" style={{ color: "rgba(0,200,81,0.65)" }}>
                                      Cerrada sin reloj · +2 PS
                                    </p>
                                  )}
                                  {showSituacionCasaUi && onAddCasaItem && (
                                    <SituacionCasaPanel
                                      vehicleId={vehicle.id}
                                      subTareaId={st.id}
                                      casaItems={casaItems}
                                      expanded={expandedCasaStId === st.id}
                                      onToggleExpand={() =>
                                        setExpandedCasaStId(expandedCasaStId === st.id ? null : st.id)
                                      }
                                      draft={newCasaTexts[st.id] || ""}
                                      onDraftChange={v =>
                                        setNewCasaTexts(prev => ({ ...prev, [st.id]: v }))
                                      }
                                      onAdd={texto => onAddCasaItem(vehicle.id, st.id, texto)}
                                      onToggleHecho={id => onToggleCasaItem?.(vehicle.id, st.id, id)}
                                      readOnly={st.completada}
                                    />
                                  )}
                                </div>
                                {showSituacionDetallesUi && isDetalleExpanded && (
                                  <div className="px-2 pb-2" style={{ borderTop: "1px solid rgba(0,255,195,0.1)" }}>
                                    {canAddSituacionDetalles && (
                                    <div className="flex gap-1.5 mt-2 mb-1.5">
                                      <input
                                        value={newDetalleTexts[st.id] || ""}
                                        onChange={(e) => setNewDetalleTexts(prev => ({ ...prev, [st.id]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === "Enter" && (newDetalleTexts[st.id] || "").trim()) { onAddDetalle?.(vehicle.id, st.id, (newDetalleTexts[st.id] || "").trim()); setNewDetalleTexts(prev => ({ ...prev, [st.id]: "" })); } }}
                                        placeholder="Agregar detalle energético..."
                                        className="flex-1 px-2 py-1 rounded bg-black/40 border text-white text-[9px] placeholder:text-slate-700 focus:outline-none"
                                        style={{ borderColor: "rgba(0,255,195,0.2)", fontFamily: "JetBrains Mono, monospace" }}
                                        data-testid={`input-detalle-${st.id}`}
                                      />
                                      <button
                                        onClick={() => { const t = (newDetalleTexts[st.id] || "").trim(); if (t) { onAddDetalle?.(vehicle.id, st.id, t); setNewDetalleTexts(prev => ({ ...prev, [st.id]: "" })); } }}
                                        disabled={!(newDetalleTexts[st.id] || "").trim()}
                                        className="px-1.5 rounded transition-all disabled:opacity-30"
                                        style={{ backgroundColor: "rgba(0,255,195,0.15)", color: CYAN }}
                                        data-testid={`button-add-detalle-${st.id}`}
                                      ><Plus size={11} /></button>
                                    </div>
                                    )}
                                    {detallesEnergia.length > 0 && (
                                      <div className="space-y-1">
                                        {detallesEnergia.map((d, dIdx) => (
                                          <button
                                            key={d.id}
                                            onClick={() => !d.entregado && onEntregarDetalle?.(vehicle.id, st.id, d.id)}
                                            disabled={d.entregado}
                                            className="w-full flex items-center gap-2 p-1 rounded text-left transition-all"
                                            style={{ backgroundColor: d.entregado ? "rgba(212,175,55,0.08)" : "rgba(0,255,195,0.05)", cursor: d.entregado ? "default" : "pointer" }}
                                            data-testid={`detalle-${d.id}`}
                                          >
                                            <span className="text-[9px] w-3 flex-shrink-0" style={{ color: d.entregado ? GOLD : CYAN, fontFamily: "JetBrains Mono, monospace" }}>{dIdx + 1}.</span>
                                            <span className={`text-[9px] flex-1 min-w-0 leading-tight ${d.entregado ? "line-through" : ""}`} style={{ color: d.entregado ? GOLD : "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{d.texto}</span>
                                            {d.entregado
                                              ? <span className="text-[7px] font-bold flex-shrink-0" style={{ color: GOLD }}>+1 PS</span>
                                              : <span className="text-[7px] flex-shrink-0" style={{ color: CYAN }}>entregar</span>
                                            }
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {detallesEnergia.length === 0 && canAddSituacionDetalles && (
                                      <p className="text-[8px] text-center py-1" style={{ color: "rgba(0,255,195,0.3)", fontFamily: "JetBrains Mono, monospace" }}>— sin detalles energéticos —</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                              </>
                            ) : null;
                            const renderCron = subsCron.length > 0 ? (
                              <>
                                {subsCron.length > 0 && (
                                  <div className="flex items-center justify-between px-0.5 mt-2 gap-2 flex-wrap">
                                    <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: "#c4b5fd" }}>
                                      {RING_COPY.ring} · +4 PS
                                      {(() => {
                                        const firstPend = subsCron.find(st => (st.resultadoSituacion ?? "pendiente") === "pendiente");
                                        return firstPend && vehicle.situacionCronometro?.activo ? (
                                          <span className="font-normal normal-case ml-1 text-slate-600">
                                            · sigue: {firstPend.texto}
                                          </span>
                                        ) : null;
                                      })()}
                                    </p>
                                    {(() => {
                                      const cronPendientes = subsCron.filter(st => (st.resultadoSituacion ?? "pendiente") === "pendiente");
                                      return cronPendientes.length >= 2 && vehicle.situacionCronometro?.activo && onReorderSubTareasCronometro ? (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setDesglosadorReorderMode(m => !m); }}
                                          className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                          style={{
                                            backgroundColor: desglosadorReorderMode ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
                                            color: desglosadorReorderMode ? VIOLET : "rgba(255,255,255,0.55)",
                                            border: `1px solid ${desglosadorReorderMode ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.12)"}`,
                                          }}
                                        >
                                          {desglosadorReorderMode ? "Listo" : "Reordenar cola"}
                                        </button>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                                {subsCron.map((st, stIdx) => {
                                  const pend = (st.resultadoSituacion ?? "pendiente") === "pendiente";
                                  const cronPendientes = subsCron.filter(s => (s.resultadoSituacion ?? "pendiente") === "pendiente");
                                  const pIdx = pend ? cronPendientes.findIndex(s => s.id === st.id) : -1;
                                  const casaItemsCron = (st.detalles || []).filter(d => d.casa);
                                  const detallesCron = (st.detalles || []).filter(d => !d.casa);
                                  const entregadosCron = detallesCron.filter(d => d.entregado).length;
                                  const isDetalleExpandedCron = expandedDetalleStId === st.id;
                                  const lineDone = st.resultadoSituacion === "cumplido" || st.resultadoSituacion === "fallado";
                                  const ok = st.resultadoSituacion === "cumplido";
                                  const bad = st.resultadoSituacion === "fallado";
                                  const horario = horarioById.get(st.id);
                                  const finLabel =
                                    horario?.finLabel ??
                                    (st.cerradaAt != null ? formatHHMM(st.cerradaAt) : null);
                                  const enFoco = horario?.enFoco ?? (pend && vehicle.situacionCupoAnchor?.subTareaId === st.id);
                                  const cupoBase = st.minutosCupo ?? 0;
                                  const cupoEfectivo = horario?.minutosCupo ?? cupoBase;
                                  const bonusCola =
                                    pend && !enFoco && situacionCronActivo && cupoEfectivo > cupoBase
                                      ? cupoEfectivo - cupoBase
                                      : 0;
                                  return (
                                    <div key={st.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: bad ? "rgba(239,68,68,0.06)" : bonusCola > 0 ? "rgba(0,200,81,0.04)" : "rgba(255,255,255,0.02)", border: bad ? "1px solid rgba(239,68,68,0.2)" : bonusCola > 0 ? "1px solid rgba(0,200,81,0.18)" : undefined }}>
                                      <div className="flex flex-col gap-1 p-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {pend && desglosadorReorderMode && vehicle.situacionCronometro?.activo && onReorderSubTareasCronometro && pIdx >= 0 && (
                                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                                              <button
                                                type="button"
                                                disabled={pIdx === 0}
                                                onClick={(e) => { e.stopPropagation(); onReorderSubTareasCronometro(vehicle.id, st.id, "up"); }}
                                                className="p-0.5 rounded disabled:opacity-25 hover:bg-white/10"
                                                title="Subir en cola"
                                              >
                                                <ChevronUp size={12} className="text-slate-400" />
                                              </button>
                                              <button
                                                type="button"
                                                disabled={pIdx === cronPendientes.length - 1}
                                                onClick={(e) => { e.stopPropagation(); onReorderSubTareasCronometro(vehicle.id, st.id, "down"); }}
                                                className="p-0.5 rounded disabled:opacity-25 hover:bg-white/10"
                                                title="Bajar en cola"
                                              >
                                                <ChevronDown size={12} className="text-slate-400" />
                                              </button>
                                            </div>
                                          )}
                                          {pend && desglosadorReorderMode && pIdx >= 0 && (
                                            <span className="text-[7px] font-mono font-bold flex-shrink-0 text-slate-500">#{pIdx + 1}</span>
                                          )}
                                          <span className={`text-[10px] leading-tight flex-1 min-w-0 ${lineDone ? (ok ? "line-through text-slate-600" : "line-through text-red-300/80") : "text-slate-300"}`}>
                                            <span className="text-[8px] mr-1" style={{ color: PLATA }}>{stIdx + 1}.</span>
                                            {st.texto}
                                          </span>
                                          {!pend && finLabel && (
                                            <span
                                              className="text-[7px] font-mono font-bold flex-shrink-0"
                                              style={{ color: ok ? "rgba(148,163,184,0.85)" : "#f87171" }}
                                              data-testid={`situacion-cron-fin-${st.id}`}
                                            >
                                              {ok ? "✓" : "✗"} {finLabel}
                                            </span>
                                          )}
                                          {pend && ringOperable && (
                                            <div className="flex gap-1 flex-shrink-0">
                                              <button type="button" onClick={(e) => { e.stopPropagation(); onSituacionCronometroCumplido?.(vehicle.id, st.id); }} className="px-2 py-0.5 rounded text-[7px] font-black uppercase" style={{ backgroundColor: "rgba(0,200,81,0.15)", color: VERDE, border: "1px solid rgba(0,200,81,0.4)" }}>Cumplido</button>
                                              <button type="button" onClick={(e) => { e.stopPropagation(); onSituacionCronometroFallado?.(vehicle.id, st.id); }} className="px-2 py-0.5 rounded text-[7px] font-black uppercase" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>Fallado</button>
                                              <button type="button" onClick={(e) => { e.stopPropagation(); onSituacionCronometroReservar?.(vehicle.id, st.id); }} className="px-2 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-0.5" style={{ backgroundColor: "rgba(148,163,184,0.12)", color: PLATA, border: "1px solid rgba(148,163,184,0.35)" }} title="Devolver al Crisol (ruta S)"><FlaskConical size={9} /> Crisol</button>
                                            </div>
                                          )}
                                          {pend && situacionCronActivo && !enFoco && !ringOperable && (
                                            <span className="text-[7px] text-slate-600 flex-shrink-0">en cola</span>
                                          )}
                                          {showSituacionDetallesUi && detallesCron.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); setExpandedDetalleStId(isDetalleExpandedCron ? null : st.id); }}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 transition-all"
                                              style={{ backgroundColor: "rgba(0,255,195,0.1)", color: CYAN, border: "1px solid rgba(0,255,195,0.3)" }}
                                              data-testid={`button-toggle-detalles-cron-${st.id}`}
                                            >
                                              ⚡ {detallesCron.length} · {entregadosCron} PS
                                              {isDetalleExpandedCron ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                                            </button>
                                          )}
                                        </div>
                                        {pend && (onSetSubTareaMinutosCupo || onExtendSituacionCupo || onQuitarSituacionCupo) && (
                                          <div className="flex items-center gap-1.5 pl-1 flex-wrap" onClick={e => e.stopPropagation()}>
                                            <span className="text-[7px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-0.5">
                                              Min
                                              {st.cupoFijo && (
                                                <span title="Minutos fijados manualmente">
                                                  <Lock size={8} style={{ color: GOLD }} />
                                                </span>
                                              )}
                                            </span>
                                            {bonusCola > 0 ? (
                                              <span
                                                className="w-11 px-1 py-0.5 rounded text-[9px] text-center font-mono font-black inline-block"
                                                style={{ backgroundColor: "rgba(0,200,81,0.15)", color: VERDE, border: "1px solid rgba(0,200,81,0.45)" }}
                                                title={`${cupoBase} min base + ${bonusCola} min ganados en vivo`}
                                                data-testid={`input-subtarea-cupo-cron-${st.id}`}
                                              >
                                                {cupoEfectivo}
                                              </span>
                                            ) : (
                                            <input
                                              type="number"
                                              min={0}
                                              max={999}
                                              key={`cupo-cron-${st.id}-${st.minutosCupo ?? "x"}-${st.cupoFijo ? "f" : "x"}`}
                                              defaultValue={st.minutosCupo ?? ""}
                                              onBlur={(e) => {
                                                const raw = e.target.value.trim();
                                                const n = raw === "" ? undefined : Math.max(0, Math.min(999, parseInt(raw, 10)));
                                                if (raw !== "" && !Number.isFinite(n!)) return;
                                                const prev = st.minutosCupo;
                                                if (raw === "" && (prev === undefined || prev === 0)) return;
                                                if (raw !== "" && n === prev) return;
                                                onSetSubTareaMinutosCupo?.(vehicle.id, st.id, raw === "" ? undefined : n);
                                              }}
                                              className="w-11 px-1 py-0.5 rounded text-[9px] bg-black/50 border text-white text-center font-mono"
                                              style={{ borderColor: st.cupoFijo ? `${GOLD}55` : "rgba(148,163,184,0.35)" }}
                                              title={st.cupoFijo ? "Fijado: el sobrante se reparte entre las demás filas" : "Fija minutos; el resto se reparte automáticamente"}
                                              data-testid={`input-subtarea-cupo-cron-${st.id}`}
                                            />
                                            )}
                                            {bonusCola > 0 && (
                                              <span className="text-[7px] font-black uppercase tracking-wide" style={{ color: VERDE }}>
                                                +{bonusCola} ganados
                                              </span>
                                            )}
                                            {finLabel && (
                                              <span
                                                className="text-[7px] font-mono font-bold"
                                                style={{ color: enFoco ? GOLD : bonusCola > 0 ? VERDE : pend ? VERDE : "rgba(148,163,184,0.85)" }}
                                                data-testid={`situacion-cron-objetivo-${st.id}`}
                                                title="Hora objetivo de fin de esta fila"
                                              >
                                                → {finLabel}
                                                {pend && !enFoco && cupoEfectivo > 0 ? ` · ${cupoEfectivo}′` : ""}
                                              </span>
                                            )}
                                            {onExtendSituacionCupo && (
                                              <button
                                                type="button"
                                                onClick={() => onExtendSituacionCupo(vehicle.id, st.id, 5)}
                                                className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide"
                                                style={{ backgroundColor: "rgba(212,175,55,0.12)", color: GOLD, border: "1px solid rgba(212,175,55,0.35)" }}
                                                title="Añade 5 min tomándolos de la siguiente fila con cupo"
                                                data-testid={`button-extend-cupo-cron-${st.id}`}
                                              >
                                                +5′
                                              </button>
                                            )}
                                            {onQuitarSituacionCupo && (
                                              <>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  max={999}
                                                  value={quitarMinDraft[st.id] ?? "5"}
                                                  onChange={(e) =>
                                                    setQuitarMinDraft(prev => ({ ...prev, [st.id]: e.target.value }))
                                                  }
                                                  className="w-9 px-1 py-0.5 rounded text-[9px] bg-black/50 border text-white text-center font-mono"
                                                  style={{ borderColor: "rgba(148,163,184,0.35)" }}
                                                  title="Quita min de la cola posterior y los pasa a la tarea en foco"
                                                  data-testid={`input-quitar-cupo-cron-${st.id}`}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const n = parseInt(quitarMinDraft[st.id] ?? "5", 10);
                                                    if (Number.isFinite(n) && n > 0) {
                                                      onQuitarSituacionCupo(vehicle.id, st.id, n);
                                                    }
                                                  }}
                                                  className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide"
                                                  style={{ backgroundColor: "rgba(148,163,184,0.1)", color: PLATA, border: "1px solid rgba(148,163,184,0.35)" }}
                                                  title="Quita min de la cola posterior → tarea en foco"
                                                  data-testid={`button-quitar-cupo-cron-${st.id}`}
                                                >
                                                  Quitar
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                        {showSituacionCasaUi && onAddCasaItem && (
                                          <SituacionCasaPanel
                                            vehicleId={vehicle.id}
                                            subTareaId={st.id}
                                            casaItems={casaItemsCron}
                                            expanded={expandedCasaStId === st.id}
                                            onToggleExpand={() =>
                                              setExpandedCasaStId(expandedCasaStId === st.id ? null : st.id)
                                            }
                                            draft={newCasaTexts[st.id] || ""}
                                            onDraftChange={v =>
                                              setNewCasaTexts(prev => ({ ...prev, [st.id]: v }))
                                            }
                                            onAdd={texto => onAddCasaItem(vehicle.id, st.id, texto)}
                                            onToggleHecho={id => onToggleCasaItem?.(vehicle.id, st.id, id)}
                                            readOnly={!pend}
                                          />
                                        )}
                                      </div>
                                      {showSituacionDetallesUi && isDetalleExpandedCron && (
                                        <div className="px-2 pb-2" style={{ borderTop: "1px solid rgba(0,255,195,0.1)" }}>
                                          {canAddSituacionDetalles && (
                                          <div className="flex gap-1.5 mt-2 mb-1.5">
                                            <input
                                              value={newDetalleTexts[st.id] || ""}
                                              onChange={(e) => setNewDetalleTexts(prev => ({ ...prev, [st.id]: e.target.value }))}
                                              onKeyDown={(e) => { if (e.key === "Enter" && (newDetalleTexts[st.id] || "").trim()) { onAddDetalle?.(vehicle.id, st.id, (newDetalleTexts[st.id] || "").trim()); setNewDetalleTexts(prev => ({ ...prev, [st.id]: "" })); } }}
                                              placeholder="Agregar detalle energético..."
                                              className="flex-1 px-2 py-1 rounded bg-black/40 border text-white text-[9px] placeholder:text-slate-700 focus:outline-none"
                                              style={{ borderColor: "rgba(0,255,195,0.2)", fontFamily: "JetBrains Mono, monospace" }}
                                              data-testid={`input-detalle-cron-${st.id}`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => { const t = (newDetalleTexts[st.id] || "").trim(); if (t) { onAddDetalle?.(vehicle.id, st.id, t); setNewDetalleTexts(prev => ({ ...prev, [st.id]: "" })); } }}
                                              disabled={!(newDetalleTexts[st.id] || "").trim()}
                                              className="px-1.5 rounded transition-all disabled:opacity-30"
                                              style={{ backgroundColor: "rgba(0,255,195,0.15)", color: CYAN }}
                                              data-testid={`button-add-detalle-cron-${st.id}`}
                                            ><Plus size={11} /></button>
                                          </div>
                                          )}
                                          {detallesCron.length > 0 && (
                                            <div className="space-y-1">
                                              {detallesCron.map((d, dIdx) => (
                                                <button
                                                  key={d.id}
                                                  type="button"
                                                  onClick={() => !d.entregado && onEntregarDetalle?.(vehicle.id, st.id, d.id)}
                                                  disabled={d.entregado}
                                                  className="w-full flex items-center gap-2 p-1 rounded text-left transition-all"
                                                  style={{ backgroundColor: d.entregado ? "rgba(212,175,55,0.08)" : "rgba(0,255,195,0.05)", cursor: d.entregado ? "default" : "pointer" }}
                                                  data-testid={`detalle-cron-${d.id}`}
                                                >
                                                  <span className="text-[9px] w-3 flex-shrink-0" style={{ color: d.entregado ? GOLD : CYAN, fontFamily: "JetBrains Mono, monospace" }}>{dIdx + 1}.</span>
                                                  <span className={`text-[9px] flex-1 min-w-0 leading-tight ${d.entregado ? "line-through" : ""}`} style={{ color: d.entregado ? GOLD : "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{d.texto}</span>
                                                  {d.entregado
                                                    ? <span className="text-[7px] font-bold flex-shrink-0" style={{ color: GOLD }}>+1 PS</span>
                                                    : <span className="text-[7px] flex-shrink-0" style={{ color: CYAN }}>entregar</span>}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                          {detallesCron.length === 0 && canAddSituacionDetalles && (
                                            <p className="text-[8px] text-center py-1" style={{ color: "rgba(0,255,195,0.3)", fontFamily: "JetBrains Mono, monospace" }}>— sin detalles aún —</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </>
                            ) : null;
                            return (
                              <>
                                {situacionCronActivo ? (
                                  <>
                                    {renderCron}
                                    {renderLibre}
                                  </>
                                ) : (
                                  <>
                                    {renderLibre}
                                    {renderCron}
                                  </>
                                )}
                              </>
                            );
                            }}
                          </VehicleCardLiveNow>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {situacionPuedeEncolarEnReto && (
                    <div
                      className="mt-2 mb-2 p-2.5 rounded-xl border space-y-2"
                      style={{ backgroundColor: "rgba(0,200,81,0.06)", borderColor: "rgba(0,200,81,0.28)" }}
                      data-testid={`situacion-encolar-reto-${vehicle.id}`}
                    >
                      <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: VERDE }}>
                        {RING_COPY.anadirAlRing}
                      </p>
                      <p className="text-[7px] text-slate-500 leading-snug">
                        Selladas para el bloque · {situacionLibreSeleccion.size} tarea{situacionLibreSeleccion.size !== 1 ? "s" : ""} · la meta no se mueve
                      </p>
                      <button
                        type="button"
                        disabled={situacionLibreSeleccion.size === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (situacionLibreSeleccion.size === 0) return;
                          onMoveSubTareasToCronometro?.(vehicle.id, Array.from(situacionLibreSeleccion));
                          setSituacionLibreSeleccion(new Set());
                        }}
                        className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                        style={{ backgroundColor: "rgba(0,200,81,0.12)", color: VERDE, border: "1px solid rgba(0,200,81,0.35)" }}
                        data-testid={`situacion-anadir-cola-${vehicle.id}`}
                      >
                        <Plus size={12} />
                        {RING_COPY.sellarEnRing}
                      </button>
                    </div>
                  )}
                  {situacionBloqueListo && onCerrarSituacionDesgloseBloque && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCerrarSituacionDesgloseBloque(vehicle.id); }}
                      className="w-full py-2.5 mb-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: "rgba(212,175,55,0.14)", color: GOLD, border: "1px solid rgba(212,175,55,0.45)" }}
                      data-testid={`situacion-cerrar-bloque-${vehicle.id}`}
                    >
                      <Check size={12} />
                      {RING_COPY.cerrarRing}
                    </button>
                  )}
                  {situacionCronActivo && !situacionBloqueListo && onCerrarSituacionDesglosadorDeGolpe && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCerrarSituacionDesglosadorDeGolpe(vehicle.id); }}
                      className="w-full py-2.5 mb-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}
                      data-testid={`situacion-cerrar-de-golpe-${vehicle.id}`}
                    >
                      <Square size={11} />
                      {RING_COPY.cerrarRingGolpe}
                    </button>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input value={newSubTarea} onChange={(e) => setNewSubTarea(e.target.value)} onKeyDown={(e) => {
                      if (e.key !== "Enter" || !newSubTarea.trim()) return;
                      if (situacionCronActivo && onAddSubTareaUrgenteACola) {
                        onAddSubTareaUrgenteACola(vehicle.id, newSubTarea.trim());
                        setNewSubTarea("");
                      } else if (onAddSubTarea) {
                        onAddSubTarea(vehicle.id, newSubTarea.trim());
                        setNewSubTarea("");
                      }
                    }} placeholder={situacionCronActivo ? "Nueva tarea para el ring..." : "Nueva tarea..."} className="flex-1 p-2 rounded-lg bg-black/40 border text-white text-[10px] placeholder:text-slate-600 focus:outline-none" style={{ borderColor: situacionCronActivo ? "rgba(0,200,81,0.25)" : "rgba(148,163,184,0.2)" }} data-testid={`input-subtarea-${vehicle.id}`} />
                    {situacionCronActivo && onAddSubTareaUrgenteACola ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSubTarea.trim()) return;
                          onAddSubTareaUrgenteACola(vehicle.id, newSubTarea.trim());
                          setNewSubTarea("");
                        }}
                        disabled={!newSubTarea.trim()}
                        className="px-2 py-1.5 rounded-lg transition-all disabled:opacity-30 text-[6px] font-black uppercase leading-tight max-w-[5.5rem]"
                        style={{ backgroundColor: "rgba(0,255,195,0.12)", color: CYAN, border: "1px solid rgba(0,255,195,0.35)" }}
                        title="Crear y sellar directo en el ring de enfoque real"
                        data-testid={`button-urgente-cola-${vehicle.id}`}
                      >
                        {RING_COPY.sellarDirectoRing}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onAddSubTarea || !newSubTarea.trim()) return;
                        void onAddSubTarea(vehicle.id, newSubTarea.trim());
                        setNewSubTarea("");
                      }}
                      disabled={!newSubTarea.trim()}
                      className="px-2 py-1 rounded-lg transition-all disabled:opacity-30"
                      style={{ backgroundColor: "rgba(148,163,184,0.2)", color: PLATA }}
                      data-testid={`button-add-subtarea-${vehicle.id}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {situacionPuedeLanzarReto && (
                    <button
                      type="button"
                      disabled={situacionLibreSeleccion.size === 0 || !situacionObjetivoHoraValid}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSubTareasToCronometro?.(vehicle.id, Array.from(situacionLibreSeleccion), {
                          objetivoHora: situacionObjetivoHoraTrim,
                        });
                        setSituacionLibreSeleccion(new Set());
                      }}
                      className="w-full py-2.5 mt-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                      style={{
                        backgroundColor: situacionProximoReto > 1 ? "rgba(0,200,81,0.12)" : `${GOLD}22`,
                        color: situacionProximoReto > 1 ? VERDE : GOLD,
                        border: `1px solid ${situacionProximoReto > 1 ? "rgba(0,200,81,0.35)" : `${GOLD}55`}`,
                        boxShadow: situacionProximoReto > 1 ? "0 0 14px rgba(0,200,81,0.12)" : `0 0 16px ${GOLD}20`,
                      }}
                      data-testid={`situacion-lanzar-reto-${vehicle.id}`}
                    >
                      <Flag size={12} />
                      {situacionProximoReto > 1 ? `Lanzar ${RING_COPY.siguienteRonda.toLowerCase()}` : RING_COPY.abrirRing}
                      {situacionLibreSeleccion.size > 0 ? ` · ${situacionLibreSeleccion.size} subtarea${situacionLibreSeleccion.size !== 1 ? "s" : ""}` : ""}
                      {situacionObjetivoHoraValid ? ` · ${situacionObjetivoHoraTrim}` : ""}
                    </button>
                  )}
                </div>
              )}

              {tipoFlota === "descanso" && vehicle.status === "activo" && (() => {
                const TIPO_LABELS: Record<string, string> = { intercepcion: "INTERCEPCIÓN", microcarga: "MICRO-CARGA", reset_profundo: "RESET PROFUNDO", punto_cero: "PUNTO CERO" };
                const TIPO_SUBLABELS: Record<string, string> = { intercepcion: "Pausa técnica", microcarga: "Siesta activa", reset_profundo: "Reset profundo", punto_cero: "Polo Neutro" };
                const tipoLabel = vehicle.tipoDescanso ? TIPO_LABELS[vehicle.tipoDescanso] : "RECARGA ACTIVA";
                const tipoSublabel = vehicle.tipoDescanso ? TIPO_SUBLABELS[vehicle.tipoDescanso] : "Recarga en curso";
                const primerAccionMs = vehicle.primerAccionAt;
                const aperturaMs = vehicle.aperturaAt || Date.now();
                const eficienciaSec = primerAccionMs ? Math.round((primerAccionMs - aperturaMs) / 1000) : null;
                const esPuntoCero = vehicle.tipoDescanso === "punto_cero";

                if (esPuntoCero) {
                  return (
                    <PuntoCeroPanel
                      vehicle={vehicle}
                      flotaColor={flotaColor}
                      showMicroPasos={showMicroPasos}
                      showDescansoReloj={showDescansoReloj}
                      onToggleReloj={() => setShowDescansoReloj(v => !v)}
                      onEtapaToggle={(id, etapa) => onEtapaPuntoCeroToggle?.(id, etapa)}
                      onColorConfirm={(id, idx, session) => onPuntoCeroColorConfirm?.(id, idx, session)}
                      onSessionPersist={(id, session) => onPuntoCeroSessionUpdate?.(id, session)}
                      onAutoClose={id => onPuntoCeroAutoClose?.(id)}
                      onConfirmManualClose={(id, etiqueta, nota) => {
                        // Punto Cero cierra directo: el modal de energía queda detrás de la pantalla pasiva (z-250).
                        onDescansoClose?.(id, "cumplido", etiqueta, nota);
                      }}
                    />
                  );
                }

                const mp = vehicle.microPasos || { hidratacion: false, respiracion: false, pantallaZero: false };
                const microPasosCfg = [
                  { key: "hidratacion" as const, label: "Hidratación", desc: "¿Tomaste agua?", Icon: Droplets },
                  { key: "respiracion" as const, label: "Respiración", desc: "3 respiraciones profundas", Icon: Wind },
                  { key: "pantallaZero" as const, label: "Pantalla cero", desc: "¿Sin dispositivo?", Icon: MonitorOff },
                ];
                const mpCompletados = [mp.hidratacion, mp.respiracion, mp.pantallaZero].filter(Boolean).length;
                return (
                  <div className="space-y-2" data-testid={`descanso-msg-${vehicle.id}`}>
                    <div className="p-3 rounded-xl border" style={{ backgroundColor: `${flotaColor}08`, borderColor: `${flotaColor}30` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Battery size={14} style={{ color: flotaColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: flotaColor }}>{tipoLabel}</span>
                        <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${flotaColor}15`, color: flotaColor }}>{mpCompletados}/3 PS</span>
                        <button onClick={() => setShowDescansoReloj(v => !v)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all" style={{ backgroundColor: showDescansoReloj ? `${flotaColor}20` : "transparent", borderColor: showDescansoReloj ? flotaColor : "rgba(255,255,255,0.15)", color: showDescansoReloj ? flotaColor : "#64748b" }} data-testid={`toggle-reloj-descanso-${vehicle.id}`} title={showDescansoReloj ? "Ocultar reloj" : "Ver reloj"}>
                          <Clock size={10} />
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500 italic">{tipoSublabel}{showDescansoReloj ? " · Reloj activo" : " · Reloj oculto"}</p>
                      {eficienciaSec !== null && (
                        <p className="text-[8px] mt-1" style={{ color: flotaColor }}>⚡ Primer micro-paso: {eficienciaSec < 60 ? `${eficienciaSec}s` : `${Math.round(eficienciaSec / 60)}m`} desde apertura</p>
                      )}
                    </div>
                    {showMicroPasos && (
                      <div className="space-y-1.5">
                        {microPasosCfg.map(({ key, label, desc, Icon }) => {
                          const checked = mp[key];
                          return (
                            <button
                              key={key}
                              onClick={() => !checked && onMicroPasoToggle?.(vehicle.id, key)}
                              disabled={checked}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left"
                              style={{ backgroundColor: checked ? `${flotaColor}10` : "rgba(255,255,255,0.03)", borderColor: checked ? flotaColor : "rgba(255,255,255,0.08)", cursor: checked ? "default" : "pointer" }}
                              data-testid={`micro-paso-${key}-${vehicle.id}`}
                            >
                              <div className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0" style={{ borderColor: checked ? flotaColor : "rgba(255,255,255,0.2)", backgroundColor: checked ? `${flotaColor}20` : "transparent" }}>
                                {checked ? <Check size={11} style={{ color: flotaColor }} /> : <Icon size={11} className="text-slate-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-bold" style={{ color: checked ? flotaColor : "#64748b" }}>{label}</p>
                                <p className="text-[8px] text-slate-600">{desc}</p>
                              </div>
                              {checked
                                ? <span className="text-[8px] font-bold flex-shrink-0" style={{ color: flotaColor }}>+1 PS</span>
                                : <span className="text-[8px] text-slate-600 flex-shrink-0">toca para activar</span>
                              }
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!showMicroPasos && (
                      <p className="text-[8px] text-center text-slate-600">Los micro-pasos aparecerán en unos segundos...</p>
                    )}
                  </div>
                );
              })()}

              {tipoFlota === "verdad" && vehicle.status === "activo" && (
                <div className="p-3 rounded-xl border" style={{ backgroundColor: "rgba(107,114,128,0.08)", borderColor: "rgba(107,114,128,0.3)" }} data-testid={`verdad-msg-${vehicle.id}`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye size={14} style={{ color: vehicle.autoVerdad ? GRIS : EMERALD }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: vehicle.autoVerdad ? GRIS : EMERALD }}>
                      {vehicle.autoVerdad ? "REGISTRO HISTÓRICO" : "FLOTA VERDAD"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-[8px] px-2 py-1 rounded-full font-black uppercase" style={{ backgroundColor: vehicle.autoVerdad ? `${BLOOD}20` : `${EMERALD}20`, color: vehicle.autoVerdad ? BLOOD : EMERALD }}>{vehicle.autoVerdad ? "VERDAD INCONSCIENTE" : "VERDAD CONSCIENTE"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-center" style={{ fontFamily: "Georgia, serif" }}>{vehicle.autoVerdad ? "Tiempo perdido detectado. No hay actividad consciente registrada." : "Registro voluntario de pausa o reflexión."}</p>
                  <VehicleTimerIsland vehicle={vehicle} tipoFlota={tipoFlota}>
                    {(ui) =>
                      ui.display ? (
                        <div className="mt-2 text-center">
                          <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">{vehicle.autoVerdad ? "Tiempo perdido" : "Duración"}</p>
                          <span className="text-lg font-black tracking-wider" style={{ color: vehicle.autoVerdad ? BLOOD : EMERALD, fontFamily: "JetBrains Mono, monospace" }}>{ui.display}</span>
                        </div>
                      ) : null
                    }
                  </VehicleTimerIsland>
                </div>
              )}

              {vehicle.status !== "activo" && vehicle.duracionFinal != null && vehicle.duracionFinal > 0 && (
                <div className="pt-3">
                  <div className="p-3 rounded-xl border text-center" style={{
                    backgroundColor: `${flotaColor}08`,
                    borderColor: `${flotaColor}30`,
                    boxShadow: vehicle.cierreManual ? `0 0 20px ${flotaColor}30` : "none"
                  }}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Timer size={12} style={{ color: flotaColor }} />
                      <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: flotaColor }}>DURACIÓN FINAL</span>
                      {vehicle.cierreManual && <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${GOLD}20`, color: GOLD }}>CONSAGRADO</span>}
                    </div>
                    <span className="text-2xl font-black tracking-wider" style={{ color: flotaColor, fontFamily: "JetBrains Mono, monospace", textShadow: vehicle.cierreManual ? `0 0 15px ${flotaColor}40` : "none" }}>
                      {Math.floor(vehicle.duracionFinal / 60) > 0 ? `${Math.floor(vehicle.duracionFinal / 60)}h ` : ""}{vehicle.duracionFinal % 60}min
                    </span>
                    {vehicle.cantidadObjetivo && vehicle.cantidadObjetivo > 0 && vehicle.duracionFinal != null && vehicle.duracionFinal > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: `${flotaColor}20` }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: flotaColor }}>RENDIMIENTO</p>
                        <div className="flex items-center justify-center gap-4">
                          <div>
                            <p className="text-[8px] text-slate-500">Unidades</p>
                            <p className="text-sm font-black" style={{ color: flotaColor }}>{vehicle.cantidadObjetivo}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-500">Tiempo/unidad</p>
                            <p className="text-sm font-black" style={{ color: flotaColor }}>{(vehicle.duracionFinal / vehicle.cantidadObjetivo).toFixed(1)} min</p>
                          </div>
                          {vehicle.resultadoPorUnidad && (
                            <div>
                              <p className="text-[8px] text-slate-500">Precisión</p>
                              <p className="text-sm font-black" style={{ color: flotaColor }}>{Math.floor(vehicle.resultadoPorUnidad / 60)}m {vehicle.resultadoPorUnidad % 60}s</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                if (vehicle.status !== "activo" || vehicle.autoVerdad || vehicle.tipoFlota === "descanso") return null;
                const activeSeg = planilla?.segmentos.find(s => s.estado === "activo") ?? null;
                const dayStart = getLimaDayStartMs(Date.now());
                const gracia = getCruceGraciaState(
                  vehicle,
                  activeSeg,
                  Date.now(),
                  dayStart,
                  planilla?.segmentos
                );
                if (gracia.phase === "none") return null;
                const isExpired = gracia.phase === "expired";
                const accent = isExpired ? BLOOD : NARANJA;
                return (
                  <div className="p-2 rounded-xl border" style={{ backgroundColor: `${accent}08`, borderColor: `${accent}40` }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} style={{ color: accent }} />
                      <span className="text-[9px] font-bold" style={{ color: accent }}>
                        {isExpired ? "CIERRE POR ENTROPÍA-ATENCIÓN" : `SEGMENTO ANTERIOR — ABRE OTRO VEHÍCULO`}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {isExpired
                        ? `«${gracia.originNombre}» no puede continuar en este segmento. Abre un vehículo nuevo.`
                        : `Sesión de «${gracia.originNombre}». Gracia ~${gracia.minutesLeft} min — luego cierre automático.`}
                    </p>
                  </div>
                );
              })()}

              {!minimal && vehicle.status === "activo" && (
                <div className="space-y-2 pt-1">
                  {vehicle.tipoReloj === "investigador" && onInvestigadorClose ? (
                    <>
                      {(() => {
                        const histInvest = historicalVehicleData ?? getHistoricalVehicleData(vehicle.titulo);
                        const cantNum = Number(cantidadRealizada);
                        const cantValida = cantNum > 0;
                        return (
                          <div className="p-3 rounded-xl border space-y-3" style={{ backgroundColor: "rgba(212,175,55,0.05)", borderColor: `${GOLD}30` }}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color: GOLD }}>RESULTADO DE MEDICIÓN</p>

                            <div>
                              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: GOLD }}>Unidades completadas</p>
                              <input
                                type="number"
                                min="0"
                                value={cantidadRealizada}
                                onChange={e => setCantidadRealizada(e.target.value)}
                                placeholder={vehicle.cantidadObjetivo ? String(vehicle.cantidadObjetivo) : "0"}
                                className="w-full rounded-lg px-3 py-2 text-sm text-center font-bold outline-none"
                                style={{ backgroundColor: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}40`, color: GOLD }}
                                data-testid={`input-cantidadrealizada-${vehicle.id}`}
                              />
                              {histInvest.count > 0 && histInvest.bestMinPerUnit && (
                                <p className="text-[9px] text-center mt-1" style={{ color: GOLD }}>
                                  Récord bóveda: {histInvest.bestMinPerUnit.toFixed(1)} min/unidad ({histInvest.count} mediciones)
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  if (!cantValida) return;
                                  if (onOpenCierreEnergia) onOpenCierreEnergia({ kind: "investigador", vehicleId: vehicle.id, cumplido: true, cantidadRealizada: cantNum });
                                  else onInvestigadorClose?.(vehicle.id, true, cantNum);
                                }}
                                disabled={!cantValida}
                                className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ backgroundColor: `${EMERALD}15`, color: EMERALD, border: `1px solid ${EMERALD}40`, boxShadow: cantValida ? `0 0 12px ${EMERALD}15` : "none" }}
                                data-testid={`button-investigador-cumplido-${vehicle.id}`}
                              >
                                <Check size={16} />
                                <span className="font-black">CUMPLIDO</span>
                                <span className="text-[8px] opacity-70">+10 PS · Dato válido</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (!cantValida) return;
                                  if (onOpenCierreEnergia) onOpenCierreEnergia({ kind: "investigador", vehicleId: vehicle.id, cumplido: false, cantidadRealizada: cantNum });
                                  else onInvestigadorClose?.(vehicle.id, false, cantNum);
                                }}
                                disabled={!cantValida}
                                className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ backgroundColor: `${NARANJA}15`, color: NARANJA, border: `1px solid ${NARANJA}40`, boxShadow: cantValida ? `0 0 12px ${NARANJA}15` : "none" }}
                                data-testid={`button-investigador-incumplido-${vehicle.id}`}
                              >
                                <AlertTriangle size={16} />
                                <span className="font-black">INCUMPLIDO</span>
                                <span className="text-[8px] opacity-70">+10 PS · Dato descartado</span>
                              </button>
                            </div>
                            {!cantValida && (
                              <p className="text-[9px] text-center" style={{ color: NARANJA }}>Ingresa las unidades para continuar</p>
                            )}
                            <p className="text-[8px] text-slate-500 text-center">Después se abre el mismo paso de energía al cerrar que en el resto de vehículos.</p>
                          </div>
                        );
                      })()}
                    </>
                  ) : tipoFlota === "descanso" ? (
                    showEtiquetaSalida ? (
                      <div className="space-y-3 p-3 rounded-xl border" style={{ backgroundColor: "rgba(0,0,0,0.4)", borderColor: `${flotaColor}30` }}>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-center" style={{ color: flotaColor }}>¿Cómo saliste?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { key: "recuperado" as const, label: "RECUPERADO", desc: "Con voltaje", color: "#10b981", bonus: "+2 PS" },
                            { key: "parcial" as const, label: "PARCIAL", desc: "Algo de recarga", color: "#f59e0b", bonus: "0 PS" },
                            { key: "fragmentado" as const, label: "FRAGMENTADO", desc: "No descansé", color: "#ef4444", bonus: "—" },
                          ]).map(opt => (
                            <button
                              key={opt.key}
                              onClick={() => setEtiquetaSalidaLocal(opt.key)}
                              className="p-2 rounded-xl border text-center transition-all"
                              style={{ backgroundColor: etiquetaSalidaLocal === opt.key ? `${opt.color}20` : "rgba(255,255,255,0.03)", borderColor: etiquetaSalidaLocal === opt.key ? opt.color : "rgba(255,255,255,0.1)" }}
                              data-testid={`etiqueta-${opt.key}-${vehicle.id}`}
                            >
                              <p className="text-[8px] font-black uppercase" style={{ color: etiquetaSalidaLocal === opt.key ? opt.color : "#64748b" }}>{opt.label}</p>
                              <p className="text-[7px] text-slate-500 mt-0.5">{opt.desc}</p>
                              <p className="text-[7px] font-bold mt-1" style={{ color: etiquetaSalidaLocal === opt.key ? opt.color : "#475569" }}>{opt.bonus}</p>
                            </button>
                          ))}
                        </div>
                        <input
                          value={notaSalidaLocal}
                          onChange={e => setNotaSalidaLocal(e.target.value.slice(0, 80))}
                          placeholder="Nota de cierre (opcional, máx 80 chars)"
                          className="w-full bg-black/30 text-white text-[9px] p-2 rounded-lg border border-white/10 focus:outline-none"
                          data-testid={`nota-salida-${vehicle.id}`}
                        />
                        <p className="text-[8px] text-slate-500 text-center leading-snug">El siguiente paso pregunta con qué energía terminaste (mismo modal que en el resto de vehículos).</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!etiquetaSalidaLocal || !pendingDescansoStatus) return;
                              if (onOpenCierreEnergia) {
                                onOpenCierreEnergia({
                                  kind: "descanso",
                                  vehicleId: vehicle.id,
                                  status: pendingDescansoStatus,
                                  etiqueta: etiquetaSalidaLocal,
                                  nota: notaSalidaLocal,
                                });
                                setShowEtiquetaSalida(false);
                                setEtiquetaSalidaLocal(null);
                                setNotaSalidaLocal("");
                                setPendingDescansoStatus(null);
                              } else {
                                onDescansoClose?.(vehicle.id, pendingDescansoStatus, etiquetaSalidaLocal, notaSalidaLocal);
                              }
                            }}
                            disabled={!etiquetaSalidaLocal}
                            className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40"
                            style={{ backgroundColor: etiquetaSalidaLocal ? flotaColor : "rgba(255,255,255,0.1)", color: etiquetaSalidaLocal ? "#000" : "#64748b" }}
                            data-testid={`button-confirmar-cierre-${vehicle.id}`}
                          >
                            Continuar · energía al cerrar
                          </button>
                          <button onClick={() => { setShowEtiquetaSalida(false); setEtiquetaSalidaLocal(null); setNotaSalidaLocal(""); setPendingDescansoStatus(null); }} className="px-3 py-2 rounded-lg text-slate-500 bg-white/5 text-[9px]"><X size={12} /></button>
                        </div>
                      </div>
                    ) : timerExpired && vehicle.tipoDescanso !== "reset_profundo" && vehicle.tipoDescanso !== "punto_cero" ? (
                      <>
                        <button onClick={() => { setShowEtiquetaSalida(true); setPendingDescansoStatus("cumplido"); }} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: "rgba(153,27,27,0.15)", color: "#fca5a5", border: "1px solid #991b1b" }} data-testid={`button-archive-${vehicle.id}`}><X size={14} /> CERRAR · TOLERANCIA SUPERADA</button>
                        <p className="text-[9px] text-center text-slate-500">Selecciona tu etiqueta de salida para cerrar</p>
                      </>
                    ) : (
                      <button onClick={() => { setShowEtiquetaSalida(true); setPendingDescansoStatus("cumplido"); }} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: `${flotaColor}15`, color: flotaColor, border: `1px solid ${flotaColor}30` }} data-testid={`button-complete-${vehicle.id}`}><Check size={14} /> CERRAR DESCANSO</button>
                    )
                  ) : tipoFlota === "situacion" && !situacionCronActivo ? (
                    <>
                      {vehicle.vehiculoPadreDesglosadorId && (
                        <p className="text-[9px] text-center mb-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(0,255,195,0.08)", color: CYAN, border: "1px solid rgba(0,255,195,0.2)" }}>
                          Al cerrar la situación el desglosador padre retoma el tiempo congelado.
                        </p>
                      )}
                      <button onClick={() => onCompleteVehicle?.(vehicle.id)} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: `${EMERALD}15`, color: EMERALD, border: `1px solid ${EMERALD}30` }} data-testid={`button-complete-${vehicle.id}`}><Check size={14} /> Cumplido situación</button>
                      <button onClick={() => onArchiveVehicle?.(vehicle.id)} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }} data-testid={`button-archive-${vehicle.id}`}><X size={14} /> Incumplido</button>
                    </>
                  ) : vehicle.tipoReloj === "desglosador" ? (
                    <p className="text-[9px] text-center px-2 py-2 rounded-lg" style={{ backgroundColor: "rgba(212,175,55,0.08)", color: GOLD, border: "1px solid rgba(212,175,55,0.25)" }}>
                      Cierra cada sub con Cumplido/Fallado. Al terminar la cola usa el botón dorado «Cerrar ciclo» dentro del desglose.
                    </p>
                  ) : timerExpired && (tipoFlota === "tiempo" || vehicle.tipoTerminoRapido === "hora") ? (
                    <>
                      <button onClick={() => onArchiveVehicle?.(vehicle.id)} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: "rgba(153,27,27,0.15)", color: "#ef4444", border: "1px solid rgba(153,27,27,0.5)" }} data-testid={`button-archive-${vehicle.id}`}><X size={14} /> CERRAR · TIEMPO EXCEDIDO</button>
                      <p className="text-[9px] text-center text-slate-500">Justifica arriba para recuperar puntos</p>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onCompleteVehicle?.(vehicle.id)} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: `${EMERALD}15`, color: EMERALD, border: `1px solid ${EMERALD}30` }} data-testid={`button-complete-${vehicle.id}`}><Check size={14} /> CUMPLIDO (+{potentialCPCumplido} PS)</button>
                      {vehicle.tipoTerminoRapido && (
                        <button onClick={() => onArchiveVehicle?.(vehicle.id)} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }} data-testid={`button-archive-${vehicle.id}`}><X size={14} /> INCUMPLIDO</button>
                      )}
                    </>
                  )}
                  {!vehicle.tipoTerminoRapido && !tipoFlota && (
                    <button onClick={() => onArchiveVehicle?.(vehicle.id)} className="w-full py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#6b7280" }}><Archive size={12} /> Archivar</button>
                  )}
                </div>
              )}

            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {subRutaModal && (() => {
        const subForModal = (vehicle.subVehiculos || []).find(s => s.id === subRutaModal.subId);
        const cruzada = subForModal?.rutaEnfoque?.cruzado ?? null;
        const canConfirm = rutaSeguimientoPickerCanConfirm(subRutaSinUso, subRutaSel);
        return (
          <motion.div className="sistemicar-modal-overlay z-[230]" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} role="dialog" aria-modal="true">
            <div className="sistemicar-modal-shell">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="sistemicar-modal-panel max-w-sm rounded-2xl border p-4 space-y-3" style={{ backgroundColor: PIZARRA, borderColor: "rgba(139,92,246,0.35)" }}>
              <RutaSeguimientoPicker
                tituloContexto={cleanSubTitulo(subForModal?.titulo || "")}
                cruzadaReferencia={cruzada}
                seleccion={subRutaSel}
                sinUso={subRutaSinUso}
                patronActivo={subRutaPatron}
                onSeleccionChange={(bandas, patron) => {
                  setSubRutaSel(bandas);
                  setSubRutaPatron(patron);
                }}
                onSinUsoChange={sin => {
                  setSubRutaSinUso(sin);
                  if (sin) setSubRutaPatron("sin_ruta");
                }}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSubRutaModal(null); setSubRutaSel(new Set()); setSubRutaSinUso(false); setSubRutaPatron(null); }} className="flex-1 py-2 rounded-xl text-xs text-slate-400 bg-white/5">Cancelar</button>
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() => finalizeSubClose(subRutaModal.subId, subRutaModal.status, subRutaModal.cantidadRealizada, subRutaModal.duracionCompletado, subRutaSinUso ? [] : Array.from(subRutaSel))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                  style={{ backgroundColor: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}
                >
                  Confirmar sub
                </button>
              </div>
            </motion.div>
            </div>
          </motion.div>
        );
      })()}
      {vehicle.tipoReloj === "desglosador" && vehicle.status === "activo" && (
        <ConquistaUnitFocusOverlay
          open={unitFocusOpen}
          onClose={() => setUnitFocusOpen(false)}
          accentColor={flotaColor}
        />
      )}
    </motion.div>
  );
}

const MemoVehicleCard = memo(VehicleCard, areVehicleCardPropsEqual);

export { MemoVehicleCard };
