/** IDs de módulos vendibles (Planificación + Umbral + Universidad + futuros).
 * Display comercial (v2): Base · Ritmo · Norte — ver planificacionPricing.ts
 * Umbral — ver umbralPricing.ts
 * Universidad — ver depositoPricing.ts (Matrícula · Carrera · Título)
 */
export type ModuleId =
  | "planificacion_base"
  | "soberania_dia"
  | "operativo"
  | "umbral"
  | "deposito_matricula"
  | "deposito_carrera"
  | "deposito_titulo";

export const MODULE_IDS = {
  /** Jornada Base — Conquista + PS */
  PLANIFICACION_BASE: "planificacion_base" as const,
  /** Norte — Crisol + Hub Proyectos */
  SOBERANIA_DIA: "soberania_dia" as const,
  NORTE: "soberania_dia" as const,
  /** Ritmo del día — segmentos + Situacional */
  OPERATIVO: "operativo" as const,
  RITMO: "operativo" as const,
  /** Umbral v2 — Forja + Arena (trial C1 gratis) */
  UMBRAL: "umbral" as const,
  /** Universidad Matrícula — G1 + dictamen */
  DEPOSITO_MATRICULA: "deposito_matricula" as const,
  MATRICULA: "deposito_matricula" as const,
  /** Universidad Carrera — G2–G3 + mapa de calor */
  DEPOSITO_CARRERA: "deposito_carrera" as const,
  CARRERA: "deposito_carrera" as const,
  /** Universidad Título — G4 + criterio vivo */
  DEPOSITO_TITULO: "deposito_titulo" as const,
  TITULO: "deposito_titulo" as const,
};

const VALID_MODULE_IDS = new Set<ModuleId>([
  "planificacion_base",
  "soberania_dia",
  "operativo",
  "umbral",
  "deposito_matricula",
  "deposito_carrera",
  "deposito_titulo",
]);

function isModuleId(value: string): value is ModuleId {
  return VALID_MODULE_IDS.has(value as ModuleId);
}

/** Planes de checkout activos (Planificación + Umbral + Universidad + packs Espejo). */
export type ActivePlanId =
  | "planificacion_base"
  | "soberania_dia"
  | "operativo"
  | "umbral"
  | "deposito_matricula"
  | "deposito_carrera"
  | "deposito_titulo"
  | "espejo_inicio"
  | "espejo_recarga";

/** Planes legacy — solo grandfather / webhooks antiguos. */
export type LegacyPlanId = "arquitecto" | "soberano_operativo" | "soberano" | "soberania-mental";

export type SubscriptionPlanId = ActivePlanId | LegacyPlanId;

export interface ModuleAccessInput {
  activeModules?: string[] | null;
  subscriptionPlan?: string | null;
  rank?: string | null;
  email?: string | null;
}

const OWNER_EMAIL = "gilsonarevalo.leo@gmail.com";

/** Módulos que otorga cada plan legacy (grandfather). */
export const LEGACY_PLAN_MODULES: Record<string, ModuleId[]> = {
  arquitecto: ["planificacion_base", "soberania_dia"],
  soberano_operativo: ["planificacion_base", "soberania_dia", "operativo"],
  soberano: ["planificacion_base", "soberania_dia", "operativo"],
};

/** Módulos que otorga cada plan nuevo en checkout. */
export const PLAN_MODULE_GRANTS: Record<string, ModuleId[]> = {
  planificacion_base: ["planificacion_base"],
  soberania_dia: ["soberania_dia"],
  operativo: ["operativo"],
  umbral: ["umbral"],
  deposito_matricula: ["deposito_matricula"],
  deposito_carrera: ["deposito_carrera"],
  deposito_titulo: ["deposito_titulo"],
};

/** Planes que el admin / webhook puede otorgar (suscripción, no packs Espejo). */
export const GRANTABLE_MODULE_PLAN_IDS = [
  "planificacion_base",
  "soberania_dia",
  "operativo",
  "umbral",
  "deposito_matricula",
  "deposito_carrera",
  "deposito_titulo",
] as const;

export function grantablePlanHint(): string {
  return GRANTABLE_MODULE_PLAN_IDS.join(", ");
}

const LEGACY_RANK_MODULES: Record<string, ModuleId[]> = {
  arquitecto: ["planificacion_base", "soberania_dia"],
  soberano_operativo: ["planificacion_base", "soberania_dia", "operativo"],
  soberano: ["planificacion_base", "soberania_dia", "operativo"],
};

export function isOwnerEmail(email?: string | null): boolean {
  return email?.toLowerCase() === OWNER_EMAIL;
}

/** Resuelve el set efectivo de módulos activos (explicit + legacy). */
export function resolveActiveModules(input: ModuleAccessInput): Set<ModuleId> {
  const set = new Set<ModuleId>();
  if (isOwnerEmail(input.email)) {
    return new Set<ModuleId>([
      "planificacion_base",
      "soberania_dia",
      "operativo",
      "umbral",
      "deposito_matricula",
      "deposito_carrera",
      "deposito_titulo",
    ]);
  }
  for (const m of input.activeModules ?? []) {
    if (isModuleId(m)) set.add(m);
  }
  const plan = input.subscriptionPlan;
  if (plan) {
    for (const m of LEGACY_PLAN_MODULES[plan] ?? PLAN_MODULE_GRANTS[plan] ?? []) {
      set.add(m);
    }
  }
  const rank = input.rank;
  if (rank) {
    for (const m of LEGACY_RANK_MODULES[rank] ?? []) {
      set.add(m);
    }
  }
  return set;
}

export function hasModule(input: ModuleAccessInput, moduleId: ModuleId): boolean {
  return resolveActiveModules(input).has(moduleId);
}

export function hasPlanificacionBaseAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "planificacion_base");
}

export function hasSoberaniaDiaAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "soberania_dia");
}

/** Alias comercial: Norte (Crisol + Hub). */
export function hasNorteAccess(input: ModuleAccessInput): boolean {
  return hasSoberaniaDiaAccess(input);
}

export function hasOperativoAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "operativo");
}

/** Alias comercial: Ritmo del día (segmentos + Situacional). */
export function hasRitmoAccess(input: ModuleAccessInput): boolean {
  return hasOperativoAccess(input);
}

/** Umbral v2 — Forja + Arena (Códigos 2–10 + métricas). */
export function hasUmbralAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "umbral");
}

/** Universidad Matrícula — volcados G1 + dictamen. */
export function hasDepositoMatriculaAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "deposito_matricula");
}

/** Universidad Carrera — G2–G3 + mapa de calor. */
export function hasDepositoCarreraAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "deposito_carrera");
}

/** Universidad Título — G4 + criterio vivo + axiomas. */
export function hasDepositoTituloAccess(input: ModuleAccessInput): boolean {
  return hasModule(input, "deposito_titulo");
}

/** @deprecated Usar hasOperativoAccess / hasRitmoAccess */
export function hasDesglosadorAccessFromModules(input: ModuleAccessInput): boolean {
  return hasOperativoAccess(input);
}

export function modulesGrantedByPlan(planId: string): ModuleId[] {
  return PLAN_MODULE_GRANTS[planId] ?? LEGACY_PLAN_MODULES[planId] ?? [];
}

export function mergeModuleIds(existing: string[] | null | undefined, toAdd: ModuleId[]): ModuleId[] {
  const set = new Set<ModuleId>();
  for (const m of existing ?? []) {
    if (isModuleId(m)) set.add(m);
  }
  for (const m of toAdd) set.add(m);
  return Array.from(set);
}
