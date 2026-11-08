import { isOwnerEmail } from "./moduleAccess.ts";

/** Sentinel de API/UI: el dueño no consume el ledger. */
export const SALDO_ILIMITADO = 999_999;

export function esEmailDueno(email?: string | null): boolean {
  return isOwnerEmail(email);
}

export function etiquetaSaldoCreditos(
  saldo: number | null,
  opts: { email?: string | null; ilimitado?: boolean } = {},
): string {
  if (opts.ilimitado || isOwnerEmail(opts.email)) return "Ilimitado";
  if (saldo == null) return "…";
  return `${saldo} crédito${saldo === 1 ? "" : "s"}`;
}
