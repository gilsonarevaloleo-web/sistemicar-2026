import type { PlaneacionHeavyMetrics } from "@/lib/planeacionHeavyMetricsCompute";
import type { SegmentoAtencion } from "@/lib/atencionPanoramicaEngine";
import type { SegmentoDisciplina } from "@/lib/disciplinaEngine";
import { tryRestoreMetricsFromJornadaBackup } from "@/services/jornadaBackup";
import type { PlanillaDailySnapshot } from "@/lib/termodinamicaAtencional";

export const PLANEACION_CACHE_TTL_MS = 30_000;
export const PLANEACION_IDLE_DEFER_MS = 2_000;
export const PLANEACION_SNAPSHOT_STORAGE_KEY = "planeacion_snapshot_v1";
export const PLANEACION_CACHE_V2_KEY = "planeacion_cache_v2";

export type PlaneacionSnapshotVehicle = {
  id?: string;
  segundos?: number;
  cumplido?: boolean;
  aperturaAt?: number;
  [key: string]: unknown;
};

export type PlaneacionSnapshotEnvelope = {
  inputSig: string;
  atMs: number;
  aperturaAt: number;
  segundosTotales: number;
  vehiculos: PlaneacionSnapshotVehicle[];
};

type SerializedHeavyMetrics = Omit<
  PlaneacionHeavyMetrics,
  "atencionBySegmentId" | "disciplinaBySegmentId"
> & {
  atencionBySegmentId: [string, SegmentoAtencion][];
  disciplinaBySegmentId: [string, SegmentoDisciplina][];
};

export type PlaneacionPersistedSnapshot = PlaneacionSnapshotEnvelope & {
  metrics?: SerializedHeavyMetrics;
};

type Snapshot = {
  inputSig: string;
  metrics: PlaneacionHeavyMetrics;
  atMs: number;
};

let snapshot: Snapshot | null = null;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Sanitiza envelope persistido — auto-fix silencioso de NaN/undefined. */
export function validateSnapshot(
  snap: Partial<PlaneacionPersistedSnapshot>
): PlaneacionPersistedSnapshot {
  const safe: PlaneacionPersistedSnapshot = {
    inputSig: typeof snap.inputSig === "string" ? snap.inputSig : "",
    atMs: isFiniteNumber(snap.atMs) ? snap.atMs : Date.now(),
    aperturaAt: isFiniteNumber(snap.aperturaAt) ? snap.aperturaAt : Date.now(),
    segundosTotales:
      isFiniteNumber(snap.segundosTotales) && snap.segundosTotales >= 0
        ? snap.segundosTotales
        : 0,
    vehiculos: Array.isArray(snap.vehiculos) ? snap.vehiculos : [],
    metrics: snap.metrics,
  };

  safe.vehiculos = safe.vehiculos.map(v => ({
    ...v,
    segundos: isFiniteNumber(v.segundos) && v.segundos >= 0 ? v.segundos : 0,
    cumplido: !!v.cumplido,
    aperturaAt: isFiniteNumber(v.aperturaAt) ? v.aperturaAt : undefined,
  }));

  return safe;
}

function serializeMetrics(metrics: PlaneacionHeavyMetrics): SerializedHeavyMetrics {
  return {
    ...metrics,
    atencionBySegmentId: [...metrics.atencionBySegmentId.entries()],
    disciplinaBySegmentId: [...metrics.disciplinaBySegmentId.entries()],
  };
}

function deserializeMetrics(raw: SerializedHeavyMetrics): PlaneacionHeavyMetrics {
  return {
    ...raw,
    atencionBySegmentId: new Map(raw.atencionBySegmentId ?? []),
    disciplinaBySegmentId: new Map(raw.disciplinaBySegmentId ?? []),
  };
}

/** Comprueba que las métricas deserializadas no tengan NaN en campos clave. */
export function validateHeavyMetrics(metrics: PlaneacionHeavyMetrics): boolean {
  const m = metrics.anilloSnapshotForEscalera?.metricas;
  const d = metrics.anilloSnapshotForEscalera?.dayStats;
  if (!m || !d) return false;
  const nums = [
    m.planificacionPct,
    m.conquistaMin,
    m.entropiaMin,
    m.jornadaMin,
    m.conquistaArcPct,
    m.entropiaArcPct,
    m.fillPct,
    m.horasCubiertas,
    d.conquistaMin,
    d.entropiaMin,
    d.vacioMin,
    d.centinelaMin,
    metrics.todayTermoLive?.conquistaMin,
    metrics.todayTermoLive?.entropiaMin,
    metrics.todayTermoLive?.vacioMin,
    metrics.disciplinaLive?.indiceDisciplina,
    metrics.atencionLive?.indiceAtencion,
  ];
  return nums.every(n => n == null || isFiniteNumber(n));
}

