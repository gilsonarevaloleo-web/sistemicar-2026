/**
 * Historial de Depósito V3.
 * Nunca escribe en sistemicar_volcados ni en la colección "volcados" (V2).
 */

import type {
  DepotAnalysisResult,
  DepotEntryPayload,
  UserTier,
} from "@shared/deposito/v3";
import { isDepotAnalysisResult } from "@shared/deposito/v3";

export const DEPOSITO_V3_STORAGE_KEY = "sistemicar_volcados_v3";
export const DEPOSITO_V3_FIRESTORE_COLLECTION = "volcados_v3";
export const DEPOSITO_V3_UPDATED_EVENT = "volcados-v3-updated";

/** Solo para tests de aislamiento. No leer ni escribir esta clave. */
export const DEPOSITO_V2_STORAGE_KEY_FORBIDDEN = "sistemicar_volcados";
export const DEPOSITO_V2_COLLECTION_FORBIDDEN = "volcados";

export interface VolcadoV3Entry {
  id: string;
  userId: string;
  createdAt: Date;
  rawFact: string;
  detectedNoise?: string;
  omittedShadow?: string;
  studentHypothesis?: string;
  userTier: UserTier;
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
}

export interface AddVolcadoV3Input {
  userId: string;
  payload: DepotEntryPayload;
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
  waitForRemote?: boolean;
}

const memory = new Map<string, string>();

function readBucket(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return memory.get(key) ?? null;
}

function writeBucket(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* ignore */
  }
  memory.set(key, value);
}

function parseLocal(): VolcadoV3Entry[] {
  try {
    const data = readBucket(DEPOSITO_V3_STORAGE_KEY);
    if (!data) return [];
    const entries = JSON.parse(data) as Array<
      Omit<VolcadoV3Entry, "createdAt"> & { createdAt: string | number | Date }
    >;
    return entries
      .filter((e) => e && isDepotAnalysisResult(e.result))
      .map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

function saveLocal(entries: VolcadoV3Entry[]): void {
  writeBucket(DEPOSITO_V3_STORAGE_KEY, JSON.stringify(entries));
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEPOSITO_V3_UPDATED_EVENT));
  }
}

export function listVolcadosV3Local(userId: string): VolcadoV3Entry[] {
  return parseLocal().filter((e) => e.userId === userId);
}

function saveVolcadoV3Local(input: AddVolcadoV3Input): string {
  const entries = parseLocal();
  const id = `local_v3_${Date.now()}`;
  const entry: VolcadoV3Entry = {
    id,
    userId: input.userId,
    createdAt: new Date(),
    rawFact: input.payload.rawFact,
    userTier: input.payload.userTier,
    result: input.result,
    source: input.source,
  };
  if (input.payload.detectedNoise) entry.detectedNoise = input.payload.detectedNoise;
  if (input.payload.omittedShadow) entry.omittedShadow = input.payload.omittedShadow;
  if (input.payload.studentHypothesis) {
    entry.studentHypothesis = input.payload.studentHypothesis;
  }
  entries.unshift(entry);
  saveLocal(entries);
  emitUpdated();
  return id;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("volcado-v3-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function addVolcadoV3Entry(input: AddVolcadoV3Input): Promise<string> {
  const localId = saveVolcadoV3Local(input);

  try {
    const firebase = await import("@/lib/firebase");
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return localId;

    const path = firebase.getPrivatePath(
      input.userId,
      DEPOSITO_V3_FIRESTORE_COLLECTION,
    );
    const remoto = withTimeout(
      firebase.addDoc(firebase.collection(firebase.db, path), {
        rawFact: input.payload.rawFact,
        detectedNoise: input.payload.detectedNoise ?? null,
        omittedShadow: input.payload.omittedShadow ?? null,
        studentHypothesis: input.payload.studentHypothesis ?? null,
        userTier: input.payload.userTier,
        result: input.result,
        source: input.source,
        userId: input.userId,
        createdAt: firebase.serverTimestamp(),
      }),
      4000,
    ).catch((err) => {
      console.error("Volcado V3 remoto falló; ya está en local:", err);
      return null;
    });

    if (input.waitForRemote === false) {
      void remoto;
      return localId;
    }

    const docRef = await remoto;
    return docRef && typeof docRef === "object" && "id" in docRef
      ? String(docRef.id)
      : localId;
  } catch {
    return localId;
  }
}

export function subscribeToVolcadosV3(
  userId: string,
  onData: (entries: VolcadoV3Entry[]) => void,
  onError: (error: Error) => void,
): () => void {
  const local = () => listVolcadosV3Local(userId);
  onData(local());

  let cancelled = false;
  let unsubRemote: (() => void) | undefined;

  void import("@/lib/firebase").then((firebase) => {
    if (cancelled) return;
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return;
    const path = firebase.getPrivatePath(
      userId,
      DEPOSITO_V3_FIRESTORE_COLLECTION,
    );
    const q = firebase.query(
      firebase.collection(firebase.db, path),
      firebase.where("userId", "==", userId),
    );
    unsubRemote = firebase.onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((d) => {
            const raw = d.data() as Omit<VolcadoV3Entry, "id" | "createdAt"> & {
              createdAt?: { toDate?: () => Date };
            };
            if (!isDepotAnalysisResult(raw.result)) return null;
            return {
              id: d.id,
              userId: raw.userId,
              rawFact: raw.rawFact,
              detectedNoise: raw.detectedNoise,
              omittedShadow: raw.omittedShadow,
              studentHypothesis: raw.studentHypothesis,
              userTier: raw.userTier,
              result: raw.result,
              source: raw.source,
              createdAt: raw.createdAt?.toDate?.() || new Date(),
            } satisfies VolcadoV3Entry;
          })
          .filter((e): e is VolcadoV3Entry => e !== null);
        data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onData(data);
      },
      (err) => {
        console.error("Error listening to volcados V3:", err);
        onError(err instanceof Error ? err : new Error(String(err)));
        onData(local());
      },
    );
  });

  return () => {
    cancelled = true;
    unsubRemote?.();
  };
}

export async function deleteVolcadoV3Entry(
  userId: string,
  entryId: string,
): Promise<void> {
  if (!entryId.startsWith("local_v3_")) {
    const firebase = await import("@/lib/firebase");
    if (firebase.isFirebaseConfigured() && firebase.db) {
      const path = firebase.getPrivatePath(
        userId,
        DEPOSITO_V3_FIRESTORE_COLLECTION,
      );
      await firebase.deleteDoc(firebase.doc(firebase.db, path, entryId));
      return;
    }
  }
  saveLocal(parseLocal().filter((e) => e.id !== entryId));
  emitUpdated();
}
