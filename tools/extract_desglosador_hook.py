"""Extract flota/desglosador logic from planeacion.tsx into useDesglosadorManager.ts."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLANEACION = ROOT / "client/src/pages/planeacion.tsx"
HOOK = ROOT / "client/src/hooks/useDesglosadorManager.ts"

STUB_EJES = 'const STUB_EJES = { enfoque: { text: "", trifecta: "omitir" as const }, conflicto: { text: "", trifecta: "omitir" as const }, pasos: { text: "", trifecta: "omitir" as const }, limite: { text: "", trifecta: "omitir" as const } };'

TIME_HELPERS = '''
function parseTimeString(t: string): { h: number; m: number } | null {
  const match = t.match(/^(\\d{1,2}):(\\d{2})$/);
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
'''

HOOK_IMPORTS = '''import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, startTransition } from "react";
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
  getDailyPointsLocalSync,
  getLocalSPLog,
  notifyVehicleClosed,
  wasVehicleRecentlyClosed,
  isOrphanDesglosadorInterrupt,
  reconcileStaleCentinelaInFirestore,
} from "@/lib/persistence";
import {
  requestGhostReconcileAfterVehicleAction,
} from "@/lib/ghostReconcileScheduler";
import {
  resetGhostSessionCache,
  shouldPreserveLocalActivo,
} from "@/lib/ghostVehicleEngine";
import {
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  vehicleMissionClosePS,
} from "@/lib/sovereigntyPointsConfig";
import { awardDesglosadorSubPointsIfNeeded } from "@/lib/desglosadorPointsAward";
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
import { clearStuckDesglosadorPause, archiveOrphanDesglosadorInterrupts } from "@/lib/situacionSessionMerge";
import {
  teardownSituacionSession,
  suppressSituacionFilaVoiceAfterSellar,
} from "@/lib/situacionSessionTeardown";
import { speakRingBienvenida, unlockSpeechSynthesis } from "@/lib/speechQueue";
import { resetPuntoCeroVoiceQueue } from "@/lib/puntoCeroVoice";
import {
  buildTermoDecisionSnapshot,
  decisionKeyMision,
  decisionKeySubDesglosador,
  decisionKeySubSituacion,
  recordDecision,
} from "@/lib/termoDecisionLedger";
import { recordFocusBandEvent, inferBandaBloque, psEspectroBloque } from "@/lib/focusBandLedger";
import type { RutaBandaId } from "@/lib/focusBandLedger";
import { hasJournalSpExactSource } from "@/lib/spLogHygiene";
import {
  computeDesglosadorSessionDepthPS,
  depthAwardForHour,
  getDesglosadorSessionElapsedSec,
} from "@/lib/desglosadorDepthPs";
import {
  reorderSubVehiculos,
  firstPendingSubVehiculoTitulo,
  ReorderDirection,
} from "@/lib/desglosadorSubOrder";
import {
  assertCanOpenVehicle,
  formatOperationalSlotsBlockMessage,
} from "@/lib/operationalVehicleSlots";
import {
  archiveActiveCentinelas,
  buildCentinelaArchiveFields,
  closeCentinelasBeforeConsciousLaunch,
  isCentinelaBlockedByVehicles,
  isInvisibleCentinelaVehicle,
  listActiveCentinelas,
  maybeReleaseStaleSuppression,
  releaseCentinela,
  resetCentinelaLaunchGate,
} from "@/lib/centinelaEngine";
import {
  getJournalDateString,
  getJournalDayStartMs,
  getSegmentCalendarDayStartMs,
} from "@/lib/journalDay";
import {
  resolveVehicleSegmentContext,
  isDesglosadorCrossSegmentExempt,
} from "@/lib/vehicleSegmentContext";
import {
  cancelFlotaFetch,
  onFlotaStaleLoadingRefetch,
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
import { useSegmentoProyectoVinculo } from "@/hooks/useSegmentoProyectoVinculo";
import {
  buildDesglosadorNestedPausePatch,
  buildNestedParentResumePatch,
  buildSituacionNestedPausePatch,
  findNestedParentAwaitingPuntoCeroResume,
  resumeDesglosadorFromNestedPause,
} from "@/lib/nestedContextStack";
import { scheduleDeferredVehicleCleanup } from "@/lib/vehicleDeferredCleanup";
import { generateStableUuid } from "@/lib/stableUuid";
import { repairStuckSituacionVehicles, vehiclesReactiveSignature } from "@/lib/situacionRepair";
import { isEntropyDebugEnabled } from "@/components/EntropiaDebugPanel";
import { syncRingDecisionToProyectoHub } from "@/lib/syncRingDecisionToProyectoHub";
import { setActiveSegmento, registrarEvento, COMPONENTES } from "@/lib/evento-universal";
import {
  markPeldanoConquistadoSituacion,
  markPeldanoConquistadoTiempo,
} from "@/lib/proyectoPeldanoConquista";
import {
  addSituacionReserva,
  deleteSituacionReserva,
  getReservaActivas,
  imanItemsParaDesglosador,
  NIDO_INBOX_ID,
  nidoKeyFromReserva,
  proyectoMetaParaReservaDesdeSub,
  reservaEsEnviabeASituacion,
  sortReservasTacticas,
  subTareaFromImanItem,
  subscribeToSituacionReserva,
  updateSituacionReservaEstado,
  updateSituacionReservaRuta,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";
import { RUTA_TACTICA_META } from "@/lib/situacionReservaUi";
import {
  absorberSaldoAdelantoEnFoco,
  aplicarProyectoHeredadoASub,
  aplicarTiempoGanadoAlCumplir,
  applyCupoManualYRedistribuir,
  buildSellarDirectoEnRingState,
  buildSituacionCronometroCierre,
  cerrarCronometroDeGolpe,
  describeRepartoGananciaEnCola,
  dominanteProyectoIdEnSubs,
  extraerSubTareaAReserva,
  firstPendingCronometroTexto,
  isCupoFijo,
  quitarMinutosHaciaFoco,
  redistribuirMinutosSituacionCronometro,
  registrarCierreFalladoCronometro,
  reanudarSituacionCronometroRing,
  remainingCronometroBudgetMin,
  reorderSubTareasCronometro,
  resolveCronometroCupoAnchor,
  resolveDefaultObjetivoHoraParaRing,
  resolveFocusSubTareaId,
  resolveProyectoIdEnfoqueSituacion,
  ringSessionOperable,
  RING_COPY,
  situacionContratoFinMs,
  situacionFilaCronometroPendiente,
  situacionMinutosHastaObjetivoHora,
  situacionObjetivoHoraToContratoMs,
  subTareaConPasoEjecutado,
  totalBudgetMinFromCronometro,
  vehicleNeedsCupoAnchorSync,
  nextRetoNumero,
} from "@/lib/situacionCronometroEngine";
import {
  etapasConColoresCompletos,
  initPuntoCeroSession,
  parsePuntoCeroDuracionMin,
  todosColoresConfirmados,
} from "@/lib/puntoCeroEngine";
import type { ModoPuntoCero, PuntoCeroSession } from "@/lib/puntoCeroTypes";
import type { DesglosadorTiempoCloseSummary } from "@/lib/desglosadorTiempoCloseSummary";
import type { RutaSeguimientoPatron } from "@/lib/rutaSeguimientoPatron";
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
  vehicleClosedAtMs,
} from "@/components/flota/vehicleCardShared";
import { requestNotificationPermission } from "@/lib/notifications";
import { auth } from "@/lib/firebase";
import { saveVehicleHistoryFirebase, mergeVehicleHistories, VehicleHistoryEntry } from "@/lib/persistence";

'''


def find_line(lines: list[str], pattern: str, after: int = 0) -> int:
    rx = re.compile(pattern)
    for i in range(after, len(lines)):
        if rx.search(lines[i]):
            return i
    raise ValueError(f"Pattern not found: {pattern}")


def extract_block(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start:end])


def main() -> None:
    content = PLANEACION.read_text(encoding="utf-8")
    lines = content.splitlines(keepends=True)

    start = find_line(lines, r"^export default function Planeacion")

    # --- locate blocks ---
    a = find_line(lines, r"vehicles: useFlotaVehiclesShallow", start)
    b = find_line(lines, r"const reservaActivas = useMemo", a)
    c_end = b + 1  # after reservaActivas line

    # skip plan layout state - jump to ghost reconcile through desglosador pause sig
    d = find_line(lines, r"const ghostReconcileRef = useRef", start)
    e = find_line(lines, r"const orphanInterruptSignature = useMemo", d)
    e_end = e + 1

    # cierre modal state block (may be far - find independently)
    f = find_line(lines, r"const \[cierreEnergiaPending, setCierreEnergiaPending\]", start)
    g = find_line(lines, r"const \[situacionBloqueSummaries", f)
    h = find_line(lines, r"const presentSituacionDesgloseCelebration = useCallback", g)
    h_end = find_line(lines, r"\}, \[openSituacionDesgloseCelebration\]\);", h) + 1

    i = find_line(lines, r"const safeAwardPS = useCallback", h_end)
    j = find_line(lines, r"const toastDailyPSTotal = useCallback", i)
    j_end = find_line(lines, r"\}, \[user\]\);", j) + 1

    k = find_line(lines, r"const setupFlotaSubscription = useCallback", start)
    k_end = find_line(lines, r"\}, \[user, setupFlotaSubscription\]\);", k) + 1

    l = find_line(lines, r"resetCentinelaLaunchGate\(\);", k_end)
    l_end = find_line(lines, r"\}, \[user\]\);", l) + 1

    m = find_line(lines, r"if \(!user \|\| !consciousActiveSignature\) return;", l_end)
    m_end = find_line(lines, r"\}, \[user, consciousActiveSignature\]\);", m) + 1

    n = find_line(lines, r"void reconcileStaleCentinelaInFirestore", m_end)
    n_end = find_line(lines, r"\}, \[user\]\);", n) + 1

    # segment crossing effect
    o = find_line(lines, r"const prevSegmentoIdRef = useRef", start)
    o_end = find_line(lines, r"\}, \[segmentoActivo\?\.id, user\]\);", o) + 1

    p = find_line(lines, r"const vehiclesRef = useRef\(vehicles\)", start)
    q = find_line(lines, r"const checkTraslado50Ref = useRef", p)
    q_end = find_line(lines, r"\}, \[user\]\);", q + 20)
    # find visibility effect for traslado50 - second [user] after q
    for i in range(q, len(lines)):
        if lines[i].strip() == "}, [user]);" and i > q + 5:
            q_end = i + 1
            break

    r = find_line(lines, r"const checkPuntoCeroEntropy = \(\) =>", q_end)
    r_end = find_line(lines, r"\}, \[user\]\);", r) + 1

    s = find_line(lines, r"const handleStatusChange = async", start)
    t = find_line(lines, r"const handleGenerarRadiografia = async", s)
    t_end = t  # handlers end before radiografia

    u = find_line(lines, r"const activeVehicles = vehicles.filter", start)
    v = find_line(lines, r"const audioCtxRef = useRef", u)

    w = find_line(lines, r"registerDesglosadorDepthReconciler\(reconcileDesglosadorDepthPS\)", u)
    w_start = find_line(lines, r"useEffect\(\(\) => \{", w - 3)
    w_end = find_line(lines, r"\}, \[flotaActivosRenderList\]\);", w) + 1

    x = find_line(lines, r"const segmentoNumero = segmentoActualIdx", start)
    y = find_line(lines, r"\}, \[vehicles, scrollFlotaActivosIntoView\]\);", x) + 1

    # mount effect for local activos + orphan sweep - parts inside p block already?
    # Also need: subscribe situacion reserva in user effect - part of k block

    body_parts: list[tuple[str, int, int]] = [
        ("flota_state", a, find_line(lines, r"useViewTransitionShield\(\);", a)),
        ("refs_scroll", find_line(lines, r"const optimisticVehiclesRef", a), find_line(lines, r"const scrollFlotaActivosIntoView", a) + 3),
        ("expanded_modal_refs", find_line(lines, r"const \[expandedId, setExpandedId\]", a), find_line(lines, r"const prevActiveVehicleCountRef", a) + 1),
        ("situacion_reserva", find_line(lines, r"const \[situacionReserva, setSituacionReserva\]", a), c_end),
        ("signatures", d, e_end),
        ("modal_state", f, g + 1),
        ("celebration_openers", find_line(lines, r"const openSituacionDesgloseCelebration", f), h_end),
        ("safe_award_record", i, j_end),
        ("flota_init_effects", k, n_end),
        ("segment_cross", o, o_end),
        ("vehicles_core", p, r_end),
        ("handlers", s, t_end),
        ("lists", u, v),
        ("depth_effects", w_start, w_end),
        ("segment_num_effects", find_line(lines, r"const segmentoActualIdx = planilla", x - 2), y),
    ]

    hook_body = []
    for name, s, e in body_parts:
        block = extract_block(lines, s, e)
        # transform flota state init
        if name == "flota_state":
            block = block.replace(
                "  const { vehicles, setVehicles } = {\n    vehicles: useFlotaVehiclesShallow(user?.uid),\n    setVehicles: useFlotaMutator(),\n  };\n",
                "  const vehicles = useFlotaVehiclesShallow(user?.uid);\n  const setVehicles = useFlotaMutator();\n",
            )
        hook_body.append(block)

    inner = "".join(hook_body)

    # Replace planeacion-specific refs with hook internals
    replacements = {
        "deferredVehicles": "deferredAll",
        "flotaActivosRenderList": "flotaActivos",
        "setGoldenFlash(true)": "options?.onGoldenFlash?.()",
        "setTimeout(() => setGoldenFlash(false), 3000)": "/* golden flash via callback */",
        "setTimeout(() => setGoldenFlash(false), 2500)": "/* golden flash via callback */",
        "triggerConquistaPulse()": "options?.onConquistaPulse?.()",
        "setDailyPS(getDailyPointsLocalSync(user.uid).total)": "options?.onDailyPsChange?.(getDailyPointsLocalSync(user.uid).total)",
        "onDailyPs: setDailyPS": "onDailyPs: (total) => options?.onDailyPsChange?.(total)",
        "showEntropyDebug": "showEntropyDebug",
    }
    for old, new in replacements.items():
        inner = inner.replace(old, new)

    # Add planilla subscription + segmentoActivo at top of hook body after user
    planilla_block = '''
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const planillaFecha = getJournalDateString();

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPlanilla(user.uid, planillaFecha, (p) => setPlanilla(p), (e) => console.error(e));
    return unsub;
  }, [user, planillaFecha]);

  const segmentoActivo = useMemo(() => {
    if (!planilla) return null;
    return planilla.segmentos.find(s => s.estado === "activo") || null;
  }, [planilla]);

  const {
    proyectosHub,
    resolverProyectoId,
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

  const showEntropyDebug = useMemo(() => isEntropyDebugEnabled(), []);

  useEffect(() => {
    try {
      repairStuckSituacionVehicles();
    } catch {
      /* noop */
    }
  }, []);

'''

    # Insert after user declaration
    inner = inner.replace(
        "  const vehicles = useFlotaVehiclesShallow(user?.uid);",
        "  const { user } = useAuthContext();\n" + planilla_block + "  const vehicles = useFlotaVehiclesShallow(user?.uid);",
    )
    # Remove duplicate user from original if present
    inner = inner.replace("  const { user } = useAuthContext();\n  const [, navigate] = useLocation();\n", "")

    # Build vehicle lists return section - append computed exports before handlers return
    footer = '''
  const deferredAll = useDeferredValue(vehicles);

  const completedVehicles = useMemo(
    () =>
      vehicles.filter(
        v =>
          (v.status === "cumplido" || v.status === "archivado") &&
          !isInvisibleCentinelaVehicle(v)
      ),
    [vehicles]
  );

  const sortedCompleted = completedVehicles;

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
      handleFlotaStatusChange,
      handleStatusChange,
      handleEmergencyArchiveStuckActives,
      scrollFlotaActivosIntoView,
      setVehicles,
      vehiclesRef,
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
      handleFlotaStatusChange,
      handleStatusChange,
      handleEmergencyArchiveStuckActives,
      scrollFlotaActivosIntoView,
      setVehicles,
    ]
  );

  return {
    vehicles: {
      all: vehicles,
      deferred: deferredAll,
      flotaActivos,
      active: activeVehicles,
      completed: sortedCompleted,
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
    },
    handlers,
  };
}
'''

    # Rename flotaActivosRenderList to flotaActivos in lists section
    inner = inner.replace("const flotaActivosRenderList = useMemo", "const flotaActivos = useMemo")
    inner = inner.replace("[sortedOperativaActivos, panoramicaActivos, activeVehicles]", "[sortedOperativaActivos, panoramicaActivos, activeVehicles]")

    hook_file = (
        HOOK_IMPORTS
        + "\n"
        + STUB_EJES
        + "\n"
        + TIME_HELPERS
        + "\n\nexport type UseDesglosadorManagerOptions = {\n"
        + "  onDailyPsChange?: (total: number) => void;\n"
        + "  onConquistaPulse?: () => void;\n"
        + "  onGoldenFlash?: () => void;\n"
        + "};\n\n"
        + "export function useDesglosadorManager(options?: UseDesglosadorManagerOptions) {\n"
        + inner
        + footer
    )

    HOOK.write_text(hook_file, encoding="utf-8")
    print(f"Wrote {HOOK} ({len(hook_file.splitlines())} lines)")

    # Now patch planeacion - remove extracted ranges (reverse order)
    remove_ranges = sorted([ (s,e) for _,s,e in body_parts ], reverse=True)
    new_lines = lines[:]
    for s, e in remove_ranges:
        new_lines[s:e] = []

    # Insert hook call after user in Planeacion
    planeacion_start = find_line(new_lines, r"^export default function Planeacion")
    user_line = find_line(new_lines, r"const \{ user \} = useAuthContext", planeacion_start)
    hook_call = (
        "  const { vehicles, modales, handlers } = useDesglosadorManager({\n"
        "    onDailyPsChange: setDailyPS,\n"
        "    onConquistaPulse: triggerConquistaPulse,\n"
        "    onGoldenFlash: () => {\n"
        "      setGoldenFlash(true);\n"
        "      setTimeout(() => setGoldenFlash(false), 2500);\n"
        "    },\n"
        "  });\n"
        "  const {\n"
        "    all: vehiclesAll,\n"
        "    deferred: deferredVehicles,\n"
        "    flotaActivos: flotaActivosRenderList,\n"
        "    active: activeVehicles,\n"
        "    completed: completedVehicles,\n"
        "    setVehicles,\n"
        "  } = vehicles;\n"
        "  const {\n"
        "    expandedId,\n"
        "    setExpandedId,\n"
        "    cierreEnergiaPending,\n"
        "    setCierreEnergiaPending,\n"
        "    cierreEnergiaSeleccion,\n"
        "    setCierreEnergiaSeleccion,\n"
        "    cierreRutaSeleccion,\n"
        "    setCierreRutaSeleccion,\n"
        "    cierreRutaSinUso,\n"
        "    setCierreRutaSinUso,\n"
        "    cierreRutaPatron,\n"
        "    setCierreRutaPatron,\n"
        "    situacionDesgloseCelebration,\n"
        "    setSituacionDesgloseCelebration,\n"
        "    desglosadorTiempoCelebration,\n"
        "    setDesglosadorTiempoCelebration,\n"
        "    situacionBloqueSummaries,\n"
        "    flotaActivosRef,\n"
        "    vehiclesRef,\n"
        "    segmentoNumero,\n"
        "    segmentoActivo: hookSegmentoActivo,\n"
        "    planilla: hookPlanilla,\n"
        "    situacionReserva,\n"
        "    reservaActivas,\n"
        "  } = modales;\n"
    )
    # Problem: triggerConquistaPulse and setDailyPS defined later - need to reorder
    # For now insert hook call later after triggerConquistaPulse

    PLANEACION.write_text("".join(new_lines), encoding="utf-8")
    print("Patched planeacion.tsx (removed extracted blocks)")


if __name__ == "__main__":
    main()
