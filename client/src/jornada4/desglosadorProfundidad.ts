/**
 * Profundidad Dual Kernel: cada sub del desglosador vale 2 PS.
 * 1 sub → 2 PS · 10 subs → 20 PS (potencial / ganado al cumplir).
 */
import { DESGLOSADOR_SUB_CUMPLIDO_PS } from "@/lib/sovereigntyPointsConfig";
import type { SubVehiculo } from "@/lib/persistence";

export const DESGLOSADOR_PROFUNDIDAD_PS_POR_SUB = DESGLOSADOR_SUB_CUMPLIDO_PS;

/** PS de profundidad potencial = cantidad de subs × 2. */
export function desglosadorProfundidadPotencialPs(subCount: number): number {
  const n = Math.max(0, Math.floor(subCount));
  return n * DESGLOSADOR_PROFUNDIDAD_PS_POR_SUB;
}

/** PS de profundidad ya ganados = subs cumplidos × 2. */
export function desglosadorProfundidadGanadaPs(subs: SubVehiculo[] | undefined): number {
  const cumplidos = (subs ?? []).filter(s => s.status === "cumplido").length;
  return desglosadorProfundidadPotencialPs(cumplidos);
}

export function desglosadorProfundidadLabel(subCount: number): string {
  const ps = desglosadorProfundidadPotencialPs(subCount);
  const n = Math.max(0, Math.floor(subCount));
  if (n <= 0) return "Profundidad · 0 PS";
  return `Profundidad · ${ps} PS (${n} sub${n === 1 ? "" : "s"} × ${DESGLOSADOR_PROFUNDIDAD_PS_POR_SUB})`;
}
