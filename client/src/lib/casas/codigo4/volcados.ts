/**
 * Persistencia durable del Juez Serio.
 * El API (Postgres) puede vaciarse en un cold start de Netlify.
 * El volcado vive también en localStorage + Firebase, como Depósito V3.
 */

import {
  HISTORIAL_JUEZ_LIMITE,
  hidratarFase1,
  type HistorialJuezItem,
  type JuezSerioFase1,
  type JuezSerioFase2,
} from "@shared/casas/codigo4";

export const JUEZ_VOLCADOS_STORAGE_KEY = "sistemicar_juez_volcados";
export const JUEZ_VOLCADOS_COLLECTION = "juez_volcados";
export const JUEZ_DRAFT_COLLECTION = "juez_draft";
export const JUEZ_DRAFT_DOC = "current";
export const JUEZ_VOLCADOS_UPDATED_EVENT = "juez-volcados-updated";

const memory = new Map<string, string>();

type VolcadoJuezGuardado = HistorialJuezItem & { userId: string };

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

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(JUEZ_VOLCADOS_UPDATED_EVENT));
  }
}

function parseItem(raw: unknown): VolcadoJuezGuardado | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<VolcadoJuezGuardado>;
  if (!row.id || !row.userId || typeof row.textoVolcado !== "string") return null;
  if (!row.fase1 || typeof row.fase1 !== "object") return null;
  try {
    const fase1 = hidratarFase1(
      row.fase1 as JuezSerioFase1 & {
        codigoProblemaDetectado: JuezSerioFase1["codigoProblemaDetectado"];
        codigoConquistadoMax: JuezSerioFase1["codigoConquistadoMax"];
        fugaInconsciente: string;
        lecturaPerimetroFria: string;
      },
    );
    return {
      id: String(row.id),
      userId: String(row.userId),
      createdAt: String(row.createdAt ?? new Date().toISOString()),
      updatedAt: String(row.updatedAt ?? row.createdAt ?? new Date().toISOString()),
      textoVolcado: row.textoVolcado,
      fase1,
      fase2Desbloqueada: Boolean(row.fase2Desbloqueada),
      directivaOperacional: row.directivaOperacional ?? null,
      confrontacionDeFuerza: row.confrontacionDeFuerza ?? null,
    };
  } catch {
    return null;
  }
}

