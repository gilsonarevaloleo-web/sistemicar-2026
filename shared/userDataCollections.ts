/**
 * Colecciones privadas de un usuario en
 * artifacts/sistemicar-v2-5/users/{uid}/{collection}
 *
 * La migración anónimo→Google tenía una lista incompleta (y nombres viejos:
 * hopeLog / bossSteps). Si se limpia el teléfono, hay que copiar ESTAS.
 */
export const USER_PRIVATE_COLLECTIONS = [
  "acervo",
  "alquimia",
  "benefits_read",
  "bossStep",
  "chispazos",
  "cierreJornada",
  "codices",
  "conviccion",
  "dailySnapshots",
  "energyLogs",
  "espejoCredits",
  "espejoSessions",
  "expedienteClinico",
  "galeria_aliados",
  "historialSistemico",
  "hopeLogs",
  "manual_progress",
  "meditationSessions",
  "mi_expediente",
  "misiones",
  "muroSoberano",
  "pacientes",
  "planillas",
  "plantillasRutina",
  "progression",
  "proyecciones",
  "proyecto_peldanos",
  "proyectos",
  "proyector_hitos",
  "radiografiaTokens",
  "semillas",
  "situacionReserva",
  "sovereigntyPointsLog",
  "subconsciente_analisis",
  "umbralLogros",
  "umbralOfertas",
  "vehicleHistory",
  "vehicles",
  "volcados",
  "volcados_v3",
  "weekly_audit",
] as const;

/** Nombres que la migración vieja usaba mal. Se leen por si quedó data ahí. */
export const LEGACY_ALIAS_COLLECTIONS = ["hopeLog", "bossSteps"] as const;

export type UserPrivateCollection = (typeof USER_PRIVATE_COLLECTIONS)[number];

export const RECOVERY_FEATURE_COLLECTIONS = {
  crisol: ["situacionReserva", "proyectos", "proyecto_peldanos"],
  record: ["vehicleHistory", "vehicles"],
  rutina: ["plantillasRutina", "planillas"],
  deposito: ["volcados", "volcados_v3", "acervo"],
  umbral: ["umbralLogros", "umbralOfertas"],
} as const;

export type RecoveryFeature = keyof typeof RECOVERY_FEATURE_COLLECTIONS;

export const RECOVERY_FEATURE_LABELS: Record<RecoveryFeature, string> = {
  crisol: "Crisol",
  record: "Récord",
  rutina: "Rutina",
  deposito: "Depósito (aprendizaje)",
  umbral: "Umbral",
};

/** Collection groups que delatan una cuenta aunque progression esté en 0. */
export const RECOVERY_SCAN_COLLECTIONS = [
  "progression",
  ...new Set(Object.values(RECOVERY_FEATURE_COLLECTIONS).flat()),
] as const;

export function emptyFeatureCounts(): Record<RecoveryFeature, number> {
  return { crisol: 0, record: 0, rutina: 0, deposito: 0, umbral: 0 };
}

export function uidFromPrivateCollectionPath(
  path: string,
  collectionName: string,
): string | null {
  const parts = path.split("/");
  const i = parts.indexOf("users");
  if (i < 0 || parts[i + 2] !== collectionName) return null;
  if (!parts.includes("sistemicar-v2-5")) return null;
  return parts[i + 1] || null;
}

export function collectionsToMigrate(): readonly string[] {
  return [...USER_PRIVATE_COLLECTIONS, ...LEGACY_ALIAS_COLLECTIONS];
}

export function featureCountsFromCollections(
  counts: Record<string, number>,
): Record<RecoveryFeature, number> {
  const features = {} as Record<RecoveryFeature, number>;
  for (const feature of Object.keys(RECOVERY_FEATURE_COLLECTIONS) as RecoveryFeature[]) {
    features[feature] = RECOVERY_FEATURE_COLLECTIONS[feature].reduce(
      (sum, name) => sum + (counts[name] ?? 0),
      0,
    );
  }
  return features;
}

export function totalDocs(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export function buildMigratedDocData(
  data: Record<string, unknown>,
  newUid: string,
  oldUid: string,
): Record<string, unknown> {
  return {
    ...data,
    userId: newUid,
    migratedFrom: oldUid,
  };
}
