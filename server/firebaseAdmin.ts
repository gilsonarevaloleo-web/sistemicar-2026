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
import {
  buildMigratedDocData,
  collectionsToMigrate,
  featureCountsFromCollections,
  RECOVERY_FEATURE_LABELS,
  RECOVERY_SCAN_COLLECTIONS,
  totalDocs,
  uidFromPrivateCollectionPath,
  type RecoveryFeature,
} from "../shared/userDataCollections";

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
    const swapped = await suggestUsersForEmail(email);
    return swapped[0]?.uid ?? null;
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

export type AdminAuthClient = {
  uid: string;
  email: string;
  displayName: string | null;
  totalCP: number;
  rank: string;
  activeModules: string[];
  whatsapp?: string | null;
  subscriptionPlan?: string | null;
};

export async function lookupAuthUserByUid(
  uid: string,
): Promise<{ email: string | null; displayName: string | null } | null> {
  const adminApp = getAdminApp();
  if (!adminApp || !uid.trim()) return null;
  try {
    const user = await getAuth(adminApp).getUser(uid.trim());
    return {
      email: user.email?.toLowerCase() ?? null,
      displayName: user.displayName ?? null,
    };
  } catch {
    return null;
  }
}

function uidFromProgressionPath(path: string): string | null {
  const parts = path.split("/");
  const i = parts.indexOf("users");
  if (i < 0 || parts[i + 2] !== "progression") return null;
  if (!parts.includes("sistemicar-v2-5")) return null;
  return parts[i + 1] || null;
}

type ProgressionSummary = {
  totalCP: number;
  rank: string;
  activeModules: string[];
  whatsapp: string | null;
  subscriptionPlan: string | null;
  updatedAt: number;
};

