/** Borrador del volcado C4. Sobrevive recarga y cambio de pestaña. */

export const JUEZ_DRAFT_KEY = "sistemicar_juez_draft";

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function leerBorradorJuez(): string {
  try {
    return storage()?.getItem(JUEZ_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function guardarBorradorJuez(texto: string): void {
  try {
    storage()?.setItem(JUEZ_DRAFT_KEY, texto);
  } catch {
    // cuota / modo privado
  }
}

export function limpiarBorradorJuez(): void {
  try {
    storage()?.removeItem(JUEZ_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Prefiere el borrador local. Si está vacío, usa el último volcado del historial. */
export function textoLienzoDesde(
  borrador: string,
  ultimoHistorial?: string | null,
): string {
  if (borrador.trim()) return borrador;
  return ultimoHistorial?.trim() || borrador;
}
