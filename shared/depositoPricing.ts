/**
 * Universidad (Depósito) — tres valores, apilados como Jornada.
 * Trial: 1 volcado G1 gratis. Paywall: el resto de la universidad.
 */

import { PLANIFICACION_USD_TO_PEN } from "./planificacionPricing.ts";
import type { GradoMaestria } from "./deposito/engineConfig.ts";

export const DEPOSITO_PRICE_VERSION = "1.0-universidad";

/** Primer volcado G1 sin matrícula (la clase de prueba). */
export const DEPOSITO_TRIAL_MAX_VOLCADOS = 1 as const;

export type DepositoSkuId =
  | "deposito_matricula"
  | "deposito_carrera"
  | "deposito_titulo";

export interface DepositoSku {
  id: DepositoSkuId;
  name: string;
  shortName: string;
  priceUsd: number;
  pricePen: number;
  peldaño: number;
  unlocks: string[];
  identity: string;
  forWho: string;
  funnelHint?: string;
  commissionUsd: number;
  checkoutHref: string;
}

function penFromUsd(usd: number): number {
  return Math.round(usd * PLANIFICACION_USD_TO_PEN);
}

function commission(usd: number): number {
  return Math.round(usd * 0.3 * 100) / 100;
}

/**
 * Valor 1 — Matrícula: el Muro nombra UN ojo.
 * ID: deposito_matricula
 */
export const SKU_MATRICULA: DepositoSku = {
  id: "deposito_matricula",
  name: "Universidad Matrícula",
  shortName: "Matrícula",
  priceUsd: 24.99,
  pricePen: penFromUsd(24.99),
  peldaño: 1,
  unlocks: [
    "1 volcado G1 de prueba (trial)",
    "Volcados Aprendiz de Ojo ilimitados",
    "Dictamen: ojo dominante + punto ciego + mecánica",
    "Historial de volcados",
  ],
  identity: "El Muro nombra UN ojo. Yo no elijo.",
  forWho: "Entrada — ver qué ojo estaba ciego",
  funnelHint: "1 volcado gratis · después Matrícula",
  commissionUsd: commission(24.99),
  checkoutHref: "/pagos?plan=deposito_matricula",
};

/**
 * Valor 2 — Carrera: filtro de flor y lo no dicho.
 * ID: deposito_carrera
 */
export const SKU_CARRERA: DepositoSku = {
  id: "deposito_carrera",
  name: "Universidad Carrera",
  shortName: "Carrera",
  priceUsd: 29.99,
  pricePen: penFromUsd(29.99),
  peldaño: 2,
  unlocks: [
    "Grado 2 — Detector de Ruido (filtro de flor)",
    "Grado 3 — Arquitecto de Punto Ciego (lo no dicho)",
    "Mapa de calor de los 10 Ojos",
    "Ritual de paso de grado",
    "Requiere Matrícula",
  ],
  identity: "Filtro mi flor y leo lo no dicho",
  forWho: "Carrera · ver mejor, no solo volcar",
  funnelHint: "Tras habituar el primer ojo",
  commissionUsd: commission(29.99),
  checkoutHref: "/pagos?plan=deposito_carrera",
};

/**
 * Valor 3 — Título: criterio vivo y rotación de lentes.
 * ID: deposito_titulo
 */
export const SKU_TITULO: DepositoSku = {
  id: "deposito_titulo",
  name: "Universidad Título",
  shortName: "Título",
  priceUsd: 34.99,
  pricePen: penFromUsd(34.99),
  peldaño: 3,
  unlocks: [
    "Grado 4 — Operador de Soberanía",
    "Sello de Criterio Vivo",
    "Axiomas de metacognición",
    "Requiere Matrícula (ideal con Carrera)",
  ],
  identity: "Sello mi criterio. Roto los 10 lentes.",
  forWho: "Título · autoría óptica",
  funnelHint: "Último peldaño — el más valioso",
  commissionUsd: commission(34.99),
  checkoutHref: "/pagos?plan=deposito_titulo",
};

export const DEPOSITO_SKUS: readonly DepositoSku[] = [
  SKU_MATRICULA,
  SKU_CARRERA,
  SKU_TITULO,
];

export const DEPOSITO_SKU_BY_ID: Record<DepositoSkuId, DepositoSku> = {
  deposito_matricula: SKU_MATRICULA,
  deposito_carrera: SKU_CARRERA,
  deposito_titulo: SKU_TITULO,
};

export const DEPOSITO_CHECKOUT_ORDER: readonly DepositoSkuId[] = [
  "deposito_matricula",
  "deposito_carrera",
  "deposito_titulo",
];

export function isDepositoSkuId(planId: string): planId is DepositoSkuId {
  return (
    planId === "deposito_matricula" ||
    planId === "deposito_carrera" ||
    planId === "deposito_titulo"
  );
}

