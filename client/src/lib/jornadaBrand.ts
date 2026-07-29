import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

/** Dual Kernel — flujo de producción de Jornada (anti-freeze). */
export const JORNADA_V4_PATH = "/jornada-v4" as const;

/** True en `/jornada-v4` (y query). Usado para pausar motores globales del App shell. */
export function isJornada4Path(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === JORNADA_V4_PATH || pathname.startsWith(`${JORNADA_V4_PATH}?`);
}

/** Pathname actual (SSR-safe). Para hot paths sin hooks (launch ms0). */
export function isJornada4WindowPath(): boolean {
  if (typeof window === "undefined") return false;
  return isJornada4Path(window.location.pathname);
}

export const JORNADA_MODULE = {
  title: "Jornada",
  titleUpper: "JORNADA",
  /** Categoría pública — no "planificador". */
  tagline: SISTEMICAR_CATEGORY.name,
  taglineShort: "Presencia · Entrada · Producción",
  /** Línea comercial en checkout (Planificación Base, etc.). */
  productLine: "Planificación",
  category: SISTEMICAR_CATEGORY,
} as const;
