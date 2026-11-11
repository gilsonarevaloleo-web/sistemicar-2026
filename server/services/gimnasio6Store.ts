/**
 * Persistencia de libros del gimnasio (planeta 6).
 * Memoria en tests; Postgres si hay DATABASE_URL.
 */

import { randomUUID } from "crypto";
import pkg from "pg";
import type { LibroGimnasio } from "../../shared/casas/gimnasio6/types.ts";
import { recursosVacios } from "../../shared/casas/gimnasio6/motor.ts";
import { resolveDatabaseUrl } from "./databaseUrl.ts";

const { Pool } = pkg;

export interface Gimnasio6Store {
  getById(id: string): Promise<LibroGimnasio | null>;
  getBySesionUmbral5(userId: string, sesionUmbral5Id: string): Promise<LibroGimnasio | null>;
  listByUser(userId: string, limit?: number): Promise<LibroGimnasio[]>;
  save(libro: LibroGimnasio): Promise<LibroGimnasio>;
  clear?(): Promise<void>;
}

export const GIMNASIO6_LIST_LIMIT = 40;

export function newLibroGimnasioId(): string {
  return randomUUID();
}

function sortByUpdatedDesc(a: LibroGimnasio, b: LibroGimnasio): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function sortByCreatedDesc(a: LibroGimnasio, b: LibroGimnasio): number {
  const byCreated = b.createdAt.localeCompare(a.createdAt);
  if (byCreated !== 0) return byCreated;
  return b.id.localeCompare(a.id);
}

function asCodigo(n: unknown): LibroGimnasio["puntero"]["capitulo"] {
  const v = Number(n);
  if (Number.isInteger(v) && v >= 1 && v <= 10) {
    return v as LibroGimnasio["puntero"]["capitulo"];
  }
  return 1;
}

