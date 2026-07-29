/**
 * PS en sombra para Dual Kernel.
 * Constantes alineadas al tronco; awards siempre fuera de ms0.
 */
import {
  awardDesglosadorSubPointsIfNeeded,
  settleDesglosadorCyclePoints,
} from "@/lib/desglosadorPointsAward";
import {
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  vehicleMissionClosePS,
} from "@/lib/sovereigntyPointsConfig";
import type { SubVehiculo } from "@/lib/persistence";

export type AwardPsFn = (amount: number, source: string) => Promise<boolean>;

/** PS por fila situacional cumplida (misma magnitud que V3 ops). */
export const J4_SITUACION_FILA_PS = 4;

export async function awardConquistaSubPs(
  vehicleTitulo: string,
  closedSub: SubVehiculo,
  award: AwardPsFn
): Promise<number> {
  const { awarded } = await awardDesglosadorSubPointsIfNeeded(
    vehicleTitulo,
    closedSub,
    award
  );
  return awarded;
}

export async function awardConquistaCyclePs(
  vehicleId: string,
  vehicleTitulo: string,
  subs: SubVehiculo[],
  award: AwardPsFn
): Promise<{ subsPs: number; cyclePs: number }> {
  const settled = await settleDesglosadorCyclePoints(
    vehicleId,
    vehicleTitulo,
    subs,
    award
  );
  return { subsPs: settled.subsPsAwarded, cyclePs: settled.cycleClosePs };
}

export async function awardSituacionFilaPs(
  texto: string,
  award: AwardPsFn
): Promise<number> {
  const ok = await award(J4_SITUACION_FILA_PS, `J4 situacional · ${texto}`);
  return ok ? J4_SITUACION_FILA_PS : 0;
}

export async function awardSituacionBlockPs(
  vehicleTitulo: string,
  status: "cumplido" | "archivado",
  award: AwardPsFn
): Promise<number> {
  const amount = vehicleMissionClosePS(status, "situacion");
  if (amount <= 0) return 0;
  const ok = await award(amount, `J4 cierre ring · ${vehicleTitulo}`);
  return ok ? amount : 0;
}

export { DESGLOSADOR_SUB_CUMPLIDO_PS };
