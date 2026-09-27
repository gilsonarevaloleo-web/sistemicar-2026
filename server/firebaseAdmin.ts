import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getPrivatePath } from "../shared/firebasePaths";
import {
  type ModuleId,
  mergeModuleIds,
  modulesGrantedByPlan,
} from "../shared/moduleAccess";

let app: App | null = null;

function parseServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.warn("[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON inv�lido");
    return null;
  }
}

export function isFirebaseAdminReady(): boolean {
  return Boolean(parseServiceAccount());
}

export function getAdminApp(): App | null {
  if (app) return app;
  const sa = parseServiceAccount();
  if (!sa) return null;
  try {
    app = getApps().length
      ? getApps()[0]!
      : initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) });
    return app;
  } catch (err) {
    console.warn("[firebaseAdmin] No se pudo inicializar:", err);
    return null;
  }
}

export async function lookupUidByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const user = await getAuth(adminApp).getUserByEmail(normalized);
      return user.uid;
    } catch {
      return null;
    }
  }

  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: [normalized] }),
      }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as { users?: { localId?: string }[] };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

/** Suma cr�ditos en Firestore (colecci�n espejoCredits). Requiere Admin SDK. */
export async function addEspejoCreditsForUser(
  userId: string,
  creditsToAdd: number
): Promise<boolean> {
  const adminApp = getAdminApp();
  if (!adminApp || creditsToAdd <= 0) return false;

  const db = getFirestore(adminApp);
  const collPath = getPrivatePath(userId, "espejoCredits");
  const collRef = db.collection(collPath);
  const snap = await collRef.limit(1).get();

  if (snap.empty) {
    await collRef.add({
      credits: creditsToAdd,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    const docRef = snap.docs[0].ref;
    const current = (snap.docs[0].data().credits as number) || 0;
    await docRef.update({
      credits: current + creditsToAdd,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return true;
}

export async function getEspejoCreditsForUser(userId: string): Promise<number | null> {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getFirestore(adminApp);
  const snap = await db.collection(getPrivatePath(userId, "espejoCredits")).limit(1).get();
  if (snap.empty) return 0;
  return (snap.docs[0].data().credits as number) || 0;
}

/** Establece el saldo total de cr�ditos (no suma). */
export async function setEspejoCreditsForUser(
  userId: string,
  credits: number
): Promise<boolean> {
  const adminApp = getAdminApp();
  if (!adminApp || credits < 0) return false;
  const db = getFirestore(adminApp);
  const collRef = db.collection(getPrivatePath(userId, "espejoCredits"));
  const snap = await collRef.limit(1).get();
  if (snap.empty) {
    await collRef.add({ credits, updatedAt: FieldValue.serverTimestamp() });
  } else {
    await snap.docs[0].ref.update({
      credits,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return true;
}

async function getLatestProgressionRef(
  db: ReturnType<typeof getFirestore>,
  userId: string
) {
  const path = getPrivatePath(userId, "progression");
  const snap = await db.collection(path).get();
  if (snap.empty) return null;
  const sorted = [...snap.docs].sort((a, b) => {
    const ta = (a.data().updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
    const tb = (b.data().updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
    return tb - ta;
  });
  const doc = sorted[0];
  return { ref: doc.ref, data: doc.data() as Record<string, unknown> };
}

export async function activateModulesForUserById(
  userId: string,
  planId: string
): Promise<boolean> {
  const adminApp = getAdminApp();
  if (!adminApp) return false;
  const grants = modulesGrantedByPlan(planId);
  if (grants.length === 0) return false;

  const db = getFirestore(adminApp);
  const existing = await getLatestProgressionRef(db, userId);
  const path = getPrivatePath(userId, "progression");

  if (!existing) {
    await db.collection(path).add({
      userId,
      rank: "iniciado",
      points: 0,
      activeModules: grants,
      subscriptionPlan: planId,
      sovereigntyPoints: 0,
      ptsEspejo: 0,
      ptsPlanificacion: 0,
      ptsDeposito: 0,
      totalCP: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  }

  const prevModules = (existing.data.activeModules as string[] | undefined) ?? [];
  const merged = mergeModuleIds(prevModules, grants as ModuleId[]);
  await existing.ref.update({
    activeModules: merged,
    subscriptionPlan: planId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function activateModulesForEmail(email: string, planId: string): Promise<boolean> {
  const uid = await lookupUidByEmail(email);
  if (!uid) {
    console.warn(`[activateModules] Sin UID para ${email} plan ${planId}`);
    return false;
  }
  return activateModulesForUserById(uid, planId);
}

export type AdminUserLookupResult = {
  found: boolean;
  adminReady: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string | null;
  providers?: string[];
  rank?: string;
  totalCP?: number;
  activeModules?: string[];
  subscriptionPlan?: string | null;
  whatsapp?: string | null;
};

/** Busca usuario en Firebase Auth (fuente de verdad) + progresión si Admin SDK está listo. */
export async function adminLookupUserByEmail(email: string): Promise<AdminUserLookupResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { found: false, adminReady: isFirebaseAdminReady() };

  const adminReady = isFirebaseAdminReady();
  const adminApp = getAdminApp();

  let uid: string | null = null;
  let authEmail = normalized;
  let emailVerified: boolean | undefined;
  let displayName: string | null | undefined;
  let providers: string[] | undefined;

  if (adminApp) {
    try {
      const user = await getAuth(adminApp).getUserByEmail(normalized);
      uid = user.uid;
      authEmail = (user.email ?? normalized).toLowerCase();
      emailVerified = user.emailVerified;
      displayName = user.displayName ?? null;
      providers = user.providerData.map(p => p.providerId);
    } catch {
      return { found: false, adminReady };
    }
  } else {
    uid = await lookupUidByEmail(normalized);
    if (!uid) return { found: false, adminReady };
  }

  let rank = "iniciado";
  let totalCP = 0;
  let activeModules: string[] | undefined;
  let subscriptionPlan: string | null | undefined;
  let whatsapp: string | null | undefined;

  if (adminApp && uid) {
    const db = getFirestore(adminApp);
    const prog = await getLatestProgressionRef(db, uid);
    if (prog) {
      rank = (prog.data.rank as string) || "iniciado";
      totalCP = (prog.data.totalCP as number) || (prog.data.points as number) || 0;
      activeModules = prog.data.activeModules as string[] | undefined;
      subscriptionPlan = (prog.data.subscriptionPlan as string) || null;
      whatsapp =
        typeof prog.data.whatsapp === "string" && prog.data.whatsapp.trim()
          ? prog.data.whatsapp.trim()
          : null;
    }
  }

  return {
    found: true,
    adminReady,
    uid,
    email: authEmail,
    emailVerified,
    displayName,
    providers,
    rank,
    totalCP,
    activeModules,
    subscriptionPlan,
    whatsapp,
  };
}
