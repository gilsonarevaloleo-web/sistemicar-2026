/**
 * Backup de logros Umbral v2 (localStorage + Firestore).
 * Las sesiones del API pueden vivir en memoria/serverless; el historial
 * de cómo se superó cada código debe permanecer entre días.
 */

import {
  calcularProgresoCarrera,
  extraerLogrosDeSesiones,
  mergeLogros,
  normalizeLogro,
  type LogroCodigoUmbral,
  type ProgresoCarreraUmbral,
} from "@shared/umbral/progreso";
import type { SesionUmbral } from "@shared/umbral/sessionTypes";

const STORAGE_PREFIX = "umbral_v2_logros_";

export interface UmbralLogrosBackup {
  version: 1;
  logros: LogroCodigoUmbral[];
  updatedAt: string;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function emptyBackup(): UmbralLogrosBackup {
  return { version: 1, logros: [], updatedAt: "" };
}

function parseBackup(raw: unknown): UmbralLogrosBackup {
  if (!raw || typeof raw !== "object") return emptyBackup();
  const obj = raw as Partial<UmbralLogrosBackup>;
  const logros = Array.isArray(obj.logros)
    ? obj.logros
        .map((l) => normalizeLogro(l))
        .filter((l): l is LogroCodigoUmbral => l != null)
    : [];
  return {
    version: 1,
    logros,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : "",
  };
}

export function loadUmbralLogrosLocal(userId: string): LogroCodigoUmbral[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return parseBackup(JSON.parse(raw)).logros;
  } catch {
    return [];
  }
}

export function saveUmbralLogrosLocal(
  userId: string,
  logros: LogroCodigoUmbral[],
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const backup: UmbralLogrosBackup = {
      version: 1,
      logros,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(backup));
  } catch (e) {
    console.error("[umbralLogros] No se pudo guardar backup local:", e);
  }
}

export function mergeCarreraUmbral(
  sesiones: SesionUmbral[],
  ...extraLogros: Array<LogroCodigoUmbral[] | undefined>
): ProgresoCarreraUmbral {
  const logros = mergeLogros(
    extraerLogrosDeSesiones(sesiones),
    ...extraLogros,
  );
  return calcularProgresoCarrera(logros);
}

export function persistirLogrosFusionados(
  userId: string,
  sesiones: SesionUmbral[],
  ...extraLogros: Array<LogroCodigoUmbral[] | undefined>
): ProgresoCarreraUmbral {
  const local = loadUmbralLogrosLocal(userId);
  const progreso = mergeCarreraUmbral(sesiones, local, ...extraLogros);
  saveUmbralLogrosLocal(userId, progreso.logros);
  void persistirLogrosFirestore(userId, progreso.logros);
  return progreso;
}

export function appendLogroUmbral(
  userId: string,
  logro: LogroCodigoUmbral,
): LogroCodigoUmbral[] {
  const merged = mergeLogros(loadUmbralLogrosLocal(userId), [logro]);
  saveUmbralLogrosLocal(userId, merged);
  void persistirLogrosFirestore(userId, merged);
  return merged;
}

async function persistirLogrosFirestore(
  userId: string,
  logros: LogroCodigoUmbral[],
): Promise<void> {
  try {
    const { db, isFirebaseConfigured, getPrivatePath } = await import(
      "@/lib/firebase"
    );
    if (!isFirebaseConfigured() || !db) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "umbralLogros");
    await setDoc(
      doc(db, path, "carrera"),
      {
        version: 1,
        logros,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn("[umbralLogros] Firestore no disponible:", e);
  }
}

export async function cargarLogrosFirestore(
  userId: string,
): Promise<LogroCodigoUmbral[]> {
  try {
    const { db, isFirebaseConfigured, getPrivatePath } = await import(
      "@/lib/firebase"
    );
    if (!isFirebaseConfigured() || !db) return [];
    const { doc, getDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "umbralLogros");
    const snap = await getDoc(doc(db, path, "carrera"));
    if (!snap.exists()) return [];
    return parseBackup(snap.data()).logros;
  } catch (e) {
    console.warn("[umbralLogros] No se pudieron leer logros de Firestore:", e);
    return [];
  }
}
