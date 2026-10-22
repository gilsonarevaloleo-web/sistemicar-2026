import React, { useState } from "react";
import {
  CANON_TEN_EYES,
  etiquetaCodigoOjo,
  focoRevelacionDe,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";
import type { VolcadoV3Entry } from "@/lib/deposito/v3/volcados";
import { formatearFechaAuditoriaV3 } from "@/lib/deposito/v3/formatear";
import { BotonCopiarV3 } from "./BotonCopiarV3";

const GOLD = "#D4AF37";

export function HistorialV3({
  entries,
  onSelect,
}: {
  entries: VolcadoV3Entry[];
  onSelect: (entry: VolcadoV3Entry) => void;
}) {
  const [abierto, setAbierto] = useState(true);

  return (
    <section className="mb-8 space-y-3" data-testid="deposito-v3-historial">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between border px-4 py-3 text-left"
        style={{ borderColor: `${GOLD}28` }}
        data-testid="deposito-v3-historial-toggle"
      >
        <span className="text-[10px] tracking-[0.22em]" style={{ color: GOLD }}>
          HISTORIAL DE AUDITORÍAS
        </span>
        <span className="text-[11px] text-white/40">
          {entries.length === 0
            ? "vacío"
            : `${entries.length} ${entries.length === 1 ? "sesión" : "sesiones"}`}
        </span>
      </button>

      {abierto && entries.length === 0 && (
        <p className="px-1 text-[12px] text-white/35">
          Todavía no hay dictámenes. El laboratorio guarda cada auditoría aquí.
        </p>
      )}

      {abierto && (
        <ul className="space-y-3">
          {entries.slice(0, 12).map((v) => {
            const firma = CANON_TEN_EYES[v.result.characterSignedCode];
            const focoCode = focoRevelacionDe(v.result);
            const ajuste =
              v.result.pedagogicalFeedback ?? v.result.immediateAdjustment;
            return (
              <li key={v.id}>
                <article
                  className="space-y-3 border bg-black/40 p-4"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  data-testid={`deposito-v3-historial-item-${v.id}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(v)}
                    className="w-full text-left"
                  >
                    <p className="mb-1 text-[10px] text-white/40">
                      {formatearFechaAuditoriaV3(v.createdAt)}
                      <span className="ml-2" style={{ color: GOLD }}>
                        {v.userTier}
                      </span>
                    </p>
                    <p className="mb-2 text-[10px] text-white/40">
                      {etiquetaCodigoOjo(v.result.characterSignedCode, "canon")} ·{" "}
                      {firma.syntaxLabel}
                      {focoCode !== v.result.characterSignedCode && (
                        <span className="ml-2" style={{ color: GOLD }}>
                          FOCO C{focoCode}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-white/35">
                      Territorio crudo
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {v.rawFact}
                    </p>
                    {v.detectedNoise && (
                      <p className="mt-2 text-[12px] text-white/55">
                        <span className="text-white/35">Flor · </span>
                        {v.detectedNoise}
                      </p>
                    )}
                    {v.omittedShadow && (
                      <p className="mt-1 text-[12px] text-white/55">
                        <span className="text-white/35">Sombra · </span>
                        {v.omittedShadow}
                      </p>
                    )}
                    <p className="mt-2 text-[12px] text-white/60">
                      <span className="text-white/35">Ajuste · </span>
                      {ajuste}
                    </p>
                  </button>
                  <BotonCopiarV3
                    item={v}
                    testId={`deposito-v3-copiar-${v.id}`}
                  />
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function resumenHistorial(result: DepotAnalysisResult): string {
  const firma = CANON_TEN_EYES[result.characterSignedCode];
  const focoCode = focoRevelacionDe(result);
  if (focoCode === result.characterSignedCode) {
    return `C${result.characterSignedCode} ${firma.name} · ${firma.syntaxLabel}`;
  }
  return `C${result.characterSignedCode} ${firma.name} · FOCO C${focoCode}`;
}

export default HistorialV3;
