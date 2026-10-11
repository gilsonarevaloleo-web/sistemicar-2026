import React from "react";
import {
  medirGradoConsistenciaDesdeVolcados,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function GradoConsistenciaV3({
  entries,
}: {
  entries: ReadonlyArray<{ result: DepotAnalysisResult; createdAt?: Date }>;
}) {
  if (entries.length === 0) return null;

  const grado = medirGradoConsistenciaDesdeVolcados(entries);
  const pct = Math.round(grado.consistencyRate * 100);

  return (
    <section
      className="border px-5 py-4"
      style={{ borderColor: `${GOLD}33`, backgroundColor: "rgba(0,0,0,0.35)" }}
      data-testid="deposito-v3-grado"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] tracking-[0.22em]"
            style={{ color: AZURE }}
          >
            GRADO POR CONSISTENCIA
          </p>
          <p
            className="mt-1 font-mono text-lg tracking-wide"
            style={{ color: GOLD }}
            data-testid="deposito-v3-grado-tier"
          >
            {grado.recommendedTier}
          </p>
        </div>
        <p
          className="text-right text-[10px] font-mono text-white/45"
          data-testid="deposito-v3-grado-tasa"
        >
          {grado.stableCount} de {grado.sampleSize} volcados estables · {pct}%
        </p>
      </div>
      <p className="mt-2 text-[11px] text-white/40">
        7 de 10 con óptica ≥ C7 y chasis sustentado otorga Título. No abre el
        candado comercial.
      </p>
    </section>
  );
}

export default GradoConsistenciaV3;
