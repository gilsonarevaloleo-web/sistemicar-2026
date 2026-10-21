/**
 * Billetera de créditos del Juez Serio.
 * Inyectable: memoria en tests, Postgres en producción.
 */

import pkg from "pg";

const { Pool } = pkg;

export interface DebitoJuezOk {
  ok: true;
  saldo: number;
}

export interface DebitoJuezErr {
  ok: false;
  saldo: number;
}

export type DebitoJuez = DebitoJuezOk | DebitoJuezErr;

export interface JuezCreditWallet {
  saldo(userId: string): Promise<number>;
  debitar(userId: string, amount: number): Promise<DebitoJuez>;
  acreditar(userId: string, amount: number): Promise<number>;
}

export function createMemoryJuezWallet(
  inicial: Record<string, number> = {},
): JuezCreditWallet {
  const map = new Map<string, number>(Object.entries(inicial));
  return {
    async saldo(userId) {
      return map.get(userId) ?? 0;
    },
    async debitar(userId, amount) {
      const current = map.get(userId) ?? 0;
      if (amount <= 0) return { ok: true, saldo: current };
      if (current < amount) return { ok: false, saldo: current };
      const next = current - amount;
      map.set(userId, next);
      return { ok: true, saldo: next };
    },
    async acreditar(userId, amount) {
      const next = (map.get(userId) ?? 0) + Math.max(0, amount);
      map.set(userId, next);
      return next;
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

export async function initJuezCreditosTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS juez_creditos (
      user_id VARCHAR(128) PRIMARY KEY,
      saldo INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function createPostgresJuezWallet(): JuezCreditWallet {
  return {
    async saldo(userId) {
      const p = getPool();
      if (!p) return 0;
      const result = await p.query(
        `SELECT saldo FROM juez_creditos WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (result.rows.length === 0) return 0;
      return Number(result.rows[0].saldo) || 0;
    },
    async debitar(userId, amount) {
      const p = getPool();
      if (!p) return { ok: false, saldo: 0 };
      if (amount <= 0) {
        const current = await this.saldo(userId);
        return { ok: true, saldo: current };
      }
      const result = await p.query(
        `UPDATE juez_creditos
         SET saldo = saldo - $2, updated_at = NOW()
         WHERE user_id = $1 AND saldo >= $2
         RETURNING saldo`,
        [userId, amount],
      );
      if (result.rows.length === 0) {
        const current = await this.saldo(userId);
        return { ok: false, saldo: current };
      }
      return { ok: true, saldo: Number(result.rows[0].saldo) || 0 };
    },
    async acreditar(userId, amount) {
      const p = getPool();
      if (!p) return 0;
      const add = Math.max(0, amount);
      const result = await p.query(
        `INSERT INTO juez_creditos (user_id, saldo, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET saldo = juez_creditos.saldo + $2, updated_at = NOW()
         RETURNING saldo`,
        [userId, add],
      );
      return Number(result.rows[0]?.saldo) || 0;
    },
  };
}

export function createDefaultJuezWallet(): JuezCreditWallet {
  if (process.env.DATABASE_URL) return createPostgresJuezWallet();
  return createMemoryJuezWallet();
}
