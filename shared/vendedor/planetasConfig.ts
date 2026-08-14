/**
 * Vendedor Capa 1 — Planetas de entrada comercial.
 * Tras el triage se fija Código + Planeta y se redirige al checkout/trial.
 */

export type PlanetaId = "ESPEJO" | "JORNADA" | "UMBRAL";

export interface PlanetaConfig {
  id: PlanetaId;
  label: string;
  slug: string;
  /** Dolor del prospecto (lenguaje humano). */
  grieta: string;
  /** Cómo entra al producto. */
  metodoEntrada: string;
  /** Ruta de prueba / producto. */
  trialHref: string;
  trialLabel: string;
  /** Checkout con plan concreto (añadir &ref= en UI). */
  checkoutHref: string;
  checkoutLabel: string;
  color: string;
}

export const PLANETAS: Record<PlanetaId, PlanetaConfig> = {
  ESPEJO: {
    id: "ESPEJO",
    label: "El Espejo",
    slug: "espejo",
    grieta:
      "Frustración, carga emocional, culpa o dolor que no deja pensar con claridad.",
    metodoEntrada:
      "Limpieza por créditos: desahogo y diagnóstico para neutralizar la mente.",
    trialHref: "/espejo",
    trialLabel: "Abrir el Espejo",
    checkoutHref: "/pagos?plan=espejo_inicio",
    checkoutLabel: "Pack Espejo Inicio · créditos",
    color: "#38BDF8",
  },
  JORNADA: {
    id: "JORNADA",
    label: "La Jornada",
    slug: "jornada",
    grieta:
      "Cansancio, falta de tiempo, dispersión o sensación de apagar incendios.",
    metodoEntrada:
      "Ejecución por bloques: medir unidades, ritmo y cierre diario.",
    trialHref: "/pagos?plan=planificacion_base",
    trialLabel: "Ver Jornada Base",
    checkoutHref: "/pagos?plan=planificacion_base",
    checkoutLabel: "Activar Jornada Base",
    color: "#D4AF37",
  },
  UMBRAL: {
    id: "UMBRAL",
    label: "El Umbral",
    slug: "umbral",
    grieta:
      "Autoengaño, excusas de incapacidad, miedo o vergüenza a vender / exponerse.",
    metodoEntrada:
      "Simulador de fricción (Forja / Arena): crear callo operativo.",
    trialHref: "/umbral/entrada",
    trialLabel: "Probar Código 1 gratis",
    checkoutHref: "/pagos?plan=umbral",
    checkoutLabel: "Activar Umbral",
    color: "#FF6B35",
  },
};

export const PLANETA_IDS: readonly PlanetaId[] = [
  "ESPEJO",
  "JORNADA",
  "UMBRAL",
];

export function isPlanetaId(value: string): value is PlanetaId {
  return (PLANETA_IDS as readonly string[]).includes(value);
}

/**
 * Mapa por defecto Código → Planeta (entrada comercial).
 * Se usa si solo hay código; el triage de preguntas puede sobrescribir.
 */
export const CODIGO_A_PLANETA_DEFAULT: Record<
  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
  PlanetaId
> = {
  1: "UMBRAL", // utilidad / claridad de oferta
  2: "JORNADA", // sobrecarga / apalancamiento del día
  3: "JORNADA", // tiempo / postergación
  4: "ESPEJO", // trauma / humo / desconfianza emocional
  5: "UMBRAL", // números / ROI en venta
  6: "ESPEJO", // miedo / ansiedad (entrada emocional)
  7: "UMBRAL", // precio / justicia de cobrar
  8: "UMBRAL", // negociación compleja
  9: "UMBRAL", // cierre
  10: "UMBRAL", // autoridad / continuidad
};

/** Códigos típicos por planeta (para matizar en Q2). */
export const CODIGOS_POR_PLANETA: Record<
  PlanetaId,
  readonly (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)[]
> = {
  ESPEJO: [6, 4, 1],
  JORNADA: [3, 2, 1],
  UMBRAL: [1, 6, 7, 5],
};
