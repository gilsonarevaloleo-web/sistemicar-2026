import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User, signInAnonymously, linkWithRedirect, type UserCredential } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, collection, collectionGroup, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp, serverTimestamp, onSnapshot } from "firebase/firestore";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA7PN2Bmu46bnMSh6L_WD7esAhdfvFrPv0",
  authDomain: "sistemicar-app.firebaseapp.com",
  projectId: "sistemicar-app",
  storageBucket: "sistemicar-app.firebasestorage.app",
  messagingSenderId: "606312674305",
  appId: "1:606312674305:web:12943997b4a522b9507c00",
} as const;

const viteEnv = import.meta.env ?? ({} as ImportMetaEnv);

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
};

const APP_ID = 'sistemicar-v2-5';

const isNodeTest = typeof process !== "undefined" && Boolean(process.env.NODE_TEST_CONTEXT);

export const isFirebaseConfigured = (): boolean => {
  if (isNodeTest) return false;
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
} else {
  console.info("Firebase not configured. Running in DEVELOPMENT MODE with localStorage.");
}

export { app, auth, db };

export const getPrivatePath = (userId: string, collectionName: string) => 
  `artifacts/${APP_ID}/users/${userId}/${collectionName}`;

export const getPublicPath = (collectionName: string) => 
  `artifacts/${APP_ID}/public/data/${collectionName}`;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/** URL que Google/Firebase usan como redirect (debe existir en Google Cloud Console). */
export function getFirebaseAuthHandlerUrl(): string {
  return `https://${firebaseConfig.authDomain}/__/auth/handler`;
}

/** Origen esperado en desarrollo (`npm run dev` → Express + Vite en el mismo puerto). */
export function getExpectedDevOrigin(): string {
  const port = import.meta.env.VITE_DEV_SERVER_PORT || "5000";
  return `http://localhost:${port}`;
}

export function warnIfUnexpectedDevOrigin(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const expected = getExpectedDevOrigin();
  const current = window.location.origin;
  if (current === expected) return;
  console.warn(
    `[Firebase Auth] Estás en ${current} pero el servidor unificado es ${expected}. ` +
      `Abre ${expected} (npm run dev). Si usas otro puerto, agrégalo en Firebase → Authorized domains ` +
      `y en Google Cloud → OAuth → Authorized JavaScript origins.`
  );
}

export function getGoogleAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const host = typeof window !== "undefined" ? window.location.host : "localhost:5000";
  const handler = getFirebaseAuthHandlerUrl();
  const project = firebaseConfig.projectId;

  if (code === "auth/unauthorized-domain") {
    return `Dominio no autorizado: "${host}". Firebase Console → Authentication → Settings → Authorized domains → agrega "${window.location.hostname}".`;
  }
  if (code === "auth/operation-not-allowed") {
    return "Google no está habilitado en Firebase Console → Authentication → Sign-in method → Google.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Inicio de sesión cancelado.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup bloqueado. Usa el botón de inicio que redirige en la misma pestaña o permite ventanas emergentes.";
  }

  return (
    `Error al conectar con Google (${code || "sin código"}). ` +
    `En local usa ${getExpectedDevOrigin()}. ` +
    `Proyecto Firebase: ${project}. ` +
    `En Google Cloud (mismo proyecto) verifica Authorized JavaScript origins y redirect URI: ${handler}`
  );
}

/** Popup bloqueado o COOP del navegador rompe window.closed → fallback redirect. */
const shouldUseRedirectAfterPopupError = (e: unknown): boolean => {
  const code = (e as { code?: string })?.code;
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
};

export const signInWithGoogle = async (): Promise<UserCredential | void> => {
  if (!auth) throw new Error("Firebase not configured");
  warnIfUnexpectedDevOrigin();
  if (import.meta.env.DEV) {
    console.info("[Firebase Auth] handler OAuth:", getFirebaseAuthHandlerUrl(), "| proyecto:", firebaseConfig.projectId);
  }
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (e) {
    if (shouldUseRedirectAfterPopupError(e)) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw e;
  }
};

/** Google en la misma pestaña (sin popup). Úsalo cuando el navegador bloquea ventanas emergentes. */
export const startGoogleSignInRedirect = async (): Promise<void> => {
  if (!auth) throw new Error("Firebase not configured");
  await signInWithRedirect(auth, googleProvider);
};

export const signInAnonymousUser = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signInAnonymously(auth);
};

/**
 * Vincular anónimo → Google **solo por redirección** (misma ventana).
 * Evita `auth/popup-blocked` y el flujo credential-already-in-use + segundo popup.
 */
export const linkAnonymousWithGoogle = async (): Promise<UserCredential | void> => {
  if (!auth || !auth.currentUser) throw new Error("No user to link");
  if (!auth.currentUser.isAnonymous) throw new Error("User is not anonymous");
  await linkWithRedirect(auth.currentUser, googleProvider);
  return;
};

export const checkRedirectResult = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Redirect result error:", error);
    return null;
  }
};

export const isUserAnonymous = (): boolean => {
  return auth?.currentUser?.isAnonymous ?? true;
};

export const getUserEmail = (): string | null => {
  return auth?.currentUser?.email ?? null;
};

export const logOut = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export { 
  collection,
  collectionGroup,
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  signInAnonymously,
  getRedirectResult
};
export type { User };
