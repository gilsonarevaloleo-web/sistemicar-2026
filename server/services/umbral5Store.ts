/**
 * Persistencia de sesiones de la Casa 5: Umbral.
 * Memoria en tests; Postgres si hay DATABASE_URL.
 */

import { randomUUID } from "crypto";
import pkg from "pg";
import type { SesionUmbral5 } from "../../shared/casas/umbral5/sesion.ts";
import type { Umbral5Lectura } from "../../shared/casas/umbral5/types.ts";

const { Pool } = pkg;

export interface Umbral5SessionStore {
  getById(id: string): Promise<SesionUmbral5 | null>;
  listByUser(userId: string, limit?: number): Promise<SesionUmbral5[]>;
  save(sesion: SesionUmbral5): Promise<SesionUmbral5>;
  clear?(): Promise<void>;
}

export const UMBRAL5_LIST_LIMIT = 40;

function sortByUpdatedDesc(a: SesionUmbral5, b: SesionUmbral5): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function newSesionUmbral5Id(): string {
  return randomUUID();
}

function normalizeSesion(raw: SesionUmbral5): SesionUmbral5 {
  return {
    id: String(raw.id),
    userId: String(raw.userId),
    textoVolcado: String(raw.textoVolcado ?? ""),
    lectura: raw.lectura,
    source: raw.source === "gemini" ? "gemini" : raw.source === "local_fallback" ? "local_fallback" : null,
    estado: raw.estado === "MAPA_PAGO" ? "MAPA_PAGO" : "VOLCADO_GRATIS",
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export function createMemoryUmbral5Store(): Umbral5SessionStore {
  const byId = new Map<string, SesionUmbral5>();
  return {
    async getById(id) {
      return byId.get(id) ?? null;
    },
    async listByUser(userId, limit = UMBRAL5_LIST_LIMIT) {
      const uid = String(userId ?? "").trim();
      if (!uid) return [];
      return [...byId.values()]
        .filter((s) => s.userId === uid)
        .sort(sortByUpdatedDesc)
        .slice(0, Math.max(1, limit));
    },
    async save(sesion) {
      const normalized = normalizeSesion(sesion);
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

export async function initUmbral5SesionesTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS umbral5_sesiones (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      texto_volcado TEXT NOT NULL,
      lectura JSONB,
      source VARCHAR(24),
      estado VARCHAR(24) NOT NULL DEFAULT 'VOLCADO_GRATIS',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_umbral5_sesiones_user
      ON umbral5_sesiones(user_id);
  `);
}

function rowToSesion(row: Record<string, unknown>): SesionUmbral5 {
  const lectura =
    row.lectura == null
      ? null
      : typeof row.lectura === "string"
        ? JSON.parse(row.lectura)
        : row.lectura;
  return normalizeSesion({
    id: String(row.id),
    userId: String(row.user_id),
    textoVolcado: String(row.texto_volcado ?? ""),
    lectura: lectura as Umbral5Lectura | null,
    source: row.source as SesionUmbral5["source"],
    estado: row.estado as SesionUmbral5["estado"],
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

export function createPostgresUmbral5Store(): Umbral5SessionStore {
  return {
    async getById(id) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM umbral5_sesiones WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) return null;
      return rowToSesion(result.rows[0]);
    },
    async listByUser(userId, limit = UMBRAL5_LIST_LIMIT) {
      const p = getPool();
      if (!p) return [];
      const uid = String(userId ?? "").trim();
      if (!uid) return [];
      const result = await p.query(
        `SELECT * FROM umbral5_sesiones
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2`,
        [uid, Math.max(1, limit)],
      );
      return result.rows.map((row) => rowToSesion(row));
    },
    async save(sesion) {
      const p = getPool();
      if (!p) throw new Error("DATABASE_URL no configurada para umbral5_sesiones");
      const s = normalizeSesion(sesion);
      await p.query(
        `INSERT INTO umbral5_sesiones (
          id, user_id, texto_volcado, lectura, source, estado, created_at, updated_at
        ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          texto_volcado = EXCLUDED.texto_volcado,
          lectura = EXCLUDED.lectura,
          source = EXCLUDED.source,
          estado = EXCLUDED.estado,
          updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.userId,
          s.textoVolcado,
          s.lectura ? JSON.stringify(s.lectura) : null,
          s.source,
          s.estado,
          s.createdAt,
          s.updatedAt,
        ],
      );
      return s;
    },
  };
}

export function createDefaultUmbral5Store(): Umbral5SessionStore {
  if (process.env.DATABASE_URL) return createPostgresUmbral5Store();
  return createMemoryUmbral5Store();
}
