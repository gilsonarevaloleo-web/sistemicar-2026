import React from "react";
import { CANON_TEN_EYES, etiquetaCodigoOjo, type DepotAnalysisResult } from "@shared/deposito/v3";
import type { VolcadoV3Entry } from "@/lib/deposito/v3/volcados";

const GOLD = "#D4AF37";

export function HistorialV3({
  entries,
  onSelect,
}: {
  entries: VolcadoV3Entry[];
  onSelect: (entry: VolcadoV3Entry) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="mb-8" data-testid="deposito-v3-historial">
      <p
        className="mb-4 text-[10px] tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        AUDITORÍAS V3
      </p>
      <ul className="space-y-3">
        {entries.slice(0, 12).map((v) => {
          const firma = CANON_TEN_EYES[v.result.characterSignedCode];
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelect(v)}
                className="w-full border px-4 py-3 text-left"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
                data-testid={`deposito-v3-historial-item-${v.id}`}
              >
                <p className="mb-1 text-[10px] text-white/40">
                  {etiquetaCodigoOjo(v.result.characterSignedCode, "canon")} ·{" "}
                  {firma.syntaxLabel}
                  <span className="ml-2" style={{ color: GOLD }}>
                    {v.userTier}
                  </span>
                </p>
                <p className="line-clamp-3 text-sm text-white/70">{v.rawFact}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function resumenHistorial(result: DepotAnalysisResult): string {
  const firma = CANON_TEN_EYES[result.characterSignedCode];
  return `C${result.characterSignedCode} ${firma.name} · ${firma.syntaxLabel}`;
}

export default HistorialV3;