export interface DepositoStack {
  id: string;
  title: string;
  subtitle: string;
  moduleIds: DepositoSkuId[];
  modulesLabel: string;
  totalUsd: number;
  totalPen: number;
  commissionUsd: number;
  desc: string;
  highlightAddOnId: DepositoSkuId | null;
}

function stackTotal(ids: DepositoSkuId[]): number {
  return (
    Math.round(
      ids.reduce((s, id) => s + DEPOSITO_SKU_BY_ID[id].priceUsd, 0) * 100,
    ) / 100
  );
}

export const DEPOSITO_STACKS: readonly DepositoStack[] = [
  {
    id: "carrera",
    title: "Con carrera",
    subtitle: "Matrícula + Carrera — ojo y grado",
    moduleIds: ["deposito_matricula", "deposito_carrera"],
    modulesLabel: "Matrícula + Carrera",
    totalUsd: stackTotal(["deposito_matricula", "deposito_carrera"]),
    totalPen: penFromUsd(stackTotal(["deposito_matricula", "deposito_carrera"])),
    commissionUsd: commission(
      stackTotal(["deposito_matricula", "deposito_carrera"]),
    ),
    desc: "Volcás el día y expandís la óptica: ruido, sombra, mapa de calor.",
    highlightAddOnId: "deposito_carrera",
  },
  {
    id: "titulo",
    title: "Con título",
    subtitle: "Universidad completa — Matrícula + Carrera + Título",
    moduleIds: ["deposito_matricula", "deposito_carrera", "deposito_titulo"],
    modulesLabel: "Matrícula + Carrera + Título",
    totalUsd: stackTotal([
      "deposito_matricula",
      "deposito_carrera",
      "deposito_titulo",
    ]),
    totalPen: penFromUsd(
      stackTotal(["deposito_matricula", "deposito_carrera", "deposito_titulo"]),
    ),
    commissionUsd: commission(
      stackTotal(["deposito_matricula", "deposito_carrera", "deposito_titulo"]),
    ),
    desc: "Ojo, grado y criterio vivo. El alumno se vuelve autor del estándar.",
    highlightAddOnId: null,
  },
];

export const DEPOSITO_FULL_MONTHLY_USD = DEPOSITO_STACKS.find(
  (s) => s.id === "titulo",
)!.totalUsd;

export const EMBUDO_UNIVERSIDAD = [
  {
    id: "matricula",
    peldaño: 1,
    pregunta: "¿El día ya ocurrió y no sabes qué ojo estaba ciego?",
    si: "Matrícula — volcá crudo. El Muro nombra UN ojo.",
  },
  {
    id: "carrera",
    peldaño: 2,
    pregunta: "¿Quieres filtrar tu flor y leer lo que no dijiste?",
    si: "Añade Carrera — G2 Detector de Ruido + G3 Punto Ciego.",
  },
  {
    id: "titulo",
    peldaño: 3,
    pregunta: "¿Tu criterio debe quedar sellado y rotar los 10 lentes?",
    si: "Añade Título — G4 + Criterio Vivo + axiomas (último peldaño).",
  },
] as const;

/** ¿El volcado extra cabe en el trial (G1, sin matrícula)? */
export function esVolcadoDepositoEnTrial(volcadosUsados: number): boolean {
  return (
    Number.isInteger(volcadosUsados) &&
    volcadosUsados >= 0 &&
    volcadosUsados < DEPOSITO_TRIAL_MAX_VOLCADOS
  );
}

/** ¿Hace falta Matrícula para guardar otro volcado? */
export function requierePagoMatricula(
  volcadosUsados: number,
  hasMatricula: boolean,
): boolean {
  if (hasMatricula) return false;
  return !esVolcadoDepositoEnTrial(volcadosUsados);
}

/**
 * Techo de grado según peldaño pagado.
 * Trial y Matrícula = G1. Carrera = G3. Título = G4.
 */
export function gradoMaximoDeposito(access: {
  hasCarrera: boolean;
  hasTitulo: boolean;
}): GradoMaestria {
  if (access.hasTitulo) return 4;
  if (access.hasCarrera) return 3;
  return 1;
}

/** ¿Este grado (o el sello de criterio) pide Título? */
export function requierePagoTitulo(
  grado: number,
  hasTitulo: boolean,
): boolean {
  if (hasTitulo) return false;
  return grado >= 4;
}

/** ¿Este grado pide Carrera (G2–G3)? */
export function requierePagoCarrera(
  grado: number,
  hasCarrera: boolean,
  hasTitulo: boolean,
): boolean {
  if (hasCarrera || hasTitulo) return false;
  return grado === 2 || grado === 3;
}
