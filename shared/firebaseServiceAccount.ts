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

/**
 * OpenSSL 3 (Node 20) falla con
 * `error:1E08010C:DECODER routines::unsupported` si el PEM sigue
 * con `\n` literales o el cuerpo va en una sola línea.
 */
export function normalizeServiceAccountPrivateKey(key: string): string {
  let k = key.trim().replace(/^\uFEFF/, "");
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const pem = k.match(
    /-----BEGIN ([A-Z ]+)-----([A-Za-z0-9+/=\s]+)-----END \1-----/,
  );
  if (!pem) return k;
  const type = pem[1];
  const body = pem[2].replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----\n`;
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
      value.private_key = normalizeServiceAccountPrivateKey(value.private_key);
      if (!value.private_key.includes("\n")) {
        lastError = "private_key_sin_saltos";
        continue;
      }
      return { ok: true, value };
    } catch {
      lastError = "invalid_json";
    }
  }
  return { ok: false, error: lastError };
}

export function explainFirebaseAdminError(
  parseError?: string | null,
  initError?: string | null,
): string | null {
  const raw = `${parseError || ""} ${initError || ""}`.trim();
  if (!raw) return null;
  if (
    /llave_pem_rota|private_key|DECODER|unsupported|private_key_rota|private_key_sin_saltos/i.test(
      raw,
    )
  ) {
    return "La llave de Firebase en Netlify está rota. Por eso no se abre la cuenta de 9000. En Netlify → Environment variables pega de nuevo FIREBASE_SERVICE_ACCOUNT_JSON (el JSON de una línea que baja Firebase) y vuelve a publicar.";
  }
  if (raw === "missing") {
    return "Falta FIREBASE_SERVICE_ACCOUNT_JSON en Netlify. Sin esa variable el servidor no ve las cuentas viejas.";
  }
  return explainFirestoreAccessError(raw) ?? raw;
}

const FIRESTORE_API_DISABLED =
  /Cloud Firestore API has not been used|firestore\.googleapis\.com\/overview|SERVICE_DISABLED/i;

/** Auth puede listar Gmail y aun así Firestore estar apagado: las cuentas salen en 0 PS. */
export function explainFirestoreAccessError(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const project =
    raw.match(/project[_ ](?:id[": ]+)?([a-z0-9-]+)/i)?.[1] ||
    raw.match(/project ([a-z0-9-]+)/i)?.[1] ||
    "sistemicar-app";
  if (FIRESTORE_API_DISABLED.test(raw)) {
    return (
      `Firestore está apagado en ${project}. Por eso ves 2 cuentas en 0 puntos: el servidor ve el Gmail (Auth) pero no puede leer los 9000 PS ni Crisol/Récord. ` +
      `Abre https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${project} y pulsa Enable. ` +
      `Luego entra a https://console.firebase.google.com/project/${project}/firestore : si dice «Create database», los 9000 nunca se guardaron en esta nube (estaban en el teléfono). Si ya ves artifacts/sistemicar-v2-5, espera 5 minutos y busca otra vez.`
    );
  }
  if (/PERMISSION_DENIED/i.test(raw)) {
    return `Firebase negó leer Firestore en ${project}. La llave de Netlify tiene que ser de ese mismo proyecto y Firestore tiene que estar encendido.`;
  }
  return null;
}

export function firestoreEnableUrl(projectId?: string | null): string {
  const project = projectId || "sistemicar-app";
  return `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${project}`;
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