async function progressionByUid(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, ProgressionSummary>> {
  const map = new Map<string, ProgressionSummary>();
  try {
    const snap = await db.collectionGroup("progression").get();
    for (const docSnap of snap.docs) {
      const uid = uidFromProgressionPath(docSnap.ref.path);
      if (!uid) continue;
      const data = docSnap.data() as Record<string, unknown>;
      const updatedAt =
        (data.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      const totalCP = Number(data.totalCP || data.points || 0);
      const prev = map.get(uid);
      if (!prev || updatedAt >= prev.updatedAt) {
        map.set(uid, {
          totalCP: Math.max(totalCP, prev?.totalCP ?? 0),
          rank: (data.rank as string) || prev?.rank || "iniciado",
          activeModules: Array.isArray(data.activeModules)
            ? (data.activeModules as string[])
            : prev?.activeModules ?? [],
          whatsapp:
            typeof data.whatsapp === "string" && data.whatsapp.trim()
              ? data.whatsapp.trim()
              : prev?.whatsapp ?? null,
          subscriptionPlan:
            (data.subscriptionPlan as string) || prev?.subscriptionPlan || null,
          updatedAt,
        });
      } else {
        prev.totalCP = Math.max(prev.totalCP, totalCP);
      }
    }
  } catch (err) {
    console.warn("[firebaseAdmin] collectionGroup progression:", err);
  }
  return map;
}

/** Lista cuentas reales (Auth + Firestore). El Gmail no es la llave: el UID sí. */
export async function listAuthClientsWithProgression(
  limit = 40,
): Promise<AdminAuthClient[]> {
  const adminApp = getAdminApp();
  if (!adminApp) return [];
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);
  const byUid = new Map<string, AdminAuthClient>();
  const progMap = await progressionByUid(db);

  let pageToken: string | undefined;
  let pages = 0;
  try {
    do {
      const page = await auth.listUsers(100, pageToken);
      for (const user of page.users) {
        const email = user.email?.toLowerCase() ?? "";
        const prog = progMap.get(user.uid);
        byUid.set(user.uid, {
          uid: user.uid,
          email,
          displayName: user.displayName ?? null,
          totalCP: prog?.totalCP ?? 0,
          rank: prog?.rank || "iniciado",
          activeModules: prog?.activeModules ?? [],
          whatsapp: prog?.whatsapp ?? null,
          subscriptionPlan: prog?.subscriptionPlan ?? null,
        });
      }
      pageToken = page.pageToken;
      pages += 1;
    } while (pageToken && pages < 5);
  } catch (err) {
    console.warn("[firebaseAdmin] listUsers:", err);
  }

  for (const [uid, prog] of progMap) {
    const existing = byUid.get(uid);
    if (existing) {
      existing.totalCP = Math.max(existing.totalCP, prog.totalCP);
      if (!existing.activeModules.length) existing.activeModules = prog.activeModules;
      if (!existing.whatsapp) existing.whatsapp = prog.whatsapp;
      continue;
    }
    byUid.set(uid, {
      uid,
      email: "",
      displayName: null,
      totalCP: prog.totalCP,
      rank: prog.rank,
      activeModules: prog.activeModules,
      whatsapp: prog.whatsapp,
      subscriptionPlan: prog.subscriptionPlan,
    });
  }

  return [...byUid.values()]
    .sort((a, b) => b.totalCP - a.totalCP)
    .slice(0, Math.min(100, Math.max(1, limit)));
}

export type RecoveryInventory = {
  uid: string;
  collections: Record<string, number>;
  features: Record<RecoveryFeature, number>;
  labels: typeof RECOVERY_FEATURE_LABELS;
  total: number;
};

export async function inventoryUserCollections(uid: string): Promise<RecoveryInventory> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error("Firebase Admin no está listo. Revisa FIREBASE_SERVICE_ACCOUNT_JSON.");
  }
  const trimmed = uid.trim();
  if (!trimmed) {
    throw new Error("Falta el UID.");
  }
  const db = getFirestore(adminApp);
  const collections: Record<string, number> = {};
  for (const name of collectionsToMigrate()) {
    const snap = await db.collection(getPrivatePath(trimmed, name)).limit(400).get();
    if (!snap.empty) collections[name] = snap.size;
  }
  return {
    uid: trimmed,
    collections,
    features: featureCountsFromCollections(collections),
    labels: RECOVERY_FEATURE_LABELS,
    total: totalDocs(collections),
  };
}

export async function restoreUserData(
  fromUid: string,
  toUid: string,
): Promise<{ migrated: number; errors: number; fromUid: string; toUid: string }> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error("Firebase Admin no está listo. Revisa FIREBASE_SERVICE_ACCOUNT_JSON.");
  }
  const source = fromUid.trim();
  const dest = toUid.trim();
  if (!source || !dest) {
    throw new Error("Faltan UID de origen o destino.");
  }
  if (source === dest) {
    return { migrated: 0, errors: 0, fromUid: source, toUid: dest };
  }

  const db = getFirestore(adminApp);
  let migrated = 0;
  let errors = 0;

  for (const name of collectionsToMigrate()) {
    const snap = await db.collection(getPrivatePath(source, name)).get();
    for (const docSnap of snap.docs) {
      try {
        const payload = buildMigratedDocData(
          docSnap.data() as Record<string, unknown>,
          dest,
          source,
        );
        await db
          .collection(getPrivatePath(dest, name))
          .doc(docSnap.id)
          .set({ ...payload, migratedAt: FieldValue.serverTimestamp() }, { merge: true });
        migrated += 1;
      } catch {
        errors += 1;
      }
    }
  }

  return { migrated, errors, fromUid: source, toUid: dest };
}

export type RecoveryAccount = {
  uid: string;
  email: string;
  displayName: string | null;
  totalCP: number;
  rank: string;
  activeModules: string[];
  whatsapp: string | null;
  subscriptionPlan: string | null;
  features: Record<RecoveryFeature, number>;
  totalDocs: number;
};

