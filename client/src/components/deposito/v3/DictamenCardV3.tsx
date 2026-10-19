import React from "react";
import {
  CANON_TEN_EYES,
  focoRevelacionDe,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export function DictamenCardV3({ result }: { result: DepotAnalysisResult }) {
  const character = CANON_TEN_EYES[result.characterSignedCode];
  const focoCode = focoRevelacionDe(result);
  const foco = CANON_TEN_EYES[focoCode];

  return (
    <section
      className="space-y-5 border px-5 py-5"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-v3-dictamen"
    >
      <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: `${GOLD}22` }}>
        <div>
          <span className="block text-[10px] tracking-[0.22em] text-white/40">
            AUDITORÍA DE FIRMA
          </span>
          <h2 className="mt-1 text-lg font-light tracking-tight text-white">
            Dictamen de Firma Sintáctica
          </h2>
        </div>
        <div className="flex items-start gap-2">
          <div
            className="px-4 py-2 text-right"
            style={{ border: `1px solid ${GOLD}33` }}
            data-testid="deposito-v3-caracter"
          >
            <span className="block text-[10px] font-mono uppercase text-white/40">
              Firma
            </span>
            <span className="font-mono text-xl font-bold" style={{ color: GOLD }}>
              C{result.characterSignedCode}
            </span>
          </div>
          <div
            className="px-4 py-2 text-right"
            style={{ border: `1px solid ${GOLD}88`, backgroundColor: `${GOLD}14` }}
            data-testid="deposito-v3-foco"
          >
            <span className="block text-[10px] font-mono uppercase text-white/40">
              Foco
            </span>
            <span className="font-mono text-xl font-bold" style={{ color: GOLD }}>
              C{focoCode}
            </span>
          </div>
        </div>
      </div>

      <div data-testid="deposito-v3-firma">
        <span className="block text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>
          Código de carácter
        </span>
        <p className="mt-1 text-sm font-bold text-white/90">
          C{result.characterSignedCode} · {character.name}
          <span className="ml-2 text-[10px] font-normal text-white/40">
            {character.syntaxLabel} · {character.planeta}
          </span>
        </p>
      </div>

      <div data-testid="deposito-v3-foco-detalle">
        <span className="block text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>
          Foco de revelación
        </span>
        <p className="mt-1 text-sm font-bold text-white/90">
          C{focoCode} · {foco.name}
          <span className="ml-2 text-[10px] font-normal text-white/40">
            {foco.syntaxLabel} · {foco.concept}
          </span>
        </p>
      </div>

      <div className="border-l-2 pl-4" style={{ borderColor: GOLD }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          Sintaxis de redacción
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          {result.syntaxDiagnostic.syntaxCharacteristics}
        </p>
        <p
          className="mt-2 text-[10px] font-mono uppercase tracking-wider text-white/40"
          data-testid="deposito-v3-cableado"
        >
          {result.syntaxDiagnostic.isCableadoConnected
            ? "Cableado título↔cierre: conectado"
            : "Cableado título↔cierre: abierto"}
        </p>
      </div>

      {(result.syntacticVacios?.length ?? 0) > 0 && (
        <div data-testid="deposito-v3-vacios">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Vacíos sintácticos
          </h4>
          <p className="mt-1 font-mono text-xs text-white/55">
            {result.syntacticVacios!.map((n) => `C${n}`).join(" · ")}
          </p>
        </div>
      )}

      <div className="border-l-2 pl-4" style={{ borderColor: `${GOLD}66` }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          Estabilidad de escritura
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          {result.groundingStatus.diagnosticMessage}
        </p>
      </div>

      <div className="p-4" style={{ border: `1px solid ${GOLD}44`, backgroundColor: `${GOLD}10` }}>
        <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
          Ajuste de percepción · C{focoCode}
        </span>
        <p className="mt-1 text-xs font-semibold leading-relaxed" style={{ color: `${GOLD}ee` }}>
          {result.immediateAdjustment}
        </p>
      </div>
    </section>
  );
}

export default DictamenCardV3;
