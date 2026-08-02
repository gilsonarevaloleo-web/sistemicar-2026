/**
 * Escala comercial Jornada V4 — Base → Ritmo → Norte (apilado).
 * IDs estables para MercadoPago / webhooks / activeModules.
 * Nombres y precios de display viven aquí (fuente canónica).
 */

export const PLANIFICACION_PRICE_VERSION = "2.0-jornada4";

/** Tipo de cambio referencial USD → PEN para checkout Yape/MP local. */
export const PLANIFICACION_USD_TO_PEN = 3.7;

export type PlanificacionSkuId =
  | "planificacion_base"
  | "operativo"
  | "soberania_dia";

export interface PlanificacionSku {
  id: PlanificacionSkuId;
  /** Nombre comercial */
  name: string;
  /** Alias corto en embudo */
  shortName: string;
  priceUsd: number;
  pricePen: number;
  peldaño: number;
  /** Qué desbloquea en producto */
  unlocks: string[];
  identity: string;
  forWho: string;
  funnelHint?: string;
  /** Comisión vendedor 30% */
  commissionUsd: number;
}

function penFromUsd(usd: number): number {
  return Math.round(usd * PLANIFICACION_USD_TO_PEN);
}

function commission(usd: number): number {
  return Math.round(usd * 0.3 * 100) / 100;
}

/**
 * Peldaño 1 — fácil / urgente: vehículos + PS + Conquista (unidades).
 * ID: planificacion_base
 */
export const SKU_BASE: PlanificacionSku = {
  id: "planificacion_base",
  name: "Jornada Base",
  shortName: "Base",
  priceUsd: 24.99,
  pricePen: penFromUsd(24.99),
  peldaño: 1,
  unlocks: [
    "Lanzar vehículos Conquista",
    "Desglosador Conquista (unidades y ritmo)",
    "Puntos de Soberanía (PS) al cerrar",
    "Métricas de cierre del día",
  ],
  identity: "Mido lo que cierro hoy",
  forWho: "Entrada — producción urgente",
  funnelHint: "Empieza aquí",
  commissionUsd: commission(24.99),
};

/**
 * Peldaño 2 — más comprometido: segmentos + Situacional.
 * ID: operativo (legacy id estable)
 */
export const SKU_RITMO: PlanificacionSku = {
  id: "operativo",
  name: "Ritmo del día",
  shortName: "Ritmo",
  priceUsd: 29.99,
  pricePen: penFromUsd(29.99),
  peldaño: 2,
  unlocks: [
    "Segmentos del día (estructura de ventanas)",
    "Desglosador Situacional / Enfoque (ring y cupos)",
    "Pulso de cobertura y puertas",
    "Requiere Jornada Base",
  ],
  identity: "Ordeno el día y los imprevistos",
  forWho: "Estructura · imprevistos · foco",
  funnelHint: "Tras habituar cierre de unidades",
  commissionUsd: commission(29.99),
};

/**
 * Peldaño 3 — alto valor / largo plazo: Crisol + Hub Proyectos.
 * ID: soberania_dia (legacy id estable)
 */
export const SKU_NORTE: PlanificacionSku = {
  id: "soberania_dia",
  name: "Norte",
  shortName: "Norte",
  priceUsd: 34.99,
  pricePen: penFromUsd(34.99),
  peldaño: 3,
  unlocks: [
    "El Crisol de Pensamientos (MOS)",
    "Hub Proyectos y pasos de fe",
    "Vínculo segmento → proyecto",
    "Requiere Jornada Base (ideal con Ritmo)",
  ],
  identity: "Mis ideas van a un proyecto con pasos",
  forWho: "Alto compromiso · horizonte",
  funnelHint: "Último peldaño — el más valioso",
  commissionUsd: commission(34.99),
};

export const PLANIFICACION_SKUS: readonly PlanificacionSku[] = [
  SKU_BASE,
  SKU_RITMO,
  SKU_NORTE,
];

export const PLANIFICACION_SKU_BY_ID: Record<PlanificacionSkuId, PlanificacionSku> = {
  planificacion_base: SKU_BASE,
  operativo: SKU_RITMO,
  soberania_dia: SKU_NORTE,
};

/** Orden checkout: fácil → valioso */
export const PLANIFICACION_CHECKOUT_ORDER: readonly PlanificacionSkuId[] = [
  "planificacion_base",
  "operativo",
  "soberania_dia",
];

export interface PlanificacionStack {
  id: string;
  title: string;
  subtitle: string;
  moduleIds: PlanificacionSkuId[];
  modulesLabel: string;
  totalUsd: number;
  totalPen: number;
  commissionUsd: number;
  desc: string;
  /** add-on principal a resaltar en UI (null = completo) */
  highlightAddOnId: PlanificacionSkuId | null;
}

function stackTotal(ids: PlanificacionSkuId[]): number {
  return Math.round(ids.reduce((s, id) => s + PLANIFICACION_SKU_BY_ID[id].priceUsd, 0) * 100) / 100;
}

export const PLANIFICACION_STACKS: readonly PlanificacionStack[] = [
  {
    id: "ritmo",
    title: "Día con ritmo",
    subtitle: "Base + Ritmo — unidades y estructura",
    moduleIds: ["planificacion_base", "operativo"],
    modulesLabel: "Base + Ritmo",
    totalUsd: stackTotal(["planificacion_base", "operativo"]),
    totalPen: penFromUsd(stackTotal(["planificacion_base", "operativo"])),
    commissionUsd: commission(stackTotal(["planificacion_base", "operativo"])),
    desc: "Cierras unidades y ordenas el día con segmentos e imprevistos.",
    highlightAddOnId: "operativo",
  },
  {
    id: "norte",
    title: "Con norte",
    subtitle: "Sistema completo — Base + Ritmo + Norte",
    moduleIds: ["planificacion_base", "operativo", "soberania_dia"],
    modulesLabel: "Base + Ritmo + Norte",
    totalUsd: stackTotal(["planificacion_base", "operativo", "soberania_dia"]),
    totalPen: penFromUsd(stackTotal(["planificacion_base", "operativo", "soberania_dia"])),
    commissionUsd: commission(stackTotal(["planificacion_base", "operativo", "soberania_dia"])),
    desc: "Producción, ritmo del día y proyectos con pasos. Usuario comprometido.",
    highlightAddOnId: null,
  },
];

/** Totales de referencia para copy (comprometido = los 3). */
export const PLANIFICACION_FULL_MONTHLY_USD = PLANIFICACION_STACKS.find(s => s.id === "norte")!.totalUsd;

export const EMBUDO_PREGUNTAS_V2 = [
  {
    id: "base",
    peldaño: 1,
    pregunta: "¿Necesitas medir unidades y cerrar hoy?",
    si: "Jornada Base — vehículos Conquista + PS.",
  },
  {
    id: "ritmo",
    peldaño: 2,
    pregunta: "¿Quieres estructurar el día y sostener imprevistos?",
    si: "Añade Ritmo del día — segmentos + Situacional.",
  },
  {
    id: "norte",
    peldaño: 3,
    pregunta: "¿Tus ideas deben ir a un proyecto con pasos a largo plazo?",
    si: "Añade Norte — Crisol + Hub Proyectos (último peldaño).",
  },
] as const;
