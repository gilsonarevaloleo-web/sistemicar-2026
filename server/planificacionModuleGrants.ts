import { randomBytes } from "crypto";
import pkg from "pg";
import {
  activateModulesForUserById,
  lookupUidByEmail,
} from "./firebaseAdmin";
import { modulesGrantedByPlan } from "../shared/moduleAccess";
import {
  buildGrantDeliveryId,
  moduleGrantAdminMessage,
} from "../shared/clientAccount";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export type ModuleGrantStatus = "pending" | "granted" | "failed";

export async function initPlanificacionModuleGrantsTable(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planificacion_module_grants (
      id SERIAL PRIMARY KEY,
      delivery_id VARCHAR(120) NOT NULL UNIQUE,
      buyer_email VARCHAR(200) NOT NULL,
      plan_id VARCHAR(50) NOT NULL,
      firebase_uid VARCHAR(128),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      source VARCHAR(30) DEFAULT 'manual',
      admin_note TEXT,
      granted_by VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      granted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS planificacion_module_grants_email_status
      ON planificacion_module_grants (buyer_email, status);
  `);
}

export interface ModuleGrantRow {
  id: number;
  deliveryId: string;
  buyerEmail: string;
  planId: string;
  status: ModuleGrantStatus;
  source: string;
  adminNote: string | null;
  grantedBy: string | null;
  firebaseUid: string | null;
  createdAt: string;
  grantedAt: string | null;
}

export async function getModuleGrantByDeliveryId(
  deliveryId: string,
): Promise<{ exists: false } | { exists: true; status: ModuleGrantStatus; buyerEmail: string; planId: string }> {
  if (!process.env.DATABASE_URL) return { exists: false };
  const result = await pool.query(
    `SELECT status, buyer_email, plan_id FROM planificacion_module_grants WHERE delivery_id = $1 LIMIT 1`,
    [deliveryId],
  );
  if (result.rows.length === 0) return { exists: false };
  const row = result.rows[0];
  return {
    exists: true,
    status: row.status as ModuleGrantStatus,
    buyerEmail: row.buyer_email,
    planId: row.plan_id,
  };
}

export async function listPendingModuleGrantsForEmail(
  email: string,
): Promise<Array<{ deliveryId: string; planId: string }>> {
  if (!process.env.DATABASE_URL) return [];
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT delivery_id, plan_id FROM planificacion_module_grants
     WHERE buyer_email = $1 AND status = 'pending'`,
    [normalized],
  );
  return result.rows.map((row) => ({
    deliveryId: row.delivery_id as string,
    planId: row.plan_id as string,
  }));
}

export async function markModuleGrantGranted(
  deliveryId: string,
  firebaseUid?: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await pool.query(
    `UPDATE planificacion_module_grants
     SET status = 'granted', firebase_uid = COALESCE($2, firebase_uid), granted_at = NOW()
     WHERE delivery_id = $1`,
    [deliveryId, firebaseUid ?? null],
  );
}

export async function grantPendingModulesForEmail(
  email: string,
  firebaseUid: string,
): Promise<{ grantedPlans: string[]; deliveryIds: string[] }> {
  const pending = await listPendingModuleGrantsForEmail(email);
  const grantedPlans: string[] = [];
  const deliveryIds: string[] = [];
  for (const row of pending) {
    if (modulesGrantedByPlan(row.planId).length === 0) continue;
    const ok = await activateModulesForUserById(firebaseUid, row.planId);
    if (ok) {
      await markModuleGrantGranted(row.deliveryId, firebaseUid);
      grantedPlans.push(row.planId);
      deliveryIds.push(row.deliveryId);
    }
  }
  return { grantedPlans, deliveryIds };
}

