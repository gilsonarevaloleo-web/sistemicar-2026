import type { MutableRefObject } from "react";
import {
  executeFlotaLaunch,
  type ExecuteFlotaLaunchParams,
  type FlotaLaunchForm,
} from "@/lib/executeFlotaLaunch";
import { updateVehicle, type Vehicle } from "@/lib/persistence";
import { scheduleSaveLocalVehicles } from "@/lib/deferredVehicleSave";
import { runShadowTaskAsync } from "@/lib/desglosadorShadow";
import { buildSituacionRingSeed } from "./situacionLaunchSeed";
import { burstJornada4Tick } from "./jornada4Tick";

export type Jornada4LaunchForm = FlotaLaunchForm & {
  /** Filas del ring (solo situacional Dual Kernel). */
  situacionFilas?: string[];
  /** Minutos totales del bloque ring (default 30). */
  situacionMinutosBloque?: number;
};

export type ExecuteJornada4LaunchParams = Omit<ExecuteFlotaLaunchParams, "form"> & {
  form: Jornada4LaunchForm;
};

/**
 * Lanza Conquista desglosador o Situacional con ring listo.
 * Situacional: si hay filas, abre el cronómetro al instante (sin V3).
 */
export async function executeJornada4Launch(
  params: ExecuteJornada4LaunchParams
): Promise<string | null> {
  const { form, vehiclesRef, setVehicles, userId, ...rest } = params;
  const {
    situacionFilas,
    situacionMinutosBloque = 30,
    ...baseForm
  } = form;

  const id = await executeFlotaLaunch({
    ...rest,
    userId,
    vehiclesRef,
    setVehicles,
    form: baseForm,
  });
  if (!id) return null;

  if (baseForm.tipoFlota === "situacion") {
    const seed = buildSituacionRingSeed({
      filas: situacionFilas ?? [],
      minutosBloque: situacionMinutosBloque,
    });
    if (seed) {
      paintSituacionSeed(id, seed, vehiclesRef, setVehicles);
      void runShadowTaskAsync(async () => {
        try {
          await updateVehicle(userId, id, {
            subTareas: seed.subTareas,
            situacionCronometro: seed.situacionCronometro,
            situacionCupoAnchor: seed.situacionCupoAnchor,
          });
        } catch (e) {
          console.error("[executeJornada4Launch] seed situacion", e);
        }
      });
    }
  }

  return id;
}

function paintSituacionSeed(
  vehicleId: string,
  seed: NonNullable<ReturnType<typeof buildSituacionRingSeed>>,
  vehiclesRef: MutableRefObject<Vehicle[]>,
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void
): void {
  const map = (list: Vehicle[]) =>
    list.map(v =>
      v.id === vehicleId
        ? {
            ...v,
            subTareas: seed.subTareas,
            situacionCronometro: seed.situacionCronometro,
            situacionCupoAnchor: seed.situacionCupoAnchor,
          }
        : v
    );
  vehiclesRef.current = map(vehiclesRef.current);
  setVehicles(map);
  scheduleSaveLocalVehicles(vehiclesRef.current);
  burstJornada4Tick();
}
