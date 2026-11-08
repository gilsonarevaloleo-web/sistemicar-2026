/**
 * Último saldo conocido del ledger de Umbral/Juez.
 * Evita que un cold start (memoria a 0 o a 10 sembrados) borre el número en pantalla.
 */

export const UMBRAL5_SALDO_KEY = "sistemicar_umbral5_saldo";

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function leerSaldoUmbral5Local(userId: string): number | null {
  const uid = userId.trim();
  if (!uid) return null;
  try {
    const raw = storage()?.getItem(`${UMBRAL5_SALDO_KEY}:${uid}`);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export function guardarSaldoUmbral5Local(userId: string, saldo: number): void {
  const uid = userId.trim();
  if (!uid) return;
  if (!Number.isFinite(saldo) || saldo < 0) return;
  try {
    storage()?.setItem(`${UMBRAL5_SALDO_KEY}:${uid}`, String(Math.floor(saldo)));
  } catch {
    /* cuota / privado */
  }
}
