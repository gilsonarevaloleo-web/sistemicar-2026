import { randomBytes } from "crypto";
import pkg from "pg";
import {
  addEspejoCreditsForUser,
  getEspejoCreditsForUser,
  lookupUidByEmail,
  setEspejoCreditsForUser,
} from "./firebaseAdmin";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export type EspejoDeliveryStatus = "pending" | "granted" | "failed";

export async function initEspejoCreditDeliveriesTable(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS espejo_credit_deliveries (
      id SERIAL PRIMARY KEY,
      mp_payment_id VARCHAR(100) NOT NULL UNIQUE,
      buyer_email VARCHAR(200) NOT NULL,
      credits INTEGER NOT NULL DEFAULT 10,
      plan_id VARCHAR(50) NOT NULL,
      firebase_uid VARCHAR(128),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      source VARCHAR(30) DEFAULT 'mp',
      admin_note TEXT,
      granted_by VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      granted_at TIMESTAMPTZ
    );
    ALTER TABLE espejo_credit_deliveries ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'mp';
    ALTER TABLE espejo_credit_deliveries ADD COLUMN IF NOT EXISTS admin_note TEXT;
    ALTER TABLE espejo_credit_deliveries ADD COLUMN IF NOT EXISTS granted_by VARCHAR(200);
  `);
}

export interface EspejoDeliveryRow {
  id: number;
  mpPaymentId: string;
  buyerEmail: string;
  credits: number;
  planId: string;
  status: EspejoDeliveryStatus;
  source: string;
  adminNote: string | null;
  grantedBy: string | null;
  firebaseUid: string | null;
  createdAt: string;
  grantedAt: string | null;
}

export async function getEspejoDeliveryByPaymentId(
  mpPaymentId: string
): Promise<{ exists: false } | { exists: true; status: EspejoDeliveryStatus; buyerEmail: string; credits: number }> {
  if (!process.env.DATABASE_URL) return { exists: false };
  const result = await pool.query(
    `SELECT status, buyer_email, credits FROM espejo_credit_deliveries WHERE mp_payment_id = $1 LIMIT 1`,
    [mpPaymentId]
  );
  if (result.rows.length === 0) return { exists: false };
  const row = result.rows[0];
  return {
    exists: true,
    status: row.status as EspejoDeliveryStatus,
    buyerEmail: row.buyer_email,
    credits: row.credits as number,
  };
}

export async function registerEspejoDelivery(params: {
  mpPaymentId: string;
  buyerEmail: string;
  credits: number;
  planId: string;
}): Promise<{ id: number } | null> {
  if (!process.env.DATABASE_URL) return null;
  const email = params.buyerEmail.trim().toLowerCase();
  const result = await pool.query(
    `INSERT INTO espejo_credit_deliveries (mp_payment_id, buyer_email, credits, plan_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (mp_payment_id) DO NOTHING
     RETURNING id`,
    [params.mpPaymentId, email, params.credits, params.planId]
  );
  if (result.rows.length === 0) return null;
  return { id: result.rows[0].id as number };
}

export async function markEspejoDeliveryGranted(
  mpPaymentId: string,
  firebaseUid?: string
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await pool.query(
    `UPDATE espejo_credit_deliveries
     SET status = 'granted', firebase_uid = COALESCE($2, firebase_uid), granted_at = NOW()
     WHERE mp_payment_id = $1`,
    [mpPaymentId, firebaseUid ?? null]
  );
}

export async function markEspejoDeliveryFailed(mpPaymentId: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await pool.query(
    `UPDATE espejo_credit_deliveries SET status = 'failed' WHERE mp_payment_id = $1`,
    [mpPaymentId]
  );
}

export async function getPendingCreditsForEmail(email: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT COALESCE(SUM(credits), 0)::int AS total
     FROM espejo_credit_deliveries
     WHERE buyer_email = $1 AND status = 'pending'`,
    [normalized]
  );
  return (result.rows[0]?.total as number) ?? 0;
}

export async function grantPendingDeliveriesForEmail(
  email: string,
  firebaseUid: string
): Promise<{ grantedCredits: number; paymentIds: string[] }> {
  if (!process.env.DATABASE_URL) {
    return { grantedCredits: 0, paymentIds: [] };
  }
  const normalized = email.trim().toLowerCase();
  const pending = await pool.query(
    `SELECT mp_payment_id, credits FROM espejo_credit_deliveries
     WHERE buyer_email = $1 AND status = 'pending'`,
    [normalized]
  );
  let total = 0;
  const paymentIds: string[] = [];
  for (const row of pending.rows) {
    const paymentId = row.mp_payment_id as string;
    const credits = row.credits as number;
    const ok = await addEspejoCreditsForUser(firebaseUid, credits);
    if (ok) {
      await markEspejoDeliveryGranted(paymentId, firebaseUid);
      total += credits;
      paymentIds.push(paymentId);
    }
  }
  return { grantedCredits: total, paymentIds };
}

