/** Borrador del volcado C4. Sobrevive recarga, otro dispositivo y limpieza del teléfono. */

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

/**
 * Persiste el lienzo.
 * Un string vacío no pisa un borrador ya guardado, salvo `allowEmpty`
 * (el operador borró el campo a propósito).
 */
export function guardarBorradorJuez(
  texto: string,
  opts?: { allowEmpty?: boolean },
): void {
  try {
    const s = storage();
    if (!s) return;
    if (!texto.trim()) {
      if (opts?.allowEmpty === true) {
        s.setItem(JUEZ_DRAFT_KEY, texto);
      }
      return;
    }
    s.setItem(JUEZ_DRAFT_KEY, texto);
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
