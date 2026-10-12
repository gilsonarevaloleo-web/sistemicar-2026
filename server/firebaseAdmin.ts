import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getPrivatePath } from "../shared/firebasePaths";
import { emailMatchKeys, normalizeBuyerEmail } from "../shared/emailAliases";
import {
  gmailLocalAnagram,
  parseFirebaseServiceAccountJson,
  serviceAccountPublicMeta,
} from "../shared/firebaseServiceAccount";
import {
  type ModuleId,
  mergeModuleIds,
  modulesGrantedByPlan,
} from "../shared/moduleAccess";

let app: App | null = null;
let initError: string | null = null;

function parseServiceAccount(): Record<string, unknown> | null {
  const parsed = parseFirebaseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!parsed.ok) return null;
  return parsed.value;
}

export function firebaseAdminStatus(): {
  adminReady: boolean;
  parseError: string | null;
  initError: string | null;
  projectId: string | null;
  clientEmail: string | null;
} {
  const parsed = parseFirebaseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!parsed.ok) {
    return {
      adminReady: false,
      parseError: parsed.error,
      initError: null,
      projectId: null,
      clientEmail: null,
    };
  }
  const meta = serviceAccountPublicMeta(parsed.value);
  return {
    adminReady: Boolean(getAdminApp()),
    parseError: null,
    initError,
    projectId: meta.projectId,
    clientEmail: meta.clientEmail,
  };
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
    initError = null;
    return app;
  } catch (err) {
    initError = err instanceof Error ? err.message : "init_failed";
    console.warn("[firebaseAdmin] No se pudo inicializar:", err);
    return null;
  }
}

export async function lookupUidByEmail(email: string): Promise<string | null> {
  const keys = emailMatchKeys(email);
  if (keys.length === 0) return null;

  const adminApp = getAdminApp();
  if (adminApp) {
    const auth = getAuth(adminApp);
    for (const key of keys) {
      try {
        const user = await auth.getUserByEmail(key);
        return user.uid;
      } catch {
        // probar alias (puntos / +tag de Gmail)
      }
    }
    return null;
  }

  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: keys }),
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

export type AdminUserSuggestion = {
  email: string;
  uid: string;
  reason: "alias" | "mismo_nombre_otro_orden";
};

export type AdminUserLookupResult = {
  found: boolean;
  adminReady: boolean;
  parseError?: string | null;
  initError?: string | null;
  projectId?: string | null;
  suggestions?: AdminUserSuggestion[];
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

async function suggestUsersForEmail(email: string): Promise<AdminUserSuggestion[]> {
  const adminApp = getAdminApp();
  if (!adminApp) return [];
  const target = normalizeBuyerEmail(email);
  const [local] = target.split("@");
  if (!local) return [];
  const keys = new Set(emailMatchKeys(target));
  const suggestions: AdminUserSuggestion[] = [];
  try {
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const page = await getAuth(adminApp).listUsers(100, pageToken);
      for (const user of page.users) {
        const authEmail = user.email?.toLowerCase();
        if (!authEmail) continue;
        const [ulocal] = authEmail.split("@");
        if (keys.has(authEmail)) {
          suggestions.push({ email: authEmail, uid: user.uid, reason: "alias" });
        } else if (ulocal && gmailLocalAnagram(local, ulocal)) {
          suggestions.push({
            email: authEmail,
            uid: user.uid,
            reason: "mismo_nombre_otro_orden",
          });
        }
      }
      pageToken = page.pageToken;
      pages += 1;
    } while (pageToken && pages < 8 && suggestions.length === 0);
  } catch (err) {
    console.warn("[firebaseAdmin] listUsers:", err);
  }
  return suggestions;
}

/** Busca usuario en Firebase Auth (fuente de verdad) + progresión si Admin SDK está listo. */
export async function adminLookupUserByEmail(email: string): Promise<AdminUserLookupResult> {
  const normalized = normalizeBuyerEmail(email);
  const status = firebaseAdminStatus();
  if (!normalized) return { found: false, ...status };

  const adminApp = getAdminApp();

  let uid: string | null = null;
  let authEmail = normalized;
  let emailVerified: boolean | undefined;
  let displayName: string | null | undefined;
  let providers: string[] | undefined;

  if (adminApp) {
    const auth = getAuth(adminApp);
    for (const key of emailMatchKeys(normalized)) {
      try {
        const user = await auth.getUserByEmail(key);
        uid = user.uid;
        authEmail = (user.email ?? key).toLowerCase();
        emailVerified = user.emailVerified;
        displayName = user.displayName ?? null;
        providers = user.providerData.map(p => p.providerId);
        break;
      } catch {
        // alias Gmail
      }
    }
    if (!uid) {
      const suggestions = await suggestUsersForEmail(normalized);
      return { found: false, ...status, suggestions };
    }
  } else {
    uid = await lookupUidByEmail(normalized);
    if (!uid) return { found: false, ...status };
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
    ...status,
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
