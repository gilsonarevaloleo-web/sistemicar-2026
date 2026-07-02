import type { CSSProperties } from "react";
import { toast } from "sonner";

const PROFUNDIDAD_TOAST_ID = "desglosador-profundidad-sesion";
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

type ProfundidadToastOpts = {
  description: string;
  style: CSSProperties;
  durationMs?: number;
};

/** Toast de lanzamiento con dismiss imperativo fuera del ciclo React. */
export function showProfundidadSesionToast(opts: ProfundidadToastOpts): void {
  if (dismissTimer != null) {
    globalThis.clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  toast.info("Profundidad de sesión", {
    id: PROFUNDIDAD_TOAST_ID,
    description: opts.description,
    style: opts.style,
    duration: Infinity,
  });
  dismissTimer = globalThis.setTimeout(() => {
    dismissTimer = null;
    toast.dismiss(PROFUNDIDAD_TOAST_ID);
  }, opts.durationMs ?? 4500);
}

export function dismissProfundidadSesionToast(): void {
  if (dismissTimer != null) {
    globalThis.clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  toast.dismiss(PROFUNDIDAD_TOAST_ID);
}
