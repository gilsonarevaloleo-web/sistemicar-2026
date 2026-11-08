/**
 * URL de Postgres en Express, Netlify y Neon.
 * Sin esto, el gimnasio y el saldo caen a memoria por instancia y se pierden.
 */

export function resolveDatabaseUrl(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): string {
  const ordered = [
    env.DATABASE_URL,
    env.NETLIFY_DATABASE_URL,
    env.POSTGRES_URL,
    env.NEON_DATABASE_URL,
    env.DATABASE_URI,
  ];
  for (const raw of ordered) {
    const value = String(raw ?? "").trim();
    if (value) return value;
  }
  return "";
}
