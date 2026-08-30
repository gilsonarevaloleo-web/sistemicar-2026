/**
 * Cierre al término del plan.
 *
 * Regla: todo vehículo consciente activo se cierra al horaFin del último
 * segmento. El cierre consciente del operador en la última franja
 * (último segmento) suma disciplina. El cierre del sistema no.
 */
import type { Vehicle } from "@/lib/persistence";
import { skipsTriadaCoverage } from "@/lib/concienciaTriadaLinea";
import { safeSetItem } from "@/lib/storageHygiene";
import { getJournalDateString } from "@/lib/segmentTime";

export const BONO_DISCIPLINA_POR_CIERRE = 5;
export const BONO_DISCIPLINA_TOPE = 15;
export const PS_CIERRE_CONSCIENTE_PLAN = 3;

export type CierreConscientePlanLedger = {
  fecha: string;
  vehicleIds: string[];
  n: number;
  bonoPct: number;
  awardedPs: number;
};

export type PlanEndSweepResult = {
  revelacion: import("./revelacionPlanDia").RevelacionPlanDia | null;
  ledger: CierreConscientePlanLedger | null;
  closed: number;
  premiados: number;
};

const LEDGER_KEY = "sistemicar_cierre_consciente_plan_v1";

function ledgerKey(userId: string): string {
  return `${LEDGER_KEY}_${userId}`;
}

/** Activos conscientes que el sistema debe cerrar al término. */
export function vehiclesToCloseAtPlanEnd(vehicles: Vehicle[]): Vehicle[] {
  const out: Vehicle[] = [];
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v || v.status !== "activo") continue;
    if (skipsTriadaCoverage(v)) continue;
    out.push(v);
  }
  return out;
}

/** Ids de vehículos que el operador cerró a mano en la última franja. */
export function collectCierresConscientesAlTermino(
  vehicles: Vehicle[],
  lastSegmentStartMs: number,
  planEndMs: number
): string[] {
  const out: string[] = [];
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v?.id) continue;
    if (!isCierreConscienteAlTermino(v, lastSegmentStartMs, planEndMs)) continue;
    out.push(v.id);
  }
  return out;
}

/** Cierre del operador en la última franja (último segmento). */
export function isCierreConscienteAlTermino(
  vehicle: Pick<Vehicle, "status" | "cierreAt" | "cierreManual">,
  lastSegmentStartMs: number,
  planEndMs: number
): boolean {
  if (vehicle.cierreManual === false) return false;
  const at = vehicle.cierreAt;
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return false;
  if (vehicle.status === "activo") return false;
  return at >= lastSegmentStartMs && at <= planEndMs + 60_000;
}

export function bonoDisciplinaDesdeCierres(n: number): number {
  if (n <= 0) return 0;
  return Math.min(BONO_DISCIPLINA_TOPE, n * BONO_DISCIPLINA_POR_CIERRE);
}

function readLedgerMap(userId: string): Record<string, CierreConscientePlanLedger> {
  try {
    const raw = localStorage.getItem(ledgerKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CierreConscientePlanLedger>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readCierreConscientePlan(
  userId: string,
  fecha?: string
): CierreConscientePlanLedger | null {
  if (!userId) return null;
  const day = fecha ?? getJournalDateString();
  return readLedgerMap(userId)[day] ?? null;
}

/** Idempotente por vehicleId. Devuelve los ids nuevos (para premiar PS una vez). */
export function recordCierresConscientesPlan(
  userId: string,
  vehicleIds: string[],
  fecha?: string
): { ledger: CierreConscientePlanLedger; nuevos: string[] } {
  const day = fecha ?? getJournalDateString();
  const map = readLedgerMap(userId);
  const prev = map[day] ?? {
    fecha: day,
    vehicleIds: [],
    n: 0,
    bonoPct: 0,
    awardedPs: 0,
  };
  const known = new Set(prev.vehicleIds);
  const nuevos: string[] = [];
  for (const id of vehicleIds) {
    const trimmed = id.trim();
    if (!trimmed || known.has(trimmed)) continue;
    known.add(trimmed);
    nuevos.push(trimmed);
  }
  const nextIds = [...prev.vehicleIds, ...nuevos];
  const n = nextIds.length;
  const ledger: CierreConscientePlanLedger = {
    fecha: day,
    vehicleIds: nextIds,
    n,
    bonoPct: bonoDisciplinaDesdeCierres(n),
    awardedPs: prev.awardedPs,
  };
  map[day] = ledger;
  safeSetItem(ledgerKey(userId), JSON.stringify(map));
  return { ledger, nuevos };
}

export function markCierresConscientesPsAwarded(
  userId: string,
  extraPs: number,
  fecha?: string
): CierreConscientePlanLedger | null {
  const day = fecha ?? getJournalDateString();
  const map = readLedgerMap(userId);
  const prev = map[day];
  if (!prev) return null;
  const next = { ...prev, awardedPs: prev.awardedPs + Math.max(0, extraPs) };
  map[day] = next;
  safeSetItem(ledgerKey(userId), JSON.stringify(map));
  return next;
}

export function applyBonoCierreConsciente(
  porcentajeDia: number,
  bonoPct: number
): number {
  return Math.min(120, Math.max(0, Math.round(porcentajeDia + Math.max(0, bonoPct))));
}
