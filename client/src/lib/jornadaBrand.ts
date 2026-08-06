import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

/** Dual Kernel — flujo de producción de Jornada (anti-freeze). */
export const JORNADA_V4_PATH = "/jornada-v4" as const;

/** Hub de Proyectos / Centros (Norte). */
export const PROYECTOS_HUB_PATH = "/proyectos" as const;

/** True en `/jornada-v4` (y query). Usado para pausar motores globales del App shell. */
export function isJornada4Path(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === JORNADA_V4_PATH || pathname.startsWith(`${JORNADA_V4_PATH}?`);
}

/** True en `/proyectos` (listado o `?id=`). */
export function isProyectosHubPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] ?? pathname;
  return path === PROYECTOS_HUB_PATH || path.startsWith(`${PROYECTOS_HUB_PATH}/`);
}

/** Pathname actual (SSR-safe). Para hot paths sin hooks (launch ms0). */
export function isJornada4WindowPath(): boolean {
  if (typeof window === "undefined") return false;
  return isJornada4Path(window.location.pathname);
}

export function isProyectosHubWindowPath(): boolean {
  if (typeof window === "undefined") return false;
  return isProyectosHubPath(window.location.pathname);
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
