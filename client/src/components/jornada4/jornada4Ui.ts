/**
 * Tokens visuales Dual Kernel — respiración, tipografía y superficie.
 * Usar en tarjetas de OPERAR / PLAN / MÉTRICAS (móvil).
 */
export const J4_UI = {
  card: "rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md p-4",
  cardCompact:
    "rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md",
  label: "text-xs uppercase tracking-widest text-neutral-400",
  value: "font-mono text-2xl font-bold tabular-nums",
  hint: "text-xs text-neutral-500",
} as const;

export const J4_NEON = {
  emerald: "#34D399",
  violet: "#8B5CF6",
  mutedRed: "#B45454",
  ink: "#f1f5f9",
} as const;

export const J4_TRIADA_NEON = {
  inconsciente: J4_NEON.mutedRed,
  presencia: J4_NEON.emerald,
  direccion: J4_NEON.violet,
  noConquistado: "#78716C",
} as const;
