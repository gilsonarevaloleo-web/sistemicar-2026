import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

/** Identidad visible del módulo `/planeacion` (capa usuario). */
/** Ruta del laboratorio modular (no sustituye `/planeacion` en producción). */
export const JORNADA_V3_PATH = "/jornada-v3" as const;

/** Dual Kernel — solo Conquista + Situacional + PS (anti-freeze). */
export const JORNADA_V4_PATH = "/jornada-v4" as const;

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