function normalizeLibro(raw: LibroGimnasio): LibroGimnasio {
  const cap = asCodigo(raw.puntero?.capitulo);
  const sub = raw.puntero?.subcodigo;
  const ind = raw.puntero?.indice;
  const modulo = raw.modulo === "vendedor" ? "vendedor" : "limite";
  return {
    id: String(raw.id),
    userId: String(raw.userId),
    sesionUmbral5Id: String(raw.sesionUmbral5Id ?? ""),
    modulo,
    limiteOrigen: String(raw.limiteOrigen ?? ""),
    recursos: {
      experiencia: String(raw.recursos?.experiencia ?? ""),
      miedo: String(raw.recursos?.miedo ?? ""),
      familia: String(raw.recursos?.familia ?? ""),
      gustos: String(raw.recursos?.gustos ?? ""),
    },
    puntero: {
      capitulo: cap,
      subcodigo: sub === 2 || sub === 3 || sub === 4 ? sub : 1,
      indice: ind === 2 || ind === 3 ? ind : 1,
      variante: Math.max(0, Number(raw.puntero?.variante ?? 0) || 0),
    },
    estado:
      raw.estado === "TOPE_DIARIO" ||
      raw.estado === "CAPITULO_SELLADO" ||
      raw.estado === "LIBRO_CERRADO"
        ? raw.estado
        : "ABIERTO",
    capituloSelladoDia: raw.capituloSelladoDia ? String(raw.capituloSelladoDia) : null,
    capitulosSellados: Array.isArray(raw.capitulosSellados)
      ? raw.capitulosSellados
          .map((c) => asCodigo(c))
          .filter((c, i, arr) => arr.indexOf(c) === i)
      : [],
    turnos: Array.isArray(raw.turnos) ? raw.turnos : [],
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export function createMemoryGimnasio6Store(): Gimnasio6Store {
  const byId = new Map<string, LibroGimnasio>();
  return {
    async getById(id) {
      return byId.get(id) ?? null;
    },
    async getBySesionUmbral5(userId, sesionUmbral5Id) {
      const uid = String(userId ?? "").trim();
      const sid = String(sesionUmbral5Id ?? "").trim();
      if (!uid || !sid) return null;
      const found = [...byId.values()]
        .filter((l) => l.userId === uid && l.sesionUmbral5Id === sid)
        .sort(sortByUpdatedDesc);
      return found[0] ?? null;
    },
    async listByUser(userId, limit = GIMNASIO6_LIST_LIMIT) {
      const uid = String(userId ?? "").trim();
      if (!uid) return [];
      return [...byId.values()]
        .filter((l) => l.userId === uid)
        .sort(sortByCreatedDesc)
        .slice(0, Math.max(1, limit));
    },
    async save(libro) {
      const normalized = normalizeLibro(libro);
      byId.set(normalized.id, normalized);
      return normalized;
    },
    async clear() {
      byId.clear();
    },
  };
}

let pool: InstanceType<typeof Pool> | null = null;

export function hydrateLibroGimnasio(
  raw: unknown,
  expected?: { userId?: string; id?: string },
): LibroGimnasio | null {
  if (!raw || typeof raw !== "object") return null;
  const libro = normalizeLibro(raw as LibroGimnasio);
  if (!libro.id || !libro.userId) return null;
  if (expected?.id && libro.id !== expected.id) return null;
  if (expected?.userId && libro.userId !== expected.userId) return null;
  return libro;
}

function getPool(): InstanceType<typeof Pool> | null {
  const url = resolveDatabaseUrl();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  return pool;
}

export async function initGimnasio6LibrosTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS gimnasio6_libros (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      sesion_umbral5_id VARCHAR(64) NOT NULL,
      libro JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gimnasio6_libros_user
      ON gimnasio6_libros(user_id);
    CREATE INDEX IF NOT EXISTS idx_gimnasio6_libros_sesion
      ON gimnasio6_libros(sesion_umbral5_id);
  `);
}

function rowToLibro(row: Record<string, unknown>): LibroGimnasio {
  const raw =
    typeof row.libro === "string" ? JSON.parse(row.libro) : row.libro;
  return normalizeLibro(raw as LibroGimnasio);
}

export function createPostgresGimnasio6Store(): Gimnasio6Store {
  return {
    async getById(id) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM gimnasio6_libros WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) return null;
      return rowToLibro(result.rows[0]);
    },
    async getBySesionUmbral5(userId, sesionUmbral5Id) {
      const p = getPool();
      if (!p) return null;
      const result = await p.query(
        `SELECT * FROM gimnasio6_libros
         WHERE user_id = $1 AND sesion_umbral5_id = $2
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId, sesionUmbral5Id],
      );
      if (result.rows.length === 0) return null;
      return rowToLibro(result.rows[0]);
    },
    async listByUser(userId, limit = GIMNASIO6_LIST_LIMIT) {
      const p = getPool();
      if (!p) return [];
      const uid = String(userId ?? "").trim();
      if (!uid) return [];
      const result = await p.query(
        `SELECT * FROM gimnasio6_libros
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [uid, Math.max(1, limit)],
      );
      return result.rows.map((row) => rowToLibro(row));
    },
    async save(libro) {
      const p = getPool();
      if (!p) throw new Error("DATABASE_URL no configurada para gimnasio6_libros");
      const s = normalizeLibro(libro);
      await p.query(
        `INSERT INTO gimnasio6_libros (
          id, user_id, sesion_umbral5_id, libro, created_at, updated_at
        ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)
        ON CONFLICT (id) DO UPDATE SET
          libro = EXCLUDED.libro,
          updated_at = EXCLUDED.updated_at`,
        [s.id, s.userId, s.sesionUmbral5Id, JSON.stringify(s), s.createdAt, s.updatedAt],
      );
      return s;
    },
  };
}

export function createDefaultGimnasio6Store(): Gimnasio6Store {
  if (resolveDatabaseUrl()) return createPostgresGimnasio6Store();
  return createMemoryGimnasio6Store();
}

export { recursosVacios };
