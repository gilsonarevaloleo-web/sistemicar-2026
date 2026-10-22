import React, { useEffect, useMemo, useState } from "react";
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

function recorte(texto: string, max = 52): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max).trim()}…`;
}

export function HistorialV3({
  entries,
  onSelect,
}: {
  entries: VolcadoV3Entry[];
  onSelect: (entry: VolcadoV3Entry) => void;
}) {
  const [elegidoId, setElegidoId] = useState(entries[0]?.id ?? "");

  useEffect(() => {
    if (entries.length === 0) {
      setElegidoId("");
      return;
    }
    if (!entries.some((e) => e.id === elegidoId)) {
      setElegidoId(entries[0].id);
    }
  }, [entries, elegidoId]);

  const elegido = useMemo(
    () => entries.find((e) => e.id === elegidoId) ?? null,
    [entries, elegidoId],
  );

  return (
    <section className="mb-8 space-y-3" data-testid="deposito-v3-historial">
      <div className="space-y-2 border px-4 py-3" style={{ borderColor: `${GOLD}28` }}>
        <p className="text-[10px] tracking-[0.22em]" style={{ color: GOLD }}>
          HISTORIAL DE AUDITORÍAS
        </p>
        {entries.length === 0 ? (
          <p className="text-[12px] text-white/35">
            Todavía no hay dictámenes. El laboratorio guarda cada auditoría aquí.
          </p>
        ) : (
          <select
            value={elegidoId}
            onChange={(e) => {
              const next = entries.find((item) => item.id === e.target.value);
              setElegidoId(e.target.value);
              if (next) onSelect(next);
            }}
            className="w-full bg-black/70 px-3 py-2 text-[12px] text-white outline-none"
            style={{ border: `1px solid ${GOLD}44`, color: GOLD }}
            data-testid="deposito-v3-historial-reductor"
          >
            {entries.map((v) => {
              const firma = etiquetaCodigoOjo(v.result.characterSignedCode, "canon");
              return (
                <option key={v.id} value={v.id}>
                  {formatearFechaAuditoriaV3(v.createdAt)} · {firma} ·{" "}
                  {recorte(v.rawFact)}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {elegido && (
        <article
          className="space-y-3 border bg-black/40 p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
          data-testid={`deposito-v3-historial-item-${elegido.id}`}
        >
          <p className="text-[10px] text-white/40">
            {formatearFechaAuditoriaV3(elegido.createdAt)}
            <span className="ml-2" style={{ color: GOLD }}>
              {elegido.userTier}
            </span>
          </p>
          <p className="text-[10px] text-white/40">
            {etiquetaCodigoOjo(elegido.result.characterSignedCode, "canon")} ·{" "}
            {CANON_TEN_EYES[elegido.result.characterSignedCode].syntaxLabel}
            {focoRevelacionDe(elegido.result) !==
              elegido.result.characterSignedCode && (
              <span className="ml-2" style={{ color: GOLD }}>
                FOCO C{focoRevelacionDe(elegido.result)}
              </span>
            )}
          </p>
          <details>
            <summary
              className="cursor-pointer text-[9px] tracking-[0.2em] uppercase text-white/35"
              data-testid="deposito-v3-historial-volcado"
            >
              Territorio crudo · ver volcado
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {elegido.rawFact}
            </p>
            {elegido.detectedNoise && (
              <p className="mt-2 text-[12px] text-white/55">
                <span className="text-white/35">Flor · </span>
                {elegido.detectedNoise}
              </p>
            )}
            {elegido.omittedShadow && (
              <p className="mt-1 text-[12px] text-white/55">
                <span className="text-white/35">Sombra · </span>
                {elegido.omittedShadow}
              </p>
            )}
          </details>
          <p className="text-[12px] text-white/60">
            <span className="text-white/35">Ajuste · </span>
            {elegido.result.pedagogicalFeedback ??
              elegido.result.immediateAdjustment}
          </p>
          <BotonCopiarV3
            item={elegido}
            testId={`deposito-v3-copiar-${elegido.id}`}
          />
        </article>
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
