/**
 * Ops Dual Kernel — gestos ms0 + PS/Firebase/disco en sombra.
 * Sin useDesglosadorManager, sin voz, sin decisiones/hub/depth.
 */
import { useCallback, useRef, type MutableRefObject } from "react";
import { toast } from "sonner";
import {
  updateVehicle,
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
} from "@/jornada4/situacionKernel";
import {
  awardConquistaSubPs,
  awardConquistaCyclePs,
  awardSituacionFilaPs,
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
import { isSituacionDesglosador, isConquistaRapido, isSituacionListaLibre } from "@/jornada4/filters";
import { reconcileCoberturaHuecos } from "@/jornada4/coberturaHuecosLog";
import { vehicleMissionClosePS } from "@/lib/sovereigntyPointsConfig";
import type { SubTarea } from "@/lib/persistence";

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

export type UseJornada4OpsParams = {
  userId: string | undefined;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  safeAwardPS: (amount: number, source: string) => Promise<boolean>;
};

export function useJornada4Ops(params: UseJornada4OpsParams) {
  const { userId, vehiclesRef, setVehicles, safeAwardPS } = params;
  const inFlightRef = useRef(new Set<string>());

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

  const closeConquistaSub = useCallback(
    async (vehicleId: string, status: "cumplido" | "fallado", cantidad?: number) => {
      if (!userId) return;
      const key = `c:${vehicleId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const active = vehicle.subVehiculos?.find(s => s.status === "activo");
        if (!active) return;

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

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              subVehiculos: patch.subVehiculos,
              desglosadorBloqueDepthPsGranted: depthPs,
            }, { skipLocalSync: true });
            if (status === "cumplido") {
              recordDesglosadorSubHistory(vehicle.titulo, patch.closedSub, userId);
              const awarded = await awardConquistaSubPs(
                vehicle.titulo,
                patch.closedSub,
                safeAwardPS
              );
              if (awarded > 0) {
                toast.success(
                  `+${awarded} PS · profundidad ${depthPs} PS`,
                  {
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
            console.error("[jornada4.closeConquistaSub]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
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
        const patch = applyConquistaCycleClose(vehicle);
        if (!patch) {
          toast.error("Aún hay unidades pendientes", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }

        const depthPs = desglosadorProfundidadGanadaPs(patch.subVehiculos);
        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          subVehiculos: patch.subVehiculos,
          desglosadorBloqueDepthPsGranted: depthPs,
        });
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              status: patch.status,
              cierreAt: patch.cierreAt,
              subVehiculos: patch.subVehiculos,
              desglosadorBloqueDepthPsGranted: depthPs,
            }, { skipLocalSync: true });
            recordDesglosadorCycleHistory(
              {
                titulo: vehicle.titulo,
                subVehiculos: patch.subVehiculos,
                aperturaAt: vehicle.aperturaAt,
                cierreAt: patch.cierreAt,
              },
              userId
            );
            const { cyclePs } = await awardConquistaCyclePs(
              vehicleId,
              vehicle.titulo,
              patch.subVehiculos,
              safeAwardPS
            );
            noteHuecoAfterClose(vehiclesRef.current);
            toast.success(
              cyclePs > 0
                ? `Ciclo cerrado · +${cyclePs} PS · profundidad ${depthPs} PS`
                : depthPs > 0
                  ? `Ciclo cerrado · profundidad ${depthPs} PS`
                  : "Ciclo cerrado",
              {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${EMERALD}`,
                  color: EMERALD,
                },
                duration: 2800,
              }
            );
          } catch (e) {
            console.error("[jornada4.closeConquistaCycle]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  const closeSituacionRow = useCallback(
    async (vehicleId: string, subTareaId: string, status: "cumplido" | "fallado") => {
      if (!userId) return;
      const key = `s:${vehicleId}:${subTareaId}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      try {
        const vehicle = vehiclesRef.current.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const patch = applySituacionRowClose(vehicle, subTareaId, status);
        if (!patch) return;

        paintVehicle(vehicleId, {
          subTareas: patch.subTareas,
          situacionCupoAnchor: patch.situacionCupoAnchor,
          situacionCronometro: patch.situacionCronometro,
        });
        flushLaunchPersistOnSubClose(vehicleId);
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              subTareas: patch.subTareas,
              situacionCupoAnchor: patch.situacionCupoAnchor,
              situacionCronometro: patch.situacionCronometro,
            }, { skipLocalSync: true });
            if (status === "cumplido") {
              const awarded = await awardSituacionFilaPs(
                patch.closedSubTexto,
                safeAwardPS
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
            console.error("[jornada4.closeSituacionRow]", e);
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
        const patch = applySituacionBlockClose(vehicle);
        if (!patch) {
          toast.error("Aún hay filas pendientes en el ring", {
            style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
          });
          return;
        }

        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          subTareas: patch.subTareas,
          situacionCronometro: patch.situacionCronometro,
          situacionCupoAnchor: patch.situacionCupoAnchor,
        });
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              status: patch.status,
              cierreAt: patch.cierreAt,
              subTareas: patch.subTareas,
              situacionCronometro: patch.situacionCronometro,
              situacionCupoAnchor: patch.situacionCupoAnchor,
            }, { skipLocalSync: true });
            const awarded = await awardSituacionBlockPs(
              vehicle.titulo,
              patch.status,
              safeAwardPS
            );
            noteHuecoAfterClose(vehiclesRef.current);
            toast.success(
              awarded > 0 ? `Ring cerrado · +${awarded} PS` : "Ring cerrado",
              {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${EMERALD}`,
                  color: EMERALD,
                },
                duration: 2800,
              }
            );
          } catch (e) {
            console.error("[jornada4.closeSituacionBlock]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
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
        const patch: Partial<Vehicle> = { status, cierreAt };
        if (cantidad != null && Number.isFinite(cantidad) && cantidad > 0) {
          patch.resultadoPorUnidad = cantidad;
          const apertura = vehicle.aperturaAt ?? cierreAt;
          const durMin = Math.max(0, (cierreAt - apertura) / 60_000);
          if (durMin > 0) {
            patch.duracionFinal = durMin;
            patch.mejorTiempoPorUnidad = durMin / cantidad;
          }
        }
        paintVehicle(vehicleId, patch);
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, patch, { skipLocalSync: true });
            const amount = vehicleMissionClosePS(status, vehicle.tipoTerminoRapido ?? "hora");
            if (amount > 0) {
              await safeAwardPS(amount, `J4 rápido · ${status} · ${vehicle.titulo}`);
            }
            noteHuecoAfterClose(vehiclesRef.current);
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
            console.error("[jornada4.closeRapidoVehicle]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  const closeSituacionLibreFila = useCallback(
    async (vehicleId: string, subTareaId: string, status: "cumplido" | "fallado") => {
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
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, { subTareas }, { skipLocalSync: true });
            if (status === "cumplido") {
              const awarded = await awardSituacionFilaPs(
                subTareas.find(s => s.id === subTareaId)?.texto ?? "fila",
                safeAwardPS
              );
              toast.success(awarded > 0 ? `+${awarded} PS · fila` : "Fila cumplida", {
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${EMERALD}`,
                  color: EMERALD,
                },
                duration: 2000,
              });
            }
          } catch (e) {
            console.error("[jornada4.closeSituacionLibreFila]", e);
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
        const cierreAt = Date.now();
        const anyOk = (vehicle.subTareas ?? []).some(
          s =>
            s.resultadoSituacion === "cumplido" ||
            (s.completada && s.resultadoSituacion !== "fallado")
        );
        const status = anyOk ? ("cumplido" as const) : ("archivado" as const);
        paintVehicle(vehicleId, { status, cierreAt });
        await yieldAfterPaint();
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(
              userId,
              vehicleId,
              { status, cierreAt },
              { skipLocalSync: true }
            );
            noteHuecoAfterClose(vehiclesRef.current);
            const awarded = await awardSituacionBlockPs(
              vehicle.titulo,
              status,
              safeAwardPS
            );
            toast.success(
              awarded > 0 ? `Lista cerrada · +${awarded} PS` : "Lista cerrada",
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
            console.error("[jornada4.closeSituacionLibreBloque]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
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
  };
}