export async function processEspejoCreditPayment(params: {
  mpPaymentId: string;
  buyerEmail: string;
  credits: number;
  planId: string;
}): Promise<{ granted: boolean; uid?: string }> {
  const email = params.buyerEmail.trim().toLowerCase();
  if (!email) return { granted: false };

  await registerEspejoDelivery({
    mpPaymentId: params.mpPaymentId,
    buyerEmail: email,
    credits: params.credits,
    planId: params.planId,
  });

  const existing = await getEspejoDeliveryByPaymentId(params.mpPaymentId);
  if (existing.exists && existing.status === "granted") {
    return { granted: true };
  }

  const uid = await lookupUidByEmail(email);
  if (!uid) {
    console.log(`[Espejo] Pago ${params.mpPaymentId}: sin cuenta Firebase para ${email} � pendiente de claim`);
    return { granted: false };
  }

  const ok = await addEspejoCreditsForUser(uid, params.credits);
  if (ok) {
    await markEspejoDeliveryGranted(params.mpPaymentId, uid);
    console.log(`[Espejo] +${params.credits} creditos a uid ${uid} (pago ${params.mpPaymentId})`);
    return { granted: true, uid };
  }

  console.warn(`[Espejo] Firestore no disponible � entrega pendiente para ${email}`);
  return { granted: false };
}

export async function listEspejoDeliveries(limit = 40): Promise<EspejoDeliveryRow[]> {
  if (!process.env.DATABASE_URL) return [];
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const result = await pool.query(
    `SELECT id, mp_payment_id, buyer_email, credits, plan_id, status, source, admin_note, granted_by, firebase_uid, created_at, granted_at
     FROM espejo_credit_deliveries
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return result.rows.map((row) => ({
    id: row.id as number,
    mpPaymentId: row.mp_payment_id as string,
    buyerEmail: row.buyer_email as string,
    credits: row.credits as number,
    planId: row.plan_id as string,
    status: row.status as EspejoDeliveryStatus,
    source: (row.source as string) || "mp",
    adminNote: (row.admin_note as string) || null,
    grantedBy: (row.granted_by as string) || null,
    firebaseUid: (row.firebase_uid as string) || null,
    createdAt: new Date(row.created_at).toISOString(),
    grantedAt: row.granted_at ? new Date(row.granted_at).toISOString() : null,
  }));
}

export type AdminGrantMode = "add" | "set";

export async function adminGrantEspejoCredits(params: {
  buyerEmail: string;
  credits: number;
  source: "yape" | "paypal" | "manual" | "mp";
  reference?: string;
  note?: string;
  mode?: AdminGrantMode;
  grantedBy?: string;
  planId?: string;
}): Promise<{
  deliveryId: string;
  granted: boolean;
  pending: boolean;
  duplicate: boolean;
  uid?: string;
  totalCredits?: number;
}> {
  const email = params.buyerEmail.trim().toLowerCase();
  const credits = Math.floor(params.credits);
  if (!email || credits <= 0) {
    throw new Error("Email y creditos validos son requeridos.");
  }

  const refPart = params.reference?.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const deliveryId = refPart
    ? `${params.source}:${refPart}`
    : `${params.source}:${Date.now()}:${randomBytes(4).toString("hex")}`;

  const existing = await getEspejoDeliveryByPaymentId(deliveryId);
  if (existing.exists && existing.status === "granted") {
    return { deliveryId, granted: true, pending: false, duplicate: true };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no configurada � no se puede auditar la entrega.");
  }

  await pool.query(
    `INSERT INTO espejo_credit_deliveries
       (mp_payment_id, buyer_email, credits, plan_id, status, source, admin_note, granted_by)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
     ON CONFLICT (mp_payment_id) DO NOTHING`,
    [
      deliveryId,
      email,
      credits,
      params.planId || "espejo_inicio",
      params.source,
      params.note?.trim() || null,
      params.grantedBy?.trim() || null,
    ]
  );

  const uid = await lookupUidByEmail(email);
  const mode = params.mode || "add";

  if (!uid) {
    console.log(`[Espejo Admin] ${deliveryId}: sin cuenta para ${email} � pendiente de claim`);
    return { deliveryId, granted: false, pending: true, duplicate: false };
  }

  let ok = false;
  if (mode === "set") {
    ok = await setEspejoCreditsForUser(uid, credits);
  } else {
    ok = await addEspejoCreditsForUser(uid, credits);
  }

  if (!ok) {
    return { deliveryId, granted: false, pending: true, duplicate: false, uid };
  }

  await markEspejoDeliveryGranted(deliveryId, uid);
  const totalCredits = await getEspejoCreditsForUser(uid);
  console.log(`[Espejo Admin] ${mode === "set" ? "set" : "+"}${credits} creditos ? ${email} (${deliveryId})`);
  return {
    deliveryId,
    granted: true,
    pending: false,
    duplicate: false,
    uid,
    totalCredits: totalCredits ?? undefined,
  };
}
