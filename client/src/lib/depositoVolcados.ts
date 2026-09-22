import {
  db,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  getPrivatePath,
  isFirebaseConfigured,
} from "./firebase";
import type { DictamenOptico } from "@shared/deposito/analizarVolcado";
import type {
  CapturaVolcadoExpansiva,
  DiagnosticoVolcado,
  GradoMaestria,
} from "@shared/deposito/engineConfig";

export interface VolcadoEntry {
  id: string;
  texto: string;
  userId: string;
  createdAt: Date;
  dictamen: DictamenOptico;
  diagnostico?: DiagnosticoVolcado;
  captura?: CapturaVolcadoExpansiva;
  gradoMaestria?: GradoMaestria;
}

const STORAGE_KEY = "sistemicar_volcados";

function parseLocal(): VolcadoEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const entries = JSON.parse(data) as VolcadoEntry[];
    return entries
      .map((e) => ({ ...e, createdAt: new Date(e.createdAt) }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

function saveLocal(entries: VolcadoEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listVolcadosLocal(userId: string): VolcadoEntry[] {
  return parseLocal().filter((e) => e.userId === userId);
}

export function subscribeToVolcados(
  userId: string,
  onData: (entries: VolcadoEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  const local = () => parseLocal().filter((e) => e.userId === userId);
  if (isFirebaseConfigured() && db) {
    const path = getPrivatePath(userId, "volcados");
    const q = query(collection(db, path), where("userId", "==", userId));
    let settled = false;
    const failSafe = setTimeout(() => {
      if (settled) return;
      settled = true;
      onData(local());
    }, 2500);
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        settled = true;
        clearTimeout(failSafe);
        const data = snapshot.docs.map((d) => {
          const raw = d.data() as Omit<VolcadoEntry, "id" | "createdAt"> & {
            createdAt?: { toDate?: () => Date };
          };
          return {
            id: d.id,
            texto: raw.texto,
            userId: raw.userId,
            dictamen: raw.dictamen,
            diagnostico: raw.diagnostico,
            captura: raw.captura,
            gradoMaestria: raw.gradoMaestria,
            createdAt: raw.createdAt?.toDate?.() || new Date(),
          } satisfies VolcadoEntry;
        });
        data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onData(data);
      },
      (err) => {
        settled = true;
        clearTimeout(failSafe);
        console.error("Error listening to volcados:", err);
        onError(err);
        onData(local());
      }
    );
    return () => {
      clearTimeout(failSafe);
      unsub();
    };
  }

  onData(local());
  return () => {};
}

function saveVolcadoLocal(
  userId: string,
  texto: string,
  dictamen: DictamenOptico,
  diagnostico?: DiagnosticoVolcado,
  captura?: CapturaVolcadoExpansiva,
): string {
  const entries = parseLocal();
  const id = `local_${Date.now()}`;
  entries.unshift({
    id,
    texto,
    dictamen,
    diagnostico,
    captura,
    gradoMaestria: captura?.gradoMaestria,
    userId,
    createdAt: new Date(),
  });
  saveLocal(entries);
  window.dispatchEvent(new CustomEvent("volcados-updated"));
  return id;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("volcado-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function addVolcadoEntry(
  userId: string,
  texto: string,
  dictamen: DictamenOptico,
  diagnostico?: DiagnosticoVolcado,
  captura?: CapturaVolcadoExpansiva,
  opts?: { waitForRemote?: boolean },
): Promise<string> {
  const localId = saveVolcadoLocal(userId, texto, dictamen, diagnostico, captura);
  if (!(isFirebaseConfigured() && db)) return localId;

  const path = getPrivatePath(userId, "volcados");
  const remoto = withTimeout(
    addDoc(collection(db, path), {
      texto,
      dictamen,
      diagnostico: diagnostico ?? null,
      captura: captura ?? null,
      gradoMaestria: captura?.gradoMaestria ?? null,
      userId,
      createdAt: serverTimestamp(),
    }),
    4000,
  ).catch((err) => {
    console.error("Volcado remoto falló; ya está en local:", err);
    return null;
  });

  if (opts?.waitForRemote === false) {
    void remoto;
    return localId;
  }

  const docRef = await remoto;
  return docRef?.id ?? localId;
}

export async function deleteVolcadoEntry(userId: string, entryId: string): Promise<void> {
  if (isFirebaseConfigured() && db && !entryId.startsWith("local_")) {
    const path = getPrivatePath(userId, "volcados");
    await deleteDoc(doc(db, path, entryId));
    return;
  }
  saveLocal(parseLocal().filter((e) => e.id !== entryId));
  window.dispatchEvent(new CustomEvent("volcados-updated"));
}
