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

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              subVehiculos: patch.subVehiculos,
            });
            if (status === "cumplido") {
              const awarded = await awardConquistaSubPs(
                vehicle.titulo,
                patch.closedSub,
                safeAwardPS
              );
              if (awarded > 0) {
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

        paintVehicle(vehicleId, {
          status: patch.status,
          cierreAt: patch.cierreAt,
          subVehiculos: patch.subVehiculos,
        });
        await yieldAfterPaint();

        void runShadowTaskAsync(async () => {
          scheduleSaveLocalVehicles(vehiclesRef.current);
          try {
            await updateVehicle(userId, vehicleId, {
              status: patch.status,
              cierreAt: patch.cierreAt,
              subVehiculos: patch.subVehiculos,
            });
            const { cyclePs } = await awardConquistaCyclePs(
              vehicleId,
              vehicle.titulo,
              patch.subVehiculos,
              safeAwardPS
            );
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
            });
            if (status === "cumplido") {
              const awarded = await awardSituacionFilaPs(
                patch.closedSubTexto,
                safeAwardPS
              );
              toast.success(
                awarded > 0
                  ? `+${awarded} PS · fila`
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
            });
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
            console.error("[jornada4.closeSituacionBlock]", e);
          }
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [userId, vehiclesRef, paintVehicle, safeAwardPS]
  );

  return {
    closeConquistaSub,
    closeConquistaCycle,
    closeSituacionRow,
    closeSituacionBlock,
  };
}
