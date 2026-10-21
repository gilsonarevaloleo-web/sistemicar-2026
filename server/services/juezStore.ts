/**
 * Persistencia de sesiones del Juez Serio.
 * Memoria en tests; Postgres si hay DATABASE_URL.
 */

import { randomUUID } from "crypto";
import pkg from "pg";
import type { SesionJuez } from "../../shared/casas/codigo4/sesion.ts";
import type { JuezSerioFase1, JuezSerioFase2 } from "../../shared/casas/codigo4/types.ts";

const { Pool } = pkg;

export interface JuezSessionStore {
  getById(id: string): Promise<SesionJuez | null>;
  save(sesion: SesionJuez): Promise<SesionJuez>;
  clear?(): Promise<void>;
}

export function newSesionJuezId(): string {
  return randomUUID();
}

function normalizeSesion(raw: SesionJuez): SesionJuez {
  return {
    id: String(raw.id),
    userId: String(raw.userId),
    textoVolcado: String(raw.textoVolcado ?? ""),
    fase1: raw.fase1,
    fase2: raw.fase2,
    source: raw.source === "gemini" ? "gemini" : "local_fallback",
    estado: raw.estado === "FASE2_ABIERTA" ? "FASE2_ABIERTA" : "FASE1",
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export function createMemoryJuezStore(): JuezSessionStore {
  const byId = new Map<string, SesionJuez>();
  return {
    async getById(id) {
      return byId.get(id) ?? null;
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

export async function initJuezSesionesTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS juez_sesiones (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      texto_volcado TEXT NOT NULL,
      fase1 JSONB NOT NULL,
      fase2 JSONB NOT NULL,
      source VARCHAR(24) NOT NULL,
      estado VARCHAR(24) NOT NULL DEFAULT 'FASE1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_juez_sesiones_user
      ON juez_sesiones(user_id);
  `);
}

function rowToSesion(row: Record<string, unknown>): SesionJuez {
  const fase1 =
    typeof row.fase1 === "string" ? JSON.parse(row.fase1) : row.fase1;
  const fase2 =
    typeof row.fase2 === "string" ? JSON.parse(row.fase2) : row.fase2;
  return normalizeSesion({
    id: String(row.id),
    userId: String(row.user_id),
    textoVolcado: String(row.texto_volcado ?? ""),
    fase1: fase1 as JuezSerioFase1,
    fase2: fase2 as JuezSerioFase2,
    source: row.source as SesionJuez["source"],
    estado: row.estado as SesionJuez["estado"],
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

export function createPostgresJuezStore(): JuezSessionStore {
  return {
    async getById(id) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM juez_sesiones WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) return null;
      return rowToSesion(result.rows[0]);
    },
    async save(sesion) {
      const p = getPool();
      if (!p) throw new Error("DATABASE_URL no configurada para juez_sesiones");
      const s = normalizeSesion(sesion);
      await p.query(
        `INSERT INTO juez_sesiones (
          id, user_id, texto_volcado, fase1, fase2, source, estado, created_at, updated_at
        ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          texto_volcado = EXCLUDED.texto_volcado,
          fase1 = EXCLUDED.fase1,
          fase2 = EXCLUDED.fase2,
          source = EXCLUDED.source,
          estado = EXCLUDED.estado,
          updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.userId,
          s.textoVolcado,
          JSON.stringify(s.fase1),
          JSON.stringify(s.fase2),
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

export function createDefaultJuezStore(): JuezSessionStore {
  if (process.env.DATABASE_URL) return createPostgresJuezStore();
  return createMemoryJuezStore();
}
