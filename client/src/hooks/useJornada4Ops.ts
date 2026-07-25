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
import { isSituacionDesglosador } from "@/jornada4/filters";

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

        paintVehicle(vehicleId, { subVehiculos: patch.subVehiculos });
        flushLaunchPersistOnSubClose(vehicleId);
        await yieldAfterPaint();

        // PS primero (local); Firebase no debe bloquear la barra del día.
        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          let subsForRemote = patch.subVehiculos;
          try {
            if (status === "cumplido") {
              recordDesglosadorSubHistory(vehicle.titulo, patch.closedSub, userId);
              const awarded = await awardConquistaSubPs(
                vehicle.titulo,
                patch.closedSub,
                safeAwardPS
              );
              if (awarded > 0) {
                subsForRemote = patch.subVehiculos.map(s =>
                  s.id === patch.closedSub.id ? { ...s, psOtorgados: awarded } : s
                );
                paintVehicle(vehicleId, { subVehiculos: subsForRemote });
                scheduleSaveLocalVehicles(vehiclesRef.current);
                toast.success(`+${awarded} PS · unidad`, {
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
          try {
            await updateVehicle(
              userId,
              vehicleId,
              { subVehiculos: subsForRemote },
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

        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          subVehiculos: patch.subVehiculos,
        });
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
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
            toast.success(
              cyclePs > 0
                ? `Ciclo cerrado · +${cyclePs} PS`
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
            console.error("[jornada4.closeConquistaCycle] PS", e);
          }
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status: patch.status,
                cierreAt: patch.cierreAt,
                subVehiculos: patch.subVehiculos,
              },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.closeConquistaCycle] remote", e);
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
            const awarded = await awardSituacionBlockPs(
              vehicle.titulo,
              patch.status,
              safeAwardPS
            );
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
            console.error("[jornada4.closeSituacionBlock] PS", e);
          }
          try {
            await updateVehicle(
              userId,
              vehicleId,
              {
                status: patch.status,
                cierreAt: patch.cierreAt,
                subTareas: patch.subTareas,
                situacionCronometro: patch.situacionCronometro,
                situacionCupoAnchor: patch.situacionCupoAnchor,
              },
              { skipLocalSync: true }
            );
          } catch (e) {
            console.error("[jornada4.closeSituacionBlock] remote", e);
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
    addConquistaSub,
    addSituacionFila,
    setSituacionCupo,
  };
}
