/**
 * Quiet Dual Kernel: pausa motores globales del App shell en `/jornada-v4`
 * y, al salir, aplica un soft-start para no colapsar el hilo al montar Espejo/etc.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { isJornada4Path } from "@/lib/jornadaBrand";
import { isMobilePerfMode } from "@/lib/mobilePerf";

/** Tras salir de Dual Kernel, diferir Centinela / SegmentAttention. */
export const DUAL_KERNEL_EXIT_SOFT_MS = isMobilePerfMode() ? 2_500 : 1_200;

/**
 * True mientras estamos en `/jornada-v4` o en la ventana soft-start tras salir.
 * Usar en motores del App shell en lugar de `isJornada4Path` solo.
 */
export function useDualKernelMotorsQuiet(): boolean {
  const [location] = useLocation();
  const onJ4 = isJornada4Path(location);
  const wasOnJ4Ref = useRef(onJ4);
  const [exitQuiet, setExitQuiet] = useState(false);

  useEffect(() => {
    const wasOnJ4 = wasOnJ4Ref.current;
    wasOnJ4Ref.current = onJ4;

    if (onJ4) {
      setExitQuiet(false);
      return;
    }

    // Solo diferir cuando venimos de Dual Kernel → otro módulo.
    if (!wasOnJ4) return;

    setExitQuiet(true);
    const id = window.setTimeout(() => setExitQuiet(false), DUAL_KERNEL_EXIT_SOFT_MS);
    return () => window.clearTimeout(id);
  }, [onJ4]);

  return onJ4 || exitQuiet;
}
