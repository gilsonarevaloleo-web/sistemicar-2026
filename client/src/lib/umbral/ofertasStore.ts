/**
 * Persistencia de ofertas Arena (localStorage + Firestore).
 * Misma idea que logros: el sello vive con el operador, no solo en la sesión.
 */

import {
  normalizeOferta,
  type OfertaArena,
} from "@shared/umbral/ofertaArena";

const STORAGE_PREFIX = "umbral_v2_ofertas_";

export interface UmbralOfertasBackup {
  version: 1;
  ofertas: OfertaArena[];
  ofertaActivaId: string | null;
  updatedAt: string;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function emptyBackup(): UmbralOfertasBackup {
  return { version: 1, ofertas: [], ofertaActivaId: null, updatedAt: "" };
}

function parseBackup(raw: unknown): UmbralOfertasBackup {
  if (!raw || typeof raw !== "object") return emptyBackup();
  const obj = raw as Partial<UmbralOfertasBackup>;
  const ofertas = Array.isArray(obj.ofertas)
    ? obj.ofertas
        .map((o) => normalizeOferta(o))
        .filter((o): o is OfertaArena => o != null)
    : [];
  const activa = String(obj.ofertaActivaId ?? "").trim();
  return {
    version: 1,
    ofertas,
    ofertaActivaId:
      activa && ofertas.some((o) => o.id === activa) ? activa : ofertas[0]?.id ?? null,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : "",
  };
}

function mergeOfertas(
  ...lists: Array<OfertaArena[] | undefined>
): OfertaArena[] {
  const byId = new Map<string, OfertaArena>();
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const o = normalizeOferta(raw);
      if (!o) continue;
      const prev = byId.get(o.id);
      if (!prev || o.updatedAt >= prev.updatedAt) {
        byId.set(o.id, o);
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function loadUmbralOfertasLocal(userId: string): UmbralOfertasBackup {
  if (typeof localStorage === "undefined") return emptyBackup();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyBackup();
    return parseBackup(JSON.parse(raw));
  } catch {
    return emptyBackup();
  }
}

export function saveUmbralOfertasLocal(
  userId: string,
  backup: Pick<UmbralOfertasBackup, "ofertas" | "ofertaActivaId">,
): UmbralOfertasBackup {
  const next: UmbralOfertasBackup = {
    version: 1,
    ofertas: mergeOfertas(backup.ofertas),
    ofertaActivaId: backup.ofertaActivaId,
    updatedAt: new Date().toISOString(),
  };
  if (
    next.ofertaActivaId &&
    !next.ofertas.some((o) => o.id === next.ofertaActivaId)
  ) {
    next.ofertaActivaId = next.ofertas[0]?.id ?? null;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch (e) {
      console.error("[umbralOfertas] No se pudo guardar backup local:", e);
    }
  }
  void persistirOfertasFirestore(userId, next);
  return next;
}

export function persistirOfertasFusionadas(
  userId: string,
  ...extra: Array<UmbralOfertasBackup | undefined>
): UmbralOfertasBackup {
  const local = loadUmbralOfertasLocal(userId);
  const ofertas = mergeOfertas(local.ofertas, ...extra.map((e) => e?.ofertas));
  let activa =
    extra.reduce<string | null>(
      (acc, e) => e?.ofertaActivaId ?? acc,
      local.ofertaActivaId,
    ) ?? null;
  if (activa && !ofertas.some((o) => o.id === activa)) {
    activa = ofertas[0]?.id ?? null;
  }
  return saveUmbralOfertasLocal(userId, {
    ofertas,
    ofertaActivaId: activa,
  });
}

async function persistirOfertasFirestore(
  userId: string,
  backup: UmbralOfertasBackup,
): Promise<void> {
  try {
    const { db, isFirebaseConfigured, getPrivatePath } = await import(
      "@/lib/firebase"
    );
    if (!isFirebaseConfigured() || !db) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "umbralOfertas");
    await setDoc(
      doc(db, path, "activas"),
      {
        version: 1,
        ofertas: backup.ofertas,
        ofertaActivaId: backup.ofertaActivaId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn("[umbralOfertas] Firestore no disponible:", e);
  }
}

export async function cargarOfertasFirestore(
  userId: string,
): Promise<UmbralOfertasBackup> {
  try {
    const { db, isFirebaseConfigured, getPrivatePath } = await import(
      "@/lib/firebase"
    );
    if (!isFirebaseConfigured() || !db) return emptyBackup();
    const { doc, getDoc } = await import("firebase/firestore");
    const path = getPrivatePath(userId, "umbralOfertas");
    const snap = await getDoc(doc(db, path, "activas"));
    if (!snap.exists()) return emptyBackup();
    return parseBackup(snap.data());
  } catch (e) {
    console.warn("[umbralOfertas] No se pudieron leer ofertas de Firestore:", e);
    return emptyBackup();
  }
}
