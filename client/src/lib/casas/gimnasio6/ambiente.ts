/**
 * Tema del cuarto por píldora (capítulo). Parametrizable: una píldora nueva
 * solo añade una entrada a TEMAS. No toca el canon ni el motor.
 */

export type TemaCuarto = {
  luz: string;
  luzSecundaria: string;
  respiracionSeg: number;
};

export const TEMAS: Record<number, TemaCuarto> = {
  1: { luz: "#b08d57", luzSecundaria: "#3a2a14", respiracionSeg: 7 },
  2: { luz: "#9a6a5a", luzSecundaria: "#2e1712", respiracionSeg: 5.5 },
  3: { luz: "#6f8fa8", luzSecundaria: "#14222e", respiracionSeg: 6.5 },
  4: { luz: "#a89a6f", luzSecundaria: "#2a2412", respiracionSeg: 5 },
};

export function temaDeCapitulo(capitulo: number): TemaCuarto {
  return TEMAS[capitulo] ?? TEMAS[1];
}

/** Avance 0..1 dentro del capítulo (12 pasos: 4 subcódigos × 3). El 10 se acerca con él. */
export function progresoDiez(
  puntero: { subcodigo: number; indice: number },
  sellado = false,
): number {
  if (sellado) return 1;
  const ordinal = (puntero.subcodigo - 1) * 3 + puntero.indice;
  return Math.min(1, Math.max(0, (ordinal - 1) / 12));
}

export function vibrarPaso(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(18);
  } catch {
    /* sin háptico */
  }
}
