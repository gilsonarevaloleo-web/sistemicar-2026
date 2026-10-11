/**
 * El pago y la cuenta Google a veces no usan el mismo string
 * (mayúsculas, puntos de Gmail, alias +tag). Sin estas claves
 * el grant queda pendiente y Jornada manda otra vez a /pagos.
 */

export function normalizeBuyerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function gmailLocalCanon(local: string): string {
  return local.split("+")[0]?.replace(/\./g, "") ?? "";
}

/** Claves con las que buscar grants y usuarios Firebase para un correo. */
export function emailMatchKeys(email: string): string[] {
  const normalized = normalizeBuyerEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return normalized ? [normalized] : [];
  }
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return [normalized];

  const keys = new Set<string>([normalized]);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusStripped = local.split("+")[0] || local;
    const canon = gmailLocalCanon(local);
    keys.add(`${plusStripped}@gmail.com`);
    keys.add(`${plusStripped}@googlemail.com`);
    if (canon) {
      keys.add(`${canon}@gmail.com`);
      keys.add(`${canon}@googlemail.com`);
    }
  }
  return [...keys];
}

export function emailsLikelySameMailbox(a: string, b: string): boolean {
  const left = emailMatchKeys(a);
  const right = new Set(emailMatchKeys(b));
  return left.some((key) => right.has(key));
}
