/**
 * Netlify suele romper el JSON al pegarlo: comillas de más,
 * saltos reales en private_key, o un string-dentro-de-string.
 */

export type ParsedServiceAccount =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

function stripWrap(raw: string): string {
  let s = raw.trim().replace(/^\uFEFF/, "");
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith("`") && s.endsWith("`"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function escapePrivateKeyNewlines(json: string): string {
  return json.replace(
    /"private_key"\s*:\s*"([\s\S]*?)"/,
    (_full, key: string) => {
      const escaped = key.replace(/\r\n/g, "\\n").replace(/\n/g, "\\n");
      return `"private_key":"${escaped}"`;
    },
  );
}

export function parseFirebaseServiceAccountJson(raw: string | undefined | null): ParsedServiceAccount {
  if (!raw?.trim()) {
    return { ok: false, error: "missing" };
  }
  const attempts = [stripWrap(raw), escapePrivateKeyNewlines(stripWrap(raw))];
  let lastError = "invalid_json";
  for (const attempt of attempts) {
    try {
      let parsed: unknown = JSON.parse(attempt);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      if (!parsed || typeof parsed !== "object") {
        lastError = "not_object";
        continue;
      }
      const value = parsed as Record<string, unknown>;
      if (value.type !== "service_account") {
        lastError = "not_service_account";
        continue;
      }
      if (typeof value.private_key !== "string" || !value.private_key.includes("BEGIN")) {
        lastError = "private_key_rota";
        continue;
      }
      return { ok: true, value };
    } catch {
      lastError = "invalid_json";
    }
  }
  return { ok: false, error: lastError };
}

export function serviceAccountPublicMeta(value: Record<string, unknown>): {
  projectId: string | null;
  clientEmail: string | null;
} {
  return {
    projectId: typeof value.project_id === "string" ? value.project_id : null,
    clientEmail: typeof value.client_email === "string" ? value.client_email : null,
  };
}

/** Mismo nombre, otro orden: pinocarreratina ↔ tinapinocarrera. */
export function gmailLocalAnagram(a: string, b: string): boolean {
  const left = a.split("+")[0]?.replace(/\./g, "") ?? "";
  const right = b.split("+")[0]?.replace(/\./g, "") ?? "";
  if (!left || left.length < 8 || left.length !== right.length) return false;
  return [...left].sort().join("") === [...right].sort().join("");
}
