import React from "react";
import type { JuezSerioFase2 } from "@shared/casas/codigo4";
import { JUEZ_IRON } from "./LienzoEntrada";

export function BloqueDirectiva({ fase2 }: { fase2: JuezSerioFase2 }) {
  return (
    <section
      className="border-l-2 bg-black/40 px-5 py-5"
      style={{ borderColor: JUEZ_IRON }}
      data-testid="juez-directiva"
    >
      <p
        className="mb-2 text-[10px] tracking-[0.22em] uppercase"
        style={{ color: JUEZ_IRON }}
      >
        Directiva operacional
      </p>
      <p className="text-base leading-relaxed text-white">
        {fase2.directivaOperacional}
      </p>
      <p className="mt-3 text-[11px] text-white/40">
        La solución actúa exclusivamente dentro del perímetro conquistado.
        No hay teoría. No hay código superior.
      </p>
    </section>
  );
}