async function scanRecoveryCollectionGroups(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, Record<string, number>>> {
  const byUid = new Map<string, Record<string, number>>();
  for (const name of RECOVERY_SCAN_COLLECTIONS) {
    try {
      const snap = await db.collectionGroup(name).get();
      for (const docSnap of snap.docs) {
        const uid = uidFromPrivateCollectionPath(docSnap.ref.path, name);
        if (!uid) continue;
        const counts = byUid.get(uid) ?? {};
        counts[name] = (counts[name] ?? 0) + 1;
        byUid.set(uid, counts);
      }
    } catch (err) {
      console.warn(`[firebaseAdmin] collectionGroup ${name}:`, err);
    }
  }
  return byUid;
}

function recoveryAccountFromParts(
  uid: string,
  opts: {
    email?: string;
    displayName?: string | null;
    prog?: ProgressionSummary;
    counts?: Record<string, number>;
  },
): RecoveryAccount {
  const counts = opts.counts ?? {};
  const features = featureCountsFromCollections(counts);
  return {
    uid,
    email: opts.email || "",
    displayName: opts.displayName ?? null,
    totalCP: opts.prog?.totalCP ?? 0,
    rank: opts.prog?.rank || "iniciado",
    activeModules: opts.prog?.activeModules ?? [],
    whatsapp: opts.prog?.whatsapp ?? null,
    subscriptionPlan: opts.prog?.subscriptionPlan ?? null,
    features,
    totalDocs: totalDocs(counts),
  };
}

/** Lista cuentas con data real (Auth + progression + Crisol/Récord/Rutina/Depósito/Umbral). */
export async function listRecoveryAccounts(limit = 80): Promise<RecoveryAccount[]> {
  const adminApp = getAdminApp();
  if (!adminApp) return [];
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);
  const byUid = new Map<string, RecoveryAccount>();
  const progMap = await progressionByUid(db);
  const scanMap = await scanRecoveryCollectionGroups(db);

  let pageToken: string | undefined;
  let pages = 0;
  try {
    do {
      const page = await auth.listUsers(100, pageToken);
      for (const user of page.users) {
        byUid.set(
          user.uid,
          recoveryAccountFromParts(user.uid, {
            email: user.email?.toLowerCase() ?? "",
            displayName: user.displayName ?? null,
            prog: progMap.get(user.uid),
            counts: scanMap.get(user.uid),
          }),
        );
      }
      pageToken = page.pageToken;
      pages += 1;
    } while (pageToken && pages < 8);
  } catch (err) {
    console.warn("[firebaseAdmin] listUsers recovery:", err);
  }

  for (const [uid, counts] of scanMap) {
    if (byUid.has(uid)) continue;
    byUid.set(
      uid,
      recoveryAccountFromParts(uid, {
        prog: progMap.get(uid),
        counts,
      }),
    );
  }

  try {
    const owner = await adminLookupUserByEmail("gilsonarevalo.leo@gmail.com");
    if (owner.found && owner.uid && !byUid.has(owner.uid)) {
      byUid.set(
        owner.uid,
        recoveryAccountFromParts(owner.uid, {
          email: owner.email || "gilsonarevalo.leo@gmail.com",
          displayName: owner.displayName ?? null,
          prog: progMap.get(owner.uid),
          counts: scanMap.get(owner.uid),
        }),
      );
    } else if (owner.found && owner.uid) {
      const current = byUid.get(owner.uid);
      if (current && !current.email) current.email = owner.email || "gilsonarevalo.leo@gmail.com";
    }
  } catch (err) {
    console.warn("[firebaseAdmin] owner lookup recovery:", err);
  }

  return [...byUid.values()]
    .filter((a) => a.email || a.totalCP > 0 || a.totalDocs > 0 || a.activeModules.length > 0)
    .sort((a, b) => b.totalDocs - a.totalDocs || b.totalCP - a.totalCP)
    .slice(0, Math.min(120, Math.max(1, limit)));
}
