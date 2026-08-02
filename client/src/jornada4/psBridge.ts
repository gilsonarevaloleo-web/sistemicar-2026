/**
 * PS en sombra para Dual Kernel.
 * Constantes alineadas al tronco; awards siempre fuera de ms0.
 *
 * Situacional desglose/ring: cada fila/sub = 2 PS (igual que conquista).
 * El cierre del ring/lista usa base de ciclo (2/1) — NO express situación (+5).
 * Express/rápido situación sigue en vehicleMissionClosePS(..., "situacion") → 5/2.
 */
import {
  awardDesglosadorSubPointsIfNeeded,
  settleDesglosadorCyclePoints,
} from "@/lib/desglosadorPointsAward";
import {
  DESGLOSADOR_CYCLE_CLOSE_BASE_PS,
  DESGLOSADOR_SUB_CUMPLIDO_PS,
  VEHICLE_ARCHIVADO_BASE_PS,
  vehicleMissionClosePS,
} from "@/lib/sovereigntyPointsConfig";
import type { SubVehiculo } from "@/lib/persistence";

export type AwardPsFn = (amount: number, source: string) => Promise<boolean>;

/** PS por fila situacional cumplida (= 2 PS por sub del desglosador). */
export const J4_SITUACION_FILA_PS = DESGLOSADOR_SUB_CUMPLIDO_PS;

/** PS por fila situacional con avance (iniciado pero no terminado). */
export const J4_SITUACION_AVANCE_PS = 1;

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
  award: AwardPsFn,
  subTareaId?: string
): Promise<number> {
  const idSuffix = subTareaId ? ` [${subTareaId}]` : "";
  const ok = await award(
    J4_SITUACION_FILA_PS,
    `J4 situacional · ${texto}${idSuffix}`
  );
  return ok ? J4_SITUACION_FILA_PS : 0;
}

export async function awardSituacionFilaAvancePs(
  texto: string,
  award: AwardPsFn,
  subTareaId?: string
): Promise<number> {
  const idSuffix = subTareaId ? ` [${subTareaId}]` : "";
  const ok = await award(
    J4_SITUACION_AVANCE_PS,
    `J4 avance · ${texto}${idSuffix}`
  );
  return ok ? J4_SITUACION_AVANCE_PS : 0;
}

/** Cierre ring/lista desglose: base de ciclo (2/1), no express situación (5/2). */
export async function awardSituacionBlockPs(
  vehicleTitulo: string,
  status: "cumplido" | "archivado",
  award: AwardPsFn
): Promise<number> {
  const amount =
    status === "cumplido"
      ? DESGLOSADOR_CYCLE_CLOSE_BASE_PS
      : VEHICLE_ARCHIVADO_BASE_PS;
  if (amount <= 0) return 0;
  const ok = await award(amount, `J4 cierre ring · ${vehicleTitulo}`);
  return ok ? amount : 0;
}

export { DESGLOSADOR_SUB_CUMPLIDO_PS, vehicleMissionClosePS };
