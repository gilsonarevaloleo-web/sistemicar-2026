const STORAGE_KEY = "seller_ref";

/** Normaliza código de vendedor (MAYÚSCULAS, sin espacios). */
export function normalizeSellerRef(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "-");
  if (code.length < 2 || code.length > 32) return null;
  if (!/^[A-Z0-9_-]+$/.test(code)) return null;
  return code;
}

export function getSellerRef(): string | null {
  try {
    return normalizeSellerRef(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setSellerRef(code: string | null): void {
  try {
    const normalized = normalizeSellerRef(code);
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Lee ?ref= de la URL y persiste si es válido. */
export function captureSellerRefFromUrl(search?: string): string | null {
  const params = new URLSearchParams(search ?? window.location.search);
  const ref = normalizeSellerRef(params.get("ref"));
  if (ref) setSellerRef(ref);
  return ref ?? getSellerRef();
}

export function buildSellerPagosUrl(sellerCode: string): string {
  const code = normalizeSellerRef(sellerCode) ?? sellerCode;
  return `https://sistemicar.app/pagos?ref=${encodeURIComponent(code)}`;
}

/** Link de triage Capa 1 (Código + Planeta) con atribución. */
export function buildSellerVendedorUrl(sellerCode: string): string {
  const code = normalizeSellerRef(sellerCode) ?? sellerCode;
  return `https://sistemicar.app/vendedor?ref=${encodeURIComponent(code)}`;
}
