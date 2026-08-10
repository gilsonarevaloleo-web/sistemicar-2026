/**
 * Umbral v2 — Persistencia de sesiones (memoria + Postgres opcional).
 */

import { randomUUID } from "crypto";
import pkg from "pg";
import type { ModoUmbral } from "../shared/umbral/engineConfig";
import type {
  HistorialCodigoUmbral,
  SesionUmbral,
} from "../shared/umbral/sessionTypes";

const { Pool } = pkg;

export interface UmbralSessionStore {
  listByUser(userId: string): Promise<SesionUmbral[]>;
  getById(id: string): Promise<SesionUmbral | null>;
  findActive(userId: string, modo: ModoUmbral): Promise<SesionUmbral | null>;
  save(session: SesionUmbral): Promise<SesionUmbral>;
  /** Solo tests / mantenimiento. */
  clear?(): Promise<void>;
}

function normalizeHistorial(raw: unknown): HistorialCodigoUmbral[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    codigo: Number(item?.codigo) || 0,
    intentos: Number(item?.intentos) || 0,
    respuestaAprobada: String(item?.respuestaAprobada ?? ""),
    feedbackGemini: String(item?.feedbackGemini ?? ""),
    psGanados: Number(item?.psGanados) || 0,
    fechaAprobacion: String(item?.fechaAprobacion ?? ""),
  }));
}

function normalizeSesion(raw: Partial<SesionUmbral> & { id: string }): SesionUmbral {
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? ""),
    modo: (raw.modo === "EXTERNO_VENTAS"
      ? "EXTERNO_VENTAS"
      : "INTERNO_HABILIDAD") as ModoUmbral,
    estado: raw.estado === "COMPLETADO" ? "COMPLETADO" : "EN_PROGRESO",
    codigoActual: Number(raw.codigoActual) || 1,
    intentosTotales: Number(raw.intentosTotales) || 0,
    historialCodigos: normalizeHistorial(raw.historialCodigos),
    intentosCodigoActual: Number(raw.intentosCodigoActual) || 0,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export function newSesionId(): string {
  return randomUUID();
}

/** Store en memoria — tests y entornos sin DATABASE_URL. */
export function createMemoryUmbralSessionStore(): UmbralSessionStore {
  const byId = new Map<string, SesionUmbral>();

  return {
    async listByUser(userId: string) {
      return [...byId.values()]
        .filter((s) => s.userId === userId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getById(id: string) {
      return byId.get(id) ?? null;
    },
    async findActive(userId: string, modo: ModoUmbral) {
      const list = [...byId.values()]
        .filter(
          (s) =>
            s.userId === userId &&
            s.modo === modo &&
            s.estado === "EN_PROGRESO",
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return list[0] ?? null;
    },
    async save(session: SesionUmbral) {
      const normalized = normalizeSesion(session);
      byId.set(normalized.id, normalized);
      return normalized;
    },
    async clear() {
      byId.clear();
    },
  };
}

let pool: InstanceType<typeof Pool> | null = null;

function getPool(): InstanceType<typeof Pool> | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  return pool;
}

export async function initUmbralSessionsTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS umbral_sesiones (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      modo VARCHAR(32) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'EN_PROGRESO',
      codigo_actual INTEGER NOT NULL DEFAULT 1,
      intentos_totales INTEGER NOT NULL DEFAULT 0,
      historial_codigos JSONB NOT NULL DEFAULT '[]'::jsonb,
      intentos_codigo_actual INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_umbral_sesiones_user
      ON umbral_sesiones(user_id);
    CREATE INDEX IF NOT EXISTS idx_umbral_sesiones_user_modo_estado
      ON umbral_sesiones(user_id, modo, estado);
  `);
}

function rowToSesion(row: Record<string, unknown>): SesionUmbral {
  const historial =
    typeof row.historial_codigos === "string"
      ? JSON.parse(row.historial_codigos)
      : row.historial_codigos;
  return normalizeSesion({
    id: String(row.id),
    userId: String(row.user_id),
    modo: row.modo as ModoUmbral,
    estado: row.estado as SesionUmbral["estado"],
    codigoActual: Number(row.codigo_actual),
    intentosTotales: Number(row.intentos_totales),
    historialCodigos: normalizeHistorial(historial),
    intentosCodigoActual: Number(row.intentos_codigo_actual),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  });
}

export function createPostgresUmbralSessionStore(): UmbralSessionStore {
  return {
    async listByUser(userId: string) {
      const p = getPool();
      if (!p) return [];
      const result = await p.query(
        `SELECT * FROM umbral_sesiones
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId],
      );
      return result.rows.map(rowToSesion);
    },
    async getById(id: string) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM umbral_sesiones WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) return null;
      return rowToSesion(result.rows[0]);
    },
    async findActive(userId: string, modo: ModoUmbral) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM umbral_sesiones
         WHERE user_id = $1 AND modo = $2 AND estado = 'EN_PROGRESO'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId, modo],
      );
      if (result.rows.length === 0) return null;
      return rowToSesion(result.rows[0]);
    },
    async save(session: SesionUmbral) {
      const p = getPool();
      if (!p) {
        throw new Error("DATABASE_URL no configurada para umbral_sesiones");
      }
      const s = normalizeSesion(session);
      await p.query(
        `INSERT INTO umbral_sesiones (
          id, user_id, modo, estado, codigo_actual, intentos_totales,
          historial_codigos, intentos_codigo_actual, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          modo = EXCLUDED.modo,
          estado = EXCLUDED.estado,
          codigo_actual = EXCLUDED.codigo_actual,
          intentos_totales = EXCLUDED.intentos_totales,
          historial_codigos = EXCLUDED.historial_codigos,
          intentos_codigo_actual = EXCLUDED.intentos_codigo_actual,
          updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.userId,
          s.modo,
          s.estado,
          s.codigoActual,
          s.intentosTotales,
          JSON.stringify(s.historialCodigos),
          s.intentosCodigoActual,
          s.createdAt,
          s.updatedAt,
        ],
      );
      return s;
    },
  };
}

/**
 * Elige Postgres si hay DATABASE_URL; si no, memoria.
 * En runtime el init de tabla debe llamarse aparte.
 */
export function createDefaultUmbralSessionStore(): UmbralSessionStore {
  if (process.env.DATABASE_URL) {
    return createPostgresUmbralSessionStore();
  }
  return createMemoryUmbralSessionStore();
}
