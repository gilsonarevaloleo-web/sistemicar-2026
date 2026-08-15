import fs from "fs";
import path from "path";
import {
  VENDEDOR_CALLS_DAILY_LIMIT,
  type VendedorCallRecord,
  type VendedorCallStatus,
} from "../shared/vendedor/callTypes";

/** En Netlify el FS del bundle es read-only: usar /tmp + memoria. */
function resolveDataDir(): string {
  const serverless =
    process.env.SERVERLESS === "1" ||
    !!process.env.NETLIFY ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (serverless) return path.join("/tmp", "sistemicar-data");
  return path.resolve(process.cwd(), "data");
}

function callsFilePath(): string {
  return path.join(resolveDataDir(), "vendedor-calls.json");
}

/** Cache en memoria (warm instances / serverless). */
let memoryCalls: VendedorCallRecord[] | null = null;

function ensureDataFile(): void {
  const dir = resolveDataDir();
  const file = callsFilePath();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf8");
    }
  } catch (err) {
    console.warn("[vendedorCalls] FS no escribible, solo memoria:", (err as Error)?.message);
  }
}

function readCalls(): VendedorCallRecord[] {
  if (memoryCalls) return memoryCalls;
  ensureDataFile();
  try {
    const raw = fs.readFileSync(callsFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    memoryCalls = Array.isArray(parsed) ? parsed : [];
    return memoryCalls;
  } catch {
    memoryCalls = memoryCalls ?? [];
    return memoryCalls;
  }
}

function writeCalls(rows: VendedorCallRecord[]): void {
  memoryCalls = rows;
  ensureDataFile();
  try {
    fs.writeFileSync(callsFilePath(), JSON.stringify(rows, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[vendedorCalls] No se pudo persistir a disco (ok en serverless):",
      (err as Error)?.message,
    );
  }
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
