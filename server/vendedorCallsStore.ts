import fs from "fs";
import path from "path";
import {
  VENDEDOR_CALLS_DAILY_LIMIT,
  type VendedorCallRecord,
  type VendedorCallStatus,
} from "../shared/vendedor/callTypes";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CALLS_FILE = path.join(DATA_DIR, "vendedor-calls.json");

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CALLS_FILE)) {
    fs.writeFileSync(CALLS_FILE, "[]", "utf8");
  }
}

function readCalls(): VendedorCallRecord[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(CALLS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCalls(rows: VendedorCallRecord[]): void {
  ensureDataFile();
  fs.writeFileSync(CALLS_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function startOfUtcDayIso(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString();
}

/** Llamadas creadas hoy (UTC), excluye limit_blocked. */
export function countCallsToday(): number {
  const start = startOfUtcDayIso();
  return readCalls().filter(
    (c) => c.createdAt >= start && c.status !== "limit_blocked",
  ).length;
}

export function getDailyCallLimit(): number {
  const raw = process.env.VENDEDOR_CALLS_DAILY_LIMIT;
  const n = raw ? parseInt(raw, 10) : VENDEDOR_CALLS_DAILY_LIMIT;
  return Number.isFinite(n) && n > 0 ? n : VENDEDOR_CALLS_DAILY_LIMIT;
}

export function listVendedorCalls(limit = 50): VendedorCallRecord[] {
  return readCalls().slice(0, Math.min(Math.max(1, limit), 200));
}

export function getVendedorCall(id: string): VendedorCallRecord | null {
  return readCalls().find((c) => c.id === id) ?? null;
}

export function insertVendedorCall(
  record: VendedorCallRecord,
): VendedorCallRecord {
  const rows = readCalls();
  rows.unshift(record);
  writeCalls(rows);
  return record;
}

export function updateVendedorCall(
  id: string,
  patch: Partial<VendedorCallRecord>,
): VendedorCallRecord | null {
  const rows = readCalls();
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  rows[idx] = {
    ...rows[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeCalls(rows);
  return rows[idx];
}

export function canAcceptNewCall(): {
  ok: boolean;
  used: number;
  limit: number;
} {
  const used = countCallsToday();
  const limit = getDailyCallLimit();
  return { ok: used < limit, used, limit };
}

export type { VendedorCallRecord, VendedorCallStatus };
