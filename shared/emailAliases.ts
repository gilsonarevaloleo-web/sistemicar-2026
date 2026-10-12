/**
 * El pago y la cuenta Google a veces no usan el mismo string
 * (mayúsculas, puntos de Gmail, alias +tag, typo gamail/gamil).
 * Sin estas claves el grant queda pendiente y Jornada manda otra vez a /pagos.
 */

const GMAIL_CANON_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Typos reales de checkout / Yape / admin. No son proveedores de Google. */
const GMAIL_TYPO_DOMAINS = new Set([
  "gamail.com",
  "gamil.com",
  "gmal.com",
  "gmil.com",
  "gnail.com",
  "gmaill.com",
  "gmai.com",
  "gmaul.com",
  "gmail.con",
  "gmail.co",
]);

function isGmailFamilyDomain(domain: string): boolean {
  return GMAIL_CANON_DOMAINS.has(domain) || GMAIL_TYPO_DOMAINS.has(domain);
}

export function normalizeBuyerEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (GMAIL_TYPO_DOMAINS.has(domain)) {
    return `${local}@gmail.com`;
  }
  return trimmed;
}

function gmailLocalCanon(local: string): string {
  return local.split("+")[0]?.replace(/\./g, "") ?? "";
}

function gmailLocals(local: string): string[] {
  const plusStripped = local.split("+")[0] || local;
  const canon = gmailLocalCanon(local);
  return [...new Set([local, plusStripped, canon].filter(Boolean))];
}

/** Claves con las que buscar grants y usuarios Firebase para un correo. */
export function emailMatchKeys(email: string): string[] {
  const raw = email.trim().toLowerCase();
  const normalized = normalizeBuyerEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return normalized ? [normalized] : [];
  }
  const [local, domain] = raw.split("@");
  if (!local || !domain) return [normalized];

  const keys = new Set<string>([raw, normalized]);
  if (isGmailFamilyDomain(domain) || isGmailFamilyDomain(normalized.split("@")[1] ?? "")) {
    const domains = ["gmail.com", "googlemail.com", ...GMAIL_TYPO_DOMAINS];
    for (const loc of gmailLocals(local)) {
      for (const d of domains) {
        keys.add(`${loc}@${d}`);
      }
    }
  }
  return [...keys];
}

export function emailsLikelySameMailbox(a: string, b: string): boolean {
  const left = emailMatchKeys(a);
  const right = new Set(emailMatchKeys(b));
  return left.some((key) => right.has(key));
}

/** Aviso de admin cuando el correo del pago tiene typo de Gmail. */
export function gmailTypoCorrection(email: string): string | null {
  const raw = email.trim().toLowerCase();
  const fixed = normalizeBuyerEmail(email);
  if (raw && fixed !== raw && fixed.endsWith("@gmail.com")) {
    return fixed;
  }
  return null;
}
