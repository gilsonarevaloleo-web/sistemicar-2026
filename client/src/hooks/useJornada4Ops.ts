/**
 * Ops Dual Kernel — gestos ms0 + PS/Firebase/disco en sombra.
 * Sin useDesglosadorManager, sin voz, sin decisiones/hub/depth.
 */
import { useCallback, useRef, type MutableRefObject } from "react";
import { toast } from "sonner";
import {
  addVehicle,
  notifyVehicleClosed,
  updateVehicle,
  wasVehicleRecentlyClosed,
  type SegmentoV5,
  type Vehicle,
} from "@/lib/persistence";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { flushLaunchPersistOnSubClose } from "@/lib/launchPersistGate";
import { runShadowTaskAsync, yieldAfterPaint } from "@/lib/desglosadorShadow";
import {
  applyConquistaSubClose,
  applyConquistaCycleClose,
} from "@/jornada4/conquistaKernel";
import {
  applySituacionRowClose,
  applySituacionBlockClose,
  applySituacionQuitarFila,
  postergarFilaEnFocoACola,
} from "@/jornada4/situacionKernel";
import {
  applySituacionDistraccionFail,
  applySituacionSustituirFoco,
  ENTRENAMIENTO_COPY,
  isRingModoEntrenamiento,
} from "@/jornada4/entrenamientoRestricciones";
import {
  awardConquistaSubPs,
  awardConquistaCyclePs,
  awardSituacionFilaPs,
  awardSituacionFilaAvancePs,
  awardSituacionBlockPs,
} from "@/jornada4/psBridge";
import { burstJornada4Tick } from "@/jornada4/jornada4Tick";
import { desglosadorProfundidadGanadaPs } from "@/jornada4/desglosadorProfundidad";
import {
  recordDesglosadorCycleHistory,
  recordDesglosadorSubHistory,
} from "@/lib/vehicleHistoryStore";
import { buildDesglosadorSubFromRuntime } from "@/components/flota/vehicleCardShared";
import type { DesglosadorSubFormRow as SharedSubForm } from "@/components/flota/vehicleCardShared";
import {
  applyCupoManualYRedistribuir,
  buildSellarDirectoEnRingState,
  remainingCronometroBudgetMin,
  resolveCronometroCupoAnchor,
  totalBudgetMinFromCronometro,
} from "@/lib/situacionCupoDistrib";
import {
  isConquistaDesglosador,
  isSituacionDesglosador,
  isSituacionRing,
  isConquistaRapido,
  isSituacionListaLibre,
} from "@/jornada4/filters";
import { reconcileCoberturaHuecos } from "@/jornada4/coberturaHuecosLog";
import { vehicleMissionClosePS } from "@/lib/sovereigntyPointsConfig";
import type { SubTarea } from "@/lib/persistence";
import { syncRingDecisionToProyectoHub } from "@/lib/syncRingDecisionToProyectoHub";
import { syncDesglosadorSubToProyectoHub } from "@/lib/syncDesglosadorSubToProyectoHub";
import {
  acreditarMinutosSituacionEnProyecto,
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  recordProgresoHubAlCerrarVehiculo,
} from "@/lib/proyectos";
import {
  feedsProyectoHub,
  resolveDestinoCierre,
  type DestinoCierre,
} from "@/lib/destinoCierre";
import {
  DIRECCION_SIN_PROYECTO,
  evaluateDireccionElegibilidad,
  noPuedesLlegarADireccion,
  resolveClaimDestinoCierre,
} from "@/lib/direccionElegibilidad";
import {
  registrarCierreConcienciaTriada,
  resolveDuracionMinCierre,
} from "@/lib/concienciaTriadaOperador";
import {
  buildDesglosadorNestedPausePatch,
  resumeDesglosadorFromNestedPause,
} from "@/lib/nestedContextStack";
import {
  firstPendingCronometroTexto,
  firstPendingSubVehiculoTitulo,
  reorderSubTareasCronometro,
  reorderSubVehiculos,
  type ReorderDirection,
} from "@/lib/desglosadorReorder";
import {
  assertCanOpenVehicle,
  formatOperationalSlotsBlockMessage,
} from "@/lib/vehicleOperationalSlots";
import { closeCentinelasBeforeConsciousLaunch } from "@/lib/centinelaEngine";
import { generateStableUuid } from "@/lib/stableUuid";
import {
  collectCierresConscientesAlTermino,
  isCierreConscienteAlTermino,
  markCierresConscientesPsAwarded,
  PS_CIERRE_CONSCIENTE_PLAN,
  readCierreConscientePlan,
  recordCierresConscientesPlan,
  vehiclesToCloseAtPlanEnd,
} from "@/jornada4/cierrePlanSweep";
import {
  isPlanTerminado,
  resolveLastSegmentWindowMs,
  resolvePlanWindowMs,
  sealRevelacionPlanDia,
  readRevelacionPlanDia,
} from "@/jornada4/revelacionPlanDia";
import type { PlanEndSweepResult } from "@/jornada4/cierrePlanSweep";

function destinoCierreVivo(
  userId: string | undefined,
  vehicle: Pick<Vehicle, "destinoCierre" | "proyectoId">
): DestinoCierre {
  const requested = resolveDestinoCierre(vehicle.destinoCierre);
  if (requested !== "peldano" || !userId) return "presencia";
  const pid = vehicle.proyectoId?.trim();
  const proyectos = getProyectosLocal(userId);
  const p = (pid ? proyectos.find(x => x.id === pid) : undefined) ?? proyectos[0];
  if (!p) return "presencia";
  const gate = evaluateDireccionElegibilidad(p, getPeldanosByProyectoLocal(userId, p.id));
  return gate.ok ? "peldano" : "presencia";
}

function noteHuecoAfterClose(vehicles: Vehicle[]): void {
  try {
    reconcileCoberturaHuecos({ vehicles });
  } catch {
    /* non-fatal */
  }
}

const PIZARRA = "#0a0a0a";
const EMERALD = "#00C851";
const BLOOD = "#FF2A2A";
const PLATA = "#C0C0C0";
const CYAN = "#00FFC3";
const VIOLET = "#8B5CF6";
const AMBER = "#F59E0B";
const GOLD = "#D4AF37";

const STUB_EJES = {
  enfoque: { text: "", trifecta: "omitir" as const },
  conflicto: { text: "", trifecta: "omitir" as const },
  pasos: { text: "", trifecta: "omitir" as const },
  limite: { text: "", trifecta: "omitir" as const },
};

export type UseJornada4OpsParams = {
  userId: string | undefined;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  safeAwardPS: (amount: number, source: string) => Promise<boolean>;
  /** Segmento activo — fallback de dirección para peldaños/pasos. */
  segmentoActivo?: SegmentoV5 | null;
  /** Plan del día — cierre al término y premio de carácter. */
  segmentos?: { horaInicio?: string; horaFin?: string }[];
};