function metricsToSegundosTotales(metrics: PlaneacionHeavyMetrics): number {
  const jornadaMin = metrics.anilloSnapshotForEscalera?.metricas?.jornadaMin;
  return isFiniteNumber(jornadaMin) && jornadaMin >= 0 ? Math.round(jornadaMin * 60) : 0;
}

function persistSnapshot(
  inputSig: string,
  metrics: PlaneacionHeavyMetrics,
  vehiculos: PlaneacionSnapshotVehicle[] = []
): void {
  if (typeof localStorage === "undefined") return;
  if (!validateHeavyMetrics(metrics)) return;

  const envelope = validateSnapshot({
    inputSig,
    atMs: Date.now(),
    aperturaAt: Date.now(),
    segundosTotales: metricsToSegundosTotales(metrics),
    vehiculos,
    metrics: serializeMetrics(metrics),
  });

  try {
    const serialized = JSON.stringify(envelope);
    localStorage.setItem(PLANEACION_SNAPSHOT_STORAGE_KEY, serialized);
    localStorage.setItem(PLANEACION_CACHE_V2_KEY, serialized);
  } catch {
    /* quota / private mode */
  }
}

function safeParseSnapshotRaw(raw: string): Partial<PlaneacionPersistedSnapshot> | null {
  try {
    return JSON.parse(raw) as Partial<PlaneacionPersistedSnapshot>;
  } catch {
    return null;
  }
}

function readPersistedSnapshotRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  return (
    localStorage.getItem(PLANEACION_CACHE_V2_KEY) ??
    localStorage.getItem(PLANEACION_SNAPSHOT_STORAGE_KEY)
  );
}

function clearPersistedSnapshotKeys(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PLANEACION_SNAPSHOT_STORAGE_KEY);
    localStorage.removeItem(PLANEACION_CACHE_V2_KEY);
  } catch {
    /* noop */
  }
}

/** Carga snapshot persistido; borra cache irrecuperable; intenta backup silencioso. */
export function loadPlaneacionSnapshot(): PlaneacionPersistedSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = readPersistedSnapshotRaw();
    if (!raw) return null;
    const parsed = safeParseSnapshotRaw(raw);
    if (!parsed) {
      clearPersistedSnapshotKeys();
      return null;
    }
    const safe = validateSnapshot(parsed);

    if (safe.metrics && !validateHeavyMetrics(deserializeMetrics(safe.metrics))) {
      clearPersistedSnapshotKeys();
      return null;
    }

    return safe;
  } catch {
    clearPersistedSnapshotKeys();
    return null;
  }
}

export function loadPlaneacionHeavyMetricsFromStorage(
  inputSig?: string
): PlaneacionHeavyMetrics | null {
  const persisted = loadPlaneacionSnapshot();
  if (!persisted?.metrics) return null;
  if (inputSig != null && persisted.inputSig !== inputSig) return null;
  if (Date.now() - persisted.atMs > PLANEACION_CACHE_TTL_MS) return null;

  const metrics = deserializeMetrics(persisted.metrics);
  if (!validateHeavyMetrics(metrics)) {
    clearPlaneacionCache();
    return null;
  }
  return metrics;
}

export function clearPlaneacionCache(): void {
  snapshot = null;
  clearPersistedSnapshotKeys();
}

/** Si caché principal corrupto o vacío, restaura desde backup de jornada. */
export function getPlaneacionHeavyMetricsWithBackup(
  inputSig: string | undefined,
  yesterdayTermoSnapshot: PlanillaDailySnapshot | null
): PlaneacionHeavyMetrics | null {
  const cached = getPlaneacionHeavyMetricsSnapshot(inputSig);
  if (cached) return cached;
  return tryRestoreMetricsFromJornadaBackup(yesterdayTermoSnapshot);
}

/** Snapshot reciente con la misma firma de entrada (TTL 30s). */
export function getPlaneacionHeavyMetricsSnapshot(
  inputSig?: string
): PlaneacionHeavyMetrics | null {
  if (snapshot) {
    if (inputSig != null && snapshot.inputSig !== inputSig) return null;
    if (Date.now() - snapshot.atMs > PLANEACION_CACHE_TTL_MS) return null;
    if (!validateHeavyMetrics(snapshot.metrics)) {
      clearPlaneacionCache();
      return null;
    }
    return snapshot.metrics;
  }

  return loadPlaneacionHeavyMetricsFromStorage(inputSig);
}

export function setPlaneacionHeavyMetricsSnapshot(
  inputSig: string,
  metrics: PlaneacionHeavyMetrics,
  vehiculos: PlaneacionSnapshotVehicle[] = []
): void {
  if (!validateHeavyMetrics(metrics)) {
    clearPlaneacionCache();
    return;
  }
  snapshot = { inputSig, metrics, atMs: Date.now() };
  persistSnapshot(inputSig, metrics, vehiculos);
}

export function invalidatePlaneacionHeavyMetricsCache(): void {
  clearPlaneacionCache();
}
