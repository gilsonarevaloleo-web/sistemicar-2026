/**
 * Teléfono / WhatsApp del cliente (Perú por defecto).
 * Misma regla que Twilio: 9 dígitos → +51; si ya trae +, se respeta.
 */

export function normalizeClientPhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 9) return `+51${digits}`;
  return `+${digits}`;
}

export function hasValidClientPhone(raw: unknown): boolean {
  return typeof raw === "string" && normalizeClientPhone(raw) != null;
}

export function pickClientPhoneFromSources(...sources: unknown[]): string | null {
  for (const source of sources) {
    if (typeof source !== "string") continue;
    const normalized = normalizeClientPhone(source);
    if (normalized) return normalized;
  }
  return null;
}

export function pickClientPhone(
  remote: unknown,
  local: unknown,
): string | null {
  return pickClientPhoneFromSources(remote, local);
}