export function useJornada4Ops(params: UseJornada4OpsParams) {
  const {
    userId,
    vehiclesRef,
    setVehicles,
    safeAwardPS,
    segmentoActivo = null,
    segmentos = [],
  } = params;
  const inFlightRef = useRef(new Set<string>());
  const sweepInFlightRef = useRef(false);
  const segmentoRef = useRef(segmentoActivo);
  segmentoRef.current = segmentoActivo;
  const segmentosRef = useRef(segmentos);
  segmentosRef.current = segmentos;

  const paintVehicle = useCallback(
    (vehicleId: string, patch: Partial<Vehicle>) => {
      const map = (list: Vehicle[]) =>
        list.map(v => (v.id === vehicleId ? { ...v, ...patch } : v));
      vehiclesRef.current = map(vehiclesRef.current);
      setVehicles(map);
      burstJornada4Tick();
    },
    [setVehicles, vehiclesRef]
  );

  const tryPremiarCierreConsciente = useCallback(
    (closed: Pick<Vehicle, "id" | "titulo" | "status" | "cierreAt" | "cierreManual">) => {
      if (!userId) return;
      const segs = segmentosRef.current;
      const last = resolveLastSegmentWindowMs(segs);
      const win = resolvePlanWindowMs(segs);
      if (!last || !win) return;
      if (!isCierreConscienteAlTermino(closed, last.startMs, win.endMs)) return;
      const { nuevos, ledger } = recordCierresConscientesPlan(userId, [closed.id]);
      if (nuevos.length === 0) return;
      const extraPs = nuevos.length * PS_CIERRE_CONSCIENTE_PLAN;
      markCierresConscientesPsAwarded(userId, extraPs);
      void safeAwardPS(
        extraPs,
        `Disciplina · cierre consciente al término · ${closed.titulo}`
      );
      toast.success(
        `Carácter · +${extraPs} PS · +${ledger.bonoPct}% disciplina`,
        {
          description: "Cerrar a mano en la última hora del plan forma el carácter.",
          duration: 3600,
          style: {
            backgroundColor: PIZARRA,
            border: `1px solid ${GOLD}`,
            color: GOLD,
          },
        }
      );
    },
    [userId, safeAwardPS]
  );

  const closeVehiclePorTerminoPlan = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `planend:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.status !== "activo") return;
        const cierreAt = Date.now();
        const wallMin = resolveDuracionMinCierre(
          vehicle,
          Math.max(0, (cierreAt - (vehicle.aperturaAt ?? cierreAt)) / 60_000)
        );
        const destino = destinoCierreVivo(userId, vehicle);
        const patch: Partial<Vehicle> = {
          status: "archivado",
          cierreAt,
          duracionFinal: wallMin || undefined,
          cierreManual: false,
          interrupcionActiva: false,
          desglosadorPausa: undefined,
          destinoCierre: destino,
        };
        notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
        paintVehicle(vehicleId, patch);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);
        noteHuecoAfterClose(vehiclesRef.current);

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(userId, vehicleId, patch, { skipLocalSync: true });
            const closed: Vehicle = { ...vehicle, ...patch, destinoCierre: destino };
            registrarCierreConcienciaTriada(userId, {
              vehicleId: vehicle.id,
              minutos: resolveDuracionMinCierre(closed, wallMin),
              destino,
              at: cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: vehicle.tipoFlota === "situacion" ? "situacion" : "tiempo",
              psGanados: 0,
              duracionMin: wallMin,
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeVehiclePorTerminoPlan]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const sweepPlanEnd = useCallback(
    async (
      segs: { horaInicio?: string; horaFin?: string }[]
    ): Promise<PlanEndSweepResult> => {
      const empty: PlanEndSweepResult = {
        revelacion: userId ? readRevelacionPlanDia(userId) : null,
        ledger: userId ? readCierreConscientePlan(userId) : null,
        closed: 0,
        premiados: 0,
      };
      if (!userId || sweepInFlightRef.current) return empty;
      if (!isPlanTerminado(segs)) return empty;
      sweepInFlightRef.current = true;
      try {
        const leftovers = vehiclesToCloseAtPlanEnd(vehiclesRef.current);
        for (let i = 0; i < leftovers.length; i++) {
          await closeVehiclePorTerminoPlan(leftovers[i].id);
        }
        const last = resolveLastSegmentWindowMs(segs);
        const win = resolvePlanWindowMs(segs);
        let premiados = 0;
        let ledger = readCierreConscientePlan(userId);
        if (last && win) {
          const ids = collectCierresConscientesAlTermino(
            vehiclesRef.current,
            last.startMs,
            win.endMs
          );
          const recorded = recordCierresConscientesPlan(userId, ids);
          ledger = recorded.ledger;
          if (recorded.nuevos.length > 0) {
            const extraPs = recorded.nuevos.length * PS_CIERRE_CONSCIENTE_PLAN;
            markCierresConscientesPsAwarded(userId, extraPs);
            premiados = recorded.nuevos.length;
            await safeAwardPS(
              extraPs,
              `Disciplina · ${premiados} cierre(s) consciente(s) al término`
            );
            toast.success(
              `Carácter · +${extraPs} PS · +${recorded.ledger.bonoPct}% disciplina`,
              {
                description: "Cerrar a mano en la última hora del plan forma el carácter.",
                duration: 4000,
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${GOLD}`,
                  color: GOLD,
                },
              }
            );
          }
        }
        if (leftovers.length > 0) {
          toast.message(
            leftovers.length === 1
              ? "El plan cerró 1 vehículo"
              : `El plan cerró ${leftovers.length} vehículos`,
            {
              description:
                "Regla: todo vehículo se cierra al término. Quien cierra a mano en la última hora suma disciplina.",
              duration: 4200,
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${PLATA}`,
                color: PLATA,
              },
            }
          );
        }
        const revelacion = sealRevelacionPlanDia(userId, {
          segmentos: segs,
          vehicles: vehiclesRef.current,
        });
        return {
          revelacion,
          ledger,
          closed: leftovers.length,
          premiados,
        };
      } finally {
        sweepInFlightRef.current = false;
      }
    },
    [userId, vehiclesRef, closeVehiclePorTerminoPlan, safeAwardPS]
  );

  const closeConquistaSub = useCallback(
    async (vehicleId: string, status: "cumplido" | "fallado", cantidad?: number) => {
      if (!userId) return;
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;
      const active = vehicle.subVehiculos?.find(s => s.status === "activo");
      if (!active) return;

      const key = `c:${vehicleId}:${active.id}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const patch = applyConquistaSubClose({
          vehicle,
          subId: active.id,
          status,
          cantidad,
        });
        if (!patch) {
          toast.error("No se pudo cerrar la unidad", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }

        const depthPs = desglosadorProfundidadGanadaPs(patch.subVehiculos);
        paintVehicle(vehicleId, {
          subVehiculos: patch.subVehiculos,
          desglosadorBloqueDepthPsGranted: depthPs,
        });
        flushLaunchPersistOnSubClose(vehicleId);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        // PS al instante (sin requestIdleCallback) — la barra no puede esperar al idle.
        let subsForRemote = patch.subVehiculos;
        try {
          if (status === "cumplido") {
            recordDesglosadorSubHistory(vehicle.titulo, patch.closedSub, userId);
            try {
              await syncDesglosadorSubToProyectoHub(
                userId,
                { ...vehicle, destinoCierre: destinoCierreVivo(userId, vehicle) },
                patch.closedSub,
                status,
                segmentoRef.current
              );
            } catch (hubErr) {
              console.error("[jornada4.closeConquistaSub] hub", hubErr);
            }
            const awarded = await awardConquistaSubPs(
              vehicle.titulo,
              patch.closedSub,
              safeAwardPS
            );
            if (awarded > 0) {
              subsForRemote = patch.subVehiculos.map(s =>
                s.id === patch.closedSub.id ? { ...s, psOtorgados: awarded } : s
              );
              paintVehicle(vehicleId, {
                subVehiculos: subsForRemote,
                desglosadorBloqueDepthPsGranted: depthPs,
              });
              scheduleSaveLocalVehicles(vehiclesRef.current);
              toast.success(`+${awarded} PS · profundidad ${depthPs} PS`, {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${EMERALD}`,
                  color: EMERALD,
                },
                duration: 2200,
              });
            }
          } else {
            toast.info("Unidad fallada", {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${PLATA}`,
                color: PLATA,
              },
              duration: 1800,
            });
          }
          if (patch.cycleReady) {
            toast.message("Ciclo listo — cierra el desglosador", {
              duration: 3200,
            });
          }
        } catch (e) {
          console.error("[jornada4.closeConquistaSub] PS", e);
        }

        const remoteSubs = subsForRemote;
        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                subVehiculos: remoteSubs,
                desglosadorBloqueDepthPsGranted: depthPs,
              },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.closeConquistaSub] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  const setDestinoCierre = useCallback(
    (vehicleId: string, destino: DestinoCierre, proyectoId?: string) => {
      let nextDestino = destino;
      let nextProyectoId = proyectoId;
      let stampedPuntoId: string | undefined;
      if (destino === "peldano") {
        const proyectos = userId ? getProyectosLocal(userId) : [];
        const pid = proyectoId?.trim() || "";
        const p = proyectos.find(x => x.id === pid) ?? proyectos[0];
        const gate = p && userId
          ? evaluateDireccionElegibilidad(p, getPeldanosByProyectoLocal(userId, p.id))
          : DIRECCION_SIN_PROYECTO;
        const claim = resolveClaimDestinoCierre({
          requested: "peldano",
          proyectoId: pid || p?.id,
          gate,
        });
        if (!claim.accepted) {
          toast.message(noPuedesLlegarADireccion(gate), {
            description: "Presencia cubre el día sin ensuciar el proyecto.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
            duration: 3200,
          });
          nextDestino = "presencia";
          nextProyectoId = undefined;
        } else {
          nextProyectoId = pid || p?.id;
          stampedPuntoId = gate.puntoProduccionId;
        }
      }
      const patch: Partial<Vehicle> = { destinoCierre: nextDestino };
      if (nextDestino === "peldano" && nextProyectoId) {
        patch.proyectoId = nextProyectoId;
        if (stampedPuntoId) patch.oleadaPuntoId = stampedPuntoId;
      }
      paintVehicle(vehicleId, patch);
      scheduleSaveLocalVehicles(vehiclesRef.current);
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(userId, vehicleId, patch, { skipLocalSync: true });
        } catch (e) {
          console.error("[jornada4.setDestinoCierre]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const closeConquistaCycle = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `cc:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const destino = destinoCierreVivo(userId, vehicle);
        if (feedsProyectoHub(destino) && !vehicle.proyectoId) {
          toast.error("No puedes llegar a Dirección: elige un proyecto con oleada y foco", {
            description: "Presencia cubre el día sin ensuciar el proyecto.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
            duration: 2800,
          });
          return;
        }
        const patch = applyConquistaCycleClose(vehicle);
        if (!patch) {
          toast.error("Aún hay unidades pendientes", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }

        const depthPs = desglosadorProfundidadGanadaPs(patch.subVehiculos);
        const wallMin = resolveDuracionMinCierre(
          vehicle,
          Math.max(0, (patch.cierreAt - (vehicle.aperturaAt ?? patch.cierreAt)) / 60_000)
        );
        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          duracionFinal: wallMin || undefined,
          subVehiculos: patch.subVehiculos,
          desglosadorBloqueDepthPsGranted: depthPs,
          destinoCierre: destino,
        });
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        let cyclePs = 0;
        try {
          recordDesglosadorCycleHistory(
            {
              titulo: vehicle.titulo,
              subVehiculos: patch.subVehiculos,
              aperturaAt: vehicle.aperturaAt,
              cierreAt: patch.cierreAt,
            },
            userId
          );
          const settled = await awardConquistaCyclePs(
            vehicleId,
            vehicle.titulo,
            patch.subVehiculos,
            safeAwardPS
          );
          cyclePs = settled.cyclePs;
          noteHuecoAfterClose(vehiclesRef.current);
          tryPremiarCierreConsciente({
            id: vehicle.id,
            titulo: vehicle.titulo,
            status: patch.status,
            cierreAt: patch.cierreAt,
          });
          const hubNote = feedsProyectoHub(destino)
            ? " · peldaño al Hub"
            : " · presencia";
          toast.success(
            cyclePs > 0
              ? `Ciclo cerrado · +${cyclePs} PS · profundidad ${depthPs} PS${hubNote}`
              : depthPs > 0
                ? `Ciclo cerrado · profundidad ${depthPs} PS${hubNote}`
                : `Ciclo cerrado${hubNote}`,
            {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${feedsProyectoHub(destino) ? GOLD : EMERALD}`,
                color: feedsProyectoHub(destino) ? GOLD : EMERALD,
              },
              duration: 2800,
            }
          );
        } catch (e) {
          console.error("[jornada4.closeConquistaCycle] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status: patch.status,
                cierreAt: patch.cierreAt,
                duracionFinal: wallMin || undefined,
                subVehiculos: patch.subVehiculos,
                desglosadorBloqueDepthPsGranted: depthPs,
                destinoCierre: destino,
                proyectoId: vehicle.proyectoId,
              },
              { skipLocalSync: true }
            );
            const closed: Vehicle = {
              ...vehicle,
              status: patch.status,
              cierreAt: patch.cierreAt,
              duracionFinal: wallMin || vehicle.duracionFinal,
              subVehiculos: patch.subVehiculos,
              desglosadorBloqueDepthPsGranted: depthPs,
              destinoCierre: destino,
            };
            const duracionMin = wallMin;
            registrarCierreConcienciaTriada(userId, {
              vehicleId: closed.id,
              minutos: resolveDuracionMinCierre(closed, duracionMin),
              destino,
              at: patch.cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: "tiempo",
              psGanados: cyclePs + depthPs,
              subs: patch.subVehiculos,
              duracionMin,
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeConquistaCycle] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS, tryPremiarCierreConsciente]
  );

  const closeSituacionRow = useCallback(
    async (vehicleId: string, subTareaId: string, status: "cumplido" | "fallado" | "avance") => {
      if (!userId) return;
      const key = `s:${vehicleId}:${subTareaId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        if (status === "avance" && isRingModoEntrenamiento(vehicle)) {
          toast.info(ENTRENAMIENTO_COPY.avanceBloqueado, {
            style: { backgroundColor: PIZARRA, border: `1px solid ${AMBER}`, color: AMBER },
            duration: 2800,
          });
          return;
        }
        const patch = applySituacionRowClose(vehicle, subTareaId, status);
        if (!patch) return;

        paintVehicle(vehicleId, {
          subTareas: patch.subTareas,
          situacionCupoAnchor: patch.situacionCupoAnchor,
          situacionCronometro: patch.situacionCronometro,
        });
        flushLaunchPersistOnSubClose(vehicleId);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        const closedForCredit = patch.subTareas.find(s => s.id === subTareaId);
        if (closedForCredit) {
          try {
            acreditarMinutosSituacionEnProyecto(userId, {
              vehicle: {
                ...vehicle,
                destinoCierre: destinoCierreVivo(userId, vehicle),
              },
              sub: closedForCredit,
              fuente: "ring-click",
            });
          } catch (creditErr) {
            console.error("[jornada4.closeSituacionRow] minutos proyecto", creditErr);
          }
        }

        let subsForRemote = patch.subTareas;
        try {
          if (status === "cumplido") {
            const awarded = await awardSituacionFilaPs(
              patch.closedSubTexto,
              safeAwardPS,
              subTareaId
            );
            toast.success(
              awarded > 0
                ? patch.minutosGanados > 0
                  ? `+${awarded} PS · +${patch.minutosGanados} min ganados`
                  : `+${awarded} PS · fila`
                : patch.minutosGanados > 0
                  ? `+${patch.minutosGanados} min ganados → cola`
                  : "Fila cumplida",
              {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${EMERALD}`,
                  color: EMERALD,
                },
                duration: 2200,
              }
            );
          } else if (status === "avance") {
            const awarded = await awardSituacionFilaAvancePs(
              patch.closedSubTexto,
              safeAwardPS,
              subTareaId
            );
            toast.success(
              awarded > 0
                ? `+${awarded} PS · avance (retomar)`
                : "Avance registrado · retomar",
              {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${AMBER}`,
                  color: AMBER,
                },
                duration: 2200,
              }
            );
          } else {
            toast.info(
              patch.minutosPerdidos > 0
                ? `Fallado · −${patch.minutosPerdidos} min`
                : "Fila fallada",
              { duration: 2000 }
            );
          }
          if (patch.bloqueListo) {
            toast.message("Ring listo — cierra el bloque", { duration: 3200 });
          }
        } catch (e) {
          console.error("[jornada4.closeSituacionRow] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            const closedSub = patch.subTareas.find(s => s.id === subTareaId);
            if (closedSub) {
              try {
                const hub = await syncRingDecisionToProyectoHub(
                  userId,
                  { ...vehicle, destinoCierre: destinoCierreVivo(userId, vehicle) },
                  closedSub,
                  status,
                  Date.now()
                );
                if (hub.pasoNumero != null && closedSub.pasoEjecutadoNumero == null) {
                  subsForRemote = patch.subTareas.map(s =>
                    s.id === subTareaId
                      ? { ...s, pasoEjecutadoNumero: hub.pasoNumero! }
                      : s
                  );
                  paintVehicle(vehicleId, { subTareas: subsForRemote });
                }
              } catch (hubErr) {
                console.error("[jornada4.closeSituacionRow] hub", hubErr);
              }
            }
            await updateVehicle(
              userId,
              vehicleId,
              {
                subTareas: subsForRemote,
                situacionCupoAnchor: patch.situacionCupoAnchor,
                situacionCronometro: patch.situacionCronometro,
              },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.closeSituacionRow] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  const closeSituacionBlock = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `sb:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const destino = destinoCierreVivo(userId, vehicle);
        if (feedsProyectoHub(destino) && !vehicle.proyectoId) {
          toast.error("No puedes llegar a Dirección: elige un proyecto con oleada y foco", {
            description: "Presencia cubre el día sin ensuciar el proyecto.",
            style: { backgroundColor: PIZARRA, border: `1px solid ${GOLD}`, color: GOLD },
            duration: 2800,
          });
          return;
        }
        const patch = applySituacionBlockClose(vehicle);
        if (!patch) {
          toast.error("Aún hay filas pendientes en el ring", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }

        const wallMin = resolveDuracionMinCierre(
          vehicle,
          Math.max(0, (patch.cierreAt - (vehicle.aperturaAt ?? patch.cierreAt)) / 60_000)
        );
        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          duracionFinal: wallMin || undefined,
          subTareas: patch.subTareas,
          situacionCronometro: patch.situacionCronometro,
          situacionCupoAnchor: patch.situacionCupoAnchor,
          destinoCierre: destino,
        });
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        let awarded = 0;
        try {
          awarded = await awardSituacionBlockPs(
            vehicle.titulo,
            patch.status,
            safeAwardPS
          );
          noteHuecoAfterClose(vehiclesRef.current);
          tryPremiarCierreConsciente({
            id: vehicle.id,
            titulo: vehicle.titulo,
            status: patch.status,
            cierreAt: patch.cierreAt,
          });
          const hubNote = feedsProyectoHub(destino)
            ? " · peldaño al Hub"
            : " · presencia";
          toast.success(
            awarded > 0
              ? `Ring cerrado · +${awarded} PS${hubNote}`
              : `Ring cerrado${hubNote}`,
            {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${feedsProyectoHub(destino) ? GOLD : EMERALD}`,
                color: feedsProyectoHub(destino) ? GOLD : EMERALD,
              },
              duration: 2800,
            }
          );
        } catch (e) {
          console.error("[jornada4.closeSituacionBlock] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status: patch.status,
                cierreAt: patch.cierreAt,
                duracionFinal: wallMin || undefined,
                subTareas: patch.subTareas,
                situacionCronometro: patch.situacionCronometro,
                situacionCupoAnchor: patch.situacionCupoAnchor,
                destinoCierre: destino,
                proyectoId: vehicle.proyectoId,
              },
              { skipLocalSync: true }
            );
            const closed: Vehicle = {
              ...vehicle,
              status: patch.status,
              cierreAt: patch.cierreAt,
              duracionFinal: wallMin || vehicle.duracionFinal,
              subTareas: patch.subTareas,
              situacionCronometro: patch.situacionCronometro,
              situacionCupoAnchor: patch.situacionCupoAnchor,
              destinoCierre: destino,
            };
            const apertura = vehicle.aperturaAt ?? patch.cierreAt;
            const wallMin = Math.max(0, (patch.cierreAt - apertura) / 60_000);
            registrarCierreConcienciaTriada(userId, {
              vehicleId: vehicle.id,
              minutos: resolveDuracionMinCierre(vehicle, wallMin),
              destino,
              at: patch.cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: "situacion",
              psGanados: awarded,
              duracionMin: wallMin,
              subTareas: patch.subTareas,
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeSituacionBlock] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS, tryPremiarCierreConsciente]
  );

  const addConquistaSub = useCallback(
    async (vehicleId: string, form: SharedSubForm) => {
      if (!userId) return;
      const key = `add:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.status !== "activo") return;
        const existing = vehicle.subVehiculos ?? [];
        const hasActive = existing.some(s => s.status === "activo");
        const newSub = buildDesglosadorSubFromRuntime(form, existing, {
          activate: !hasActive,
        });
        const nextSubs = [...existing, newSub];
        paintVehicle(vehicleId, { subVehiculos: nextSubs });
        await yieldAfterPaint();
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(
              userId,
              vehicleId,
              { subVehiculos: nextSubs },
              { skipLocalSync: true }
            );
            toast.message(
              newSub.status === "activo"
                ? "Unidad activa"
                : "Unidad añadida a la cola",
              { duration: 1800 }
            );
          } catch (e) {
            console.error("[jornada4.addConquistaSub]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const addSituacionFila = useCallback(
    async (vehicleId: string, texto: string) => {
      if (!userId) return;
      const key = `sellar:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isSituacionDesglosador(vehicle)) return;
        const result = buildSellarDirectoEnRingState(vehicle, texto);
        if (!result.ok) {
          toast.error(
            result.reason === "empty_text"
              ? "Escribe el texto de la fila"
              : "No se pudo sellar en el ring",
            {
              style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
            }
          );
          return;
        }
        paintVehicle(vehicleId, {
          subTareas: result.subTareas,
          situacionCronometro: result.situacionCronometro,
          situacionCupoAnchor: result.situacionCupoAnchor,
        });
        await yieldAfterPaint();
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                subTareas: result.subTareas,
                situacionCronometro: result.situacionCronometro,
                situacionCupoAnchor: result.situacionCupoAnchor,
              },
              { skipLocalSync: true }
            );
            toast.message("Sellado en ring · tiempo redistribuido", { duration: 1800 });
          } catch (e) {
            console.error("[jornada4.addSituacionFila]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const closeRapidoVehicle = useCallback(
    async (
      vehicleId: string,
      status: "cumplido" | "archivado",
      cantidad?: number
    ) => {
      if (!userId) return;
      const key = `r:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isConquistaRapido(vehicle)) return;
        const cierreAt = Date.now();
        const apertura = vehicle.aperturaAt ?? cierreAt;
        const durMin = Math.max(0, (cierreAt - apertura) / 60_000);
        const patch: Partial<Vehicle> = {
          status,
          cierreAt,
          ...(durMin > 0 ? { duracionFinal: durMin } : {}),
        };
        if (cantidad != null && Number.isFinite(cantidad) && cantidad > 0) {
          patch.resultadoPorUnidad = cantidad;
          if (durMin > 0) patch.mejorTiempoPorUnidad = durMin / cantidad;
        }
        paintVehicle(vehicleId, patch);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        try {
          const amount = vehicleMissionClosePS(status, vehicle.tipoTerminoRapido ?? "hora");
          if (amount > 0) {
            await safeAwardPS(amount, `J4 rápido · ${status} · ${vehicle.titulo}`);
          }
          noteHuecoAfterClose(vehiclesRef.current);
          tryPremiarCierreConsciente({
            id: vehicle.id,
            titulo: vehicle.titulo,
            status,
            cierreAt,
          });
          toast.success(
            amount > 0
              ? `Cerrado · +${amount} PS`
              : status === "cumplido"
                ? "Misión cumplida"
                : "Misión archivada",
            {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${EMERALD}`,
                color: EMERALD,
              },
              duration: 2400,
            }
          );
        } catch (e) {
          console.error("[jornada4.closeRapidoVehicle] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(userId, vehicleId, patch, { skipLocalSync: true });
            const destino = destinoCierreVivo(userId, vehicle);
            const closed: Vehicle = {
              ...vehicle,
              ...patch,
              destinoCierre: destino,
            };
            registrarCierreConcienciaTriada(userId, {
              vehicleId: vehicle.id,
              minutos: resolveDuracionMinCierre(vehicle, durMin),
              destino,
              at: cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: "tiempo",
              psGanados: 0,
              duracionMin: durMin,
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeRapidoVehicle] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS, tryPremiarCierreConsciente]
  );

  const closeSituacionLibreFila = useCallback(
    async (vehicleId: string, subTareaId: string, status: "cumplido" | "fallado" | "avance") => {
      if (!userId) return;
      const key = `sl:${vehicleId}:${subTareaId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isSituacionListaLibre(vehicle) || !vehicle.subTareas) return;
        const subTareas = vehicle.subTareas.map(st =>
          st.id === subTareaId
            ? {
                ...st,
                completada: status === "cumplido",
                resultadoSituacion: status,
              }
            : st
        );
        paintVehicle(vehicleId, { subTareas });
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        try {
          if (status === "cumplido") {
            const awarded = await awardSituacionFilaPs(
              subTareas.find(s => s.id === subTareaId)?.texto ?? "fila",
              safeAwardPS,
              subTareaId
            );
            toast.success(awarded > 0 ? `+${awarded} PS · fila` : "Fila cumplida", {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${EMERALD}`,
                color: EMERALD,
              },
              duration: 2000,
            });
          } else if (status === "avance") {
            const awarded = await awardSituacionFilaAvancePs(
              subTareas.find(s => s.id === subTareaId)?.texto ?? "fila",
              safeAwardPS,
              subTareaId
            );
            toast.success(awarded > 0 ? `+${awarded} PS · avance` : "Avance registrado", {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${AMBER}`,
                color: AMBER,
              },
              duration: 2000,
            });
          }
        } catch (e) {
          console.error("[jornada4.closeSituacionLibreFila] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(userId, vehicleId, { subTareas }, { skipLocalSync: true });
          } catch (e) {
            console.error("[jornada4.closeSituacionLibreFila] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  const closeSituacionLibreBloque = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `slb:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isSituacionListaLibre(vehicle)) return;
        // Lista libre: sella pared al cerrar (presencia). No reclama Norte.
        const destino: DestinoCierre = "presencia";
        const cierreAt = Date.now();
        const apertura = vehicle.aperturaAt ?? cierreAt;
        const wallMin = Math.max(0, (cierreAt - apertura) / 60_000);
        const anyOk = (vehicle.subTareas ?? []).some(
          s =>
            s.resultadoSituacion === "cumplido" ||
            (s.completada && s.resultadoSituacion !== "fallado")
        );
        const status = anyOk ? ("cumplido" as const) : ("archivado" as const);
        paintVehicle(vehicleId, {
          status,
          cierreAt,
          destinoCierre: destino,
          ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
        });
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        let awarded = 0;
        try {
          noteHuecoAfterClose(vehiclesRef.current);
          tryPremiarCierreConsciente({
            id: vehicle.id,
            titulo: vehicle.titulo,
            status,
            cierreAt,
          });
          awarded = await awardSituacionBlockPs(
            vehicle.titulo,
            status,
            safeAwardPS
          );
          toast.success(
            awarded > 0
              ? `Lista cerrada · +${awarded} PS · presencia`
              : "Lista cerrada · presencia",
            {
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${EMERALD}`,
                color: EMERALD,
              },
              duration: 2400,
            }
          );
        } catch (e) {
          console.error("[jornada4.closeSituacionLibreBloque] PS", e);
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status,
                cierreAt,
                destinoCierre: destino,
                proyectoId: vehicle.proyectoId,
                ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
              },
              { skipLocalSync: true }
            );
            const closed: Vehicle = {
              ...vehicle,
              status,
              cierreAt,
              destinoCierre: destino,
              ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
            };
            registrarCierreConcienciaTriada(userId, {
              vehicleId: vehicle.id,
              minutos: resolveDuracionMinCierre(vehicle, wallMin),
              destino,
              at: cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: "situacion",
              psGanados: awarded,
              duracionMin: wallMin,
              subTareas: vehicle.subTareas ?? [],
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeSituacionLibreBloque] remote", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS, tryPremiarCierreConsciente]
  );

  const addSituacionLibreFila = useCallback(
    async (vehicleId: string, texto: string) => {
      if (!userId) return;
      const trimmed = texto.trim();
      if (!trimmed) return;
      const key = `sla:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isSituacionListaLibre(vehicle)) return;
        const now = Date.now();
        const row: SubTarea = {
          id: `st_j4_libre_${now}`,
          texto: trimmed,
          completada: false,
          creadaAt: now,
          enDesgloseCronometro: false,
          resultadoSituacion: "pendiente",
        };
        const subTareas = [...(vehicle.subTareas ?? []), row];
        paintVehicle(vehicleId, { subTareas });
        await yieldAfterPaint();
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, { subTareas }, { skipLocalSync: true });
          } catch (e) {
            console.error("[jornada4.addSituacionLibreFila]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const setSituacionCupo = useCallback(
    async (vehicleId: string, subTareaId: string, minutos: number | undefined) => {
      if (!userId) return;
      const key = `cupo:${vehicleId}:${subTareaId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || !isSituacionDesglosador(vehicle) || !vehicle.subTareas) return;
        const sc = vehicle.situacionCronometro;
        if (sc?.activo !== true) return;
        const now = Date.now();
        const bloqueInicio = sc.bloqueInicioAt ?? vehicle.aperturaAt ?? now;
        const budget =
          remainingCronometroBudgetMin(sc, vehicle.subTareas, now) ??
          totalBudgetMinFromCronometro(
            vehicle.subTareas,
            bloqueInicio,
            sc.horaFinContratoMs ?? sc.horaFinMs
          );
        const subTareas = applyCupoManualYRedistribuir(
          vehicle.subTareas,
          subTareaId,
          minutos,
          budget
        );
        const resolved = resolveCronometroCupoAnchor(subTareas, vehicle.situacionCupoAnchor, {
          now,
        });
        const situacionCupoAnchor =
          resolved === "unchanged" ? vehicle.situacionCupoAnchor ?? null : resolved;

        paintVehicle(vehicleId, { subTareas, situacionCupoAnchor });
        await yieldAfterPaint();
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(
              userId,
              vehicleId,
              { subTareas, situacionCupoAnchor },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.setSituacionCupo]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const reorderConquistaSubs = useCallback(
    (vehicleId: string, movedId: string, direction: ReorderDirection) => {
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle?.subVehiculos || !isConquistaDesglosador(vehicle)) return;
      if (vehicle.interrupcionActiva) {
        toast.info("Desglosador en pausa", {
          description: "Cierra la interrupción o reanúdalo antes de reordenar.",
          duration: 3200,
        });
        return;
      }
      const next = reorderSubVehiculos(vehicle.subVehiculos, movedId, direction);
      if (!next) return;
      paintVehicle(vehicleId, { subVehiculos: next });
      scheduleSaveLocalVehicles(vehiclesRef.current);
      const nextTitulo = firstPendingSubVehiculoTitulo(next);
      toast.info("Orden actualizado", {
        description: nextTitulo
          ? `Próximo tras el activo: ${nextTitulo}`
          : "Cola de unidades reordenada",
        style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
        duration: 2200,
      });
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            vehicleId,
            { subVehiculos: next },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[jornada4.reorderConquistaSubs]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const reorderSituacionFilas = useCallback(
    (vehicleId: string, movedId: string, direction: ReorderDirection) => {
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle?.subTareas || !isSituacionRing(vehicle)) return;
      const next = reorderSubTareasCronometro(vehicle.subTareas, movedId, direction);
      if (!next) return;
      paintVehicle(vehicleId, { subTareas: next });
      scheduleSaveLocalVehicles(vehiclesRef.current);
      const nextTexto = firstPendingCronometroTexto(next);
      toast.info("Orden actualizado", {
        description: nextTexto ? `Sigue: ${nextTexto}` : "Cola del ring reordenada",
        style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
        duration: 2200,
      });
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            vehicleId,
            { subTareas: next },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[jornada4.reorderSituacionFilas]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  /** Sustituye la fila en foco (solo modo entrenamiento). Paint ms0 + sombra. */
  const sustituirSituacionFoco = useCallback(
    (vehicleId: string, newFocusId: string) => {
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;
      const patch = applySituacionSustituirFoco(vehicle, newFocusId);
      if (!patch) return;
      paintVehicle(vehicleId, {
        subTareas: patch.subTareas,
        situacionCupoAnchor: patch.situacionCupoAnchor,
      });
      scheduleSaveLocalVehicles(vehiclesRef.current);
      toast.info(ENTRENAMIENTO_COPY.sustituirFoco, {
        description: `Ahora: ${patch.nuevoFocoTexto}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
        duration: 2200,
      });
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            vehicleId,
            {
              subTareas: patch.subTareas,
              situacionCupoAnchor: patch.situacionCupoAnchor,
            },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[jornada4.sustituirSituacionFoco]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  /** Auto-fallado por distracción (pestaña oculta). Reusa paint ms0 del ring. */
  const failSituacionDistraccion = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `dist:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const patch = applySituacionDistraccionFail(vehicle);
        if (!patch) return;

        paintVehicle(vehicleId, {
          subTareas: patch.subTareas,
          situacionCupoAnchor: patch.situacionCupoAnchor,
          situacionCronometro: patch.situacionCronometro,
        });
        flushLaunchPersistOnSubClose(vehicleId);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);

        toast.error(ENTRENAMIENTO_COPY.perdidaDistraccion, {
          description:
            patch.minutosPerdidos > 0
              ? `${patch.closedSubTexto} · −${patch.minutosPerdidos} min`
              : patch.closedSubTexto,
          duration: 3200,
          style: {
            backgroundColor: PIZARRA,
            border: `1px solid ${BLOOD}`,
            color: BLOOD,
          },
        });
        if (patch.bloqueListo) {
          toast.message("Ring listo — cierra el bloque", { duration: 3200 });
        }

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                subTareas: patch.subTareas,
                situacionCupoAnchor: patch.situacionCupoAnchor,
                situacionCronometro: patch.situacionCronometro,
              },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.failSituacionDistraccion]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  /** Archiva desglosador anclado que cruzó su segmento (sin cascada de celebración). */
  const archiveAncladoPorSegmento = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const key = `anc:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.status !== "activo") return;
        if (vehicle.ancladoAlSegmento !== true) return;

        const cierreAt = Date.now();
        const aperturaAt = vehicle.aperturaAt || vehicle.createdAt?.getTime() || cierreAt;
        const duracionFinal = Math.max(1, Math.round((cierreAt - aperturaAt) / 60000));
        const patch = {
          status: "archivado" as const,
          cierreAt,
          duracionFinal,
          cierreManual: false,
          interrupcionActiva: false,
          desglosadorPausa: undefined,
        };

        notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
        paintVehicle(vehicleId, patch);
        await yieldAfterPaint();
        scheduleSaveLocalVehicles(vehiclesRef.current);
        noteHuecoAfterClose(vehiclesRef.current);

        toast.error(ENTRENAMIENTO_COPY.cierreAnclado, {
          description: `${vehicle.titulo} · no puede pasar su segmento`,
          duration: 4500,
          style: {
            backgroundColor: PIZARRA,
            border: `1px solid ${BLOOD}`,
            color: BLOOD,
          },
        });

        void runShadowTaskAsync(async () => {
          try {
            await updateVehicle(userId, vehicleId, patch, { skipLocalSync: true });
          } catch (e) {
            console.error("[jornada4.archiveAncladoPorSegmento]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const pausaInterrupcion = useCallback(
    async (vehicleId: string, tituloInterrupcion: string) => {
      if (!userId || !tituloInterrupcion.trim()) return;
      const key = `pause:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle || !isConquistaDesglosador(vehicle) || vehicle.interrupcionActiva) return;

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

      const nestedPause = buildDesglosadorNestedPausePatch(vehicle, "interrupcion_situacion");
      if (!nestedPause) {
        toast.error("No hay unidad activa para pausar");
        return;
      }

      inFlightRef.current.add(key);
      try {
        const activeSub = (vehicle.subVehiculos || []).find(s => s.status === "activo");
        let restanteUnidades: number | undefined;
        if (activeSub?.aperturaAt && activeSub.cantidadObjetivo && activeSub.tiempoRecordMinPerUnit) {
          const elapsedSec = Math.floor((Date.now() - activeSub.aperturaAt) / 1000);
          const done = Math.floor(elapsedSec / 60 / activeSub.tiempoRecordMinPerUnit);
          restanteUnidades = Math.max(0, activeSub.cantidadObjetivo - done);
        }
        const pausedPatch = {
          ...nestedPause,
          desglosadorPausa: {
            ...nestedPause.desglosadorPausa,
            restanteUnidades,
          },
        };

        void closeCentinelasBeforeConsciousLaunch(userId, vehiclesRef.current);

        const provisionalInterruptId = generateStableUuid();
        const clientRequestId = `crq_${generateStableUuid()}`;
        const interruptVehicle: Vehicle = {
          id: provisionalInterruptId,
          titulo: tituloInterrupcion.trim(),
          criterioFin: "circunstancia",
          criterioDetalle: "Interrupción",
          tiempoInicio: new Date(),
          createdAt: new Date(),
          userId,
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
        vehiclesRef.current = optimisticList;
        setVehicles(optimisticList);
        scheduleSaveLocalVehicles(optimisticList);
        burstJornada4Tick();

        toast.success("Interrupción lanzada", {
          description: "Cierra la situación arriba (Cumplido o Incumplido) para reanudar.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${CYAN}`, color: CYAN },
          duration: 4200,
        });

        try {
          void updateVehicle(userId, vehicleId, pausedPatch, { skipLocalSync: true }).catch(e =>
            console.warn("[jornada4.pausa] parent", e)
          );
          const { id: realId } = await addVehicle(
            userId,
            {
              titulo: tituloInterrupcion.trim(),
              criterioFin: "circunstancia",
              criterioDetalle: "Interrupción",
              tiempoInicio: new Date(),
              ejes: STUB_EJES,
              tipoTerminoRapido: "situacion",
              tipoFlota: "situacion",
              aperturaAt: Date.now(),
              excluirDeHistorial: true,
              vehiculoPadreDesglosadorId: vehicleId,
            },
            { provisionalId: provisionalInterruptId, clientRequestId }
          );
          if (realId !== provisionalInterruptId) {
            const synced = vehiclesRef.current.map(v =>
              v.id === provisionalInterruptId ? { ...v, id: realId } : v
            );
            vehiclesRef.current = synced;
            setVehicles(synced);
          }
        } catch {
          const rolledBack = vehiclesRef.current
            .filter(v => v.id !== provisionalInterruptId)
            .map(v =>
              v.id === vehicleId
                ? { ...v, desglosadorPausa: undefined, interrupcionActiva: false }
                : v
            );
          vehiclesRef.current = rolledBack;
          setVehicles(rolledBack);
          scheduleSaveLocalVehicles(rolledBack);
          toast.error("No se pudo lanzar la interrupción", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
        }
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, setVehicles]
  );

  const resumeDesglosador = useCallback(
    async (parentId: string) => {
      if (!userId) return;
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
        patch = nestedResume ?? { desglosadorPausa: undefined, interrupcionActiva: false };
      } else {
        patch = { desglosadorPausa: undefined, interrupcionActiva: false };
      }

      paintVehicle(parentId, patch);
      scheduleSaveLocalVehicles(vehiclesRef.current);
      toast.info("Desglosador reanudado", {
        description: "Tiempo recuperado tras la interrupción.",
        style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
        duration: 3200,
      });
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(userId, parentId, patch, { skipLocalSync: true });
        } catch (e) {
          console.error("[jornada4.resumeDesglosador]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  /** Postergar fila en foco → final de cola con minutos restantes (no congela el ring). */
  const postergarFilaEnFoco = useCallback(
    (vehicleId: string) => {
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;
      const patch = postergarFilaEnFocoACola(vehicle);
      if (!patch) {
        toast.info("Necesitas al menos 2 filas pendientes", {
          description: "Postergar manda la fila en foco al final de la cola.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${AMBER}`, color: AMBER },
          duration: 3200,
        });
        return;
      }
      paintVehicle(vehicleId, {
        subTareas: patch.subTareas,
        situacionCupoAnchor: patch.situacionCupoAnchor,
      });
      scheduleSaveLocalVehicles(vehiclesRef.current);
      toast.success("Fila postergada a la cola", {
        description: `«${patch.filaPostergadaTexto}» · ${patch.minutosConservados} min → ahora: ${patch.nuevoFocoTexto}`,
        style: { backgroundColor: PIZARRA, border: `1px solid ${AMBER}`, color: AMBER },
        duration: 3800,
      });
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            vehicleId,
            {
              subTareas: patch.subTareas,
              situacionCupoAnchor: patch.situacionCupoAnchor,
            },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[jornada4.postergarFilaEnFoco]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const quitarSituacionFila = useCallback(
    (vehicleId: string, subTareaId: string) => {
      const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
      if (!vehicle) return;
      const patch = applySituacionQuitarFila(vehicle, subTareaId);
      if (!patch) {
        toast.info("Quitar solo recorta la cola", {
          description: "El foco se cierra con Cumplido, Avance o Fallado.",
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 2800,
        });
        return;
      }
      paintVehicle(vehicleId, {
        subTareas: patch.subTareas,
        situacionCupoAnchor: patch.situacionCupoAnchor,
      });
      scheduleSaveLocalVehicles(vehiclesRef.current);
      toast.success(
        patch.minutosAlFoco > 0
          ? `Plan recortado · +${patch.minutosAlFoco} min al foco`
          : "Plan recortado",
        {
          description: `«${patch.quitadaTexto}» fuera · ahora: ${patch.focoTexto}`,
          style: { backgroundColor: PIZARRA, border: `1px solid ${PLATA}`, color: PLATA },
          duration: 3200,
        }
      );
      if (!userId) return;
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(
            userId,
            vehicleId,
            {
              subTareas: patch.subTareas,
              situacionCupoAnchor: patch.situacionCupoAnchor,
            },
            { skipLocalSync: true }
          );
        } catch (e) {
          console.error("[jornada4.quitarSituacionFila]", e);
        }
      });
    },
    [userId, vehiclesRef, paintVehicle]
  );

  const closeExpressVehicle = useCallback(
    async (vehicleId: string, status: "cumplido" | "archivado") => {
      if (!userId) return;
      const key = `ex:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.status !== "activo") return;
        const cierreAt = Date.now();
        const parentId = vehicle.vehiculoPadreDesglosadorId;
        const apertura = vehicle.aperturaAt ?? cierreAt;
        const wallMin = Math.max(0, (cierreAt - apertura) / 60_000);
        const destino = destinoCierreVivo(userId, vehicle);

        paintVehicle(vehicleId, {
          status,
          cierreAt,
          destinoCierre: destino,
          ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
        });
        notifyVehicleClosed(vehicleId, vehicle.clientRequestId);
        await yieldAfterPaint();
        tryPremiarCierreConsciente({
          id: vehicle.id,
          titulo: vehicle.titulo,
          status,
          cierreAt,
        });

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            const amount = vehicleMissionClosePS(status, vehicle.tipoTerminoRapido ?? "situacion");
            if (amount > 0) {
              const ok = await safeAwardPS(
                amount,
                status === "cumplido"
                  ? `Situación: ${vehicle.titulo}`
                  : `Archivado: ${vehicle.titulo}`
              );
              toast.success(
                ok
                  ? status === "cumplido"
                    ? `+${amount} PS · Cumplido`
                    : `Archivado · +${amount} PS`
                  : status === "cumplido"
                    ? "Cumplido"
                    : "Archivado",
                {
                  style: {
                    backgroundColor: PIZARRA,
                    border: `1px solid ${status === "cumplido" ? EMERALD : PLATA}`,
                    color: status === "cumplido" ? EMERALD : PLATA,
                  },
                  duration: 2400,
                }
              );
            } else {
              toast.info(status === "cumplido" ? "Cumplido" : "Archivado", { duration: 1800 });
            }
          } catch (e) {
            console.error("[jornada4.closeExpressVehicle] PS", e);
          }
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status,
                cierreAt,
                destinoCierre: destino,
                ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
              },
              { skipLocalSync: true }
            );
            const closed: Vehicle = {
              ...vehicle,
              status,
              cierreAt,
              destinoCierre: destino,
              ...(wallMin > 0 ? { duracionFinal: wallMin } : {}),
            };
            registrarCierreConcienciaTriada(userId, {
              vehicleId: vehicle.id,
              minutos: resolveDuracionMinCierre(vehicle, wallMin),
              destino,
              at: cierreAt,
            });
            await recordProgresoHubAlCerrarVehiculo(userId, closed, {
              tipoOrigen: "situacion",
              psGanados: 0,
              duracionMin: wallMin,
              destinoCierre: destino,
            });
          } catch (e) {
            console.error("[jornada4.closeExpressVehicle] remote", e);
          }

          if (parentId) {
            const parent = vehiclesRef.current.find(v => v.id === parentId);
            if (parent && (parent.desglosadorPausa || parent.interrupcionActiva)) {
              const resume =
                resumeDesglosadorFromNestedPause(parent) ?? {
                  desglosadorPausa: undefined,
                  interrupcionActiva: false,
                };
              paintVehicle(parentId, resume);
              scheduleSaveLocalVehicles(vehiclesRef.current);
              toast.info("Desglosador reanudado", {
                description: "Tras cerrar la interrupción.",
                style: { backgroundColor: PIZARRA, border: `1px solid ${VIOLET}`, color: VIOLET },
                duration: 2800,
              });
              try {
                await updateVehicle(userId, parentId, resume, { skipLocalSync: true });
              } catch (e) {
                console.error("[jornada4.closeExpressVehicle] resume parent", e);
              }
            }
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS, tryPremiarCierreConsciente]
  );

  return {
    closeConquistaSub,
    closeConquistaCycle,
    closeSituacionRow,
    closeSituacionBlock,
    closeRapidoVehicle,
    closeSituacionLibreFila,
    closeSituacionLibreBloque,
    addSituacionLibreFila,
    addConquistaSub,
    addSituacionFila,
    setSituacionCupo,
    setDestinoCierre,
    reorderConquistaSubs,
    reorderSituacionFilas,
    sustituirSituacionFoco,
    failSituacionDistraccion,
    archiveAncladoPorSegmento,
    pausaInterrupcion,
    resumeDesglosador,
    postergarFilaEnFoco,
    quitarSituacionFila,
    closeExpressVehicle,
    sweepPlanEnd,
  };
}