function parseLocal(): VolcadoJuezGuardado[] {
  try {
    const data = readBucket(JUEZ_VOLCADOS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseItem)
      .filter((item): item is VolcadoJuezGuardado => item != null)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch {
    return [];
  }
}

function saveLocal(entries: VolcadoJuezGuardado[]): void {
  writeBucket(JUEZ_VOLCADOS_STORAGE_KEY, JSON.stringify(entries));
  emitUpdated();
}

export function listVolcadosJuezLocal(userId: string): HistorialJuezItem[] {
  return parseLocal()
    .filter((e) => e.userId === userId)
    .map(({ userId: _uid, ...item }) => item);
}

export function mergeHistorialJuez(
  ...listas: HistorialJuezItem[][]
): HistorialJuezItem[] {
  const byId = new Map<string, HistorialJuezItem>();
  for (const lista of listas) {
    for (const item of lista) {
      const prev = byId.get(item.id);
      if (!prev || String(item.updatedAt) >= String(prev.updatedAt)) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, HISTORIAL_JUEZ_LIMITE);
}

export function itemDesdeAuditoria(input: {
  id: string;
  createdAt: string;
  textoVolcado: string;
  fase1: JuezSerioFase1;
  fase2?: JuezSerioFase2 | null;
}): HistorialJuezItem {
  const abierta = Boolean(
    input.fase2?.confrontacionDeFuerza || input.fase2?.directivaOperacional,
  );
  return {
    id: input.id,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    textoVolcado: input.textoVolcado,
    fase1: input.fase1,
    fase2Desbloqueada: abierta,
    directivaOperacional: abierta
      ? input.fase2?.confrontacionDeFuerza ??
        input.fase2?.directivaOperacional ??
        null
      : null,
    confrontacionDeFuerza: abierta
      ? input.fase2?.confrontacionDeFuerza ??
        input.fase2?.directivaOperacional ??
        null
      : null,
  };
}

function upsertLocal(userId: string, item: HistorialJuezItem): HistorialJuezItem {
  const next: VolcadoJuezGuardado = { ...item, userId };
  const entries = parseLocal().filter(
    (e) => !(e.userId === userId && e.id === item.id),
  );
  entries.unshift(next);
  saveLocal(entries);
  return item;
}

async function upsertRemoto(
  userId: string,
  item: HistorialJuezItem,
): Promise<void> {
  try {
    const firebase = await import("@/lib/firebase");
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return;
    const path = firebase.getPrivatePath(userId, JUEZ_VOLCADOS_COLLECTION);
    await firebase.setDoc(firebase.doc(firebase.db, path, item.id), {
      ...item,
      userId,
    });
  } catch (err) {
    console.error("Volcado Juez remoto falló; ya está en local:", err);
  }
}

export async function persistVolcadoJuez(
  userId: string,
  item: HistorialJuezItem,
): Promise<HistorialJuezItem> {
  const saved = upsertLocal(userId, item);
  void upsertRemoto(userId, saved);
  return saved;
}

export async function persistFase2Juez(
  userId: string,
  sesionId: string,
  fase2: JuezSerioFase2,
): Promise<HistorialJuezItem | null> {
  const actual = parseLocal().find(
    (e) => e.userId === userId && e.id === sesionId,
  );
  if (!actual) return null;
  const confrontacion =
    fase2.confrontacionDeFuerza ?? fase2.directivaOperacional ?? null;
  const next: HistorialJuezItem = {
    ...actual,
    updatedAt: new Date().toISOString(),
    fase2Desbloqueada: true,
    directivaOperacional: confrontacion,
    confrontacionDeFuerza: confrontacion,
  };
  return persistVolcadoJuez(userId, next);
}

export function subscribeToVolcadosJuez(
  userId: string,
  onData: (entries: HistorialJuezItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  onData(listVolcadosJuezLocal(userId));

  let cancelled = false;
  let unsubRemote: (() => void) | undefined;

  void import("@/lib/firebase").then((firebase) => {
    if (cancelled) return;
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return;
    const path = firebase.getPrivatePath(userId, JUEZ_VOLCADOS_COLLECTION);
    const q = firebase.query(
      firebase.collection(firebase.db, path),
      firebase.where("userId", "==", userId),
    );
    unsubRemote = firebase.onSnapshot(
      q,
      (snapshot) => {
        const data: HistorialJuezItem[] = [];
        for (const d of snapshot.docs) {
          const parsed = parseItem({ ...d.data(), id: d.id, userId });
          if (parsed) {
            const { userId: _uid, ...item } = parsed;
            data.push(item);
          }
        }
        onData(mergeHistorialJuez(listVolcadosJuezLocal(userId), data));
      },
      (err) => {
        console.error("Error listening to juez volcados:", err);
        onError(err instanceof Error ? err : new Error(String(err)));
        onData(listVolcadosJuezLocal(userId));
      },
    );
  });

  return () => {
    cancelled = true;
    unsubRemote?.();
  };
}

export async function syncBorradorJuezRemoto(
  userId: string,
  texto: string,
): Promise<void> {
  if (!userId) return;
  try {
    const firebase = await import("@/lib/firebase");
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return;
    const path = firebase.getPrivatePath(userId, JUEZ_DRAFT_COLLECTION);
    await firebase.setDoc(
      firebase.doc(firebase.db, path, JUEZ_DRAFT_DOC),
      {
        texto,
        userId,
        updatedAt: firebase.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Borrador Juez remoto falló; ya está en local:", err);
  }
}

export function subscribeBorradorJuez(
  userId: string,
  onTexto: (texto: string) => void,
): () => void {
  let cancelled = false;
  let unsub: (() => void) | undefined;

  void import("@/lib/firebase").then((firebase) => {
    if (cancelled) return;
    if (!(firebase.isFirebaseConfigured() && firebase.db)) return;
    const path = firebase.getPrivatePath(userId, JUEZ_DRAFT_COLLECTION);
    unsub = firebase.onSnapshot(
      firebase.doc(firebase.db, path, JUEZ_DRAFT_DOC),
      (snap) => {
        const data = snap.data() as { texto?: unknown } | undefined;
        onTexto(typeof data?.texto === "string" ? data.texto : "");
      },
      () => {
        /* el lienzo local sigue */
      },
    );
  });

  return () => {
    cancelled = true;
    unsub?.();
  };
}

let draftTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDraft: { userId: string; texto: string } | null = null;

export function programarBorradorJuezRemoto(
  userId: string,
  texto: string,
  delayMs = 800,
): void {
  if (!userId) return;
  pendingDraft = { userId, texto };
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    draftTimer = null;
    const job = pendingDraft;
    pendingDraft = null;
    if (job) void syncBorradorJuezRemoto(job.userId, job.texto);
  }, delayMs);
}

export function flushBorradorJuezRemoto(): void {
  if (draftTimer) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  const job = pendingDraft;
  pendingDraft = null;
  if (job) void syncBorradorJuezRemoto(job.userId, job.texto);
}
