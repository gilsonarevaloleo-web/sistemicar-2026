/**
 * Crédito ilimitado del dueño (gilsonarevalo.leo@gmail.com).
 * El ledger puede estar en 0; el dueño no se cobra ni se bloquea.
 */

import { OWNER_EMAIL, isOwnerEmail } from "../../shared/moduleAccess.ts";
import { SALDO_ILIMITADO } from "../../shared/ownerCredits.ts";

export { SALDO_ILIMITADO, esEmailDueno } from "../../shared/ownerCredits.ts";

type Debito = { ok: true; saldo: number } | { ok: false; saldo: number };

type Billetera = {
  saldo(userId: string): Promise<number>;
  debitar(userId: string, amount: number): Promise<Debito>;
};

export function emailDePeticion(
  body: unknown,
  header?: string | null,
  query?: unknown,
): string {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const desdeQuery =
    query && typeof query === "object" && query !== null && "email" in query
      ? String((query as { email?: unknown }).email ?? "")
      : typeof query === "string"
        ? query
        : "";
  return String(raw.email ?? header ?? desdeQuery ?? "").trim();
}

let ownerUidCache: { uid: string | null; at: number } | null = null;
const OWNER_UID_TTL_MS = 5 * 60 * 1000;

function puedeResolverUidDueno(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.VITE_FIREBASE_API_KEY,
  );
}

export async function esDuenoCreditos(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  if (isOwnerEmail(email?.trim())) return true;
  const uid = userId.trim();
  if (!uid || !puedeResolverUidDueno()) return false;
  const now = Date.now();
  if (ownerUidCache && now - ownerUidCache.at < OWNER_UID_TTL_MS) {
    return Boolean(ownerUidCache.uid && ownerUidCache.uid === uid);
  }
  try {
    const { lookupUidByEmail } = await import("../firebaseAdmin.ts");
    const ownerUid = await lookupUidByEmail(OWNER_EMAIL);
    ownerUidCache = { uid: ownerUid, at: now };
    return Boolean(ownerUid && ownerUid === uid);
  } catch {
    ownerUidCache = { uid: null, at: now };
    return false;
  }
}

export async function consultarSaldoCreditos(
  wallet: Pick<Billetera, "saldo">,
  userId: string,
  email?: string | null,
): Promise<{ saldo: number; ilimitado: boolean }> {
  if (await esDuenoCreditos(userId, email)) {
    return { saldo: SALDO_ILIMITADO, ilimitado: true };
  }
  return { saldo: await wallet.saldo(userId), ilimitado: false };
}

export async function cobroCreditos(
  wallet: Billetera,
  userId: string,
  amount: number,
  email?: string | null,
): Promise<
  | { ok: true; saldo: number; cobrado: number; ilimitado: boolean }
  | { ok: false; saldo: number; ilimitado: false }
> {
  if (await esDuenoCreditos(userId, email)) {
    return { ok: true, saldo: SALDO_ILIMITADO, cobrado: 0, ilimitado: true };
  }
  const saldoAntes = await wallet.saldo(userId);
  if (saldoAntes < amount) {
    return { ok: false, saldo: saldoAntes, ilimitado: false };
  }
  const debito = await wallet.debitar(userId, amount);
  if (!debito.ok) {
    return { ok: false, saldo: debito.saldo, ilimitado: false };
  }
  return {
    ok: true,
    saldo: debito.saldo,
    cobrado: amount,
    ilimitado: false,
  };
}
