import React from "react";
import { etiquetaCodigoOjo, type DepotAnalysisResult } from "@shared/deposito/v3";
import type { VolcadoV3Entry } from "@/lib/deposito/v3/volcados";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

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
        style={{ color: AZURE }}
      >
        AUDITORÍAS V3
      </p>
      <ul className="space-y-3">
        {entries.slice(0, 12).map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v)}
              className="w-full border px-4 py-3 text-left"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
              data-testid={`deposito-v3-historial-item-${v.id}`}
            >
              <p className="mb-1 text-[10px] text-white/40">
                {etiquetaCodigoOjo(v.result.perceptionEye, "canon")} ·{" "}
                {etiquetaCodigoOjo(v.result.characterSignedCode, "canon")} · Δ{" "}
                {v.result.deltaGap}
                <span className="ml-2" style={{ color: GOLD }}>
                  {v.userTier}
                </span>
              </p>
              <p className="line-clamp-3 text-sm text-white/70">{v.rawFact}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function resumenHistorial(result: DepotAnalysisResult): string {
  return `C${result.perceptionEye} / C${result.characterSignedCode} · Δ ${result.deltaGap}`;
}

export default HistorialV3;
