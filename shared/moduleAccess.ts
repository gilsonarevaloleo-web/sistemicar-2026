/** IDs de módulos vendibles (Planificación + futuros).
 * Display comercial (v2): Base · Ritmo · Norte — ver planificacionPricing.ts
 */
export type ModuleId =
  | "planificacion_base"
  | "soberania_dia"
  | "operativo";

export const MODULE_IDS = {
  /** Jornada Base — Conquista + PS */
  PLANIFICACION_BASE: "planificacion_base" as const,
  /** Norte — Crisol + Hub Proyectos */
  SOBERANIA_DIA: "soberania_dia" as const,
  NORTE: "soberania_dia" as const,
  /** Ritmo del día — segmentos + Situacional */
  OPERATIVO: "operativo" as const,
  RITMO: "operativo" as const,
};

/** Planes de checkout activos (Planificación mensual + Espejo aparte). */
export type ActivePlanId =
  | "corazon-sabio"
  | "planificacion_base"
  | "soberania_dia"
  | "operativo";

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
};

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
    return new Set<ModuleId>(["planificacion_base", "soberania_dia", "operativo"]);
  }
  for (const m of input.activeModules ?? []) {
    if (m === "planificacion_base" || m === "soberania_dia" || m === "operativo") {
      set.add(m);
    }
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
    if (m === "planificacion_base" || m === "soberania_dia" || m === "operativo") set.add(m);
  }
  for (const m of toAdd) set.add(m);
  return Array.from(set);
}
