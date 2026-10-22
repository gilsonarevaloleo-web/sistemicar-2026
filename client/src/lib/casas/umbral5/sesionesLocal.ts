/**
 * Caché local de volcados de Casa 5.
 * El servidor (Postgres, como el Juez) es la fuente.
 * Esto sobrevive recarga y serverless sin memoria.
 */

import type { SesionUmbral5 } from "@shared/casas/umbral5";

export const UMBRAL5_SESIONES_KEY = "sistemicar_umbral5_sesiones";
export const UMBRAL5_DRAFT_KEY = "sistemicar_umbral5_draft";
export const UMBRAL5_SESIONES_EVENT = "umbral5-sesiones-updated";

const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readBucket(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeBucket(key: string, value: string): void {
  try {
    const s = storage();
    if (s) {
      s.setItem(key, value);
      return;
    }
  } catch {
    /* cuota / privado */
  }
  memory.set(key, value);
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UMBRAL5_SESIONES_EVENT));
  }
}

function parseAll(): SesionUmbral5[] {
  try {
    const raw = readBucket(UMBRAL5_SESIONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SesionUmbral5[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.id === "string" && typeof s.userId === "string")
      .map((s) => ({
        id: String(s.id),
        userId: String(s.userId),
        textoVolcado: String(s.textoVolcado ?? ""),
        lectura: s.lectura ?? null,
        source:
          s.source === "gemini"
            ? "gemini"
            : s.source === "local_fallback"
              ? "local_fallback"
              : null,
        estado: s.estado === "MAPA_PAGO" ? "MAPA_PAGO" : "VOLCADO_GRATIS",
        createdAt: String(s.createdAt ?? ""),
        updatedAt: String(s.updatedAt ?? s.createdAt ?? ""),
      }));
  } catch {
    return [];
  }
}

function writeAll(sesiones: SesionUmbral5[]): void {
  writeBucket(UMBRAL5_SESIONES_KEY, JSON.stringify(sesiones));
  emitUpdated();
}

export function listarSesionesUmbral5Local(userId: string): SesionUmbral5[] {
  const uid = userId.trim();
  if (!uid) return [];
  return parseAll()
    .filter((s) => s.userId === uid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function guardarSesionUmbral5Local(sesion: SesionUmbral5): void {
  const all = parseAll().filter((s) => s.id !== sesion.id);
  all.push(sesion);
  writeAll(all);
}

export function fusionarSesionesUmbral5Local(
  userId: string,
  remotas: SesionUmbral5[],
): SesionUmbral5[] {
  const uid = userId.trim();
  const byId = new Map<string, SesionUmbral5>();
  for (const s of parseAll()) {
    if (s.userId === uid) byId.set(s.id, s);
  }
  for (const s of remotas) {
    if (s.userId === uid) byId.set(s.id, s);
  }
  const merged = [...byId.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const others = parseAll().filter((s) => s.userId !== uid);
  writeAll([...others, ...merged]);
  return merged;
}

export function leerBorradorUmbral5(): string {
  try {
    return String(readBucket(UMBRAL5_DRAFT_KEY) ?? "");
  } catch {
    return "";
  }
}

export function guardarBorradorUmbral5(texto: string): void {
  writeBucket(UMBRAL5_DRAFT_KEY, texto);
}

export function limpiarBorradorUmbral5(): void {
  try {
    storage()?.removeItem(UMBRAL5_DRAFT_KEY);
  } catch {
    /* ignore */
  }
  memory.delete(UMBRAL5_DRAFT_KEY);
}
