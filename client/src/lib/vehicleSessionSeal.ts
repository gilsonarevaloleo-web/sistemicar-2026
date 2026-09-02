/**
 * Sellado irreversible de cierre vehicular (sobrevive reconcile Firebase tardío).
 */
import type { Vehicle } from "./persistence";
import { getJournalDayStartMs } from "./segmentTime";

const SEALED_KEY = "sistemicar_vehicle_sealed_closes_v1";

export interface VehicleSealRecord {
  vehicleId: string;
  clientRequestId?: string;
  cierreAt: number;
  status: Vehicle["status"];
  journalDayMs: number;
  sealedAtMs: number;
}

let memorySealedMap: Record<string, VehicleSealRecord> | null = null;

function readSealedMap(): Record<string, VehicleSealRecord> {
  if (memorySealedMap) return memorySealedMap;
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEALED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, VehicleSealRecord>;
    const map = parsed && typeof parsed === "object" ? parsed : {};
    memorySealedMap = map;
    return map;
  } catch {
    return {};
  }
}

function writeSealedMap(map: Record<string, VehicleSealRecord>): void {
  memorySealedMap = map;
  if (typeof localStorage === "undefined") return;
  try {
    const journalDay = getJournalDayStartMs();
    const prevJournal = journalDay - 24 * 3600_000;
    const pruned: Record<string, VehicleSealRecord> = {};
    for (const [id, rec] of Object.entries(map)) {
      if (rec.journalDayMs === journalDay || rec.journalDayMs === prevJournal) {
        pruned[id] = rec;
      }
    }
    localStorage.setItem(SEALED_KEY, JSON.stringify(pruned));
  } catch {
    /* quota */
  }
}

export function sealVehicleSessionClose(
  vehicleId: string,
  params: {
    cierreAt: number;
    status: Vehicle["status"];
    clientRequestId?: string;
  }
): void {
  const journalDayMs = getJournalDayStartMs(params.cierreAt);
  const map = readSealedMap();
  map[vehicleId] = {
    vehicleId,
    clientRequestId: params.clientRequestId,
    cierreAt: params.cierreAt,
    status: params.status,
    journalDayMs,
    sealedAtMs: Date.now(),
  };
  if (params.clientRequestId) {
    map[`crq:${params.clientRequestId}`] = map[vehicleId];
  }
  writeSealedMap(map);
}

export function getVehicleSealRecord(vehicleId: string, clientRequestId?: string): VehicleSealRecord | null {
  const map = readSealedMap();
  const byId = map[vehicleId];
  if (byId) return byId;
  if (clientRequestId) {
    const byCrq = map[`crq:${clientRequestId}`];
    if (byCrq) return byCrq;
  }
  return null;
}

export function isVehicleSessionSealed(vehicleId: string, clientRequestId?: string): boolean {
  return getVehicleSealRecord(vehicleId, clientRequestId) != null;
}

/** Aplica sellado sobre snapshot remoto/local — impide resurrección como `activo`. */
export function applyVehicleSessionSeal(v: Vehicle): Vehicle {
  const seal = getVehicleSealRecord(v.id, v.clientRequestId);
  if (!seal) return v;
  if (v.status === seal.status && v.cierreAt === seal.cierreAt) return v;
  return {
    ...v,
    status: seal.status,
    cierreAt: seal.cierreAt,
    cierreManual: v.cierreManual ?? true,
    interrupcionActiva: false,
    desglosadorPausa: undefined,
    situacionCronometro: v.situacionCronometro
      ? { ...v.situacionCronometro, activo: false }
      : v.situacionCronometro,
    situacionCupoAnchor: null,
  };
}

export function resetVehicleSessionSealsForTests(): void {
  memorySealedMap = {};
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(SEALED_KEY);
    } catch {
      /* ignore */
    }
  }
}
