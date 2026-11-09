/**
 * Peso del límite: serie de volcados, no un sello.
 * El gimnasio se ofrece cuando hay corpus.
 */

import type { CodigoLimite } from "./diccionarioLimites.ts";
import type { SesionUmbral5 } from "./sesion.ts";

export const MIN_VOLCADOS_PESO = 5;
export const MIN_REPETICIONES_PESO = 2;

export interface PesoLimite {
  total: number;
  hayPeso: boolean;
  canal: CodigoLimite | null;
  repeticiones: number;
}

function canalDe(sesion: Pick<SesionUmbral5, "lectura">): CodigoLimite | null {
  const n = sesion.lectura?.codigoLimite;
  if (typeof n !== "number" || n < 1 || n > 10) return null;
  return n as CodigoLimite;
}

export function pesoDeVolcados(
  sesiones: readonly Pick<SesionUmbral5, "lectura">[],
): PesoLimite {
  const counts = new Map<CodigoLimite, number>();
  for (const s of sesiones) {
    const canal = canalDe(s);
    if (!canal) continue;
    counts.set(canal, (counts.get(canal) ?? 0) + 1);
  }
  let canal: CodigoLimite | null = null;
  let repeticiones = 0;
  for (const [c, n] of Array.from(counts.entries())) {
    if (n > repeticiones || (n === repeticiones && canal != null && c < canal)) {
      canal = c;
      repeticiones = n;
    }
  }
  const total = sesiones.length;
  const hayPeso =
    total >= MIN_VOLCADOS_PESO && repeticiones >= MIN_REPETICIONES_PESO;
  return {
    total,
    hayPeso,
    canal: hayPeso ? canal : null,
    repeticiones,
  };
}

export function hayPesoParaGimnasio(
  sesiones: readonly Pick<SesionUmbral5, "lectura">[],
): boolean {
  return pesoDeVolcados(sesiones).hayPeso;
}
