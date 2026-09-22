/**
 * Modelos Gemini para servidor (callGemini) y cliente (REST directo).
 * Orden: primero el m�s capaz; fallbacks si quota o regi�n fallan.
 */
export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number];

/** Modelo por defecto para llamadas REST desde el navegador */
export const GEMINI_MODEL_CLIENT = "gemini-2.5-flash" as const;

export const GEMINI_GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiGenerateContentUrl(model: string): string {
  return `${GEMINI_GENERATE_CONTENT_BASE}/${model}:generateContent`;
}

/**
 * Claves de Gemini en runtime (Netlify Functions / Express).
 * `GEMINI_API_KEY` es la variable canónica de Site settings; el resto son alias.
 * No usa `VITE_*` como fuente primaria: esa clave se embebe en el cliente.
 */
export function collectGeminiApiKeys(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): string[] {
  const ordered = [
    env.GEMINI_API_KEY,
    env.GOOGLE_API_KEY,
    env.VITE_GEMINI_API_KEY,
    env.AI_INTEGRATIONS_GEMINI_API_KEY,
  ];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const raw of ordered) {
    const k = (raw || "").trim();
    if (k.length <= 10 || k.startsWith("_DUMMY") || seen.has(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys;
}

export function geminiApiKeyConfigured(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): boolean {
  return collectGeminiApiKeys(env).length > 0;
}
