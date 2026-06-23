/**
 * Snapshots atómicos de horas Consciente/Inconsciente — sobreviven caché corrupto.
 */
import {
  createEmptyPlaneacionHeavyMetrics,
  type PlaneacionHeavyMetrics,
} from "@/lib/planeacionHeavyMetricsCompute";
import type { Vehicle } from "@/lib/persistence";
import { getLimaDateString } from "@/lib/persistence";
import type { PlanillaDailySnapshot } from "@/lib/termodinamicaAtencional";
import type { PlaneacionSnapshotVehicle } from "@/lib/planeacionCache";

export const JORNADA_BACKUP_INTERVAL_MS = 30_000;

export type JornadaBackupPayload = {
  conquistaDiaSeg: number;
  entropiaDiaSeg: number;
  vehiculos: PlaneacionSnapshotVehicle[];
  atMs: number;
};

export function jornadaBackupStorageKey(fecha?: string): string {
  return `jornada_backup_${fecha ?? getLimaDateString()}`;
}

function safeParseBackup(raw: string): JornadaBackupPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<JornadaBackupPayload>;
    if (!parsed || typeof parsed !== "object") return null;
    const conquistaDiaSeg =
      typeof parsed.conquistaDiaSeg === "number" && Number.isFinite(parsed.conquistaDiaSeg)
        ? Math.max(0, parsed.conquistaDiaSeg)
        : 0;
    const entropiaDiaSeg =
      typeof parsed.entropiaDiaSeg === "number" && Number.isFinite(parsed.entropiaDiaSeg)
        ? Math.max(0, parsed.entropiaDiaSeg)
        : 0;
    const vehiculos = Array.isArray(parsed.vehiculos) ? parsed.vehiculos : [];
    const atMs =
      typeof parsed.atMs === "number" && Number.isFinite(parsed.atMs) ? parsed.atMs : Date.now();
    return { conquistaDiaSeg, entropiaDiaSeg, vehiculos, atMs };
  } catch {
    return null;
  }
}

/** Guarda snapshot atómico del día (no lanza). */
export function saveJornadaBackup(
  conquistaDiaSeg: number,
  entropiaDiaSeg: number,
  vehiculos: PlaneacionSnapshotVehicle[]
): void {
  if (typeof localStorage === "undefined") return;
  const payload: JornadaBackupPayload = {
    conquistaDiaSeg: Math.max(0, conquistaDiaSeg),
    entropiaDiaSeg: Math.max(0, entropiaDiaSeg),
    vehiculos,
    atMs: Date.now(),
  };
  try {
    localStorage.setItem(jornadaBackupStorageKey(), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/** Carga último backup válido del día (o fecha dada). */
export function loadJornadaBackup(fecha?: string): JornadaBackupPayload | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(jornadaBackupStorageKey(fecha));
    if (!raw) return null;
    return safeParseBackup(raw);
  } catch {
    return null;
  }
}

/** Busca el backup más reciente válido (hoy primero, luego ayer). */
export function loadLatestJornadaBackup(): JornadaBackupPayload | null {
  const today = loadJornadaBackup();
  if (today) return today;
  const yesterdayMs = Date.now() - 86_400_000;
  return loadJornadaBackup(getLimaDateString(yesterdayMs));
}

/** Reconstruye métricas mínimas desde backup para pintar sin recalcular. */
export function metricsFromJornadaBackup(
  backup: JornadaBackupPayload,
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null
): PlaneacionHeavyMetrics {
  const base = createEmptyPlaneacionHeavyMetrics(yesterdayTermoSnapshot);
  const conquistaMin = backup.conquistaDiaSeg / 60;
  const entropiaMin = backup.entropiaDiaSeg / 60;
  const jornadaMin = conquistaMin + entropiaMin + (base.anilloSnapshotForEscalera.dayStats.vacioMin ?? 0);

  return {
    ...base,
    anilloSnapshotForEscalera: {
      dayStats: {
        ...base.anilloSnapshotForEscalera.dayStats,
        conquistaMin,
        entropiaMin,
      },
      metricas: {
        ...base.anilloSnapshotForEscalera.metricas,
        conquistaMin,
        entropiaMin,
        jornadaMin,
      },
    },
    todayTermoLive: {
      ...base.todayTermoLive,
      conquistaMin,
      entropiaMin,
    },
  };
}

/** Si caché principal falló, devuelve métricas desde backup (silencioso). */
export function tryRestoreMetricsFromJornadaBackup(
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null
): PlaneacionHeavyMetrics | null {
  const backup = loadLatestJornadaBackup();
  if (!backup) return null;
  return metricsFromJornadaBackup(backup, yesterdayTermoSnapshot);
}

/** Vehículos compactos para snapshot de backup. */
export function vehiclesForJornadaBackup(vehicles: Vehicle[]): PlaneacionSnapshotVehicle[] {
  return vehicles.map(v => ({
    id: v.id,
    segundos:
      typeof v.duracionFinal === "number" && Number.isFinite(v.duracionFinal)
        ? Math.max(0, v.duracionFinal * 60)
        : 0,
    cumplido: v.status === "archivado" || !!v.cierreAt,
    aperturaAt:
      typeof v.aperturaAt === "number" && Number.isFinite(v.aperturaAt)
        ? v.aperturaAt
        : undefined,
  }));
}
/** Convierte minutos de métricas a segundos para backup. */
export function segundosFromMetrics(metrics: PlaneacionHeavyMetrics): {
  conquistaDiaSeg: number;
  entropiaDiaSeg: number;
} {
  const dayStats = metrics.anilloSnapshotForEscalera?.dayStats;
  const conquistaMin = dayStats?.conquistaMin ?? 0;
  const entropiaMin = dayStats?.entropiaMin ?? 0;
  return {
    conquistaDiaSeg: Math.round(Math.max(0, conquistaMin) * 60),
    entropiaDiaSeg: Math.round(Math.max(0, entropiaMin) * 60),
  };
}