export async function processPlanificacionModulePayment(params: {
  deliveryId: string;
  buyerEmail: string;
  planId: string;
  source?: string;
  note?: string;
  grantedBy?: string;
}): Promise<{ granted: boolean; pending: boolean; uid?: string }> {
  const email = params.buyerEmail.trim().toLowerCase();
  const planId = params.planId.trim();
  if (!email || modulesGrantedByPlan(planId).length === 0) {
    return { granted: false, pending: false };
  }

  if (process.env.DATABASE_URL) {
    await pool.query(
      `INSERT INTO planificacion_module_grants
         (delivery_id, buyer_email, plan_id, status, source, admin_note, granted_by)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       ON CONFLICT (delivery_id) DO NOTHING`,
      [
        params.deliveryId,
        email,
        planId,
        params.source || "mp",
        params.note?.trim() || null,
        params.grantedBy?.trim() || null,
      ],
    );

    const existing = await getModuleGrantByDeliveryId(params.deliveryId);
    if (existing.exists && existing.status === "granted") {
      return { granted: true, pending: false };
    }
  }

  const uid = await lookupUidByEmail(email);
  if (!uid) {
    console.log(
      `[Planificacion] ${params.deliveryId}: sin cuenta Firebase para ${email} — pendiente de /acceso`,
    );
    return { granted: false, pending: Boolean(process.env.DATABASE_URL) };
  }

  const ok = await activateModulesForUserById(uid, planId);
  if (ok) {
    await markModuleGrantGranted(params.deliveryId, uid);
    console.log(`[Planificacion] ${planId} activado para uid ${uid} (${params.deliveryId})`);
    return { granted: true, pending: false, uid };
  }

  console.warn(`[Planificacion] Firestore no disponible — entrega pendiente para ${email}`);
  return { granted: false, pending: Boolean(process.env.DATABASE_URL), uid };
}

export async function listModuleGrants(limit = 40): Promise<ModuleGrantRow[]> {
  if (!process.env.DATABASE_URL) return [];
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const result = await pool.query(
    `SELECT id, delivery_id, buyer_email, plan_id, status, source, admin_note, granted_by, firebase_uid, created_at, granted_at
     FROM planificacion_module_grants
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  return result.rows.map((row) => ({
    id: row.id as number,
    deliveryId: row.delivery_id as string,
    buyerEmail: row.buyer_email as string,
    planId: row.plan_id as string,
    status: row.status as ModuleGrantStatus,
    source: (row.source as string) || "manual",
    adminNote: (row.admin_note as string) || null,
    grantedBy: (row.granted_by as string) || null,
    firebaseUid: (row.firebase_uid as string) || null,
    createdAt: new Date(row.created_at).toISOString(),
    grantedAt: row.granted_at ? new Date(row.granted_at).toISOString() : null,
  }));
}

export async function adminGrantPlanificacionModule(params: {
  buyerEmail: string;
  planId: string;
  source: "yape" | "paypal" | "manual" | "mp";
  reference?: string;
  note?: string;
  grantedBy?: string;
}): Promise<{
  deliveryId: string;
  granted: boolean;
  pending: boolean;
  duplicate: boolean;
  uid?: string;
  message: string;
}> {
  const email = params.buyerEmail.trim().toLowerCase();
  const planId = params.planId.trim();
  if (!email || !email.includes("@")) {
    throw new Error("Email válido requerido.");
  }
  if (modulesGrantedByPlan(planId).length === 0) {
    throw new Error("Plan no válido. Usa: planificacion_base, soberania_dia, operativo o umbral.");
  }

  const deliveryId = params.reference?.trim()
    ? buildGrantDeliveryId(params.source, params.reference)
    : `${params.source}:${Date.now()}:${randomBytes(4).toString("hex")}`;

  const existing = await getModuleGrantByDeliveryId(deliveryId);
  if (existing.exists && existing.status === "granted") {
    return {
      deliveryId,
      granted: true,
      pending: false,
      duplicate: true,
      message: "Esta referencia de pago ya fue activada.",
    };
  }

  if (!process.env.DATABASE_URL) {
    const uid = await lookupUidByEmail(email);
    if (!uid) {
      return {
        deliveryId,
        granted: false,
        pending: false,
        duplicate: false,
        message: moduleGrantAdminMessage({ email, planId, granted: false, pending: true }),
      };
    }
    const ok = await activateModulesForUserById(uid, planId);
    return {
      deliveryId,
      granted: ok,
      pending: !ok,
      duplicate: false,
      uid,
      message: moduleGrantAdminMessage({ email, planId, granted: ok, pending: !ok }),
    };
  }

  const result = await processPlanificacionModulePayment({
    deliveryId,
    buyerEmail: email,
    planId,
    source: params.source,
    note: params.note,
    grantedBy: params.grantedBy,
  });

  return {
    deliveryId,
    granted: result.granted,
    pending: result.pending && !result.granted,
    duplicate: false,
    uid: result.uid,
    message: moduleGrantAdminMessage({
      email,
      planId,
      granted: result.granted,
      pending: result.pending && !result.granted,
    }),
  };
}
