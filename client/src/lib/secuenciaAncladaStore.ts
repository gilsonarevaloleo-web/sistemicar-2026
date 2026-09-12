/**
 * Persistencia local de secuencias ancladas (hábitos A–F).
 * User-scoped, sin red: no hay superficie de sync ni inyección remota.
 */
import {
  normalizeBank,
  type SecuenciaAnclada,
} from "./secuenciaAnclada";

const KEY_PREFIX = "sistemicar_secuencia_anclada_v2_";

export function secuenciaAncladaStorageKey(userId: string): string | null {
  const id = String(userId ?? "").trim();
  if (!id || id.length > 128) return null;
  if (/[/\\]/.test(id)) return null;
  return `${KEY_PREFIX}${id}`;
}

export function readSecuenciasAncladas(userId: string): SecuenciaAnclada[] {
  const key = secuenciaAncladaStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return normalizeBank(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeSecuenciasAncladas(
  userId: string,
  slots: SecuenciaAnclada[]
): SecuenciaAnclada[] {
  const key = secuenciaAncladaStorageKey(userId);
  const normalized = normalizeBank(slots);
  if (!key) return normalized;
  try {
    localStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    /* quota / private mode */
  }
  return normalized;
}
